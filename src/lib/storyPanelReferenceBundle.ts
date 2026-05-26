// Strict reference bundle builder for story panel generation.
// Selects approved reference assets in priority order and produces a structured
// bundle with a prompt context block ready for injection into the generation prompt.
// Server-safe — do NOT import in client components.

import type { SceneReferencePackage, CharacterReferencePackage } from "@/lib/referenceAssetLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BundleAssetRole =
  | "profile-sheet"
  | "main-reference"
  | "supporting"
  | "environment";

export type BundleAsset = {
  id: string;
  characterSlug: string;
  characterName: string;
  title: string;
  assetType: string;
  url: string;
  role: BundleAssetRole;
  isOfficial: boolean;
};

export type CharacterBundleSummary = {
  characterSlug: string;
  characterName: string;
  profileSheetCount: number;
  mainReferenceCount: number;
  supportingCount: number;
  environmentCount: number;
  totalCount: number;
  isReady: boolean;
  warnings: string[];
};

export type ReferenceBundleCounts = {
  total: number;
  profileSheets: number;
  mainReferences: number;
  supporting: number;
  environment: number;
};

export type StoryPanelReferenceBundle = {
  referenceMode: "strict-reference-bundle" | "no-references-available";
  characterSlugs: string[];
  assets: BundleAsset[];
  characterSummaries: CharacterBundleSummary[];
  counts: ReferenceBundleCounts;
  warnings: string[];
  promptContextBlock: string;
};

// ─── Production reference set (one canonical URL per character) ───────────────

export type ProductionCharacterRef = {
  characterSlug: string;
  characterName: string;
  canonicalUrl: string;
  canonicalRole: BundleAssetRole;
  canonicalTitle: string;
};

export type ProductionReferenceSet = {
  characterRefs: ProductionCharacterRef[];
  environmentUrl: string | undefined;
  allUrls: string[];
  characterReferenceCount: number;
  supportingReferenceCount: number;
  environmentReferenceCount: number;
  passedToProviderCount: number;
  sceneCharacterCount: number;
  environmentReferenceUsedAsImage: boolean;
  environmentReferenceUsedAsText: boolean;
  warnings: string[];
};

export function buildProductionReferenceSet(
  sceneRefPkg: SceneReferencePackage,
  useEnvImageRef: boolean = false
): ProductionReferenceSet {
  const warnings: string[] = [];
  const characterRefs: ProductionCharacterRef[] = [];
  let environmentUrl: string | undefined;

  for (const charPkg of sceneRefPkg.characterPackages) {
    // Priority: mainReferences[0] → profileSheets[0] → supportingReferences[0]
    const canonicalRaw =
      charPkg.mainReferences[0] ??
      charPkg.profileSheets[0] ??
      charPkg.supportingReferences[0];

    if (!canonicalRaw?.blobUrl) {
      warnings.push(
        `${charPkg.characterName}: No reference asset found — character will appear without a visual reference anchor.`
      );
      continue;
    }

    const canonicalRole: BundleAssetRole =
      charPkg.mainReferences.length > 0
        ? "main-reference"
        : charPkg.profileSheets.length > 0
        ? "profile-sheet"
        : "supporting";

    characterRefs.push({
      characterSlug: charPkg.characterSlug,
      characterName: charPkg.characterName,
      canonicalUrl: canonicalRaw.blobUrl,
      canonicalRole,
      canonicalTitle: canonicalRaw.title || canonicalRaw.assetType,
    });
  }

  // One environment ref for the whole scene — first available from any character
  for (const charPkg of sceneRefPkg.characterPackages) {
    const envAsset = charPkg.environmentReferences[0];
    if (!environmentUrl && envAsset?.blobUrl) {
      environmentUrl = envAsset.blobUrl;
    }
  }

  const allUrls: string[] = [
    ...characterRefs.map((r) => r.canonicalUrl),
    ...(useEnvImageRef && environmentUrl ? [environmentUrl] : []),
  ];

  return {
    characterRefs,
    environmentUrl,
    allUrls,
    characterReferenceCount: characterRefs.length,
    supportingReferenceCount: 0,
    environmentReferenceCount: environmentUrl ? 1 : 0,
    passedToProviderCount: allUrls.length,
    sceneCharacterCount: sceneRefPkg.characterPackages.length,
    environmentReferenceUsedAsImage: useEnvImageRef && Boolean(environmentUrl),
    environmentReferenceUsedAsText: !useEnvImageRef && Boolean(environmentUrl),
    warnings,
  };
}

// ─── Selection limits ─────────────────────────────────────────────────────────

