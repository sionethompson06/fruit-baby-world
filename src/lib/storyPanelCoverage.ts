// Story panel coverage detection for episodes.
// Pure data helpers — no fs, no external APIs — safe in any server context.
// All types are JSON-serializable for passing to client components.

import { getActiveEpisodeScenes } from "@/lib/episodeScenes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryPanelCoverage = {
  totalActiveScenes: number;
  scenesWithPanel: number;
  scenesMissingPanel: number;
  coveragePercent: number;
};

export type MissingPanelThumbnail = {
  characterSlug: string;
  characterName: string;
  profileSheetUrl: string;
  mainImageUrl: string;
  supportingThumbnails: { url: string; title: string }[];
  envThumbnails: { url: string; title: string }[];
  totalSupportingCount: number;
  totalEnvCount: number;
  hasProfileSheet: boolean;
  isTiki: boolean;
};

export type MissingPanelChecklistItem = {
  id: string;
  label: string;
  isTikiSpecific: boolean;
};

export type MissingPanelSceneInfo = {
  sceneNumber: number;
  sceneId: string;
  title: string;
  summary: string;
  characters: string[];
  referenceCharacters: string[];
  panelPrompt: string;
  readinessBadge: "reference-ready" | "needs-official-ref" | "no-approved-refs" | "prompt-only";
  referenceWarnings: string[];
  fidelityThumbnails: MissingPanelThumbnail[];
  fidelityChecklist: MissingPanelChecklistItem[];
  hasTiki: boolean;
  totalApprovedRefs: number;
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ─── Panel access ──────────────────────────────────────────────────────────────

function getAllPanels(episode: Record<string, unknown>): Record<string, unknown>[] {
  const media = isRecord(episode.media) ? episode.media : null;
  const spm = media && isRecord(media.storyPanelMode) ? media.storyPanelMode : null;
  const panels = spm && Array.isArray(spm.panels) ? spm.panels : [];
  return (panels as unknown[]).filter(isRecord);
}

export function getAttachedPanelForScene(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): Record<string, unknown> | undefined {
  const panels = getAllPanels(episode);
  const sceneId = safeStr(scene.sceneId);
  const sceneNum =
    typeof scene.sceneNumber === "number" ? scene.sceneNumber : -1;

  return panels.find((p) => {
    if (sceneId && safeStr(p.sceneId) === sceneId) return true;
    if (
      sceneNum > 0 &&
      typeof p.sceneNumber === "number" &&
      p.sceneNumber === sceneNum
    )
      return true;
    return false;
  });
}

export function sceneHasApprovedStoryPanel(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): boolean {
  const panel = getAttachedPanelForScene(scene, episode);
  if (!panel) return false;
  const asset = isRecord(panel.asset) ? panel.asset : null;
  if (!asset) return false;
  return safeStr(asset.url).length > 0;
}

// ─── Visibility helpers ───────────────────────────────────────────────────────

export function isPanelPubliclyVisible(panel: Record<string, unknown>): boolean {
  // Missing visibility field is treated as "public" for backward compatibility
  return panel.visibility !== "hidden";
}

export function sceneHasPublicStoryPanel(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): boolean {
  const panel = getAttachedPanelForScene(scene, episode);
  if (!panel) return false;
  const asset = isRecord(panel.asset) ? panel.asset : null;
  if (!asset) return false;
  if (!safeStr(asset.url)) return false;
  return isPanelPubliclyVisible(panel);
}

export function getVisiblePanelsForScene(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): Record<string, unknown>[] {
  const panels = getAllPanels(episode);
  const sceneId = safeStr(scene.sceneId);
  const sceneNum = typeof scene.sceneNumber === "number" ? scene.sceneNumber : -1;
  return panels.filter((p) => {
    const matches =
      (sceneId && safeStr(p.sceneId) === sceneId) ||
      (sceneNum > 0 && typeof p.sceneNumber === "number" && p.sceneNumber === sceneNum);
    return matches && isPanelPubliclyVisible(p);
  });
}

export function getHiddenPanelsForScene(
  scene: Record<string, unknown>,
  episode: Record<string, unknown>
): Record<string, unknown>[] {
  const panels = getAllPanels(episode);
  const sceneId = safeStr(scene.sceneId);
  const sceneNum = typeof scene.sceneNumber === "number" ? scene.sceneNumber : -1;
  return panels.filter((p) => {
    const matches =
      (sceneId && safeStr(p.sceneId) === sceneId) ||
      (sceneNum > 0 && typeof p.sceneNumber === "number" && p.sceneNumber === sceneNum);
    return matches && !isPanelPubliclyVisible(p);
  });
}

// ─── Missing scene detection ──────────────────────────────────────────────────

export function getActiveScenesMissingStoryPanels(
  episode: Record<string, unknown>
): Record<string, unknown>[] {
  return getActiveEpisodeScenes(episode).filter(
    (s) => !sceneHasApprovedStoryPanel(s, episode)
  );
}

export function getStoryPanelCoverageForEpisode(
  episode: Record<string, unknown>
): StoryPanelCoverage {
  const activeScenes = getActiveEpisodeScenes(episode);
  const total = activeScenes.length;
  const withPanel = activeScenes.filter((s) =>
    sceneHasApprovedStoryPanel(s, episode)
  ).length;
  const missing = total - withPanel;
  return {
    totalActiveScenes: total,
    scenesWithPanel: withPanel,
    scenesMissingPanel: missing,
    coveragePercent:
      total > 0 ? Math.round((withPanel / total) * 100) : 0,
  };
}
