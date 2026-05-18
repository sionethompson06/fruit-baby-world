// POST /api/video-generation/generate-draft
// Validates a video clip draft request, loads episode/scene data, builds a
// scene reference package, and returns a structured video generation package.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  No video is generated, saved, uploaded, or written to JSON in Phase 14B.
//          Returns not_implemented_yet with the full generation package.
//          Does not expose API keys, auth headers, stack traces, or raw secrets.
// Phase:   14B — Generate Temporary Animated Clip Draft.

import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { getEpisodeScenes } from "@/lib/episodeScenes";
import {
  loadReferenceAssets,
  buildSceneReferencePackage,
} from "@/lib/referenceAssetLoader";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import {
  getVideoGenerationProvider,
  getVideoGenerationModelId,
  getVideoProviderMissingEnvVars,
  isVideoGenerationConfigured,
  getVideoProviderLabel,
} from "@/lib/videoGenerationConfig";
import {
  buildVideoClipGenerationPackage,
  ALLOWED_VIDEO_STYLES,
} from "@/lib/videoClipGenerationPackage";
import type { VideoClipRequestStyle, VideoClipGenerationPackage } from "@/lib/videoClipGenerationTypes";
import type { Character } from "@/lib/content";

export const maxDuration = 60;

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateDraftResult =
  | {
      ok: false;
      status: "not_implemented_yet";
      message: string;
      provider: string;
      videoGenerationPackage: VideoClipGenerationPackage;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: true;
      status: "video_draft_generated";
      episodeSlug: string;
      sceneId: string;
      sceneNumber: number;
      provider: string;
      videoStyle: string;
      durationSeconds: number;
      draft: {
        id: string;
        videoUrl: string;
        thumbnailUrl: string | null;
        providerJobId: string;
        mimeType: string;
      };
      videoGenerationPackage: VideoClipGenerationPackage;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "scene_not_found"
        | "provider_error"
        | "provider_timeout";
      message: string;
      provider?: string;
      missing?: string[];
    };

// ─── Validation helpers ───────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG_RE.test(normalized);
}

const SAFE_SCENE_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;
function validateSceneId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 100 && SAFE_SCENE_ID_RE.test(id);
}

const HTML_TAG_RE = /<[^>]*>/g;
function sanitizePromptText(text: string): string {
  return text.replace(HTML_TAG_RE, "").slice(0, 4000);
}

function isAllowedVideoStyle(v: unknown): v is VideoClipRequestStyle {
  return typeof v === "string" && (ALLOWED_VIDEO_STYLES as readonly string[]).includes(v);
}

function getSceneStr(scene: Record<string, unknown>, key: string): string {
  return typeof scene[key] === "string" ? (scene[key] as string).trim() : "";
}

