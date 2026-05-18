// Pure types and constants for the video clip generation pipeline (Phase 14B).
// No server-only imports — safe to use in client components.

import type { VideoGenerationProvider } from "@/lib/videoGenerationTypes";

export const ALLOWED_VIDEO_STYLES = [
  "storybook-cartoon",
  "gentle-animation",
  "playful-short",
  "classroom-friendly",
  "cinematic-soft",
] as const;

export type VideoClipRequestStyle = (typeof ALLOWED_VIDEO_STYLES)[number];

export type VideoReferenceImage = {
  url: string;
  characterSlug: string;
  characterName: string;
  assetType: string;
  role: "profile-sheet" | "main-reference" | "supporting" | "environment";
};

export type VideoClipCharacterContext = {
  slug: string;
  displayName: string;
  shortDescription: string;
  personalityTraits: string[];
  visualIdentitySummary: string;
  colorPaletteSummary: string;
  alwaysRules: string[];
  neverRules: string[];
  doNotChangeRules: string[];
  generationRestrictions: string[];
  isTiki: boolean;
};

export type VideoClipGenerationPackage = {
  episodeSlug: string;
  sceneId: string;
  sceneNumber: number;
  sceneTitle: string;
  sceneSummary: string;
  sceneAction: string;
  sceneSetting: string;
  sceneMood: string;
  videoStyle: VideoClipRequestStyle;
  durationSeconds: number;
  provider: VideoGenerationProvider;
  modelId: string | undefined;
  finalPromptText: string;
  referenceImages: VideoReferenceImage[];
  referenceMode: "reference-ready" | "prompt-only";
  characters: VideoClipCharacterContext[];
  hasTiki: boolean;
  warnings: string[];
  globalFidelityRules: string[];
};
