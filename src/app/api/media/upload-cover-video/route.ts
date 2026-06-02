// POST /api/media/upload-cover-video
// Uploads a cover page teaser video to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin session cookie.
// Upload only — attach video to settings via save-cover-page-settings.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";
import type { CoverPageVideo } from "@/lib/coverPageTypes";

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
] as const;
type AllowedVideoMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedVideoMime, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};

type UploadResult =
  | { ok: true; status: "uploaded"; video: CoverPageVideo }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "missing_file"
        | "invalid_video_type"
        | "upload_failed";
      message: string;
    };

function isAllowedMime(v: unknown): v is AllowedVideoMime {
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

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: Request): Promise<Response> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "BLOB_READ_WRITE_TOKEN is not configured.",
      } satisfies UploadResult,
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request must be multipart/form-data.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  const fileRaw = formData.get("file");
  if (!(fileRaw instanceof File) || fileRaw.size === 0) {
    return Response.json(
      {
        ok: false,
        status: "missing_file",
        message: "file is required and must not be empty.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const file = fileRaw;

  const mimeType = file.type.toLowerCase();
  if (!isAllowedMime(mimeType)) {
    return Response.json(
      {
        ok: false,
        status: "invalid_video_type",
        message:
          "Video type must be one of: video/mp4, video/webm, video/quicktime, video/x-m4v.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  const titleRaw = formData.get("title");
  const title =
    typeof titleRaw === "string" && titleRaw.trim()
      ? titleRaw.trim()
      : file.name.replace(/\.[^.]+$/, "");

  const originalFilename = file.name;
  const ext = MIME_EXTENSIONS[mimeType as AllowedVideoMime];
  const safeName = safeFilename(originalFilename.replace(/\.[^.]+$/, ""));
  const storagePath = `cover-page/videos/${Date.now()}-${safeName}.${ext}`;

  try {
    const blob = await put(storagePath, file, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });

    const now = new Date().toISOString();
    const video: CoverPageVideo = {
      id: generateId(),
      title,
      videoUrl: blob.url,
      pathname: blob.pathname,
      originalFilename,
      mimeType,
      sizeBytes: file.size,
      isActive: true,
      sortOrder: 0,
      uploadedAt: now,
      updatedAt: now,
    };

    return Response.json(
      { ok: true, status: "uploaded", video } satisfies UploadResult,
      { status: 200 }
    );
  } catch (err) {
    if (
      err instanceof BlobAccessError ||
      err instanceof BlobClientTokenExpiredError
    ) {
      return Response.json(
        {
          ok: false,
          status: "upload_failed",
          message:
            "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN.",
        } satisfies UploadResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobStoreNotFoundError) {
      return Response.json(
        {
          ok: false,
          status: "upload_failed",
          message: "Vercel Blob store not found.",
        } satisfies UploadResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobStoreSuspendedError) {
      return Response.json(
        {
          ok: false,
          status: "upload_failed",
          message: "Vercel Blob store is suspended.",
        } satisfies UploadResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobFileTooLargeError) {
      return Response.json(
        {
          ok: false,
          status: "upload_failed",
          message: "Video file too large for Vercel Blob.",
        } satisfies UploadResult,
        { status: 413 }
      );
    }
    if (err instanceof BlobError) {
      return Response.json(
        {
          ok: false,
          status: "upload_failed",
          message: `Blob upload failed: ${err.message}`,
        } satisfies UploadResult,
        { status: 502 }
      );
    }
    return Response.json(
      {
        ok: false,
        status: "upload_failed",
        message: "Unexpected error during upload.",
      } satisfies UploadResult,
      { status: 502 }
    );
  }
}
