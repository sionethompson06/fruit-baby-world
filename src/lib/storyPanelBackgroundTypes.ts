// Story panel background-only draft types (Phase 18D.10 / 18D.10.2).
// StoryPanelBackgroundDraft — temporary in-memory draft, never saved.
// EpisodeSceneBackgroundLayer — saved admin-only background layer in episode JSON.

// Saved background layer stored in episode scene.backgroundLayers[].
// admin-only — never public, never a story panel.
export type EpisodeSceneBackgroundLayer = {
  id: string;
  type: "background-layer";
  status: "saved";
  visibility: "admin-only";

  imageUrl: string;
  pathname?: string;
  mimeType?: string;

  provider?: string;
  modelId?: string;
  promptText?: string;
  settingLabel?: string;
  environmentDescription?: string;
  assemblyPlanId?: string;

  createdAt: string;
  updatedAt?: string;
};

export type StoryPanelBackgroundDraft = {
  id: string;
  type: "background-only-draft";
  status: "temporary";

  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  panelId?: string;

  provider: "openai" | "fal";
  modelId?: string;

  imageBase64?: string;
  imageUrl?: string;
  mimeType: string;

  promptText: string;
  providerPromptLength?: number;
  promptWasCompacted?: boolean;

  assemblyPlanId?: string;
  settingLabel?: string;
  environmentDescription?: string;

  createdAt: string;
  warnings: string[];
};
