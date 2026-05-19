// Generation input package for story panel image generation.
// Selects reference assets by priority, builds a strict reference bundle,
// and prepares an enriched final prompt. Server-safe. Do NOT import in client components.

import type { SceneReferencePackage, ReferenceAsset } from "@/lib/referenceAssetLoader";
import {
  buildStoryPanelReferenceBundle,
  type ReferenceBundleCounts,
} from "@/lib/storyPanelReferenceBundle";
import { buildStrictFidelityMandate } from "@/lib/storyPanelFidelityRules";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryPanelReferenceImage = {
  characterSlug: string;
  characterName: string;
  assetId: string;
  assetType: string;
  title: string;
  blobUrl: string;
  priority: "profile-sheet" | "main-reference" | "supporting" | "environment";
};

export type StoryPanelGenerationPackage = {
  panelPrompt: string;
  finalPrompt: string;
  characterSlugs: string[];
  sceneNumber?: number;
  referenceImages: StoryPanelReferenceImage[];
  omittedImages: StoryPanelReferenceImage[];
  referenceMode:
    | "reference-images-attached"
    | "strict-reference-bundle"
    | "prompt-only-reference-summary"
    | "no-references-available";
  referenceCounts: ReferenceBundleCounts;
  referencesUsed: Array<{
    characterSlug: string;
    characterName: string;
    title: string;
    type: string;
    priority: string;
  }>;
  referencesOmitted: Array<{
    characterSlug: string;
    characterName: string;
    title: string;
    type: string;
    priority: string;
  }>;
  warnings: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRefImage(
  asset: ReferenceAsset,
  characterName: string,
  priority: StoryPanelReferenceImage["priority"]
): StoryPanelReferenceImage {
  return {
    characterSlug: asset.characterSlug,
    characterName,
    assetId: asset.id,
    assetType: asset.assetType,
    title: asset.title || asset.description || asset.assetType,
    blobUrl: asset.blobUrl,
    priority,
  };
}

function toMeta(img: StoryPanelReferenceImage) {
  return {
    characterSlug: img.characterSlug,
    characterName: img.characterName,
    title: img.title,
    type: img.assetType,
    priority: img.priority,
  };
}

// ─── Legacy reference image selection (kept for omitted list) ─────────────────

const MAX_PROFILE_SHEETS_PER_CHAR = 1;
const MAX_MAIN_REFS_PER_CHAR = 1;
const MAX_SUPPORTING_REFS_PER_CHAR = 4;
const MAX_ENV_REFS_PER_CHAR = 2;
const MAX_REFS_PER_CHAR = 4;
const MAX_TOTAL_REFS = 8;

export function getReferenceImagesForStoryPanel(
  sceneRefPkg: SceneReferencePackage
): { selected: StoryPanelReferenceImage[]; omitted: StoryPanelReferenceImage[] } {
  const selected: StoryPanelReferenceImage[] = [];
  const omitted: StoryPanelReferenceImage[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const name = charPkg.characterName;
    const perChar: StoryPanelReferenceImage[] = [];
    const perCharOmitted: StoryPanelReferenceImage[] = [];

    charPkg.profileSheets.slice(0, MAX_PROFILE_SHEETS_PER_CHAR).forEach((a) =>
      perChar.push(toRefImage(a, name, "profile-sheet"))
    );
    charPkg.profileSheets.slice(MAX_PROFILE_SHEETS_PER_CHAR).forEach((a) =>
      perCharOmitted.push(toRefImage(a, name, "profile-sheet"))
    );

    const mainSlots = Math.max(0, MAX_REFS_PER_CHAR - perChar.length);
    charPkg.mainReferences.slice(0, Math.min(MAX_MAIN_REFS_PER_CHAR, mainSlots)).forEach((a) =>
      perChar.push(toRefImage(a, name, "main-reference"))
    );
    charPkg.mainReferences.slice(Math.min(MAX_MAIN_REFS_PER_CHAR, mainSlots)).forEach((a) =>
      perCharOmitted.push(toRefImage(a, name, "main-reference"))
    );

    const suppSlots = Math.max(0, MAX_REFS_PER_CHAR - perChar.length);
    charPkg.supportingReferences
      .slice(0, Math.min(MAX_SUPPORTING_REFS_PER_CHAR, suppSlots))
      .forEach((a) => perChar.push(toRefImage(a, name, "supporting")));
    charPkg.supportingReferences
      .slice(Math.min(MAX_SUPPORTING_REFS_PER_CHAR, suppSlots))
      .forEach((a) => perCharOmitted.push(toRefImage(a, name, "supporting")));

    const envSlots = Math.max(0, MAX_REFS_PER_CHAR - perChar.length);
    charPkg.environmentReferences
      .slice(0, Math.min(MAX_ENV_REFS_PER_CHAR, envSlots))
      .forEach((a) => perChar.push(toRefImage(a, name, "environment")));
    charPkg.environmentReferences
      .slice(Math.min(MAX_ENV_REFS_PER_CHAR, envSlots))
      .forEach((a) => perCharOmitted.push(toRefImage(a, name, "environment")));

    for (const img of perChar) {
      if (selected.length < MAX_TOTAL_REFS) {
        selected.push(img);
      } else {
        omitted.push(img);
      }
    }
    omitted.push(...perCharOmitted);
  }

  return { selected, omitted };
}

// ─── Package builder ──────────────────────────────────────────────────────────

export function buildStoryPanelGenerationPackage(
  sceneRefPkg: SceneReferencePackage,
  panelPrompt: string,
  options?: { sceneNumber?: number }
): StoryPanelGenerationPackage {
  // Build the strict reference bundle
  const bundle = buildStoryPanelReferenceBundle(sceneRefPkg);

  // Keep legacy selected/omitted lists for backward-compat response metadata
  const { selected, omitted } = getReferenceImagesForStoryPanel(sceneRefPkg);

  // Build the enriched final prompt:
  // - Start with the full reference-aware panel prompt (sections A–G from the caller)
  // - Append the strict reference bundle listing (section H)
  // - Append the fidelity mandate
  const fidelityMandate = buildStrictFidelityMandate(sceneRefPkg);
  const finalPrompt = [
    panelPrompt.trimEnd(),
    bundle.promptContextBlock,
    fidelityMandate,
  ].join("\n\n");

  const referenceMode: StoryPanelGenerationPackage["referenceMode"] =
    bundle.counts.total > 0 ? "strict-reference-bundle" : "no-references-available";

  return {
    panelPrompt,
    finalPrompt,
    characterSlugs: sceneRefPkg.characterSlugs,
    sceneNumber: options?.sceneNumber,
    referenceImages: selected,
    omittedImages: omitted,
    referenceMode,
    referenceCounts: bundle.counts,
    referencesUsed: selected.map(toMeta),
    referencesOmitted: omitted.map(toMeta),
    warnings: bundle.warnings,
  };
}

// ─── Final prompt ─────────────────────────────────────────────────────────────

export function buildFinalStoryPanelPrompt(pkg: StoryPanelGenerationPackage): string {
  return pkg.finalPrompt;
}

// ─── Admin summary ────────────────────────────────────────────────────────────

export function summarizeReferenceInputsForAdmin(
  pkg: StoryPanelGenerationPackage
): string {
  const lines: string[] = [`Reference mode: ${pkg.referenceMode}`];

  if (pkg.referenceImages.length > 0) {
    lines.push(`Reference assets in bundle: ${pkg.referenceImages.length}`);
    pkg.referenceImages.forEach((r) => {
      lines.push(`  • ${r.characterName} — ${r.title} [${r.priority}]`);
    });
  } else {
    lines.push("No approved reference assets found for this scene.");
  }

  if (pkg.omittedImages.length > 0) {
    lines.push(`Additional assets omitted (cap reached): ${pkg.omittedImages.length}`);
  }

  if (pkg.warnings.length > 0) {
    lines.push("Warnings:");
    pkg.warnings.forEach((w) => lines.push(`  ⚠ ${w}`));
  }

  return lines.join("\n");
}
