// POST /api/storybook-audio/generate-full-book
// Generates audio for all (or missing) blocks across all pages of a storybook,
// processing pages sequentially and blocks within each page sequentially.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does NOT attach audio to the public storybook reader.
//          Does NOT update GitHub — the caller must call save-storybook-audio-script separately.
//          Does NOT touch storybookNarration.
//          API key is never exposed in responses or logs.
// Phase:   Audio 4 — full storybook draft generation.

export const maxDuration = 300;

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

const UNSAFE_CONTENT = /<[^>]+>|javascript:/i;

function isSafeText(text: string): boolean {
  return !UNSAFE_CONTENT.test(text);
}

// Extract a safe provider message from an ElevenLabs error response body.
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

type RequestBlock = {
  blockId: string;
  text: string;
  speakerSlug: string;
  speakerName: string;
  voiceId?: string;
  audioUrl?: string;
  regenerate?: boolean;
};

type RequestPage = {
  pageId: string;
  blocks: RequestBlock[];
};

type GeneratedBlockResult = {
  pageId: string;
  blockId: string;
  audioUrl: string | null;
  pathname: string | null;
  mimeType: "audio/mpeg" | null;
  sizeBytes: number | null;
  generatedAt: string | null;
  provider: "elevenlabs" | "existing" | null;
  modelId: string | null;
  error: string | null;
};

type FullBookAudioPreview = {
  generatedAt: string;
  generationProvider: "storybook-full-sequence";
  status: "draft";
  pageIds: string[];
  blockIds: string[];
  missingAudioBlockIds: string[];
  totalBlocks: number;
  totalPages: number;
};

type GenerateFullBookResult =
  | {
      ok: true;
      generatedBlocks: GeneratedBlockResult[];
      fullBookAudioPreview: FullBookAudioPreview;
    }
  | {
      ok: false;
      message: string;
      generatedBlocks?: GeneratedBlockResult[];
    };

// ─── Single block generation ──────────────────────────────────────────────────

