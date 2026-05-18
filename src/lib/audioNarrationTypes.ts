// Types for the audio narration pipeline (Phase 13A–13C).
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

// ─── Review types (Phase 13C) ─────────────────────────────────────────────────

export type AudioDraftReviewChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type AudioDraftReviewDecision = "looks-good" | "needs-regeneration";

export type AudioDraftReviewState = {
  checklist: AudioDraftReviewChecklistItem[];
  notes: string;
  decision: AudioDraftReviewDecision | null;
  decidedAt: string | null;
};

export type AudioDraftReviewRecommendation =
  | "ready"
  | "needs-review"
  | "no-draft";

// ─── Approved audio asset (Phase 13D) ────────────────────────────────────────

export type ApprovedNarrationAudioAsset = {
  id: string;
  episodeSlug: string;
  provider: string;
  voiceId: string;
  modelId: string;
  voiceStyle: string;
  url: string;
  pathname: string;
  mimeType: string;
  sizeBytes: number;
  scriptText: string;
  reviewNotes: string;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
};

