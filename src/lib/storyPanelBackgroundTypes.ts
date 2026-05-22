// Story panel background and character layer types (Phase 18D.10 / 18D.10.2 / 18D.11 / 18D.12).
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

  sourceType?: "generated-background" | "selected-official-environment-reference" | "golden-reference-background";
  originalReferenceId?: string;
  originalReferenceTitle?: string;
  originalReferenceCharacterSlug?: string;
  originalReferenceImageUrl?: string;

  createdAt: string;
  updatedAt?: string;
};

// Saved character layer stored in episode scene.characterLayers[].
// admin-only — never public, never a story panel.
export type EpisodeSceneCharacterLayer = {
  id: string;
  type: "character-layer";
  status: "saved";
  visibility: "admin-only";

  characterSlug: string;
  characterName: string;

  imageUrl: string;
  pathname?: string;
  mimeType?: string;

  provider?: string;
  modelId?: string;
  promptText?: string;
  placement?: string;
  emotion?: string;
  action?: string;
  facingDirection?: string;
  interactionTargetSlug?: string | null;
  assemblyPlanId?: string;

  createdAt: string;
  updatedAt?: string;
};

// Temporary in-memory draft for a single character layer.
export type StoryPanelCharacterLayerDraft = {
  id: string;
  type: "character-layer-draft";
  status: "temporary";

  characterSlug: string;
  characterName: string;

  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;

  provider: "openai" | "fal";
  modelId?: string;

  imageBase64?: string;
  imageUrl?: string;
  mimeType: string;

  promptText: string;
  providerPromptLength?: number;
  promptWasCompacted?: boolean;

  placement?: string;
  emotion?: string;
  action?: string;
  facingDirection?: string;
  interactionTargetSlug?: string | null;
  assemblyPlanId?: string;

  createdAt: string;
  warnings: string[];
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

// Assembled story panel draft — temporary composite of background + character layers.
// Never saved automatically; used to feed the existing Approve & Save Panel flow.
export type AssembledStoryPanelDraft = {
  id: string;
  type: "assembled-story-panel-draft";
  status: "temporary";

  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  panelId?: string;

  backgroundLayerId: string;
  characterLayerIds: string[];

  imageBase64?: string;
  imageUrl?: string;
  mimeType: "image/png";

  assemblyPlanId?: string;
  provider: "local-composite";
  modelId?: "none";

  canvasWidth: number;
  canvasHeight: number;

  placements: {
    characterLayerId: string;
    characterSlug: string;
    characterName: string;
    x: number;
    y: number;
    width: number;
    height: number;
    placement: string;
    relativeSize?: string;
    facingDirection?: string;
  }[];

  createdAt: string;
  warnings: string[];
};

// Harmonized story panel draft — temporary result of a harmonization pass on an
// assembled draft. Preserves composition/placement while improving visual cohesion.
// Never saved automatically; eligible for existing Approve & Save Panel flow.
export type HarmonizedStoryPanelDraft = {
  id: string;
  type: "harmonized-story-panel-draft";
  status: "temporary";

  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  panelId?: string;

  baseDraftId?: string;
  baseDraftType?: "assembled-story-panel-draft";
  backgroundLayerId?: string;
  characterLayerIds?: string[];
  assembledDraftWarnings?: string[];

  imageBase64?: string;
  imageUrl?: string;
  mimeType: "image/png";

  provider: "fal" | "openai";
  modelId?: string;

  harmonizationPrompt: string;
  promptWasCompacted?: boolean;
  providerPromptLength?: number;

  preserveComposition: true;
  preserveCharacterIdentity: true;
  preservePlacement: true;

  createdAt: string;
  warnings: string[];
};
