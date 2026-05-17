import fs from "fs";
import path from "path";
import type { Character } from "@/lib/content";
import {
  PROFILE_SHEET_TYPES,
  MAIN_REFERENCE_TYPES,
  ENVIRONMENT_REFERENCE_TYPES,
} from "@/lib/characterProfileAssets";

// ─── Private constants ────────────────────────────────────────────────────────

const SUPPORTING_REF_TYPES = new Set([
  "supporting-reference",
  "expression-sheet",
  "pose-reference",
  "turnaround-reference",
  "supplemental-reference",
  "other",
]);

const PRODUCT_REF_TYPES = new Set(["product-reference"]);
const BRAND_REF_TYPES = new Set(["brand-guide"]);

function isApproved(asset: ReferenceAsset): boolean {
  return (
    asset.reviewStatus === "approved-for-generation" ||
    asset.approvedForGeneration === true ||
    asset.generationUseAllowed === true
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReferenceAsset = {
  id: string;
  characterSlug: string;
  assetType: string;
  title?: string;
  description?: string;
  notes?: string;
  blobUrl: string;
  mimeType?: string;
  fileSizeBytes?: number;
  uploadedAt?: string;
  approvedForGeneration?: boolean;
  requiresReview?: boolean;
  reviewStatus?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  generationUseAllowed?: boolean;
  publicUseAllowed?: boolean;
  isOfficialReference?: boolean;
  updatedAt?: string;
};

export type CharacterReferencePackage = {
  characterSlug: string;
  characterName: string;
  primaryReferenceUrl: string | null;
  profileSheets: ReferenceAsset[];
  mainReferences: ReferenceAsset[];
  supportingReferences: ReferenceAsset[];
  environmentReferences: ReferenceAsset[];
  productReferences: ReferenceAsset[];
  brandReferences: ReferenceAsset[];
  allApproved: ReferenceAsset[];
  isGenerationReady: boolean;
  totalApprovedCount: number;
};

export type SceneReferencePackage = {
  sceneNumber: number;
  characterSlugs: string[];
  characterPackages: CharacterReferencePackage[];
};

export type EpisodeReferencePackageSummary = {
  episodeSlug: string;
  scenePackages: SceneReferencePackage[];
  allCharacterSlugs: string[];
  totalApprovedAssets: number;
  charactersSummary: Array<{
    slug: string;
    name: string;
    assetCount: number;
    isReady: boolean;
  }>;
};

// ─── Loader ───────────────────────────────────────────────────────────────────

export function loadReferenceAssets(): ReferenceAsset[] {
  const filePath = path.join(
    process.cwd(),
    "src/content/reference-assets/character-reference-assets.json"
  );
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as {
    assets: ReferenceAsset[];
  };
  return Array.isArray(raw.assets) ? raw.assets : [];
}

// ─── Per-character filters ────────────────────────────────────────────────────

export function getApprovedReferenceAssetsForCharacter(
  slug: string,
  assets: ReferenceAsset[]
): ReferenceAsset[] {
  return assets.filter((a) => a.characterSlug === slug && isApproved(a));
}

export function getSupportingReferencesForCharacter(
  slug: string,
  assets: ReferenceAsset[]
): ReferenceAsset[] {
  return assets.filter(
    (a) => a.characterSlug === slug && isApproved(a) && SUPPORTING_REF_TYPES.has(a.assetType)
  );
}

export function getEnvironmentReferencesForCharacter(
  slug: string,
  assets: ReferenceAsset[]
): ReferenceAsset[] {
  return assets.filter(
    (a) =>
      a.characterSlug === slug && isApproved(a) && ENVIRONMENT_REFERENCE_TYPES.has(a.assetType)
  );
}

export function getProductReferencesForCharacter(
  slug: string,
  assets: ReferenceAsset[]
): ReferenceAsset[] {
  return assets.filter(
    (a) => a.characterSlug === slug && isApproved(a) && PRODUCT_REF_TYPES.has(a.assetType)
  );
}

export function getBrandReferencesForCharacter(
  slug: string,
  assets: ReferenceAsset[]
): ReferenceAsset[] {
  return assets.filter(
    (a) => a.characterSlug === slug && isApproved(a) && BRAND_REF_TYPES.has(a.assetType)
  );
}

// ─── Package builders ─────────────────────────────────────────────────────────

export function buildCharacterReferencePackage(
  character: Character,
  assets: ReferenceAsset[]
): CharacterReferencePackage {
  const slug = character.slug;
  const approved = getApprovedReferenceAssetsForCharacter(slug, assets);
  const primaryUrl =
    typeof character.primaryReferenceAssetUrl === "string" &&
    character.primaryReferenceAssetUrl.startsWith("http")
      ? character.primaryReferenceAssetUrl
      : null;

  return {
    characterSlug: slug,
    characterName: character.name,
    primaryReferenceUrl: primaryUrl,
    profileSheets: approved.filter((a) => PROFILE_SHEET_TYPES.has(a.assetType)),
    mainReferences: approved.filter((a) => MAIN_REFERENCE_TYPES.has(a.assetType)),
    supportingReferences: approved.filter((a) => SUPPORTING_REF_TYPES.has(a.assetType)),
    environmentReferences: approved.filter((a) => ENVIRONMENT_REFERENCE_TYPES.has(a.assetType)),
    productReferences: approved.filter((a) => PRODUCT_REF_TYPES.has(a.assetType)),
    brandReferences: approved.filter((a) => BRAND_REF_TYPES.has(a.assetType)),
    allApproved: approved,
    isGenerationReady: primaryUrl !== null || approved.length > 0,
    totalApprovedCount: approved.length,
  };
}

export function buildSceneReferencePackage(
  sceneNumber: number,
  characterSlugs: string[],
  assets: ReferenceAsset[],
  charBySlug: Record<string, Character>
): SceneReferencePackage {
  const packages: CharacterReferencePackage[] = [];
  for (const slug of characterSlugs) {
    const char = charBySlug[slug];
    if (char) {
      packages.push(buildCharacterReferencePackage(char, assets));
    }
  }
  return { sceneNumber, characterSlugs, characterPackages: packages };
}

export function buildEpisodeReferencePackages(
  episodeSlug: string,
  scenes: Array<Record<string, unknown>>,
  assets: ReferenceAsset[],
  charBySlug: Record<string, Character>
): EpisodeReferencePackageSummary {
  const scenePackages: SceneReferencePackage[] = [];
  const seenSlugs = new Set<string>();

  scenes.forEach((scene, i) => {
    const num =
      typeof scene.sceneNumber === "number" ? scene.sceneNumber : i + 1;
    const chars = Array.isArray(scene.characters)
      ? (scene.characters as unknown[]).filter(
          (c): c is string => typeof c === "string"
        )
      : [];
    chars.forEach((s) => seenSlugs.add(s));
    scenePackages.push(buildSceneReferencePackage(num, chars, assets, charBySlug));
  });

  const allCharacterSlugs = Array.from(seenSlugs);
  const charactersSummary = allCharacterSlugs.map((slug) => {
    const char = charBySlug[slug];
    const approved = getApprovedReferenceAssetsForCharacter(slug, assets);
    const primaryUrl =
      char &&
      typeof char.primaryReferenceAssetUrl === "string" &&
      char.primaryReferenceAssetUrl.startsWith("http")
        ? char.primaryReferenceAssetUrl
        : null;
    return {
      slug,
      name: char?.name ?? slug,
      assetCount: approved.length,
      isReady: primaryUrl !== null || approved.length > 0,
    };
  });

  const totalApprovedAssets = charactersSummary.reduce(
    (sum, c) => sum + c.assetCount,
    0
  );

  return {
    episodeSlug,
    scenePackages,
    allCharacterSlugs,
    totalApprovedAssets,
    charactersSummary,
  };
}

// ─── Prompt summary ───────────────────────────────────────────────────────────

export function summarizeReferencePackageForPrompt(
  pkg: CharacterReferencePackage
): string {
  const lines: string[] = [
    `${pkg.characterName} (${pkg.isGenerationReady ? "generation-ready" : "no approved references"})`,
  ];
  const counts: string[] = [];
  if (pkg.profileSheets.length > 0)
    counts.push(
      `${pkg.profileSheets.length} profile sheet${pkg.profileSheets.length !== 1 ? "s" : ""}`
    );
  if (pkg.mainReferences.length > 0)
    counts.push(
      `${pkg.mainReferences.length} main reference${pkg.mainReferences.length !== 1 ? "s" : ""}`
    );
  if (pkg.supportingReferences.length > 0)
    counts.push(`${pkg.supportingReferences.length} supporting`);
  if (pkg.environmentReferences.length > 0)
    counts.push(`${pkg.environmentReferences.length} environment`);
  if (pkg.productReferences.length > 0)
    counts.push(`${pkg.productReferences.length} product`);
  if (pkg.brandReferences.length > 0)
    counts.push(`${pkg.brandReferences.length} brand`);
  if (counts.length > 0) lines.push(`  Approved assets: ${counts.join(", ")}`);
  if (pkg.primaryReferenceUrl) lines.push("  Primary reference assigned");
  return lines.join("\n");
}