const MAX_PROFILE_SHEETS_PER_CHAR = 1;
const MAX_MAIN_REFS_PER_CHAR = 1;
const MAX_SUPPORTING_PER_CHAR = 4;
const MAX_ENV_PER_CHAR = 2;
const MAX_TOTAL = 8;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickCharacterAssets(
  charPkg: CharacterReferencePackage
): { selected: BundleAsset[]; summary: CharacterBundleSummary } {
  const selected: BundleAsset[] = [];
  const warnings: string[] = [];

  const push = (
    assets: CharacterReferencePackage["profileSheets"],
    role: BundleAssetRole,
    max: number
  ) => {
    assets.slice(0, max).forEach((a) =>
      selected.push({
        id: a.id,
        characterSlug: a.characterSlug,
        characterName: charPkg.characterName,
        title: a.title || a.description || a.assetType,
        assetType: a.assetType,
        url: a.blobUrl,
        role,
        isOfficial: a.isOfficialReference === true,
      })
    );
  };

  push(charPkg.profileSheets, "profile-sheet", MAX_PROFILE_SHEETS_PER_CHAR);
  push(charPkg.mainReferences, "main-reference", MAX_MAIN_REFS_PER_CHAR);
  push(charPkg.supportingReferences, "supporting", MAX_SUPPORTING_PER_CHAR);
  push(charPkg.environmentReferences, "environment", MAX_ENV_PER_CHAR);

  if (!charPkg.isGenerationReady) {
    warnings.push(
      `${charPkg.characterName}: No approved reference assets found. Upload and approve an official profile sheet.`
    );
  } else if (
    charPkg.profileSheets.length === 0 &&
    charPkg.mainReferences.length === 0
  ) {
    warnings.push(
      `${charPkg.characterName}: No official profile sheet or main reference. Supporting references used as fallback.`
    );
  }

  const summary: CharacterBundleSummary = {
    characterSlug: charPkg.characterSlug,
    characterName: charPkg.characterName,
    profileSheetCount: Math.min(charPkg.profileSheets.length, MAX_PROFILE_SHEETS_PER_CHAR),
    mainReferenceCount: Math.min(charPkg.mainReferences.length, MAX_MAIN_REFS_PER_CHAR),
    supportingCount: Math.min(charPkg.supportingReferences.length, MAX_SUPPORTING_PER_CHAR),
    environmentCount: Math.min(charPkg.environmentReferences.length, MAX_ENV_PER_CHAR),
    totalCount: selected.length,
    isReady: charPkg.isGenerationReady,
    warnings,
  };

  return { selected, summary };
}

function buildPromptContextBlock(
  assets: BundleAsset[],
  summaries: CharacterBundleSummary[]
): string {
  const lines: string[] = [
    "=== H. STRICT REFERENCE BUNDLE ===",
    "This generation uses a strict reference-anchored production pipeline.",
    "The approved official reference assets listed below are the PRIMARY source of truth.",
    "Match these references exactly. Do not substitute or improvise character design.",
    "",
  ];

  const byChar: Record<string, BundleAsset[]> = {};
  for (const asset of assets) {
    if (!byChar[asset.characterSlug]) byChar[asset.characterSlug] = [];
    byChar[asset.characterSlug].push(asset);
  }

  for (const summary of summaries) {
    const charAssets = byChar[summary.characterSlug] ?? [];
    lines.push(`${summary.characterName}:`);

    if (summary.profileSheetCount > 0) {
      const items = charAssets.filter((a) => a.role === "profile-sheet");
      lines.push(
        `  Profile Sheet (${summary.profileSheetCount}) [PRIMARY VISUAL SOURCE OF TRUTH]: ${items.map((a) => `"${a.title}"`).join(", ")}`
      );
    } else {
      lines.push("  Profile Sheet: NOT AVAILABLE — rely on visual identity description below");
    }

    if (summary.mainReferenceCount > 0) {
      const items = charAssets.filter((a) => a.role === "main-reference");
      lines.push(
        `  Main Reference (${summary.mainReferenceCount}): ${items.map((a) => `"${a.title}"`).join(", ")}`
      );
    }

    if (summary.supportingCount > 0) {
      const items = charAssets.filter((a) => a.role === "supporting");
      lines.push(
        `  Supporting (${summary.supportingCount}): ${items.map((a) => `"${a.title}"`).join(", ")}`
      );
    }

    if (summary.environmentCount > 0) {
      const items = charAssets.filter((a) => a.role === "environment");
      lines.push(
        `  Environment/Home (${summary.environmentCount}): ${items.map((a) => `"${a.title}"`).join(", ")}`
      );
    }

    summary.warnings.forEach((w) => lines.push(`  ⚠ ${w}`));
    lines.push("");
  }

  const total = assets.length;
  lines.push(`Bundle total: ${total} approved asset${total !== 1 ? "s" : ""}`);
  lines.push("Reference mode: Strict Reference-Anchored Production Bundle");

  return lines.join("\n");
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildStoryPanelReferenceBundle(
  sceneRefPkg: SceneReferencePackage
): StoryPanelReferenceBundle {
  const allSelected: BundleAsset[] = [];
  const characterSummaries: CharacterBundleSummary[] = [];
  const globalWarnings: string[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const { selected, summary } = pickCharacterAssets(charPkg);
    const remaining = MAX_TOTAL - allSelected.length;
    allSelected.push(...selected.slice(0, remaining));
    characterSummaries.push(summary);
    globalWarnings.push(...summary.warnings);
  }

  const counts: ReferenceBundleCounts = {
    total: allSelected.length,
    profileSheets: allSelected.filter((a) => a.role === "profile-sheet").length,
    mainReferences: allSelected.filter((a) => a.role === "main-reference").length,
    supporting: allSelected.filter((a) => a.role === "supporting").length,
    environment: allSelected.filter((a) => a.role === "environment").length,
  };

  return {
    referenceMode:
      counts.total > 0 ? "strict-reference-bundle" : "no-references-available",
    characterSlugs: sceneRefPkg.characterSlugs,
    assets: allSelected,
    characterSummaries,
    counts,
    warnings: globalWarnings,
    promptContextBlock: buildPromptContextBlock(allSelected, characterSummaries),
  };
}
