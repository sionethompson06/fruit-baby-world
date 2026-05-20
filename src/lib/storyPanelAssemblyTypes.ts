// Story panel assembly planning types (Phase 18D.9).
// Defines the structured decomposition of a story panel into background,
// per-character layers, layout, and final assembly — for future staged rendering.
// No AI provider calls — deterministic planning only.

import type { StoryPanelGenerationMode } from "@/lib/storyPanelImageProvider";

// ─── Character layer plan ──────────────────────────────────────────────────────

export type CharacterPlacement =
  | "left"
  | "center-left"
  | "center"
  | "center-right"
  | "right"
  | "background-left"
  | "background-right"
  | "background-center"
  | "foreground"
  | "unknown";

export type CharacterFacingDirection =
  | "facing-left"
  | "facing-right"
  | "facing-viewer"
  | "facing-away"
  | "three-quarter-left"
  | "three-quarter-right"
  | "toward-another-character"
  | "unknown";

export type StoryPanelCharacterLayerPlan = {
  characterSlug: string;
  characterName: string;
  roleInScene: "protagonist" | "supporting" | "background" | "unknown";
  emotion: string;
  action: string;
  pose: string;
  placement: CharacterPlacement;
  placementDetail: string;
  relativeSize: "large" | "medium" | "small" | "unknown";
  facingDirection: CharacterFacingDirection;
  interactionTargetSlug: string | null;
  interactionTargetName: string | null;
  interactionTargetPlacement: string | null;
  interactionInstruction: string | null;
  storyContextSummary: string;
  sceneRelationshipSummary: string;
  assemblyIntent: string;
  mustShow: string[];
  mustAvoid: string[];
  officialFeatureLocks: string[];
  referenceAssetIds: string[];
  cleanRenderPrompt: string;
};

// ─── Assembly plan ─────────────────────────────────────────────────────────────

export type AssemblyPlanStatus =
  | "planned"
  | "background-rendered"
  | "characters-rendered"
  | "composited"
  | "approved";

export type StoryPanelAssemblyPlan = {
  id: string;
  episodeSlug: string;
  sceneId: string | null;
  sceneNumber: number | null;
  panelId: string | null;
  mode: StoryPanelGenerationMode;
  status: AssemblyPlanStatus;

  scene: {
    settingLabel: string;
    settingDescription: string;
    mood: string;
    timeOfDay: string | null;
    locationKeywords: string[];
  };

  cast: StoryPanelCharacterLayerPlan[];

  layout: {
    compositionStyle: "portrait" | "landscape" | "square";
    characterCount: number;
    primaryCharacterSlug: string | null;
    depthLayers: number;
    backgroundDescription: string;
    backgroundPrompt: string;
  };

  references: {
    characterSlugs: string[];
    referenceAssetIds: string[];
    totalReferenceCount: number;
  };

  prompts: {
    backgroundPrompt: string;
    assemblyDirectionPrompt: string;
    adminDirectionUsed: string | null;
  };

  metadata: {
    plannedAt: string;
    plannerVersion: string;
    sourceSceneTextLength: number | null;
    warnings: string[];
    signalKeywordsFound: string[];
  };
};

// ─── Compact summary (for route response) ─────────────────────────────────────

export type AssemblyPlanUiSummary = {
  available: boolean;
  settingLabel: string;
  mood: string;
  characterCount: number;
  characters: Array<{
    slug: string;
    name: string;
    placement: string;
    emotion: string;
    action: string;
    interactionTargetName: string | null;
    interactionInstruction: string | null;
    assemblyIntent: string;
  }>;
  backgroundSummary: string;
  warnings: string[];
  adminDirectionUsed: string | null;
};
