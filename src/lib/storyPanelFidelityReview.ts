// Fidelity review helpers for side-by-side story panel draft review.
// Server-safe — uses referenceAssetLoader and characterProfileAssets.
// Do NOT import functions (only types) in client components.

import type { SceneReferencePackage } from "@/lib/referenceAssetLoader";
import { getOfficialProfileSheetUrl, getMainCharacterImageUrl } from "@/lib/characterProfileAssets";
import type { Character } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FidelityThumbnail = {
  characterSlug: string;
  characterName: string;
  profileSheetUrl: string;
  mainImageUrl: string;
  supportingThumbnails: { url: string; title: string }[];
  envThumbnails: { url: string; title: string }[];
  totalSupportingCount: number;
  totalEnvCount: number;
  hasProfileSheet: boolean;
  isTiki: boolean;
};

export type FidelityChecklistItem = {
  id: string;
  label: string;
  isTikiSpecific: boolean;
};

export type FidelityReviewWarning = {
  characterSlug: string;
  characterName: string;
  message: string;
};

// ─── Checklist items ──────────────────────────────────────────────────────────

export const BASE_FIDELITY_CHECKLIST: FidelityChecklistItem[] = [
  { id: "body-shape",     label: "Character body shape matches official reference",                   isTikiSpecific: false },
  { id: "colors",         label: "Character colors match official reference",                         isTikiSpecific: false },
  { id: "face",           label: "Face, eyes, mouth, and cheeks match official reference",            isTikiSpecific: false },
  { id: "accessories",    label: "Leaf, crown, and accessories are correct",                          isTikiSpecific: false },
  { id: "fruit-identity", label: "Fruit identity is preserved",                                       isTikiSpecific: false },
  { id: "baby-like",      label: "Character remains baby-like, soft, and kid-friendly",              isTikiSpecific: false },
  { id: "no-redesign",    label: "Character was not redesigned into a generic or realistic version",  isTikiSpecific: false },
  { id: "environment",    label: "Scene environment matches approved setting and home references",     isTikiSpecific: false },
  { id: "mood",           label: "Mood and lesson tone feel appropriate",                             isTikiSpecific: false },
  { id: "safe-content",   label: "No scary, adult, violent, cruel, or off-brand content",            isTikiSpecific: false },
];

export const TIKI_CHECKLIST_ITEM: FidelityChecklistItem = {
  id: "tiki-character",
  label: "Tiki remains mischievous, funny, dramatic, and kid-friendly — not scary or evil",
  isTikiSpecific: true,
};

export function buildFidelityChecklist(hasTiki: boolean): FidelityChecklistItem[] {
  return hasTiki ? [...BASE_FIDELITY_CHECKLIST, TIKI_CHECKLIST_ITEM] : [...BASE_FIDELITY_CHECKLIST];
}

// ─── Tiki detection ───────────────────────────────────────────────────────────

export function hasTikiInScene(sceneRefPkg: SceneReferencePackage): boolean {
  return sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );
}

// ─── Reference thumbnails ─────────────────────────────────────────────────────

/**
 * Builds per-character thumbnail data for the fidelity review panel.
 * Profile sheet priority: approved blob asset → character profile sheet → canonical fallback.
 * Up to 2 supporting and 2 environment thumbnails per character.
 */
export function getFidelityReferenceThumbnails(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): FidelityThumbnail[] {
  return sceneRefPkg.characterPackages.map((charPkg) => {
    const char = charBySlug[charPkg.characterSlug];

    const profileSheetUrl =
      charPkg.profileSheets[0]?.blobUrl ||
      (char ? getOfficialProfileSheetUrl(char) : "");

    const mainImageUrl =
      charPkg.mainReferences[0]?.blobUrl ||
      (char ? getMainCharacterImageUrl(char) : "");

    const supportingThumbnails = charPkg.supportingReferences.slice(0, 2).map((a) => ({
      url: a.blobUrl,
      title: a.title || a.description || a.assetType,
    }));

    const envThumbnails = charPkg.environmentReferences.slice(0, 2).map((a) => ({
      url: a.blobUrl,
      title: a.title || a.description || a.assetType,
    }));

    const isTiki =
      charPkg.characterSlug === "tiki" || charPkg.characterSlug === "tiki-trouble";

    return {
      characterSlug: charPkg.characterSlug,
      characterName: charPkg.characterName,
      profileSheetUrl,
      mainImageUrl,
      supportingThumbnails,
      envThumbnails,
      totalSupportingCount: charPkg.supportingReferences.length,
      totalEnvCount: charPkg.environmentReferences.length,
      hasProfileSheet: Boolean(profileSheetUrl),
      isTiki,
    };
  });
}

// ─── Review warnings ──────────────────────────────────────────────────────────

export function getFidelityWarnings(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): FidelityReviewWarning[] {
  const warnings: FidelityReviewWarning[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];

    if (charPkg.profileSheets.length === 0) {
      const fallback = char ? getOfficialProfileSheetUrl(char) : "";
      if (!fallback) {
        warnings.push({
          characterSlug: charPkg.characterSlug,
          characterName: charPkg.characterName,
          message:
            "No official profile sheet found. Compare against any available character reference images.",
        });
      }
    }

    if (!charPkg.isGenerationReady) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message:
          "No approved reference assets found. Character design relies on text description only.",
      });
    }

    if (charPkg.environmentReferences.length === 0) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message:
          "No environment or home references found. Scene background cannot be compared against official references.",
      });
    }
  }

  return warnings;
}
