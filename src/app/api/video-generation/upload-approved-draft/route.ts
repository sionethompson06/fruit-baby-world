// POST /api/video-generation/upload-approved-draft
// Fetches an approved temporary provider video server-side and uploads it to Vercel Blob.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not attach video to episode JSON. Does not publish video.
//          Does not expose Blob token, Fal key, or raw secrets.
// Phase:   14D — Save Approved Video Clip to Blob.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";
import type { ApprovedVideoClipAsset } from "@/lib/videoGenerationTypes";

export const maxDuration = 120;

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

const SAFE_SLUG_RE = /^[a-z0-9-]+$/;
const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,100}$/;
const HTTPS_RE = /^https:\/\//;

const ALLOWED_VIDEO_STYLES = [
  "storybook-cartoon",
  "gentle-animation",
  "playful-short",
  "classroom-friendly",
  "cinematic-soft",
] as const;

const ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "application/octet-stream",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadResult =
  | {
      ok: true;
      status: "approved_video_uploaded";
      episodeSlug: string;
      sceneId: string;
      sceneNumber: number;
      video: ApprovedVideoClipAsset;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "video_fetch_failed"
        | "file_too_large"
        | "blob_upload_failed";
      message: string;
      details?: {
        storageProvider?: string;
        targetPath?: string;
      };
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function sanitizeText(v: unknown, maxLen: number): string {
  if (typeof v !== "string") return "";
  return v.replace(/<[^>]*>/g, "").trim().slice(0, maxLen);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Check Blob config ────────────────────────────────────────────────────────
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Vercel Blob storage is not configured yet. Add BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
      } satisfies UploadResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ─────────────────────────────────────────────────────
  const episodeSlug = safeStr(body.episodeSlug);
  if (!episodeSlug || !SAFE_SLUG_RE.test(episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Validate sceneId / sceneNumber ───────────────────────────────────────────
  const sceneIdRaw = safeStr(body.sceneId);
  const sceneId = sceneIdRaw && SAFE_ID_RE.test(sceneIdRaw) ? sceneIdRaw : "";

  const sceneNumberRaw = body.sceneNumber;
  const sceneNumber =
    typeof sceneNumberRaw === "number" && Number.isFinite(sceneNumberRaw) && sceneNumberRaw >= 1
      ? Math.floor(sceneNumberRaw)
      : 0;

  // ── Validate videoUrl ────────────────────────────────────────────────────────
  const videoUrl = safeStr(body.videoUrl);
  if (!videoUrl || !HTTPS_RE.test(videoUrl)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "videoUrl is required and must be a valid https:// URL.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Validate optional thumbnailUrl ───────────────────────────────────────────
  const thumbnailUrlRaw = safeStr(body.thumbnailUrl);
  const thumbnailUrl = thumbnailUrlRaw && HTTPS_RE.test(thumbnailUrlRaw) ? thumbnailUrlRaw : "";

  // ── Optional metadata ────────────────────────────────────────────────────────
  const provider = safeStr(body.provider, "fal");
  const providerJobId = safeStr(body.providerJobId);
  const modelId = safeStr(body.modelId);

  const videoStyleRaw = safeStr(body.videoStyle);
  const videoStyle = (ALLOWED_VIDEO_STYLES as readonly string[]).includes(videoStyleRaw)
    ? videoStyleRaw
    : "storybook-cartoon";

  const durationSeconds =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
      ? body.durationSeconds
      : 6;

  const promptText = sanitizeText(body.promptText, 4000);
  const referenceMode = safeStr(body.referenceMode);
  const reviewNotes = sanitizeText(body.reviewNotes, 1000);
  const approvedBy = safeStr(body.approvedBy, "admin");

  // ── Fetch provider video server-side ─────────────────────────────────────────
  let videoBuffer: Buffer;
  let detectedMime = "video/mp4";

  try {
    const fetchRes = await fetch(videoUrl, {
      signal: AbortSignal.timeout(90_000),
    });

    if (!fetchRes.ok) {
      return Response.json(
        {
          ok: false,
          status: "video_fetch_failed",
          message: `Could not fetch the temporary provider video for upload. Provider responded with HTTP ${fetchRes.status}.`,
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    const contentType = fetchRes.headers.get("content-type") ?? "";
    const ct = contentType.split(";")[0].trim().toLowerCase();
    if (ALLOWED_CONTENT_TYPES.includes(ct)) {
      detectedMime = ct === "application/octet-stream" ? "video/mp4" : ct;
    }

    const arrayBuffer = await fetchRes.arrayBuffer();
    videoBuffer = Buffer.from(arrayBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("abort");
    return Response.json(
      {
        ok: false,
        status: "video_fetch_failed",
        message: isTimeout
          ? "Could not fetch the provider video: request timed out. The temporary URL may have expired."
          : "Could not fetch the temporary provider video for upload.",
      } satisfies UploadResult,
      { status: 502 }
    );
  }

  // ── Check size ───────────────────────────────────────────────────────────────
  if (videoBuffer.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "video_fetch_failed",
        message: "The fetched video was empty. The temporary URL may have expired.",
      } satisfies UploadResult,
      { status: 502 }
    );
  }

  if (videoBuffer.length > MAX_VIDEO_BYTES) {
    return Response.json(
      {
        ok: false,
        status: "file_too_large",
        message: `Video draft is too large to upload (${Math.round(videoBuffer.length / 1024 / 1024)}MB). Maximum size is 100 MB. Try a shorter clip or lower-quality provider setting.`,
      } satisfies UploadResult,
      { status: 413 }
    );
  }

  // ── Build storage path ────────────────────────────────────────────────────────
  const sceneSegment = sceneId || `scene-${sceneNumber || "unknown"}`;
  const ext = detectedMime === "video/webm" ? "webm" : "mp4";
  const storagePath = `video/clip-drafts/${episodeSlug}/${sceneSegment}/${Date.now()}-video-clip.${ext}`;

  console.info(
    `[upload-approved-video] Uploading ${detectedMime} (~${Math.round(videoBuffer.length / 1024 / 1024 * 10) / 10}MB) to ${storagePath}`
  );

  // ── Upload to Vercel Blob ─────────────────────────────────────────────────────
  try {
    const blob = await put(storagePath, videoBuffer, {
      access: "public",
      contentType: detectedMime,
      token: blobToken,
    });

    const now = new Date().toISOString();
    const id = `video-${Date.now()}`;

    const video: ApprovedVideoClipAsset = {
      id,
      episodeSlug,
      sceneId,
      sceneNumber,
      provider,
      providerJobId,
      modelId,
      videoStyle,
      durationSeconds,
      url: blob.url,
      pathname: blob.pathname,
      thumbnailUrl,
      mimeType: detectedMime,
      sizeBytes: videoBuffer.length,
      promptText,
      referenceMode,
      reviewNotes,
      approvedBy,
      approvedAt: now,
      createdAt: now,
    };

    return Response.json(
      {
        ok: true,
        status: "approved_video_uploaded",
        episodeSlug,
        sceneId,
        sceneNumber,
        video,
        notes: [
          "Approved video clip was uploaded to Blob storage.",
          "The video has not been attached to the episode JSON yet.",
          "Public video playback is not enabled yet.",
        ],
      } satisfies UploadResult,
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      console.error("[upload-approved-video] Blob access error:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: "Vercel Blob access denied. Check that BLOB_READ_WRITE_TOKEN is valid and has write access to this Blob store.",
          details: { storageProvider: "vercel-blob", targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    if (err instanceof BlobStoreNotFoundError) {
      console.error("[upload-approved-video] Blob store not found:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: "Vercel Blob store not found. The BLOB_READ_WRITE_TOKEN may point to a deleted or non-existent store.",
          details: { storageProvider: "vercel-blob", targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    if (err instanceof BlobStoreSuspendedError) {
      console.error("[upload-approved-video] Blob store suspended:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: "Vercel Blob store is suspended. Check Vercel account status.",
          details: { storageProvider: "vercel-blob", targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    if (err instanceof BlobFileTooLargeError) {
      console.error("[upload-approved-video] Blob file too large:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "file_too_large",
          message: "The video file is too large for Vercel Blob storage. Try a shorter clip.",
          details: { storageProvider: "vercel-blob", targetPath: storagePath },
        } satisfies UploadResult,
        { status: 413 }
      );
    }

    if (err instanceof BlobError) {
      console.error("[upload-approved-video] Blob error:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: `Vercel Blob upload failed. Check Blob storage configuration and token permissions.`,
          details: { storageProvider: "vercel-blob", targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    console.error("[upload-approved-video] Unexpected error:", err instanceof Error ? err.message : String(err));
    return Response.json(
      {
        ok: false,
        status: "blob_upload_failed",
        message: "Vercel Blob upload failed. Check Blob storage configuration and token permissions.",
        details: { storageProvider: "vercel-blob", targetPath: storagePath },
      } satisfies UploadResult,
      { status: 502 }
    );
  }
}
