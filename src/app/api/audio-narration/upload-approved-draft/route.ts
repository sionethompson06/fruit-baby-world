// POST /api/audio-narration/upload-approved-draft
// Protected route that uploads a reviewed narration audio draft to Vercel Blob.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not attach audio to episode JSON. Does not publish audio. Does not expose tokens.
// Phase:   13D — Save Approved Audio to Blob.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";
import type { ApprovedNarrationAudioAsset } from "@/lib/audioNarrationTypes";

export const maxDuration = 60;

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"] as const;
type AllowedAudioMime = (typeof ALLOWED_MIME_TYPES)[number];

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB decoded buffer limit
const SAFE_SLUG_RE = /^[a-z0-9-]+$/;

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadResult =
  | {
      ok: true;
      status: "approved_audio_uploaded";
      episodeSlug: string;
      audio: ApprovedNarrationAudioAsset;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "invalid_audio_payload"
        | "file_too_large"
        | "blob_upload_failed";
      message: string;
      details?: {
        storageProvider?: string;
        mimeType?: string;
        targetPath?: string;
      };
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedAudioMime(v: unknown): v is AllowedAudioMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

function safeStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Check Vercel Blob config ──────────────────────────────────────────────────
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "Media storage is not configured yet. Add BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
      } satisfies UploadResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ──────────────────────────────────────────────────────
  const episodeSlug = safeStr(body.episodeSlug);
  if (!episodeSlug || !SAFE_SLUG_RE.test(episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Validate audioBase64 ──────────────────────────────────────────────────────
  if (typeof body.audioBase64 !== "string" || body.audioBase64.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "invalid_audio_payload",
        message: "audioBase64 is required and must be a non-empty string.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const audioBase64 = body.audioBase64.trim();

  // ── Validate mimeType ─────────────────────────────────────────────────────────
  if (!isAllowedAudioMime(body.mimeType)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "mimeType must be one of: audio/mpeg, audio/mp3, audio/wav, audio/ogg.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const mimeType: AllowedAudioMime = body.mimeType;

  // ── Optional metadata fields ──────────────────────────────────────────────────
  const scriptText = safeStr(body.scriptText);
  const voiceStyle = safeStr(body.voiceStyle);
  const voiceId = safeStr(body.voiceId);
  const modelId = safeStr(body.modelId);
  const provider = safeStr(body.provider, "elevenlabs");
  const reviewNotes = safeStr(body.reviewNotes);
  const approvedBy = safeStr(body.approvedBy, "admin");

  // ── Decode base64 → Buffer ────────────────────────────────────────────────────
  let audioBuffer: Buffer;
  try {
    audioBuffer = Buffer.from(audioBase64, "base64");
  } catch {
    return Response.json(
      {
        ok: false,
        status: "invalid_audio_payload",
        message:
          "The audio data could not be decoded. Regenerate the temporary draft and try again.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (audioBuffer.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "invalid_audio_payload",
        message:
          "The audio data decoded to an empty buffer. Regenerate the temporary draft and try again.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    return Response.json(
      {
        ok: false,
        status: "file_too_large",
        message: `The audio file is too large (${Math.round(audioBuffer.length / 1024 / 1024)}MB). Maximum size is 25 MB.`,
      } satisfies UploadResult,
      { status: 413 }
    );
  }

  // ── Build storage path ────────────────────────────────────────────────────────
  const storagePath = `audio/narration-drafts/${episodeSlug}/${Date.now()}-narration-draft.mp3`;

  console.info(
    `[upload-approved-draft] Uploading ${mimeType} (~${Math.round(audioBuffer.length / 1024)}KB) to ${storagePath}`
  );

  // ── Upload to Vercel Blob ─────────────────────────────────────────────────────
  try {
    const blob = await put(storagePath, audioBuffer, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });

    const now = new Date().toISOString();

    const audio: ApprovedNarrationAudioAsset = {
      id: `audio-${Date.now()}`,
      episodeSlug,
      provider,
      voiceId,
      modelId,
      voiceStyle,
      url: blob.url,
      pathname: blob.pathname,
      mimeType,
      sizeBytes: audioBuffer.length,
      scriptText,
      reviewNotes,
      approvedBy,
      approvedAt: now,
      createdAt: now,
    };

    return Response.json(
      {
        ok: true,
        status: "approved_audio_uploaded",
        episodeSlug,
        audio,
        notes: [
          "Approved narration audio was uploaded to Blob storage.",
          "The audio has not been attached to the episode JSON yet.",
          "Public audio playback is not enabled yet.",
        ],
      } satisfies UploadResult,
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      console.error("[upload-approved-draft] Blob access error:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message:
            "Vercel Blob access denied. Check that BLOB_READ_WRITE_TOKEN is valid and has write access to this Blob store.",
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    if (err instanceof BlobStoreNotFoundError) {
      console.error("[upload-approved-draft] Blob store not found:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message:
            "Vercel Blob store not found. The BLOB_READ_WRITE_TOKEN may point to a deleted or non-existent store. Recreate the Blob store in Vercel dashboard.",
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    if (err instanceof BlobStoreSuspendedError) {
      console.error("[upload-approved-draft] Blob store suspended:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: "Vercel Blob store is suspended. Check Vercel account status.",
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    if (err instanceof BlobFileTooLargeError) {
      console.error("[upload-approved-draft] Blob file too large:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "file_too_large",
          message:
            "The audio file is too large for Vercel Blob storage. Try regenerating a shorter narration draft.",
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 413 }
      );
    }

    if (err instanceof BlobError) {
      console.error("[upload-approved-draft] Blob error:", (err as Error).message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: `Vercel Blob upload failed: ${(err as Error).message}. Check Blob storage configuration and token permissions.`,
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    const safeMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload-approved-draft] Unexpected error:", safeMsg);
    return Response.json(
      {
        ok: false,
        status: "blob_upload_failed",
        message: "Vercel Blob upload failed. Check Blob storage configuration and token permissions.",
        details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
      } satisfies UploadResult,
      { status: 502 }
    );
  }
}
