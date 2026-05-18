// Types for the video generation pipeline (Phase 14A+).
// No video is generated in Phase 14A. Types are prepared for future phases.
// All types are JSON-serializable.

export type VideoGenerationProvider =
  | "runway"
  | "luma"
  | "fal"
  | "replicate"
  | "none";

export type VideoDraftStatus =
  | "not-started"
  | "draft-generated"
  | "approved"
  | "rejected"
  | "archived";

export type VideoClipStyle =
  | "storybook-animation"
  | "character-animation"
  | "scene-transition"
  | "title-sequence"
  | "ambient-loop";

export type VideoClipDraftMetadata = {
  id: string;
  episodeSlug: string;
  sceneId?: string;
  provider: VideoGenerationProvider;
  modelId?: string;
  promptText: string;
  status: VideoDraftStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  widthPx?: number;
  heightPx?: number;
  createdAt: string;
  approvedAt?: string;
};

export type VideoProviderStatus = {
  provider: VideoGenerationProvider;
  configured: boolean;
  missing: string[];
  modelIdConfigured: boolean;
  providerLabel: string;
};

export type VideoGenerationReadiness = {
  readyForVideoGeneration: boolean;
  providerConfigured: boolean;
  activeScenes: number;
  scenesWithAnimationPrompt: number;
  scenesMissingAnimationPrompt: number;
  scenesWithCharacterReferences: number;
  totalApprovedReferenceAssets: number;
  warnings: string[];
  blockers: string[];
};

export type EpisodeVideoGenerationReadiness = VideoGenerationReadiness & {
  episodeSlug: string;
  episodeTitle: string;
};
