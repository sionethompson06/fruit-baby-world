// POST /api/storybook-audio/generate-block
// Generates a single script block audio draft using ElevenLabs TTS and uploads
// the result to Vercel Blob.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does NOT attach audio to the public storybook reader.
//          Does NOT update GitHub — the caller must call save-storybook-audio-script separately.
//          API key is never exposed in responses or logs.
// Phase:   Audio 2 — per-block draft generation.

export const maxDuration = 60;

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";

// ─── Constants ────────────────────────────────────────────────────────────────

const ELEVENLABS_DEFAULT_MODEL = "eleven_multilingual_v2";
const ELEVENLABS_TIMEOUT_MS = 60_000;
const MAX_TEXT_LENGTH = 5000;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;

function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

function validateId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 200 && SAFE_ID.test(id);
}

const UNSAFE_CONTENT = /<[^>]+>|javascript:/i;

function isSafeText(text: string): boolean {
  return !UNSAFE_CONTENT.test(text);
}

// Extract a safe provider message from an ElevenLabs error response body.
// Never returns secrets, headers, or stack traces.
function extractProviderMessage(httpStatus: number, rawText: string): string {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (isRecord(parsed)) {
      if (typeof parsed.detail === "string" && parsed.detail.length > 0) {
        return parsed.detail.slice(0, 300);
      }
      if (isRecord(parsed.detail)) {
        if (typeof parsed.detail.message === "string" && parsed.detail.message.length > 0) {
          return parsed.detail.message.slice(0, 300);
        }
        if (typeof parsed.detail.status === "string" && parsed.detail.status.length > 0) {
          return parsed.detail.status.slice(0, 300);
        }
      }
      if (typeof parsed.message === "string" && parsed.message.length > 0) {
        return parsed.message.slice(0, 300);
      }
      if (typeof parsed.error === "string" && parsed.error.length > 0) {
        return parsed.error.slice(0, 300);
      }
    }
  } catch {
    // Not JSON — fall through to status-based messages
  }

  if (httpStatus === 401) return "Invalid or missing API key.";
  if (httpStatus === 403) return "Access denied — check your ElevenLabs plan, quota, or permissions.";
  if (httpStatus === 404) return "Voice not found — check that the Voice ID exists in your ElevenLabs account.";
  if (httpStatus === 422) return "Invalid request — check the model ID, voice settings, or text content.";
  if (httpStatus === 429) return "Rate limit or quota exceeded — wait and try again.";
  if (httpStatus >= 500) return "ElevenLabs service error.";
  return `Provider returned status ${httpStatus}.`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateBlockResult =
  | {
      ok: true;
      audioUrl: string;
      pathname: string;
      mimeType: "audio/mpeg";
      sizeBytes: number;
      generatedAt: string;
      provider: "elevenlabs";
      modelId: string;
    }
  | {
      ok: false;
      message: string;
      providerStatus?: number;
      providerMessage?: string;
    };

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "Request body must be valid JSON." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, message: "Request body must be a JSON object." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }

  // ── Validate config ───────────────────────────────────────────────────────
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message:
          "ElevenLabs is not configured. Add ELEVENLABS_API_KEY in Vercel environment variables.",
      } satisfies GenerateBlockResult,
      { status: 503 }
    );
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      { ok: false, message: "BLOB_READ_WRITE_TOKEN is not configured." } satisfies GenerateBlockResult,
      { status: 503 }
    );
  }

  // ── Validate fields ───────────────────────────────────────────────────────
  if (!validateSlug(body.slug)) {
    return Response.json(
      { ok: false, message: "slug is required and must be a safe lowercase slug." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }
  const slug = body.slug as string;

  if (!validateId(body.pageId)) {
    return Response.json(
      { ok: false, message: "pageId is required." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }
  const pageId = body.pageId as string;

  if (!validateId(body.blockId)) {
    return Response.json(
      { ok: false, message: "blockId is required." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }
  const blockId = body.blockId as string;

  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return Response.json(
      { ok: false, message: "text is required and must be non-empty." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }
  const text = body.text.trim();

  if (text.length > MAX_TEXT_LENGTH) {
    return Response.json(
      { ok: false, message: `text must be at most ${MAX_TEXT_LENGTH} characters.` } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }

  if (!isSafeText(text)) {
    return Response.json(
      { ok: false, message: "text contains disallowed content." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }

  if (typeof body.voiceId !== "string" || body.voiceId.trim().length === 0) {
    return Response.json(
      { ok: false, message: "voiceId is required. Add a voice ID to this speaker before generating audio." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }
  const voiceId = body.voiceId.trim();

  if (!isSafeText(voiceId)) {
    return Response.json(
      { ok: false, message: "voiceId contains disallowed content." } satisfies GenerateBlockResult,
      { status: 400 }
    );
  }

  // speakerSlug and speakerName are informational — validate lightly
  const speakerSlug = typeof body.speakerSlug === "string" ? body.speakerSlug.trim().slice(0, 100) : "unknown";
  const speakerName = typeof body.speakerName === "string" ? body.speakerName.trim().slice(0, 100) : speakerSlug;

  // ── Determine model ───────────────────────────────────────────────────────
  const modelId = (process.env.ELEVENLABS_MODEL_ID?.trim()) || ELEVENLABS_DEFAULT_MODEL;

  // ── Call ElevenLabs TTS ───────────────────────────────────────────────────
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  let audioBuffer: ArrayBuffer;
  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          output_format: "mp3_44100_128",
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => "");
      console.error(
        `[storybook-audio/generate-block] ElevenLabs error (${elevenRes.status}):`,
        errText.slice(0, 300)
      );
      const providerMessage = extractProviderMessage(elevenRes.status, errText);
      return Response.json(
        {
          ok: false,
          message: "ElevenLabs could not generate audio for this block.",
          providerStatus: elevenRes.status,
          providerMessage,
        } satisfies GenerateBlockResult,
        { status: 502 }
      );
    }

    audioBuffer = await elevenRes.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return Response.json(
        {
          ok: false,
          message: "ElevenLabs returned an empty audio response. Try regenerating.",
        } satisfies GenerateBlockResult,
        { status: 502 }
      );
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return Response.json(
        {
          ok: false,
          message: "Audio generation timed out. Try a shorter text or try again.",
        } satisfies GenerateBlockResult,
        { status: 504 }
      );
    }
    console.error(
      "[storybook-audio/generate-block] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        message: "Failed to reach ElevenLabs. Check your network and API key.",
      } satisfies GenerateBlockResult,
      { status: 502 }
    );
  }

  // ── Upload to Vercel Blob ─────────────────────────────────────────────────
  const timestamp = Date.now();
  const storagePath = `storybooks/audio-drafts/${slug}/${pageId}/${blockId}-${timestamp}.mp3`;
  const mp3Buffer = Buffer.from(audioBuffer);

  try {
    const blob = await put(storagePath, mp3Buffer, {
      access: "public",
      contentType: "audio/mpeg",
      token: blobToken,
    });

    const generatedAt = new Date().toISOString();

    console.info(
      `[storybook-audio/generate-block] Generated audio for block ${blockId} ` +
        `(speaker: ${speakerName}, slug: ${slug}, model: ${modelId}, bytes: ${mp3Buffer.length})`
    );

    return Response.json(
      {
        ok: true,
        audioUrl: blob.url,
        pathname: blob.pathname,
        mimeType: "audio/mpeg",
        sizeBytes: mp3Buffer.length,
        generatedAt,
        provider: "elevenlabs",
        modelId,
      } satisfies GenerateBlockResult,
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      return Response.json(
        { ok: false, message: "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN." } satisfies GenerateBlockResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobStoreNotFoundError) {
      return Response.json(
        { ok: false, message: "Vercel Blob store not found." } satisfies GenerateBlockResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobStoreSuspendedError) {
      return Response.json(
        { ok: false, message: "Vercel Blob store is suspended." } satisfies GenerateBlockResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobFileTooLargeError) {
      return Response.json(
        { ok: false, message: "Audio file too large for Vercel Blob." } satisfies GenerateBlockResult,
        { status: 413 }
      );
    }
    if (err instanceof BlobError) {
      return Response.json(
        { ok: false, message: `Blob upload failed: ${err.message}` } satisfies GenerateBlockResult,
        { status: 502 }
      );
    }
    console.error("[storybook-audio/generate-block] Unexpected blob error:", err);
    return Response.json(
      { ok: false, message: "Unexpected error during audio upload." } satisfies GenerateBlockResult,
      { status: 502 }
    );
  }
}
