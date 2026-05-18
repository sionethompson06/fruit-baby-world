// POST /api/audio-narration/generate-draft
// Generates a temporary audio narration draft using ElevenLabs TTS.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not save, upload, attach, or publish the generated audio.
//          API key is never exposed in responses or logs.
// Phase:   13B — temporary narration draft generation.

// Allow up to 60 s on Vercel (default is 10 s on Hobby, which ElevenLabs TTS easily exceeds).
export const maxDuration = 60;

import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import {
  isElevenLabsConfigured,
  getDefaultVoiceId,
  getDefaultNarrationModelId,
} from "@/lib/audioNarrationConfig";
import {
  buildNarrationScriptDraftFromEpisode,
  summarizeVoiceGuidanceForEpisode,
} from "@/lib/audioNarrationContext";
import type { NarrationVoiceStyle } from "@/lib/audioNarrationTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_VOICE_STYLES = new Set<NarrationVoiceStyle>([
  "warm-storyteller",
  "playful",
  "gentle-teacher",
  "calm-bedtime",
  "energetic-cartoon",
]);

const ELEVENLABS_DEFAULT_MODEL = "eleven_multilingual_v2";
const MAX_SCRIPT_LENGTH = 5000;
const ELEVENLABS_TIMEOUT_MS = 60_000;

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateDraftResult =
  | {
      ok: true;
      status: "narration_draft_generated";
      episodeSlug: string;
      provider: "elevenlabs";
      voiceId: string;
      modelId: string;
      voiceStyle: NarrationVoiceStyle;
      mimeType: "audio/mpeg";
      audioBase64: string;
      scriptText: string;
      durationEstimateSeconds: null;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "missing_voice_id"
        | "episode_not_found"
        | "missing_script"
        | "provider_error"
        | "provider_timeout";
      message: string;
      providerStatus?: number;
      providerMessage?: string;
      troubleshooting?: string[];
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function sanitizeScriptForNarration(text: string): string {
  let clean = text;
  // Remove Blob/GitHub URLs
  clean = clean.replace(/https?:\/\/[^\s,;)]+/g, "");
  // Remove JSON-like objects
  clean = clean.replace(/\{[^}]{0,300}\}/g, "");
  // Remove placeholder scene markers
  clean = clean.replace(/\[Scene \d+:[^\]]*\]/gi, "");
  // Collapse excess whitespace
  clean = clean.replace(/[ \t]+/g, " ");
  clean = clean.replace(/\n{3,}/g, "\n\n");
  return clean.trim();
}

// Extract a safe provider message from an ElevenLabs error response body.
// Never returns secrets, headers, or stack traces.
function extractProviderMessage(httpStatus: number, rawText: string): string {
  try {
    const parsed = JSON.parse(rawText) as unknown;
    if (typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      if (typeof obj.detail === "string" && obj.detail.length > 0) {
        return obj.detail.slice(0, 300);
      }
      if (typeof obj.detail === "object" && obj.detail !== null) {
        const detail = obj.detail as Record<string, unknown>;
        if (typeof detail.message === "string" && detail.message.length > 0) {
          return detail.message.slice(0, 300);
        }
        if (typeof detail.status === "string" && detail.status.length > 0) {
          return detail.status.slice(0, 300);
        }
      }
      if (typeof obj.message === "string" && obj.message.length > 0) {
        return obj.message.slice(0, 300);
      }
      if (typeof obj.error === "string" && obj.error.length > 0) {
        return obj.error.slice(0, 300);
      }
    }
  } catch {
    // Not JSON — fall through to status-based messages
  }

  if (httpStatus === 401) return "Invalid or missing API key.";
  if (httpStatus === 403) return "Access denied — check your ElevenLabs plan, quota, or permissions.";
  if (httpStatus === 404) return "Voice not found — check that the Voice ID exists in your ElevenLabs account.";
  if (httpStatus === 422) return "Invalid request — check the model ID, voice settings, or script content.";
  if (httpStatus === 429) return "Rate limit or quota exceeded — wait and try again.";
  if (httpStatus >= 500) return "ElevenLabs service error.";
  return `Provider returned status ${httpStatus}.`;
}

