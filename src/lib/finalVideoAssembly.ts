// Final story video assembly planning helpers.
// Pure data — no rendering, no uploads, no network calls, no fs.
// Builds a planning package from already-loaded episode JSON.

import { getActiveEpisodeScenes } from "@/lib/episodeScenes";
import { getAttachedPanelForScene, isPanelPubliclyVisible } from "@/lib/storyPanelCoverage";
import type {
  FinalVideoAssemblyPackage,
  FinalVideoSceneSegment,
  FinalVideoVisualMode,
  FinalVideoStoryPanel,
  FinalVideoAnimatedClip,
  FinalVideoNarrationAudio,
} from "@/lib/finalVideoTypes";

// ─── Duration constants ───────────────────────────────────────────────────────

const PANEL_DEFAULT_SECONDS = 5;
const TEXT_ONLY_DEFAULT_SECONDS = 4;

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) return (v as unknown[]).filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 10;
}

// ─── Narration audio ──────────────────────────────────────────────────────────

export function getPublicReadyNarrationAudio(
  episode: Record<string, unknown>
): FinalVideoNarrationAudio | null {
  const an = episode.audioNarration;
  if (!isRecord(an)) return null;
  if (!isHttpsUrl(an.url)) return null;
  if (an.status !== "approved") return null;
  if (str(an.visibility) !== "public-ready") return null;
  return {
    url: an.url as string,
    mimeType: str(an.mimeType) || "audio/mpeg",
    durationSeconds: typeof an.durationSeconds === "number" ? an.durationSeconds : undefined,
  };
}

function getNarrationAudioStatus(episode: Record<string, unknown>): "public-ready" | "admin-only" | "missing" {
  const an = episode.audioNarration;
  if (!isRecord(an)) return "missing";
  if (!isHttpsUrl(an.url)) return "missing";
  const vis = str(an.visibility);
  if (vis === "public-ready" && an.status === "approved") return "public-ready";
  return "admin-only";
}

// ─── Visual selection ─────────────────────────────────────────────────────────

function getPublicReadyClipForScene(
  scene: Record<string, unknown>
): FinalVideoAnimatedClip | null {
  const clips = Array.isArray(scene.videoClips) ? (scene.videoClips as unknown[]) : [];
  for (const c of clips) {
    if (!isRecord(c)) continue;
    if (c.status !== "approved") continue;
    if (str(c.visibility) !== "public-ready") continue;
    if (!isHttpsUrl(c.url)) continue;
    return {
      id: str(c.id) || undefined,
      url: c.url as string,
      durationSeconds: typeof c.durationSeconds === "number" ? c.durationSeconds : undefined,
      thumbnailUrl: isHttpsUrl(c.thumbnailUrl) ? (c.thumbnailUrl as string) : undefined,
    };
  }
  return null;
}

function getPublicReadyPanelForScene(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): FinalVideoStoryPanel | null {
  const panel = getAttachedPanelForScene(scene, episode);
  if (!panel) return null;
  if (!isPanelPubliclyVisible(panel)) return null;
  const asset = isRecord(panel.asset) ? panel.asset : null;
  if (!asset) return null;
  const url = str(asset.url);
  if (!isHttpsUrl(url)) return null;
  return {
    id: str(panel.id) || undefined,
    url,
    altText: str(asset.alt) || undefined,
    caption: str(asset.caption) || undefined,
  };
}

export function getBestPublicVisualForScene(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): { mode: FinalVideoVisualMode; clip?: FinalVideoAnimatedClip; panel?: FinalVideoStoryPanel } {
  const clip = getPublicReadyClipForScene(scene);
  if (clip) return { mode: "animated-clip", clip };

  const panel = getPublicReadyPanelForScene(scene, episode);
  if (panel) return { mode: "story-panel", panel };

  return { mode: "text-only" };
}

// ─── Caption selection ────────────────────────────────────────────────────────

function pickCaptionText(
  scene: Record<string, unknown>,
  panel: FinalVideoStoryPanel | undefined
): string {
  if (panel?.caption) return panel.caption;
  const voiceover = strArr(scene.voiceoverNotes);
  if (voiceover.length > 0) return voiceover[0];
  const summary = str(scene.summary);
  if (summary) return summary;
  return str(scene.title);
}

// ─── Segment builder ──────────────────────────────────────────────────────────

export function buildFinalVideoSceneSegment(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): FinalVideoSceneSegment {
  const sceneId = str(scene.sceneId);
  const sceneNumber = typeof scene.sceneNumber === "number" ? scene.sceneNumber : undefined;
  const title = str(scene.title) || undefined;
  const summary = str(scene.summary) || undefined;
  const warnings: string[] = [];

  const { mode, clip, panel } = getBestPublicVisualForScene(scene, episode);

  const captionText = pickCaptionText(scene, panel) || undefined;

  let durationSeconds: number;
  if (mode === "animated-clip" && clip?.durationSeconds) {
    durationSeconds = clip.durationSeconds;
  } else if (mode === "story-panel") {
    durationSeconds = PANEL_DEFAULT_SECONDS;
  } else {
    durationSeconds = TEXT_ONLY_DEFAULT_SECONDS;
    warnings.push("No public-ready visual available — text-only fallback");
  }

  // Warn about hidden/admin-only clips (they exist but can't be used)
  const allClips = Array.isArray(scene.videoClips) ? (scene.videoClips as unknown[]) : [];
  const hasAdminClips = allClips.some(
    (c) => isRecord(c) && isRecord(c) && str(c.visibility) !== "public-ready" && isHttpsUrl(c.url)
  );
  if (hasAdminClips && mode !== "animated-clip") {
    warnings.push("Video clip attached but not public-ready — using panel or text fallback");
  }

  return {
    sceneId,
    sceneNumber,
    title,
    summary,
    captionText,
    durationSeconds,
    visualMode: mode,
    storyPanel: panel,
    animatedClip: clip,
    warnings,
  };
}

