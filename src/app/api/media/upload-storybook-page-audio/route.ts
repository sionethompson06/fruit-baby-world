// POST /api/media/upload-storybook-page-audio
// Uploads a per-page audio file to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin cookie.
// Accepts: multipart/form-data with fields: file, slug, pageId

import { put } from "@vercel/blob";

const ALLOWED_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/aac",
  "audio/x-m4a",
] as const;

type AllowedAudioMime = (typeof ALLOWED_AUDIO_MIME)[number];

const MIME_EXTENSIONS: Record<AllowedAudioMime, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/x-m4a": "m4a",
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

function isAllowedAudioMime(v: string): v is AllowedAudioMime {
  return (ALLOWED_AUDIO_MIME as readonly string[]).includes(v);
}

function safeName(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "audio";
}

export async function POST(request: Request): Promise<Response> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      { ok: false, message: "BLOB_READ_WRITE_TOKEN is not configured." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { ok: false, message: "Request must be multipart/form-data." },
      { status: 400 }
    );
  }

  const slug = formData.get("slug");
  const pageId = formData.get("pageId");
  const file = formData.get("file");

  if (!validateSlug(slug)) {
    return Response.json(
      { ok: false, message: "slug is required and must be a safe slug." },
      { status: 400 }
    );
  }
  if (typeof pageId !== "string" || !pageId.trim()) {
    return Response.json(
      { ok: false, message: "pageId is required." },
      { status: 400 }
    );
  }
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, message: "file is required." },
      { status: 400 }
    );
  }

  const mime = file.type.toLowerCase();
  if (!isAllowedAudioMime(mime)) {
    return Response.json(
      { ok: false, message: "File must be MP3, WAV, or M4A/AAC." },
      { status: 400 }
    );
  }

  if (file.size > MAX_BYTES) {
    return Response.json(
      { ok: false, message: "File exceeds 50 MB limit." },
      { status: 400 }
    );
  }

  const ext = MIME_EXTENSIONS[mime];
  const safeOriginal = safeName(file.name || `audio.${ext}`);
  const safePageId = pageId.trim().replace(/[^a-z0-9-]/gi, "-").slice(0, 60);
  const storagePath = `storybooks/page-audio/${slug}/${safePageId}/${Date.now()}-${safeOriginal}`;

  try {
    const blob = await put(storagePath, file, {
      access: "public",
      contentType: mime,
      token: blobToken,
    });

    return Response.json(
      {
        ok: true,
        pageId: pageId.trim(),
        audioUrl: blob.url,
        pathname: blob.pathname,
        originalAudioFilename: file.name || undefined,
        mimeType: mime,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { ok: false, message: "Upload to Vercel Blob failed." },
      { status: 502 }
    );
  }
}
