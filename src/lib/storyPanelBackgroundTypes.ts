// Story panel background-only draft types (Phase 18D.10).
// Represents a temporary background layer generated without characters.
// Background drafts are separate from story panel drafts — they are
// never attached, uploaded, or published automatically.

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