function getSceneStrArr(scene: Record<string, unknown>, key: string): string[] {
  const v = scene[key];
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }

  // ── Validate provider config ─────────────────────────────────────────────────
  const provider = getVideoGenerationProvider();

  if (provider === "none") {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Video generation provider is not configured yet.",
        missing: ["VIDEO_GENERATION_PROVIDER"],
      } satisfies GenerateDraftResult,
      { status: 503 }
    );
  }

  if (!isVideoGenerationConfigured()) {
    const missing = getVideoProviderMissingEnvVars(provider);
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Video generation provider is missing required environment variables.",
        provider,
        missing,
      } satisfies GenerateDraftResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ─────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate sceneId / sceneNumber ───────────────────────────────────────────
  const sceneIdRaw = body.sceneId;
  const sceneNumberRaw = body.sceneNumber;

  const hasSceneId = validateSceneId(sceneIdRaw);
  const hasSceneNumber =
    typeof sceneNumberRaw === "number" &&
    Number.isFinite(sceneNumberRaw) &&
    sceneNumberRaw >= 1;

  if (!hasSceneId && !hasSceneNumber) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "At least one of sceneId or sceneNumber must be provided.",
      } satisfies GenerateDraftResult,
      { status: 400 }
    );
  }

  const sceneIdInput = hasSceneId ? (sceneIdRaw as string) : undefined;
  const sceneNumberInput = hasSceneNumber ? (sceneNumberRaw as number) : undefined;

  // ── Validate durationSeconds ─────────────────────────────────────────────────
  let durationSeconds = 6;
  if (body.durationSeconds !== undefined) {
    if (
      typeof body.durationSeconds !== "number" ||
      !Number.isFinite(body.durationSeconds) ||
      body.durationSeconds < 3 ||
      body.durationSeconds > 15
    ) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "durationSeconds must be a number between 3 and 15.",
        } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    durationSeconds = body.durationSeconds as number;
  }

  // ── Validate videoStyle ──────────────────────────────────────────────────────
  let videoStyle: VideoClipRequestStyle = "storybook-cartoon";
  if (body.videoStyle !== undefined) {
    if (!isAllowedVideoStyle(body.videoStyle)) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: `videoStyle must be one of: ${ALLOWED_VIDEO_STYLES.join(", ")}.`,
        } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    videoStyle = body.videoStyle;
  }

  // ── Validate promptText (optional override) ──────────────────────────────────
  let promptOverride: string | undefined;
  if (body.promptText !== undefined) {
    if (typeof body.promptText !== "string") {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "promptText must be a string if provided.",
        } satisfies GenerateDraftResult,
        { status: 400 }
      );
    }
    const sanitized = sanitizePromptText(body.promptText.trim());
    if (sanitized.length > 0) promptOverride = sanitized;
  }

  // ── Load episode from disk ───────────────────────────────────────────────────
  let episodeRaw: Record<string, unknown>;
  try {
    const result = loadEpisodeBySlug(episodeSlug);
    if (!result) {
      return Response.json(
        {
          ok: false,
          status: "episode_not_found",
          message: "Episode was not found in saved content files.",
        } satisfies GenerateDraftResult,
        { status: 404 }
      );
    }
    episodeRaw = result.raw;
  } catch {
    return Response.json(
      {
        ok: false,
        status: "episode_not_found",
        message: "Episode could not be loaded from content files.",
      } satisfies GenerateDraftResult,
      { status: 404 }
    );
  }

  // ── Find scene ───────────────────────────────────────────────────────────────
  const allScenes = getEpisodeScenes(episodeRaw);

  let targetScene: Record<string, unknown> | undefined;

  if (sceneIdInput) {
    targetScene = allScenes.find(
      (s) => typeof s.sceneId === "string" && s.sceneId === sceneIdInput
    );
  }
  if (!targetScene && sceneNumberInput !== undefined) {
    targetScene = allScenes.find(
      (s) => typeof s.sceneNumber === "number" && s.sceneNumber === sceneNumberInput
    );
  }

  if (!targetScene) {
    return Response.json(
      {
        ok: false,
        status: "scene_not_found",
        message: "Scene was not found for this episode.",
      } satisfies GenerateDraftResult,
      { status: 404 }
    );
  }

  if (
    typeof targetScene.status === "string" &&
    targetScene.status === "archived"
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "Archived scenes cannot generate new video drafts unless restored.",
      } satisfies GenerateDraftResult,
      { status: 422 }
    );
  }

  const sceneId = getSceneStr(targetScene, "sceneId");
  const sceneNumber =
    typeof targetScene.sceneNumber === "number" ? targetScene.sceneNumber : sceneNumberInput ?? 0;
  const sceneTitle = getSceneStr(targetScene, "title");
  const sceneSummary = getSceneStr(targetScene, "summary");
  const sceneAction =
    getSceneStr(targetScene, "animationPromptDraft") ||
    getSceneStr(targetScene, "actionNotes") ||
    getSceneStr(targetScene, "summary");
  const characterSlugs = getSceneStrArr(targetScene, "characters");

  // ── Load reference assets and characters ─────────────────────────────────────
  let charBySlug: Record<string, Character> = {};
  try {
    const allChars = loadAllCharactersFromDisk();
    for (const c of allChars) {
      charBySlug[c.slug] = c;
      if (c.slug === "tiki") charBySlug["tiki-trouble"] = c;
    }
  } catch { /* fallback: proceed with empty charBySlug */ }

  let referenceAssets: ReturnType<typeof loadReferenceAssets> = [];
  try {
    referenceAssets = loadReferenceAssets();
  } catch { /* fallback: proceed with empty reference assets */ }

  // ── Build scene reference package ────────────────────────────────────────────
  const sceneRefPkg = buildSceneReferencePackage(
    sceneNumber,
    characterSlugs,
    referenceAssets,
    charBySlug
  );

  // ── Build video clip generation package ──────────────────────────────────────
  const episodeSetting =
    typeof episodeRaw.setting === "string" ? episodeRaw.setting.trim() : "";
  const episodeTone =
    typeof episodeRaw.tone === "string" ? episodeRaw.tone.trim() : "";
  const sceneEmotionalBeat = getSceneStr(targetScene, "emotionalBeat");
  const sceneMood = sceneEmotionalBeat || episodeTone;
  const modelId = getVideoGenerationModelId();

  const warnings: string[] = [];
  if (characterSlugs.length === 0) {
    warnings.push("No characters found for this scene. Prompt will have no character context.");
  }
  if (!sceneAction) {
    warnings.push("No animation prompt or action notes found for this scene. Prompt will use scene summary.");
  }
  if (sceneRefPkg.characterPackages.length === 0 && characterSlugs.length > 0) {
    warnings.push(
      "Character slugs found but no character profiles loaded. Reference images and profiles will be missing."
    );
  }

  const videoGenerationPackage = buildVideoClipGenerationPackage(
    {
      episodeSlug,
      sceneId,
      sceneNumber,
      sceneTitle,
      sceneSummary,
      sceneAction,
      sceneSetting: episodeSetting,
      sceneMood,
      videoStyle,
      durationSeconds,
      provider,
      modelId,
      promptOverride,
    },
    sceneRefPkg,
    charBySlug,
    warnings
  );

  // ── Return not_implemented_yet with full package ──────────────────────────────
  const providerLabel = getVideoProviderLabel(provider);

  return Response.json(
    {
      ok: false,
      status: "not_implemented_yet",
      message: `Video generation package is prepared, but provider execution for ${providerLabel} is not implemented yet.`,
      provider,
      videoGenerationPackage,
      warnings: videoGenerationPackage.warnings,
      notes: [
        "No video was generated.",
        "No media was saved.",
        `Provider "${providerLabel}" is configured but actual video generation will be added in a provider-specific phase.`,
        "This package can be used for the provider-specific generation phase.",
        "Review it and confirm the prompt and references before proceeding.",
      ],
    } satisfies GenerateDraftResult,
    { status: 200 }
  );
}
