// Generation input package for story panel image generation.
// Selects reference assets by priority and prepares the final prompt.
// Server-safe. Do NOT import in client components.
//
// NOTE: DALL-E 3 only accepts text prompts — reference images cannot be passed
// as image inputs. referenceMode is therefore always "prompt-only-reference-summary"
// when reference assets exist.
// TODO: When upgrading to a provider that supports image reference inputs (e.g. a
// future OpenAI model or Stability AI), set referenceMode = "reference-images-attached"
// and pass referenceImages[].blobUrl to the provider.

import type { SceneReferencePackage, ReferenceAsset } from "@/lib/referenceAssetLoader";

// ─── Limits ───────────────────────────────────────────────────────────────────

const MAX_PROFILE_SHEETS_PER_CHAR = 1;
const MAX_MAIN_REFS_PER_CHAR = 1;
const MAX_SUPPORTING_REFS_PER_CHAR = 3;
const MAX_ENV_REFS_PER_CHAR = 2;
const MAX_REFS_PER_CHAR = 4;
const MAX_TOTAL_REFS = 8;

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
    | "prompt-only-reference-summary"
    | "no-references-available";
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

// ─── Reference image selection ────────────────────────────────────────────────

/**
 * Selects reference images in priority order:
 * 1. Profile sheet (max 1 per char)
 * 2. Main reference (max 1 per char)
 * 3. Supporting references (max 3 per char)
 * 4. Environment references (max 2 per char)
 * Total cap: 4 per character, 8 overall.
 */
export function getReferenceImagesForStoryPanel(
  sceneRefPkg: SceneReferencePackage
): { selected: StoryPanelReferenceImage[]; omitted: StoryPanelReferenceImage[] } {
  const selected: StoryPanelReferenceImage[] = [];
  const omitted: StoryPanelReferenceImage[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const name = charPkg.characterName;
    const perChar: StoryPanelReferenceImage[] = [];
    const perCharOmitted: StoryPanelReferenceImage[] = [];

    // 1. Profile sheets
    charPkg.profileSheets.slice(0, MAX_PROFILE_SHEETS_PER_CHAR).forEach((a) =>
      perChar.push(toRefImage(a, name, "profile-sheet"))
    );
    charPkg.profileSheets.slice(MAX_PROFILE_SHEETS_PER_CHAR).forEach((a) =>
      perCharOmitted.push(toRefImage(a, name, "profile-sheet"))
    );

    // 2. Main references
    const mainSlots = Math.max(0, MAX_REFS_PER_CHAR - perChar.length);
    charPkg.mainReferences.slice(0, Math.min(MAX_MAIN_REFS_PER_CHAR, mainSlots)).forEach((a) =>
      perChar.push(toRefImage(a, name, "main-reference"))
    );
    charPkg.mainReferences.slice(Math.min(MAX_MAIN_REFS_PER_CHAR, mainSlots)).forEach((a) =>
      perCharOmitted.push(toRefImage(a, name, "main-reference"))
    );

    // 3. Supporting references
    const suppSlots = Math.max(0, MAX_REFS_PER_CHAR - perChar.length);
    charPkg.supportingReferences
      .slice(0, Math.min(MAX_SUPPORTING_REFS_PER_CHAR, suppSlots))
      .forEach((a) => perChar.push(toRefImage(a, name, "supporting")));
    charPkg.supportingReferences
      .slice(Math.min(MAX_SUPPORTING_REFS_PER_CHAR, suppSlots))
      .forEach((a) => perCharOmitted.push(toRefImage(a, name, "supporting")));

    // 4. Environment references
    const envSlots = Math.max(0, MAX_REFS_PER_CHAR - perChar.length);
    charPkg.environmentReferences
      .slice(0, Math.min(MAX_ENV_REFS_PER_CHAR, envSlots))
      .forEach((a) => perChar.push(toRefImage(a, name, "environment")));
    charPkg.environmentReferences
      .slice(Math.min(MAX_ENV_REFS_PER_CHAR, envSlots))
      .forEach((a) => perCharOmitted.push(toRefImage(a, name, "environment")));

    // Apply total cap
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
  const { selected, omitted } = getReferenceImagesForStoryPanel(sceneRefPkg);
  const warnings: string[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    if (!charPkg.isGenerationReady) {
      warnings.push(
        `${charPkg.characterName}: No approved reference assets found. Character described from profile only.`
      );
    } else if (charPkg.profileSheets.length === 0 && charPkg.mainReferences.length === 0) {
      warnings.push(
        `${charPkg.characterName}: No official profile sheet or main reference found. Supporting references used.`
      );
    }
  }

  // DALL-E 3 is text-only — image inputs are not supported.
  // referenceMode reflects what could be sent to an image-input-capable provider.
  const referenceMode: StoryPanelGenerationPackage["referenceMode"] =
    selected.length > 0 ? "prompt-only-reference-summary" : "no-references-available";

  return {
    panelPrompt,
    finalPrompt: panelPrompt,
    characterSlugs: sceneRefPkg.characterSlugs,
    sceneNumber: options?.sceneNumber,
    referenceImages: selected,
    omittedImages: omitted,
    referenceMode,
    referencesUsed: selected.map(toMeta),
    referencesOmitted: omitted.map(toMeta),
    warnings,
  };
}

// ─── Final prompt ─────────────────────────────────────────────────────────────

/**
 * Returns the prompt to send to the image generation provider.
 * With DALL-E 3 (text-only), this is the reference-aware text prompt as-is.
 * With a future image-input provider, this could also attach reference image URLs.
 */
export function buildFinalStoryPanelPrompt(pkg: StoryPanelGenerationPackage): string {
  return pkg.finalPrompt;
}

// ─── Admin summary ────────────────────────────────────────────────────────────

export function summarizeReferenceInputsForAdmin(
  pkg: StoryPanelGenerationPackage
): string {
  const lines: string[] = [`Reference mode: ${pkg.referenceMode}`];

  if (pkg.referenceImages.length > 0) {
    lines.push(`Reference assets available for context: ${pkg.referenceImages.length}`);
    pkg.referenceImages.forEach((r) => {
      lines.push(`  • ${r.characterName} — ${r.title} [${r.priority}]`);
    });
  } else {
    lines.push("No approved reference assets found for this scene.");
  }

  if (pkg.omittedImages.length > 0) {
    lines.push(`Additional assets omitted (exceeded per-character or total limit): ${pkg.omittedImages.length}`);
  }

  if (pkg.warnings.length > 0) {
    lines.push("Warnings:");
    pkg.warnings.forEach((w) => lines.push(`  ⚠ ${w}`));
  }

  return lines.join("\n");
}
