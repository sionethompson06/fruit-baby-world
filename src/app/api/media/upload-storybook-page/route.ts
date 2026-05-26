// POST /api/media/upload-storybook-page
// Uploads an admin-provided storybook page image to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin cookie.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20 MB for high-quality artwork

type UploadResult =
  | {
      ok: true;
      status: "uploaded";
      asset: {
        url: string;
        pathname: string;
        mimeType: string;
        altText: string;
        uploadedAt: string;
      };
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "invalid_image_payload"
        | "image_too_large"
        | "blob_upload_failed";
      message: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

function parseImageBase64(raw: string): { base64: string; detectedMime: string | null } {
  const match = raw.match(/^data:(image\/[a-z]+);base64,([\s\S]+)$/);
  if (match) return { base64: match[2], detectedMime: match[1] };
  return { base64: raw, detectedMime: null };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UploadResult, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UploadResult, { status: 400 });
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json({ ok: false, status: "setup_required", message: "BLOB_READ_WRITE_TOKEN is not configured." } satisfies UploadResult, { status: 503 });
  }

  if (!validateSlug(body.episodeSlug)) {
    return Response.json({ ok: false, status: "validation_error", message: "episodeSlug is required and must be a safe slug." } satisfies UploadResult, { status: 400 });
  }
  const episodeSlug = body.episodeSlug as string;

  if (typeof body.imageBase64 !== "string" || body.imageBase64.trim().length === 0) {
    return Response.json({ ok: false, status: "invalid_image_payload", message: "imageBase64 is required." } satisfies UploadResult, { status: 400 });
  }
  const rawBase64Input = body.imageBase64.trim();

  if (Buffer.byteLength(rawBase64Input, "utf8") > MAX_BASE64_BYTES) {
    return Response.json({ ok: false, status: "image_too_large", message: "Image payload exceeds 20 MB limit." } satisfies UploadResult, { status: 400 });
  }

  const { base64: base64Data, detectedMime } = parseImageBase64(rawBase64Input);
  const resolvedMime = detectedMime ?? body.mimeType;

  if (!isAllowedMime(resolvedMime)) {
    return Response.json({ ok: false, status: "validation_error", message: "mimeType must be image/png, image/jpeg, or image/webp." } satisfies UploadResult, { status: 400 });
  }
  const mimeType: AllowedMime = resolvedMime;

  if (typeof body.altText !== "string" || body.altText.trim().length === 0) {
    return Response.json({ ok: false, status: "validation_error", message: "altText is required." } satisfies UploadResult, { status: 400 });
  }
  const altText = body.altText.trim();

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, "base64");
  } catch {
    return Response.json({ ok: false, status: "invalid_image_payload", message: "Could not decode imageBase64." } satisfies UploadResult, { status: 400 });
  }

  if (imageBuffer.length === 0) {
    return Response.json({ ok: false, status: "invalid_image_payload", message: "Decoded image is empty." } satisfies UploadResult, { status: 400 });
  }

  const ext = MIME_EXTENSIONS[mimeType];
  const storagePath = `episodes/${episodeSlug}/storybook-pages/page-${Date.now()}.${ext}`;

  try {
    const blob = await put(storagePath, imageBuffer, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });

    return Response.json({
      ok: true,
      status: "uploaded",
      asset: {
        url: blob.url,
        pathname: blob.pathname,
        mimeType,
        altText,
        uploadedAt: new Date().toISOString(),
      },
    } satisfies UploadResult, { status: 200 });
  } catch (err) {
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      return Response.json({ ok: false, status: "blob_upload_failed", message: "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN." } satisfies UploadResult, { status: 502 });
    }
    if (err instanceof BlobStoreNotFoundError) {
      return Response.json({ ok: false, status: "blob_upload_failed", message: "Vercel Blob store not found." } satisfies UploadResult, { status: 502 });
    }
    if (err instanceof BlobStoreSuspendedError) {
      return Response.json({ ok: false, status: "blob_upload_failed", message: "Vercel Blob store is suspended." } satisfies UploadResult, { status: 502 });
    }
    if (err instanceof BlobFileTooLargeError) {
      return Response.json({ ok: false, status: "image_too_large", message: "Image too large for Vercel Blob." } satisfies UploadResult, { status: 413 });
    }
    if (err instanceof BlobError) {
      return Response.json({ ok: false, status: "blob_upload_failed", message: `Blob upload failed: ${err.message}` } satisfies UploadResult, { status: 502 });
    }
    return Response.json({ ok: false, status: "blob_upload_failed", message: "Unexpected error during upload." } satisfies UploadResult, { status: 502 });
  }
}
