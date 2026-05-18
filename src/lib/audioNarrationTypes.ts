// Types for the audio narration pipeline (Phase 13A — foundation only).
// No audio is generated in this phase. Types are prepared for future phases.
// All types are JSON-serializable.

export type NarrationProvider =
  | "elevenlabs"
  | "openai-tts"
  | "none";

export type NarrationDraftStatus =
  | "not-started"
  | "draft-generated"
  | "approved"
  | "rejected"
  | "archived";

export type NarrationVoiceStyle =
  | "warm-storyteller"
  | "playful"
  | "gentle-teacher"
  | "calm-bedtime"
  | "energetic-cartoon";

export type NarrationDraftMetadata = {
  id: string;
  episodeSlug: string;
  sceneId?: string;
  provider: NarrationProvider;
  voiceId?: string;
  modelId?: string;
  scriptText: string;
  status: NarrationDraftStatus;
  audioUrl?: string;
  durationSeconds?: number;
  createdAt: string;
  approvedAt?: string;
};

export type NarrationProviderStatus = {
  provider: NarrationProvider;
  configured: boolean;
  missing: string[];
  defaultVoiceIdConfigured: boolean;
  modelIdConfigured: boolean;
};

export type NarrationReadiness = {
  readyForNarrationDraft: boolean;
  scriptAvailable: boolean;
  activeScenes: number;
  scenesWithReadAloudText: number;
  scenesMissingReadAloudText: number;
  voiceGuidanceAvailable: boolean;
  providerConfigured: boolean;
  warnings: string[];
  blockers: string[];
};
