// POST /api/media/upload-storybook-audio
// Uploads an admin-provided narration audio file to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin cookie.
// Does not attach audio to episode JSON — keep upload and save separate.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
] as const;
type AllowedAudioMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedAudioMime, string> = {
  "audio/mpeg":  "mp3",
  "audio/mp3":   "mp3",
  "audio/wav":   "wav",
  "audio/x-wav": "wav",
  "audio/mp4":   "m4a",
  "audio/aac":   "aac",
  "audio/x-m4a": "m4a",
};

const MAX_BASE64_BYTES = 60 * 1024 * 1024; // 60 MB base64 limit (~45 MB decoded)

type UploadResult =
  | {
      ok: true;
      status: "uploaded";
      asset: {
        audioUrl: string;
        pathname: string;
        mimeType: string;
        sizeBytes: number;
        uploadedAt: string;
      };
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "missing_file"
        | "invalid_audio_type"
        | "audio_too_large"
        | "audio_upload_failed";
      message: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedMime(v: unknown): v is AllowedAudioMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

function parseAudioBase64(raw: string): { base64: string; detectedMime: string | null } {
  const match = raw.match(/^data:(audio\/[a-z0-9-]+);base64,([\s\S]+)$/);
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

  if (typeof body.audioBase64 !== "string" || body.audioBase64.trim().length === 0) {
    return Response.json({ ok: false, status: "missing_file", message: "audioBase64 is required." } satisfies UploadResult, { status: 400 });
  }
  const rawBase64Input = body.audioBase64.trim();

  if (Buffer.byteLength(rawBase64Input, "utf8") > MAX_BASE64_BYTES) {
    return Response.json({ ok: false, status: "audio_too_large", message: "Audio payload exceeds 60 MB limit." } satisfies UploadResult, { status: 400 });
  }

  const { base64: base64Data, detectedMime } = parseAudioBase64(rawBase64Input);
  const resolvedMime = detectedMime ?? body.mimeType;

  if (!isAllowedMime(resolvedMime)) {
    return Response.json({ ok: false, status: "invalid_audio_type", message: "mimeType must be one of: audio/mpeg, audio/mp3, audio/wav, audio/x-wav, audio/mp4, audio/aac, audio/x-m4a." } satisfies UploadResult, { status: 400 });
  }
  const mimeType: AllowedAudioMime = resolvedMime;

  let audioBuffer: Buffer;
  try {
    audioBuffer = Buffer.from(base64Data, "base64");
  } catch {
    return Response.json({ ok: false, status: "missing_file", message: "Could not decode audioBase64." } satisfies UploadResult, { status: 400 });
  }

  if (audioBuffer.length === 0) {
    return Response.json({ ok: false, status: "missing_file", message: "Decoded audio file is empty." } satisfies UploadResult, { status: 400 });
  }

  const ext = MIME_EXTENSIONS[mimeType];
  const storagePath = `episodes/${episodeSlug}/storybook-audio/narration-${Date.now()}.${ext}`;

  try {
    const blob = await put(storagePath, audioBuffer, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });

    return Response.json({
      ok: true,
      status: "uploaded",
      asset: {
        audioUrl: blob.url,
        pathname: blob.pathname,
        mimeType,
        sizeBytes: audioBuffer.length,
        uploadedAt: new Date().toISOString(),
      },
    } satisfies UploadResult, { status: 200 });
  } catch (err) {
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      return Response.json({ ok: false, status: "audio_upload_failed", message: "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN." } satisfies UploadResult, { status: 502 });
    }
    if (err instanceof BlobStoreNotFoundError) {
      return Response.json({ ok: false, status: "audio_upload_failed", message: "Vercel Blob store not found." } satisfies UploadResult, { status: 502 });
    }
    if (err instanceof BlobStoreSuspendedError) {
      return Response.json({ ok: false, status: "audio_upload_failed", message: "Vercel Blob store is suspended." } satisfies UploadResult, { status: 502 });
    }
    if (err instanceof BlobFileTooLargeError) {
      return Response.json({ ok: false, status: "audio_too_large", message: "Audio file too large for Vercel Blob." } satisfies UploadResult, { status: 413 });
    }
    if (err instanceof BlobError) {
      return Response.json({ ok: false, status: "audio_upload_failed", message: `Blob upload failed: ${err.message}` } satisfies UploadResult, { status: 502 });
    }
    return Response.json({ ok: false, status: "audio_upload_failed", message: "Unexpected error during upload." } satisfies UploadResult, { status: 502 });
  }
}
