// POST /api/media/upload-animated-story-card-image
// Uploads a public card/thumbnail image for an animated story to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin session cookie.
//
// Form fields:
//   file       — image file (required)
//   storySlug  — animated story slug (required)

import { put } from "@vercel/blob";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;
type AllowedImageMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedImageMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function isAllowedMime(v: unknown): v is AllowedImageMime {
  return (
    typeof v === "string" &&
    (ALLOWED_MIME_TYPES as readonly string[]).includes(v)
  );
}

function safeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

type UploadResult =
  | {
      ok: true;
      imageUrl: string;
      pathname: string;
      originalFilename: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }
  | { ok: false; status: string; message: string };

export async function POST(request: Request): Promise<Response> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      { ok: false, status: "setup_required", message: "BLOB_READ_WRITE_TOKEN is not configured." } satisfies UploadResult,
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request must be multipart/form-data." } satisfies UploadResult,
      { status: 400 }
    );
  }

  const fileRaw = formData.get("file");
  if (!(fileRaw instanceof File) || fileRaw.size === 0) {
    return Response.json(
      { ok: false, status: "missing_file", message: "file is required and must not be empty." } satisfies UploadResult,
      { status: 400 }
    );
  }
  const file = fileRaw;

  const mimeType = file.type.toLowerCase();
  if (!isAllowedMime(mimeType)) {
    return Response.json(
      {
        ok: false,
        status: "invalid_image_type",
        message: "Image must be one of: image/png, image/jpeg, image/webp.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  const storySlug = formData.get("storySlug");
  if (!validateSlug(storySlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "storySlug is required and must be a safe slug." } satisfies UploadResult,
      { status: 400 }
    );
  }

  const ext = MIME_EXTENSIONS[mimeType as AllowedImageMime];
  const safeName = safeFilename(file.name.replace(/\.[^.]+$/, ""));
  const storagePath = `animated-stories/${storySlug}/card-images/${Date.now()}-${safeName}.${ext}`;

  try {
    const blob = await put(storagePath, file, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
      addRandomSuffix: false,
    });

    return Response.json({
      ok: true,
      imageUrl: blob.url,
      pathname: blob.pathname,
      originalFilename: file.name,
      mimeType,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
    } satisfies UploadResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    const isQuota =
      message.toLowerCase().includes("quota") ||
      message.toLowerCase().includes("1gb") ||
      message.toLowerCase().includes("hobby plan");
    return Response.json(
      {
        ok: false,
        status: "upload_failed",
        message: isQuota
          ? "Storage quota exceeded. Upgrade Vercel plan or delete unused blobs."
          : `Upload failed: ${message}`,
      } satisfies UploadResult,
      { status: 502 }
    );
  }
}
