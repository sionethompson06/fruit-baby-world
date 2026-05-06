// POST /api/media/upload-story-panel-image
// Protected route that uploads an approved story panel image draft to Vercel Blob.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Requires characterFidelityApproved === true before uploading.
//          Does not update episode JSON. Does not publish. Does not expose tokens.
// Phase:   6F/6G Fix — improved error handling and MIME detection.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";
import { validateSlug } from "@/lib/storyPanelImageGeneration";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

// 12 MB — covers DALL-E 3 1024×1024 PNG output with headroom
const MAX_BASE64_BYTES = 12 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadResult =
  | {
      ok: true;
      status: "uploaded";
      asset: {
        url: string;
        pathname: string;
        storageProvider: "vercel-blob";
        mimeType: string;
        sceneNumber: number;
        alt: string;
        referenceCharacters: string[];
        uploadedAt: string;
      };
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "not_approved"
        | "invalid_image_payload"
        | "image_too_large"
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

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

/**
 * Accepts either a raw base64 string or a data URL (data:image/...;base64,...).
 * Returns both the stripped base64 and the detected MIME type (if found in prefix).
 */
function parseImageBase64(raw: string): { base64: string; detectedMime: string | null } {
  const dataUrlMatch = raw.match(/^data:(image\/[a-z]+);base64,([\s\S]+)$/);
  if (dataUrlMatch) {
    return { base64: dataUrlMatch[2], detectedMime: dataUrlMatch[1] };
  }
  return { base64: raw, detectedMime: null };
}

function buildStoragePath(
  episodeSlug: string,
  sceneNumber: number,
  mimeType: AllowedMime
): string {
  const ext = MIME_EXTENSIONS[mimeType];
  return `episodes/${episodeSlug}/story-panels/scene-${sceneNumber}-${Date.now()}.${ext}`;
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
  if (!validateSlug(body.episodeSlug)) {
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
  const episodeSlug = body.episodeSlug as string;

  // ── Validate sceneNumber ──────────────────────────────────────────────────────
  if (
    typeof body.sceneNumber !== "number" ||
    body.sceneNumber < 1 ||
    !Number.isFinite(body.sceneNumber)
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "sceneNumber must be a positive number.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const sceneNumber = body.sceneNumber as number;

  // ── Validate imageBase64 ──────────────────────────────────────────────────────
  if (typeof body.imageBase64 !== "string" || body.imageBase64.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "invalid_image_payload",
        message: "imageBase64 is required and must be a non-empty string.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  const rawBase64Input = body.imageBase64.trim();

  if (Buffer.byteLength(rawBase64Input, "utf8") > MAX_BASE64_BYTES) {
    return Response.json(
      {
        ok: false,
        status: "image_too_large",
        message: "The generated image is too large to upload in this request. Maximum base64 payload size is 12 MB.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  const { base64: base64Data, detectedMime } = parseImageBase64(rawBase64Input);

  // ── Resolve MIME type (from data URL prefix or request body) ─────────────────
  const resolvedMime = detectedMime ?? body.mimeType;

  if (!isAllowedMime(resolvedMime)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "mimeType must be one of: image/png, image/jpeg, image/webp.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const mimeType: AllowedMime = resolvedMime;

  // ── Validate alt text ─────────────────────────────────────────────────────────
  if (typeof body.alt !== "string" || body.alt.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "alt is required and must be a non-empty string.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const alt = body.alt.trim();

  // ── Require character fidelity approval ──────────────────────────────────────
  const review = isRecord(body.review) ? body.review : null;
  if (!review || review.characterFidelityApproved !== true) {
    return Response.json(
      {
        ok: false,
        status: "not_approved",
        message: "Character fidelity must be approved before uploading a story panel image.",
      } satisfies UploadResult,
      { status: 422 }
    );
  }

  // ── referenceCharacters (optional) ───────────────────────────────────────────
  const referenceCharacters: string[] = Array.isArray(body.referenceCharacters)
    ? (body.referenceCharacters as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  // ── Decode base64 → Buffer ────────────────────────────────────────────────────
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, "base64");
  } catch {
    return Response.json(
      {
        ok: false,
        status: "invalid_image_payload",
        message: "The uploaded draft image could not be read. Regenerate the temporary draft and try again.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (imageBuffer.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "invalid_image_payload",
        message: "The uploaded draft image could not be read. Regenerate the temporary draft and try again.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Upload to Vercel Blob ─────────────────────────────────────────────────────
  const storagePath = buildStoragePath(episodeSlug, sceneNumber, mimeType);

  console.info(
    `[upload-story-panel-image] Uploading ${mimeType} (~${Math.round(imageBuffer.length / 1024)}KB) to ${storagePath}`
  );

  try {
    const blob = await put(storagePath, imageBuffer, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });

    const uploadedAt = new Date().toISOString();

    return Response.json(
      {
        ok: true,
        status: "uploaded",
        asset: {
          url: blob.url,
          pathname: blob.pathname,
          storageProvider: "vercel-blob",
          mimeType,
          sceneNumber,
          alt,
          referenceCharacters,
          uploadedAt,
        },
        notes: [
          "Image uploaded as a storage asset only.",
          "It is not attached to the episode JSON yet.",
          "It is not published yet.",
        ],
      } satisfies UploadResult,
      { status: 200 }
    );
  } catch (err) {
    // Map specific Blob errors to useful messages
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      console.error("[upload-story-panel-image] Blob access error:", err.message);
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
      console.error("[upload-story-panel-image] Blob store not found:", err.message);
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
      console.error("[upload-story-panel-image] Blob store suspended:", err.message);
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
      console.error("[upload-story-panel-image] Blob file too large:", err.message);
      return Response.json(
        {
          ok: false,
          status: "image_too_large",
          message: "The generated image is too large for Vercel Blob storage. Try regenerating a smaller draft.",
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 413 }
      );
    }

    // Generic BlobError — surface message safely
    if (err instanceof BlobError) {
      console.error("[upload-story-panel-image] Blob error:", err.message);
      return Response.json(
        {
          ok: false,
          status: "blob_upload_failed",
          message: `Vercel Blob upload failed: ${err.message}. Check Blob storage configuration and token permissions.`,
          details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    // Unknown error
    const safeMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[upload-story-panel-image] Unexpected error:", safeMsg);
    return Response.json(
      {
        ok: false,
        status: "blob_upload_failed",
        message: `Vercel Blob upload failed. Check Blob storage configuration and token permissions.`,
        details: { storageProvider: "vercel-blob", mimeType, targetPath: storagePath },
      } satisfies UploadResult,
      { status: 502 }
    );
  }
}