function getTroubleshootingForStatus(httpStatus: number): string[] {
  if (httpStatus === 401) {
    return [
      "Check that ELEVENLABS_API_KEY is valid and active.",
      "Verify the key has not expired or been revoked in your ElevenLabs dashboard.",
    ];
  }
  if (httpStatus === 403) {
    return [
      "Check your ElevenLabs plan limits and quota.",
      "Verify your account has access to the requested model.",
      "Check that ELEVENLABS_API_KEY is correct.",
    ];
  }
  if (httpStatus === 404) {
    return [
      "Check that the Voice ID exists in your ElevenLabs account.",
      "Voice IDs are case-sensitive — copy the exact ID from your ElevenLabs dashboard.",
      "The voice may have been deleted or is unavailable on your plan.",
    ];
  }
  if (httpStatus === 422) {
    return [
      "Check that ELEVENLABS_MODEL_ID is valid, such as eleven_multilingual_v2.",
      "Check that the script does not contain unsupported characters or content.",
      "Check that the voice settings values are in the expected range.",
    ];
  }
  if (httpStatus === 429) {
    return [
      "Wait a few minutes before retrying.",
      "Check your ElevenLabs quota and character limits.",
      "Consider using a shorter script for this draft.",
    ];
  }
  return [
    "Check that ELEVENLABS_API_KEY is valid.",
    "Check that the Voice ID exists in your ElevenLabs account.",
    "Check that ELEVENLABS_MODEL_ID is valid, such as eleven_multilingual_v2.",
    "Check ElevenLabs plan/quota limits.",
  ];
}

const VOICE_STYLE_SETTINGS: Record<
  NarrationVoiceStyle,
  { stability: number; similarity_boost: number; style: number; use_speaker_boost: boolean }
