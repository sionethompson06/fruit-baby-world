// Types for final story video assembly planning.
// Used by admin preview — no rendering, no uploads, no publishing.

export type FinalVideoAssetType =
  | "story-panel"
  | "animated-clip"
  | "narration-audio"
  | "caption"
  | "title-card"
  | "end-card";

export type FinalVideoVisualMode = "animated-clip" | "story-panel" | "text-only";

export type FinalVideoAssemblyStatus = "ready" | "needs-work" | "blocked";

// ─── Per-asset shapes ─────────────────────────────────────────────────────────

export type FinalVideoStoryPanel = {
  id?: string;
  url: string;
  altText?: string;
  caption?: string;
};

export type FinalVideoAnimatedClip = {
  id?: string;
  url: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
};

export type FinalVideoNarrationAudio = {
  url: string;
  mimeType: string;
  durationSeconds?: number;
};

// ─── Scene segment ────────────────────────────────────────────────────────────

export type FinalVideoSceneSegment = {
  sceneId: string;
  sceneNumber?: number;
  title?: string;
  summary?: string;
  captionText?: string;
  durationSeconds: number;
  visualMode: FinalVideoVisualMode;
  storyPanel?: FinalVideoStoryPanel;
  animatedClip?: FinalVideoAnimatedClip;
  warnings: string[];
};

// ─── Assembly package ─────────────────────────────────────────────────────────

export type FinalVideoAssemblyPackage = {
  episodeSlug: string;
  episodeTitle: string;
  status: FinalVideoAssemblyStatus;
  estimatedDurationSeconds: number;
  hasNarrationAudio: boolean;
  narrationAudio?: FinalVideoNarrationAudio;
  segments: FinalVideoSceneSegment[];
  blockers: string[];
  warnings: string[];
  notes: string[];
};
