// Fidelity review helpers for video clip draft review (Phase 14C).
// Server-only — imports from storyPanelFidelityReview and referenceAssetLoader.
// Do NOT import functions (only types) in client components.

import type { SceneReferencePackage } from "@/lib/referenceAssetLoader";
import type { Character } from "@/lib/content";
import {
  getFidelityReferenceThumbnails,
  type FidelityThumbnail,
} from "@/lib/storyPanelFidelityReview";

export type { FidelityThumbnail };

// ─── Checklist item type ──────────────────────────────────────────────────────

export type VideoFidelityChecklistItem = {
  id: string;
  label: string;
  group: "character" | "motion" | "environment" | "safety" | "tiki";
};

// ─── Checklist definitions ────────────────────────────────────────────────────

const CHARACTER_ITEMS: VideoFidelityChecklistItem[] = [
  {
    id: "v-body-shape",
    label: "Character body shape stays consistent during motion",
    group: "character",
  },
  {
    id: "v-colors",
    label: "Character colors remain consistent throughout",
    group: "character",
  },
  {
    id: "v-face",
    label: "Face, eyes, mouth, cheeks, and expression style remain consistent",
    group: "character",
  },
  {
    id: "v-accessories",
    label: "Leaf, crown, and accessories stay correct through motion",
    group: "character",
  },
  {
    id: "v-fruit-id",
    label: "Fruit identity is preserved",
    group: "character",
  },
  {
    id: "v-baby-like",
    label: "Character remains baby-like, soft, warm, and kid-friendly",
    group: "character",
  },
  {
    id: "v-no-redesign",
    label: "Character is not redesigned into a generic, realistic, adult, or scary version",
    group: "character",
  },
];

const MOTION_ITEMS: VideoFidelityChecklistItem[] = [
  {
    id: "v-movement",
    label: "Movement is gentle, clear, and appropriate for children",
    group: "motion",
  },
  {
    id: "v-no-distortion",
    label: "Animation does not distort the character",
    group: "motion",
  },
  {
    id: "v-actions-match",
    label: "Actions match the scene prompt",
    group: "motion",
  },
  {
    id: "v-expression",
    label: "Emotional expression matches the story moment",
    group: "motion",
  },
  {
    id: "v-pacing",
    label: "Pacing feels appropriate for a short children's clip",
    group: "motion",
  },
];

const ENVIRONMENT_ITEMS: VideoFidelityChecklistItem[] = [
  {
    id: "v-setting",
    label: "Setting/background matches scene and environment/home references",
    group: "environment",
  },
  {
    id: "v-props",
    label: "Props and mood fit the Fruit Baby universe",
    group: "environment",
  },
  {
    id: "v-no-distractions",
    label: "No distracting or off-brand background elements",
    group: "environment",
  },
];

const SAFETY_ITEMS: VideoFidelityChecklistItem[] = [
  {
    id: "v-safe",
    label: "No scary, violent, cruel, adult, or unsafe content",
    group: "safety",
  },
  {
    id: "v-tone",
    label: "Tone remains classroom/family friendly",
    group: "safety",
  },
  {
    id: "v-lesson",
    label: "Lesson/story mood is preserved",
    group: "safety",
  },
];

const TIKI_ITEM: VideoFidelityChecklistItem = {
  id: "v-tiki",
  label:
    "Tiki remains mischievous, funny, dramatic, and kid-friendly — not scary, evil, cruel, or too intense",
  group: "tiki",
};

// ─── Exported helpers ─────────────────────────────────────────────────────────

export function buildVideoFidelityChecklist(
  hasTiki: boolean
): VideoFidelityChecklistItem[] {
  return [
    ...CHARACTER_ITEMS,
    ...MOTION_ITEMS,
    ...ENVIRONMENT_ITEMS,
    ...SAFETY_ITEMS,
    ...(hasTiki ? [TIKI_ITEM] : []),
  ];
}

export function hasTikiInVideoScene(sceneRefPkg: SceneReferencePackage): boolean {
  return sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );
}

export function getVideoFidelityReferenceThumbnails(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): FidelityThumbnail[] {
  return getFidelityReferenceThumbnails(sceneRefPkg, charBySlug);
}

export function getVideoFidelityWarnings(
  sceneRefPkg: SceneReferencePackage
): { characterSlug: string; characterName: string; message: string }[] {
  const warnings: { characterSlug: string; characterName: string; message: string }[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    if (charPkg.profileSheets.length === 0 && charPkg.mainReferences.length === 0) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message:
          "No approved reference images for this character. Video fidelity comparison is prompt-only.",
      });
    }
    if (charPkg.environmentReferences.length === 0) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message:
          "No environment/home references found. Background consistency cannot be verified against official references.",
      });
    }
  }

  return warnings;
}
