// POST /api/media/upload-story-panel-image
// Protected route that uploads an approved story panel image draft to Vercel Blob.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Requires characterFidelityApproved === true before uploading.
//          Does not update episode JSON. Does not publish. Does not expose tokens.
// Phase:   6F — foundation only. Not connected to UI yet.

import { put } from "@vercel/blob";
import { validateSlug } from "@/lib/storyPanelImageGeneration";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_BASE64_BYTES = 8 * 1024 * 1024; // 8 MB

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
        | "upload_error";
      message: string;
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

function stripDataUrlPrefix(raw: string): string {
  const match = raw.match(/^data:[a-z/]+;base64,(.+)$/);
  return match ? match[1] : raw;
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
  const episodeSlug = body.episodeSlug;

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
  const sceneNumber = body.sceneNumber;

  // ── Validate imageBase64 ──────────────────────────────────────────────────────
  if (typeof body.imageBase64 !== "string" || body.imageBase64.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "imageBase64 is required and must be a non-empty string.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (Buffer.byteLength(body.imageBase64, "utf8") > MAX_BASE64_BYTES) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Image data is too large. Maximum base64 payload size is 8MB.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  const base64Data = stripDataUrlPrefix(body.imageBase64.trim());

  // ── Validate mimeType ─────────────────────────────────────────────────────────
  if (!isAllowedMime(body.mimeType)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "mimeType must be one of: image/png, image/jpeg, image/webp.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const mimeType = body.mimeType;

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
        message:
          "Character fidelity must be approved before uploading a story panel image.",
      } satisfies UploadResult,
      { status: 422 }
    );
  }

  // ── referenceCharacters (optional) ───────────────────────────────────────────
  const referenceCharacters: string[] = Array.isArray(body.referenceCharacters)
    ? (body.referenceCharacters as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];

  // ── Decode base64 → Buffer ────────────────────────────────────────────────────
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, "base64");
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "imageBase64 could not be decoded. Ensure it is valid base64.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (imageBuffer.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Decoded image data is empty.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Upload to Vercel Blob ─────────────────────────────────────────────────────
  const storagePath = buildStoragePath(episodeSlug, sceneNumber, mimeType);

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
    const msg = err instanceof Error ? err.message : "Upload failed.";
    console.error("[upload-story-panel-image] Vercel Blob error:", msg);
    return Response.json(
      {
        ok: false,
        status: "upload_error",
        message: "Media upload failed. See server logs for details.",
      } satisfies UploadResult,
      { status: 502 }
    );
  }
}
