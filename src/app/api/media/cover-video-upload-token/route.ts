// GET /api/media/cover-video-upload-token
// Generates a short-lived Vercel Blob client token so the browser can upload
// a cover video directly to Vercel Blob — bypassing serverless function body limits.
// Auth: Protected by proxy.ts — requires valid admin session cookie.

import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";

export const runtime = "nodejs";

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

type TokenResult =
  | { ok: true; token: string; pathname: string }
  | { ok: false; status: string; message: string };

export async function GET(request: Request): Promise<Response> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "BLOB_READ_WRITE_TOKEN is not configured.",
      } satisfies TokenResult,
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const filename = url.searchParams.get("filename") ?? "";
  const contentType = url.searchParams.get("contentType") ?? "";

  if (!filename) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "filename is required.",
      } satisfies TokenResult,
      { status: 400 }
    );
  }

  if (!isAllowedMime(contentType)) {
    return Response.json(
      {
        ok: false,
        status: "invalid_video_type",
        message:
          "contentType must be one of: video/mp4, video/webm, video/quicktime, video/x-m4v.",
      } satisfies TokenResult,
      { status: 400 }
    );
  }

  const ext = MIME_EXTENSIONS[contentType as AllowedVideoMime];
  const safeName = safeFilename(filename.replace(/\.[^.]+$/, ""));
  const pathname = `cover-page/videos/${Date.now()}-${safeName}.${ext}`;

  try {
    const clientToken = await generateClientTokenFromReadWriteToken({
      token: blobToken,
      pathname,
      allowedContentTypes: [contentType],
      maximumSizeInBytes: 200 * 1024 * 1024,
      addRandomSuffix: false,
    });

    return Response.json(
      { ok: true, token: clientToken, pathname } satisfies TokenResult
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Token generation failed.";
    return Response.json(
      { ok: false, status: "token_error", message } satisfies TokenResult,
      { status: 502 }
    );
  }
}