> = {
  "warm-storyteller":   { stability: 0.65, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
  "playful":            { stability: 0.45, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true },
  "gentle-teacher":     { stability: 0.70, similarity_boost: 0.70, style: 0.15, use_speaker_boost: true },
  "calm-bedtime":       { stability: 0.75, similarity_boost: 0.65, style: 0.10, use_speaker_boost: true },
  "energetic-cartoon":  { stability: 0.40, similarity_boost: 0.90, style: 0.55, use_speaker_boost: true },
};

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }
  const b = body as Record<string, unknown>;

  // ── Validate provider config ──────────────────────────────────────────────
  if (!isElevenLabsConfigured()) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "ElevenLabs is not configured yet. Add ELEVENLABS_API_KEY in Vercel environment variables.",
      } satisfies GenerateDraftResult,
      { status: 503 }
    );
  }
  const apiKey = process.env.ELEVENLABS_API_KEY!;

  // ── Validate episodeSlug ──────────────────────────────────────────────────
  if (!validateSlug(b.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episodeSlug is required and must contain only lowercase letters, numbers, and hyphens.",
      } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }
  const episodeSlug = b.episodeSlug as string;

  // ── Validate voiceStyle ───────────────────────────────────────────────────
  const voiceStyle: NarrationVoiceStyle =
    typeof b.voiceStyle === "string" &&
    ALLOWED_VOICE_STYLES.has(b.voiceStyle as NarrationVoiceStyle)
      ? (b.voiceStyle as NarrationVoiceStyle)
      : "warm-storyteller";

  // ── Validate voiceId ──────────────────────────────────────────────────────
  let voiceId: string | undefined;
  if (b.voiceId !== undefined && b.voiceId !== null && b.voiceId !== "") {
    if (
      typeof b.voiceId !== "string" ||
      b.voiceId.trim().length === 0 ||
      b.voiceId.trim().length > 200
    ) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "voiceId must be a non-empty string under 200 characters.",
        } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    if (!isSafeText(b.voiceId.trim())) {
      return Response.json(
        { ok: false, status: "validation_error", message: "voiceId contains disallowed content." } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    voiceId = b.voiceId.trim();
  }

  if (!voiceId) voiceId = getDefaultVoiceId();

  if (!voiceId) {
    return Response.json(
      {
        ok: false,
        status: "missing_voice_id",
        message:
          "No ElevenLabs voice ID was provided. Add ELEVENLABS_DEFAULT_VOICE_ID in Vercel or enter a voice ID in the admin form.",
      } satisfies GenerateDraftResult,
      { status: 503 }
    );
  }

  // ── Validate scriptText override ──────────────────────────────────────────
  let scriptOverride: string | undefined;
  if (b.scriptText !== undefined && b.scriptText !== null && b.scriptText !== "") {
    if (typeof b.scriptText !== "string") {
      return Response.json(
        { ok: false, status: "validation_error", message: "scriptText must be a string." } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    const trimmed = b.scriptText.trim();
    if (trimmed.length > MAX_SCRIPT_LENGTH) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message:
            "Please generate narration one episode section at a time or shorten the draft script.",
        } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    if (trimmed.length > 0 && !isSafeText(trimmed)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "scriptText contains disallowed content." } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    if (trimmed.length > 0) scriptOverride = trimmed;
  }

  // ── Load episode ──────────────────────────────────────────────────────────
  const episodeResult = loadEpisodeBySlug(episodeSlug);
  if (!episodeResult) {
    return Response.json(
      { ok: false, status: "episode_not_found", message: "Episode was not found." } satisfies GenerateDraftResult,
      { status: 404 }
    );
  }
  const raw = episodeResult.raw;

  // ── Build narration script ────────────────────────────────────────────────
  const warnings: string[] = [];
  let scriptText: string;

  if (scriptOverride) {
    scriptText = scriptOverride;
  } else {
    const draft = buildNarrationScriptDraftFromEpisode(raw);

    if (draft.scenesWithScript === 0) {
      return Response.json(
        {
          ok: false,
          status: "missing_script",
          message:
            "This episode needs read-aloud or narration text before audio can be generated.",
        } satisfies GenerateDraftResult,
        { status: 422 }
      );
    }

    const scenesMissing = draft.totalScenes - draft.scenesWithScript;
    if (scenesMissing > 0) {
      warnings.push(
        `${scenesMissing} scene${scenesMissing !== 1 ? "s" : ""} missing read-aloud text — skipped in this draft.`
      );
    }

    scriptText = draft.scenes
      .filter((s) => !s.scriptLine.startsWith("[Scene "))
      .map((s) => {
        const prefix = s.title ? `Scene ${s.sceneNumber} — ${s.title}:\n` : "";
        return `${prefix}${s.scriptLine}`;
      })
      .join("\n\n");
  }

  // Sanitize
  scriptText = sanitizeScriptForNarration(scriptText);

  if (!scriptText) {
    return Response.json(
      {
        ok: false,
        status: "missing_script",
        message:
          "This episode needs read-aloud or narration text before audio can be generated.",
      } satisfies GenerateDraftResult,
      { status: 422 }
    );
  }

  if (scriptText.length > MAX_SCRIPT_LENGTH) {
    scriptText = scriptText.slice(0, MAX_SCRIPT_LENGTH);
    warnings.push("Script was truncated to 5,000 characters for this draft.");
  }

  const voiceGuidance = summarizeVoiceGuidanceForEpisode(raw);
  if (voiceGuidance.length === 0) {
    warnings.push("No character voice guidance found — using default narration voice.");
  }

  // ── Call ElevenLabs TTS ───────────────────────────────────────────────────
  const modelId = getDefaultNarrationModelId() ?? ELEVENLABS_DEFAULT_MODEL;
  const baseSettings = VOICE_STYLE_SETTINGS[voiceStyle];

  // eleven_*_v1 models do not support `style` or `use_speaker_boost` — sending
  // them produces a 422. v2/turbo/flash models support all four fields.
  const isV2Model = !/v1($|[^0-9])/.test(modelId);
  const voiceSettings = isV2Model
    ? baseSettings
    : { stability: baseSettings.stability, similarity_boost: baseSettings.similarity_boost };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ELEVENLABS_TIMEOUT_MS);

  let audioBuffer: ArrayBuffer;
  try {
    const elevenRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: scriptText,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => "");
      console.error(
        `[generate-draft] ElevenLabs error (${elevenRes.status}):`,
        errText.slice(0, 300)
      );
      const providerMessage = extractProviderMessage(elevenRes.status, errText);
      const troubleshooting = getTroubleshootingForStatus(elevenRes.status);
      return Response.json(
        {
          ok: false,
          status: "provider_error",
          message: "ElevenLabs could not generate the narration draft.",
          providerStatus: elevenRes.status,
          providerMessage,
          troubleshooting,
        } satisfies GenerateDraftResult,
        { status: 502 }
      );
    }

    audioBuffer = await elevenRes.arrayBuffer();
    if (audioBuffer.byteLength === 0) {
      return Response.json(
        {
          ok: false,
          status: "provider_error",
          message: "ElevenLabs returned an empty audio response. Try a different voice style or regenerate.",
          troubleshooting: [
            "Try a different voice style.",
            "Shorten the script and regenerate.",
            "Check ElevenLabs service status.",
          ],
        } satisfies GenerateDraftResult,
        { status: 502 }
      );
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      return Response.json(
        {
          ok: false,
          status: "provider_timeout",
          message: "Narration generation timed out. Try a shorter script or try again.",
        } satisfies GenerateDraftResult,
        { status: 504 }
      );
    }
    console.error(
      "[generate-draft] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "provider_error",
        message: "ElevenLabs could not generate the narration draft.",
        troubleshooting: [
          "Check your network connection.",
          "Check that ELEVENLABS_API_KEY is valid.",
          "Check ElevenLabs service status.",
        ],
      } satisfies GenerateDraftResult,
      { status: 502 }
    );
  }

  const audioBase64 = Buffer.from(audioBuffer).toString("base64");

  return Response.json(
    {
      ok: true,
      status: "narration_draft_generated",
      episodeSlug,
      provider: "elevenlabs",
      voiceId,
      modelId,
      voiceStyle,
      mimeType: "audio/mpeg",
      audioBase64,
      scriptText,
      durationEstimateSeconds: null,
      warnings,
      notes: [
        "This narration draft has not been saved.",
        "Review the audio before uploading or attaching it in a future phase.",
      ],
    } satisfies GenerateDraftResult,
    { status: 200 }
  );
}
