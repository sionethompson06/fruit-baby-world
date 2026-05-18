// POST /api/audio-narration/generate-draft
// Generates a temporary audio narration draft using ElevenLabs TTS.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not save, upload, attach, or publish the generated audio.
//          API key is never exposed in responses or logs.
// Phase:   13B — temporary narration draft generation.

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

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateDraftResult =
  | {
      ok: true;
      status: "narration_draft_generated";
      episodeSlug: string;
      provider: "elevenlabs";
      voiceId: string;
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
        | "episode_not_found"
        | "missing_script"
        | "provider_error";
      message: string;
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

const VOICE_STYLE_SETTINGS: Record<
  NarrationVoiceStyle,
  { stability: number; similarity_boost: number; style: number }
> = {
  "warm-storyteller": { stability: 0.65, similarity_boost: 0.75, style: 0.25 },
  "playful": { stability: 0.45, similarity_boost: 0.85, style: 0.45 },
  "gentle-teacher": { stability: 0.70, similarity_boost: 0.70, style: 0.15 },
  "calm-bedtime": { stability: 0.75, similarity_boost: 0.65, style: 0.10 },
  "energetic-cartoon": { stability: 0.40, similarity_boost: 0.90, style: 0.55 },
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
        status: "setup_required",
        message:
          "Add ELEVENLABS_DEFAULT_VOICE_ID in environment variables or provide a voiceId for narration drafts.",
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
  const voiceSettings = VOICE_STYLE_SETTINGS[voiceStyle];

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
          text: scriptText,
          model_id: modelId,
          voice_settings: voiceSettings,
        }),
      }
    );

    if (!elevenRes.ok) {
      const errText = await elevenRes.text().catch(() => "");
      console.error(
        `[generate-draft] ElevenLabs error (${elevenRes.status}):`,
        errText.slice(0, 300)
      );
      return Response.json(
        {
          ok: false,
          status: "provider_error",
          message: "Narration provider returned an error while generating the draft.",
        } satisfies GenerateDraftResult,
        { status: 502 }
      );
    }

    audioBuffer = await elevenRes.arrayBuffer();
  } catch (err) {
    console.error(
      "[generate-draft] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "provider_error",
        message: "Narration provider returned an error while generating the draft.",
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
