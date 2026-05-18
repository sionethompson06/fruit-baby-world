// Fal.ai video provider execution helper (Phase 14B.1).
// Server-only — reads FAL_KEY from process.env, calls @fal-ai/client.
// Never import this file in client components.

import "server-only";
import { fal } from "@fal-ai/client";
import type { VideoClipGenerationPackage } from "@/lib/videoClipGenerationTypes";

// ─── Default model ────────────────────────────────────────────────────────────

const FAL_DEFAULT_MODEL_ID = "fal-ai/minimax/video-01";

export function getFalVideoModelId(): string {
  const configured = process.env.VIDEO_GENERATION_MODEL_ID?.trim();
  if (!configured || configured === "none") return FAL_DEFAULT_MODEL_ID;
  return configured;
}

// ─── Input builder ────────────────────────────────────────────────────────────

export function buildFalVideoInput(
  pkg: VideoClipGenerationPackage
): Record<string, unknown> {
  // Minimal known-safe input — prompt-only for broad model compatibility.
  // Reference images are summarised inside the prompt text rather than passed
  // as model inputs, since image_url support varies by Fal model.
  return {
    prompt: pkg.finalPromptText,
  };
}

// ─── Result extraction ────────────────────────────────────────────────────────

type ExtractedFalResult = {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  providerJobId: string | null;
  rawShapeSummary: string;
};

export function extractFalVideoResult(result: unknown): ExtractedFalResult {
  let videoUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  let providerJobId: string | null = null;

  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;

    if (typeof r.requestId === "string") providerJobId = r.requestId;
    if (typeof r.request_id === "string") providerJobId = r.request_id;

    // Fal wraps output in a `data` field when using fal.subscribe
    const data =
      r.data && typeof r.data === "object"
        ? (r.data as Record<string, unknown>)
        : r.output && typeof r.output === "object"
        ? (r.output as Record<string, unknown>)
        : r;

    if (data && typeof data === "object") {
      const d = data as Record<string, unknown>;

      // shape: { video: { url } }
      if (d.video && typeof d.video === "object") {
        const v = d.video as Record<string, unknown>;
        if (typeof v.url === "string") videoUrl = v.url;
      }

      // shape: { video_url }
      if (!videoUrl && typeof d.video_url === "string") videoUrl = d.video_url;

      // shape: { url }
      if (!videoUrl && typeof d.url === "string") videoUrl = d.url;

      // shape: { videos: [{ url } | string] }
      if (!videoUrl && Array.isArray(d.videos) && d.videos.length > 0) {
        const first = d.videos[0];
        if (typeof first === "string") videoUrl = first;
        else if (first && typeof first === "object") {
          const fv = first as Record<string, unknown>;
          if (typeof fv.url === "string") videoUrl = fv.url;
        }
      }

      // thumbnail
      if (d.thumbnail && typeof d.thumbnail === "object") {
        const t = d.thumbnail as Record<string, unknown>;
        if (typeof t.url === "string") thumbnailUrl = t.url;
      }
      if (!thumbnailUrl && typeof d.thumbnail_url === "string") {
        thumbnailUrl = d.thumbnail_url;
      }
    }
  }

  const topKeys =
    result && typeof result === "object"
      ? Object.keys(result as object).join(", ")
      : "unknown";

  return { videoUrl, thumbnailUrl, providerJobId, rawShapeSummary: `Top-level keys: ${topKeys}` };
}

// ─── Troubleshooting list ─────────────────────────────────────────────────────

export function getFalProviderTroubleshooting(): string[] {
  return [
    "Confirm FAL_KEY is set in Vercel and redeployed.",
    "Confirm VIDEO_GENERATION_PROVIDER is set to fal.",
    "Confirm VIDEO_GENERATION_MODEL_ID is valid or leave it blank for the default.",
    "Try a shorter prompt or shorter duration.",
    "Check Fal.ai usage limits or billing.",
  ];
}

// ─── Result type ──────────────────────────────────────────────────────────────

export type FalVideoGenerateResult =
  | {
      ok: true;
      status: "video_draft_generated";
      videoUrl: string;
      thumbnailUrl: string | null;
      providerJobId: string;
      modelId: string;
      referenceMode: "prompt-only-reference-summary";
    }
  | {
      ok: true;
      status: "video_draft_requested";
      providerJobId: string;
      modelId: string;
      message: string;
    }
  | {
      ok: false;
      status: "provider_error";
      message: string;
      providerMessage: string;
      troubleshooting: string[];
    }
  | {
      ok: false;
      status: "provider_timeout";
      message: string;
      troubleshooting: string[];
    };

// ─── Main generator ───────────────────────────────────────────────────────────

// Long-running — Fal video generation can take 60-120+ seconds.
export async function generateFalVideoDraft(
  pkg: VideoClipGenerationPackage
): Promise<FalVideoGenerateResult> {
  const modelId = getFalVideoModelId();
  const falKey =
    process.env.FAL_KEY?.trim() ||
    process.env.VIDEO_GENERATION_API_KEY?.trim();

  if (!falKey) {
    return {
      ok: false,
      status: "provider_error",
      message: "Fal.ai could not generate the temporary video draft.",
      providerMessage: "FAL_KEY is not configured on the server.",
      troubleshooting: getFalProviderTroubleshooting(),
    };
  }

  fal.config({ credentials: falKey });

  const input = buildFalVideoInput(pkg);

  try {
    const result = await fal.subscribe(modelId, { input, logs: true });
    const extracted = extractFalVideoResult(result);

    if (extracted.videoUrl) {
      return {
        ok: true,
        status: "video_draft_generated",
        videoUrl: extracted.videoUrl,
        thumbnailUrl: extracted.thumbnailUrl,
        providerJobId: extracted.providerJobId ?? `fal-${Date.now()}`,
        modelId,
        referenceMode: "prompt-only-reference-summary",
      };
    }

    if (extracted.providerJobId) {
      return {
        ok: true,
        status: "video_draft_requested",
        providerJobId: extracted.providerJobId,
        modelId,
        message:
          "Fal.ai accepted the video generation request, but no video URL was returned yet.",
      };
    }

    return {
      ok: false,
      status: "provider_error",
      message: "Fal.ai could not generate the temporary video draft.",
      providerMessage: `No video URL in provider response. ${extracted.rawShapeSummary}`,
      troubleshooting: getFalProviderTroubleshooting(),
    };
  } catch (err: unknown) {
    const raw = err instanceof Error ? err.message : String(err);
    const isTimeout =
      raw.toLowerCase().includes("timeout") ||
      raw.toLowerCase().includes("timed out");

    if (isTimeout) {
      return {
        ok: false,
        status: "provider_timeout",
        message:
          "Fal.ai video generation timed out. Generation can take up to 2 minutes.",
        troubleshooting: [
          ...getFalProviderTroubleshooting(),
          "Try a shorter duration (3-6 seconds).",
          "Try again — Fal.ai may be under high load.",
        ],
      };
    }

    // Redact any token-length strings that could be secrets
    const safeMsg = raw.replace(/[A-Za-z0-9_\-]{20,}/g, "[REDACTED]").slice(0, 300);

    return {
      ok: false,
      status: "provider_error",
      message: "Fal.ai could not generate the temporary video draft.",
      providerMessage: safeMsg,
      troubleshooting: getFalProviderTroubleshooting(),
    };
  }
}