async function generateSingleBlock(
  apiKey: string,
  blobToken: string,
  modelId: string,
  slug: string,
  pageId: string,
  block: RequestBlock,
  mode: "missing-only" | "regenerate-all"
): Promise<GeneratedBlockResult> {
  const { blockId, text, speakerSlug, speakerName, voiceId, audioUrl, regenerate } = block;

  // In missing-only mode, skip blocks that already have audio (unless explicitly flagged to regenerate)
  if (mode === "missing-only" && audioUrl && regenerate !== true) {
    return {
      pageId,
      blockId,
      audioUrl,
      pathname: null,
      mimeType: "audio/mpeg",
      sizeBytes: null,
      generatedAt: null,
      provider: "existing",
      modelId: null,
      error: null,
    };
  }

  // Validate text
  if (!text || text.trim().length === 0) {
    return {
      pageId,
      blockId,
      audioUrl: audioUrl ?? null,
      pathname: null,
      mimeType: null,
      sizeBytes: null,
      generatedAt: null,
      provider: null,
      modelId: null,
      error: "Block text is empty — cannot generate audio.",
    };
  }

  const trimmedText = text.trim();
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return {
      pageId,
      blockId,
      audioUrl: audioUrl ?? null,
      pathname: null,
      mimeType: null,
      sizeBytes: null,
      generatedAt: null,
      provider: null,
      modelId: null,
      error: `Block text exceeds maximum length of ${MAX_TEXT_LENGTH} characters.`,
    };
  }

  if (!isSafeText(trimmedText)) {
    return {
      pageId,
      blockId,
      audioUrl: audioUrl ?? null,
      pathname: null,
      mimeType: null,
      sizeBytes: null,
      generatedAt: null,
      provider: null,
      modelId: null,
      error: "Block text contains disallowed content.",
    };
  }

  // Validate voiceId
  if (!voiceId || voiceId.trim().length === 0) {
    return {
      pageId,
      blockId,
      audioUrl: audioUrl ?? null,
      pathname: null,
      mimeType: null,
      sizeBytes: null,
      generatedAt: null,
      provider: null,
      modelId: null,
      error: `No voice ID for speaker "${speakerName}" (${speakerSlug}). Add a voice ID in the Speakers tab.`,
    };
  }

  const trimmedVoiceId = voiceId.trim();

  // Call ElevenLabs TTS
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  let audioBuffer: ArrayBuffer;
  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(trimmedVoiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: trimmedText,
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
        `[storybook-audio/generate-full-book] ElevenLabs error for block ${blockId} (${elevenRes.status}):`,
        errText.slice(0, 300)
      );
      const providerMessage = extractProviderMessage(elevenRes.status, errText);
      return {
        pageId,
        blockId,
        audioUrl: null,
        pathname: null,
        mimeType: null,
        sizeBytes: null,
        generatedAt: null,
        provider: null,
        modelId: null,
        error: providerMessage,
      };
    }

    audioBuffer = await elevenRes.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return {
        pageId,
        blockId,
        audioUrl: null,
        pathname: null,
        mimeType: null,
        sizeBytes: null,
        generatedAt: null,
        provider: null,
        modelId: null,
        error: "ElevenLabs returned an empty audio response. Try regenerating.",
      };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        pageId,
        blockId,
        audioUrl: null,
        pathname: null,
        mimeType: null,
        sizeBytes: null,
        generatedAt: null,
        provider: null,
        modelId: null,
        error: "Audio generation timed out. Try a shorter text or try again.",
      };
    }
    console.error(
      `[storybook-audio/generate-full-book] Network error for block ${blockId}:`,
      err instanceof Error ? err.message : err
    );
    return {
      pageId,
      blockId,
      audioUrl: null,
      pathname: null,
      mimeType: null,
      sizeBytes: null,
      generatedAt: null,
      provider: null,
      modelId: null,
      error: "Failed to reach ElevenLabs. Check your network and API key.",
    };
  }

  // Upload to Vercel Blob
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
      `[storybook-audio/generate-full-book] Generated audio for block ${blockId} ` +
        `(speaker: ${speakerName}, slug: ${slug}, model: ${modelId}, bytes: ${mp3Buffer.length})`
    );

    return {
      pageId,
      blockId,
      audioUrl: blob.url,
      pathname: blob.pathname,
      mimeType: "audio/mpeg",
      sizeBytes: mp3Buffer.length,
      generatedAt,
      provider: "elevenlabs",
      modelId,
      error: null,
    };
  } catch (err) {
    let blobErrorMessage = "Unexpected error during audio upload.";
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      blobErrorMessage = "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN.";
    } else if (err instanceof BlobStoreNotFoundError) {
      blobErrorMessage = "Vercel Blob store not found.";
    } else if (err instanceof BlobStoreSuspendedError) {
      blobErrorMessage = "Vercel Blob store is suspended.";
    } else if (err instanceof BlobFileTooLargeError) {
      blobErrorMessage = "Audio file too large for Vercel Blob.";
    } else if (err instanceof BlobError) {
      blobErrorMessage = `Blob upload failed: ${err.message}`;
    } else {
      console.error(`[storybook-audio/generate-full-book] Unexpected blob error for block ${blockId}:`, err);
    }
    return {
      pageId,
      blockId,
      audioUrl: null,
      pathname: null,
      mimeType: null,
      sizeBytes: null,
      generatedAt: null,
      provider: null,
      modelId: null,
      error: blobErrorMessage,
    };
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "Request body must be valid JSON." } satisfies GenerateFullBookResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, message: "Request body must be a JSON object." } satisfies GenerateFullBookResult,
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
      } satisfies GenerateFullBookResult,
      { status: 503 }
    );
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      { ok: false, message: "BLOB_READ_WRITE_TOKEN is not configured." } satisfies GenerateFullBookResult,
      { status: 503 }
    );
  }

  // ── Validate fields ───────────────────────────────────────────────────────
  if (!validateSlug(body.slug)) {
    return Response.json(
      { ok: false, message: "slug is required and must be a safe lowercase slug." } satisfies GenerateFullBookResult,
      { status: 400 }
    );
  }
  const slug = body.slug as string;

  const rawMode = body.mode;
  const mode: "missing-only" | "regenerate-all" =
    rawMode === "regenerate-all" ? "regenerate-all" : "missing-only";

  if (!Array.isArray(body.pages) || body.pages.length === 0) {
    return Response.json(
      { ok: false, message: "pages is required and must be a non-empty array." } satisfies GenerateFullBookResult,
      { status: 400 }
    );
  }

  // Parse pages and blocks
  const requestPages: RequestPage[] = [];
  for (const rawPage of body.pages) {
    if (!isRecord(rawPage)) continue;
    const pageId = typeof rawPage.pageId === "string" ? rawPage.pageId.trim() : "";
    if (!pageId) continue;
    const rawBlocks = Array.isArray(rawPage.blocks) ? rawPage.blocks : [];
    const blocks: RequestBlock[] = [];
    for (const rawBlock of rawBlocks) {
      if (!isRecord(rawBlock)) continue;
      const blockId = typeof rawBlock.blockId === "string" ? rawBlock.blockId.trim() : "";
      if (!blockId) continue;
      blocks.push({
        blockId,
        text: typeof rawBlock.text === "string" ? rawBlock.text : "",
        speakerSlug: typeof rawBlock.speakerSlug === "string" ? rawBlock.speakerSlug : "unknown",
        speakerName: typeof rawBlock.speakerName === "string" ? rawBlock.speakerName : "Unknown",
        voiceId: typeof rawBlock.voiceId === "string" ? rawBlock.voiceId.trim() || undefined : undefined,
        audioUrl: typeof rawBlock.audioUrl === "string" ? rawBlock.audioUrl.trim() || undefined : undefined,
        regenerate: rawBlock.regenerate === true,
      });
    }
    if (blocks.length > 0) {
      requestPages.push({ pageId, blocks });
    }
  }

  if (requestPages.length === 0) {
    return Response.json(
      { ok: false, message: "No valid pages with blocks provided." } satisfies GenerateFullBookResult,
      { status: 400 }
    );
  }

  // ── Determine model ───────────────────────────────────────────────────────
  const modelId = process.env.ELEVENLABS_MODEL_ID?.trim() || ELEVENLABS_DEFAULT_MODEL;

  // ── Process pages sequentially, blocks within each page sequentially ──────
  const generatedBlocks: GeneratedBlockResult[] = [];

  for (const page of requestPages) {
    for (const block of page.blocks) {
      const result = await generateSingleBlock(
        apiKey,
        blobToken,
        modelId,
        slug,
        page.pageId,
        block,
        mode
      );
      generatedBlocks.push(result);
    }
  }

  // ── Build summary ─────────────────────────────────────────────────────────
  const allFailed = generatedBlocks.every(
    (b) => b.error !== null && b.provider !== "existing"
  );

  if (allFailed) {
    const firstError = generatedBlocks[0]?.error ?? "All blocks failed to generate.";
    return Response.json(
      {
        ok: false,
        message: `All blocks failed to generate. First error: ${firstError}`,
        generatedBlocks,
      } satisfies GenerateFullBookResult,
      { status: 502 }
    );
  }

  // Collect all page IDs and block IDs that were successfully processed
  const pageIdSet = new Set<string>();
  const blockIds: string[] = [];
  const missingAudioBlockIds: string[] = [];

  for (const result of generatedBlocks) {
    pageIdSet.add(result.pageId);
    blockIds.push(result.blockId);
    if (!result.audioUrl) {
      missingAudioBlockIds.push(result.blockId);
    }
  }

  const successCount = generatedBlocks.filter((b) => b.audioUrl !== null).length;
  console.info(
    `[storybook-audio/generate-full-book] ${slug}: ` +
      `${successCount}/${generatedBlocks.length} blocks succeeded across ${pageIdSet.size} pages.`
  );

  const fullBookAudioPreview: FullBookAudioPreview = {
    generatedAt: new Date().toISOString(),
    generationProvider: "storybook-full-sequence",
    status: "draft",
    pageIds: Array.from(pageIdSet),
    blockIds,
    missingAudioBlockIds,
    totalBlocks: generatedBlocks.length,
    totalPages: pageIdSet.size,
  };

  return Response.json(
    {
      ok: true,
      generatedBlocks,
      fullBookAudioPreview,
    } satisfies GenerateFullBookResult,
    { status: 200 }
  );
}