// ─── Package builder ──────────────────────────────────────────────────────────

export function buildFinalVideoAssemblyPackage(
  episode: Record<string, unknown>
): FinalVideoAssemblyPackage {
  const episodeSlug = str(episode.slug) || str(episode.id) || "unknown";
  const episodeTitle = str(episode.title) || "Untitled Episode";

  const activeScenes = getActiveEpisodeScenes(episode);
  const segments = activeScenes.map((scene) => buildFinalVideoSceneSegment(scene, episode));

  const narrationAudio = getPublicReadyNarrationAudio(episode);
  const narrationStatus = getNarrationAudioStatus(episode);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const notes: string[] = [];

  if (activeScenes.length === 0) {
    blockers.push("No active scenes — episode needs at least one active scene.");
  }

  const textOnlyCount = segments.filter((s) => s.visualMode === "text-only").length;
  if (textOnlyCount === segments.length && segments.length > 0) {
    blockers.push("No public-ready visuals found for any scene — all scenes are text-only.");
  } else if (textOnlyCount > 0) {
    warnings.push(`${textOnlyCount} scene${textOnlyCount !== 1 ? "s" : ""} have no public-ready visual (text-only fallback).`);
  }

  if (narrationStatus === "missing") {
    warnings.push("No public-ready narration audio attached.");
  } else if (narrationStatus === "admin-only") {
    warnings.push("Narration audio is attached but not public-ready.");
  }

  // Collect per-segment warnings
  for (const seg of segments) {
    for (const w of seg.warnings) {
      warnings.push(`Scene ${seg.sceneNumber ?? seg.sceneId}: ${w}`);
    }
  }

  const estimatedDurationSeconds = estimateFinalVideoDuration({ segments, narrationAudio });

  const clipCount = segments.filter((s) => s.visualMode === "animated-clip").length;
  const panelCount = segments.filter((s) => s.visualMode === "story-panel").length;

  if (clipCount > 0) {
    notes.push(`${clipCount} scene${clipCount !== 1 ? "s" : ""} will use public-ready animated clips.`);
  }
  if (panelCount > 0) {
    notes.push(`${panelCount} scene${panelCount !== 1 ? "s" : ""} will use story panel images.`);
  }
  if (narrationAudio) {
    notes.push("Narration audio is public-ready and will be included.");
  }
  notes.push("Final video rendering comes in a later phase.");

  const status = getFinalVideoReadiness({ blockers, warnings, segments });

  return {
    episodeSlug,
    episodeTitle,
    status,
    estimatedDurationSeconds,
    hasNarrationAudio: Boolean(narrationAudio),
    narrationAudio: narrationAudio ?? undefined,
    segments,
    blockers,
    warnings,
    notes,
  };
}

// ─── Readiness ────────────────────────────────────────────────────────────────

export function getFinalVideoReadiness(pkg: {
  blockers: string[];
  warnings: string[];
  segments: FinalVideoSceneSegment[];
}): "ready" | "needs-work" | "blocked" {
  if (pkg.blockers.length > 0) return "blocked";
  if (pkg.warnings.length > 0) return "needs-work";
  if (pkg.segments.some((s) => s.visualMode === "text-only")) return "needs-work";
  return "ready";
}

// ─── Duration estimate ────────────────────────────────────────────────────────

export function estimateFinalVideoDuration(pkg: {
  segments: FinalVideoSceneSegment[];
  narrationAudio?: FinalVideoNarrationAudio | null;
}): number {
  const segmentTotal = pkg.segments.reduce((sum, s) => sum + s.durationSeconds, 0);
  return segmentTotal;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function summarizeFinalVideoPackage(pkg: FinalVideoAssemblyPackage): string {
  const { segments } = pkg;
  const clipCount = segments.filter((s) => s.visualMode === "animated-clip").length;
  const panelCount = segments.filter((s) => s.visualMode === "story-panel").length;
  const textCount = segments.filter((s) => s.visualMode === "text-only").length;
  const parts: string[] = [];
  if (clipCount > 0) parts.push(`${clipCount} animated`);
  if (panelCount > 0) parts.push(`${panelCount} panel`);
  if (textCount > 0) parts.push(`${textCount} text-only`);
  const visual = parts.join(", ") || "no visuals";
  const audio = pkg.hasNarrationAudio ? "narration included" : "no narration";
  return `${segments.length} scenes (${visual}); ${audio}; ~${pkg.estimatedDurationSeconds}s`;
}
