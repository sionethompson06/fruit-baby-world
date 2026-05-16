// Canonical character profile asset resolver.
// Determines the correct official profile sheet, main image, and supplemental references.
// Safe to import in server components — does not use fs directly.

import type { Character } from "@/lib/content";

// ─── Asset type classification ─────────────────────────────────────────────────

export const PROFILE_SHEET_TYPES = new Set([
  "official-profile-reference",
  "profile-sheet",
]);

export const MAIN_REFERENCE_TYPES = new Set([
  "isolated-character-reference",
  "main-character-reference",
]);

export const SUPPLEMENTAL_REFERENCE_TYPES = new Set([
  "supporting-reference",
  "expression-sheet",
  "pose-reference",
  "turnaround-reference",
  "brand-guide",
  "product-reference",
  "scene-style-reference",
  "supplemental-reference",
  "other",
]);

export const ENVIRONMENT_REFERENCE_TYPES = new Set([
  "character-environment-reference",
  "environment-reference",
  "home-reference",
  "scene-style-reference",
]);

// ─── Original canonical fallback profile sheets ────────────────────────────────
// Used only when image.profileSheet is absent or conflicted.

const CANONICAL_PROFILE_SHEETS: Record<string, string> = {
  "pineapple-baby": "/characters/pineapple-baby/Pineapple Profile.png",
  "ube-baby": "/characters/ube-baby/Ube Profile.png",
  "kiwi-baby": "/characters/kiwi-baby/Kiwi Profile.png",
  "coconut-baby": "/characters/coconut-baby/Coconut Profile.png",
  "mango-baby": "/characters/mango-baby/Mango Profile.png",
  tiki: "/characters/tiki/Tiki Profile.png",
  "tiki-trouble": "/characters/tiki/Tiki Profile.png",
};

// ─── Reference asset shape ─────────────────────────────────────────────────────

export type ReferenceAssetLike = {
  id?: string;
  characterSlug?: string;
  assetType?: string;
  reviewStatus?: string;
  approvedForGeneration?: boolean;
  generationUseAllowed?: boolean;
  isOfficialReference?: boolean;
  blobUrl?: string;
  url?: string;
  title?: string;
  [key: string]: unknown;
};

// ─── Internal helpers ──────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isValidUrl(url: string): boolean {
  return Boolean(url) && (url.startsWith("http") || url.startsWith("/"));
}

// ─── Type classification ───────────────────────────────────────────────────────

export function isProfileSheetAssetType(assetType: string | undefined): boolean {
  return PROFILE_SHEET_TYPES.has(assetType ?? "");
}

export function isMainReferenceAssetType(assetType: string | undefined): boolean {
  return MAIN_REFERENCE_TYPES.has(assetType ?? "");
}

export function isSupplementalReferenceAssetType(assetType: string | undefined): boolean {
  if (!assetType) return false;
  return SUPPLEMENTAL_REFERENCE_TYPES.has(assetType) ||
    (!PROFILE_SHEET_TYPES.has(assetType) && !MAIN_REFERENCE_TYPES.has(assetType));
}

export function isEnvironmentReferenceAssetType(assetType: string | undefined): boolean {
  return ENVIRONMENT_REFERENCE_TYPES.has(assetType ?? "");
}

export function isSceneStyleReferenceAssetType(assetType: string | undefined): boolean {
  return assetType === "scene-style-reference";
}

/** Canonical normalization — maps legacy/alias types to their canonical form. */
export function normalizeReferenceAssetType(assetType: string | undefined): string {
  const t = assetType?.trim() ?? "";
  if (t === "environment-reference" || t === "home-reference") return "character-environment-reference";
  if (t === "character-sheet" || t === "reference-guide") return "supplemental-reference";
  return t;
}

/** Returns a semantic purpose category for use in prompt/story planning. */
export function getReferenceAssetPurpose(
  asset: ReferenceAssetLike
): "character-profile" | "character-main" | "character-support" | "character-environment" | "scene-style" | "product" | "brand" | "other" {
  const t = safeStr(asset.assetType);
  if (PROFILE_SHEET_TYPES.has(t)) return "character-profile";
  if (MAIN_REFERENCE_TYPES.has(t)) return "character-main";
  if (t === "character-environment-reference" || t === "environment-reference" || t === "home-reference") return "character-environment";
  if (t === "scene-style-reference") return "scene-style";
  if (t === "product-reference") return "product";
  if (t === "brand-guide") return "brand";
  if (
    t === "supporting-reference" || t === "expression-sheet" || t === "pose-reference" ||
    t === "turnaround-reference" || t === "supplemental-reference"
  ) return "character-support";
  return "other";
}

export function getReferenceAssetDisplayRole(asset: ReferenceAssetLike): string {
  const t = safeStr(asset.assetType);
  if (PROFILE_SHEET_TYPES.has(t)) return "Official Profile Sheet";
  if (MAIN_REFERENCE_TYPES.has(t)) return "Main Character Image";
  if (t === "supporting-reference") return "Supporting Reference";
  if (t === "expression-sheet") return "Expression Reference";
  if (t === "pose-reference") return "Pose Reference";
  if (t === "turnaround-reference") return "Turnaround Reference";
  if (t === "brand-guide") return "Brand Guide";
  if (t === "product-reference") return "Product Reference";
  if (t === "character-environment-reference") return "Character Environment / Home Reference";
  if (t === "environment-reference") return "Environment Reference";
  if (t === "home-reference") return "Home Reference";
  if (t === "scene-style-reference") return "Scene / Style Reference";
  return "Supplemental Reference";
}

// ─── Core resolvers ────────────────────────────────────────────────────────────

/**
 * Returns the official profile sheet URL for a character.
 *
 * Priority:
 * 1. image.profileSheet — skipped if it matches a supplemental primaryReferenceAssetUrl
 * 2. primaryReferenceAssetUrl — only if primaryReferenceAssetType is a profile-sheet type
 * 3. Canonical fallback path for original characters
 * 4. Empty string
 */
export function getOfficialProfileSheetUrl(c: Character): string {
  const raw = c as Character & Record<string, unknown>;

  const profileSheet = c.image?.profileSheet?.trim() ?? "";
  if (isValidUrl(profileSheet)) {
    const primaryUrl = safeStr(c.primaryReferenceAssetUrl);
    const primaryType = safeStr(raw.primaryReferenceAssetType);
    const isSupplementalConflict =
      profileSheet === primaryUrl && SUPPLEMENTAL_REFERENCE_TYPES.has(primaryType);
    if (!isSupplementalConflict) return profileSheet;
  }

  const primaryUrl = safeStr(c.primaryReferenceAssetUrl);
  const primaryType = safeStr(raw.primaryReferenceAssetType);
  if (isValidUrl(primaryUrl) && PROFILE_SHEET_TYPES.has(primaryType)) return primaryUrl;

  const canonical = CANONICAL_PROFILE_SHEETS[c.slug];
  if (canonical) return canonical;

  return "";
}

/**
 * Returns the main isolated character image URL.
 * Priority: image.main → mainReferenceAssetUrl → primaryRef (if main type) → profile sheet fallback
 */
export function getMainCharacterImageUrl(c: Character): string {
  const raw = c as Character & Record<string, unknown>;

  const main = c.image?.main?.trim() ?? "";
  if (isValidUrl(main)) return main;

  const mainRef = safeStr(raw.mainReferenceAssetUrl);
  if (isValidUrl(mainRef)) return mainRef;

  const primaryUrl = safeStr(c.primaryReferenceAssetUrl);
  const primaryType = safeStr(raw.primaryReferenceAssetType);
  if (isValidUrl(primaryUrl) && MAIN_REFERENCE_TYPES.has(primaryType)) return primaryUrl;

  return getOfficialProfileSheetUrl(c);
}

/**
 * Returns the best image URL for cards and thumbnails.
 * Priority: image.main → mainReferenceAssetUrl → official profile sheet
 */
export function getCharacterCardImageUrl(c: Character): string {
  const raw = c as Character & Record<string, unknown>;
  const main = c.image?.main?.trim() ?? "";
  if (isValidUrl(main)) return main;
  const mainRef = safeStr(raw.mainReferenceAssetUrl);
  if (isValidUrl(mainRef)) return mainRef;
  return getOfficialProfileSheetUrl(c);
}

/**
 * Returns the primary reference asset from a list, preferring profile-sheet types.
 */
export function getPrimaryReferenceAsset(
  c: Character,
  referenceAssets: ReferenceAssetLike[]
): ReferenceAssetLike | undefined {
  const slug = c.slug;
  const charAssets = referenceAssets.filter((a) => a.characterSlug === slug);
  const raw = c as Character & Record<string, unknown>;
  const assignedId = safeStr(raw.primaryReferenceAssetId);
  if (assignedId) {
    const byId = charAssets.find((a) => a.id === assignedId);
    if (byId) return byId;
  }
  return charAssets.find(
    (a) =>
      PROFILE_SHEET_TYPES.has(safeStr(a.assetType)) &&
      (a.reviewStatus === "approved-for-generation" || a.approvedForGeneration === true)
  );
}

/**
 * Returns supplemental (non-profile-sheet, non-main) reference assets for a character.
 */
export function getSupplementalReferenceAssets(
  characterSlug: string,
  referenceAssets: ReferenceAssetLike[]
): ReferenceAssetLike[] {
  return referenceAssets.filter(
    (a) =>
      a.characterSlug === characterSlug &&
      !PROFILE_SHEET_TYPES.has(safeStr(a.assetType)) &&
      !MAIN_REFERENCE_TYPES.has(safeStr(a.assetType))
  );
}

// ─── Asset summary ─────────────────────────────────────────────────────────────

export type CharacterProfileAssetSummary = {
  officialProfileSheetUrl: string;
  mainCharacterImageUrl: string;
  characterCardImageUrl: string;
  profileSheetSource: "local" | "blob" | "missing";
  hasOfficialProfileSheet: boolean;
  hasMainImage: boolean;
  supplementalAssets: ReferenceAssetLike[];
  profileAssetWarnings: string[];
};

export function getCharacterProfileAssetSummary(
  c: Character,
  referenceAssets?: ReferenceAssetLike[]
): CharacterProfileAssetSummary {
  const raw = c as Character & Record<string, unknown>;
  const officialProfileSheetUrl = getOfficialProfileSheetUrl(c);
  const mainCharacterImageUrl = getMainCharacterImageUrl(c);
  const characterCardImageUrl = getCharacterCardImageUrl(c);
  const warnings: string[] = [];

  const profileSheet = c.image?.profileSheet?.trim() ?? "";
  const primaryUrl = safeStr(c.primaryReferenceAssetUrl);
  const primaryType = safeStr(raw.primaryReferenceAssetType);
  if (profileSheet && profileSheet === primaryUrl && SUPPLEMENTAL_REFERENCE_TYPES.has(primaryType)) {
    warnings.push(
      `image.profileSheet is set to a supplemental asset (${primaryType}) — official profile sheet falls back to canonical file`
    );
  }

  if (!officialProfileSheetUrl) warnings.push("No official profile sheet found");

  const profileSheetSource: "local" | "blob" | "missing" = officialProfileSheetUrl
    ? officialProfileSheetUrl.startsWith("http")
      ? "blob"
      : "local"
    : "missing";

  const supplementalAssets = referenceAssets
    ? getSupplementalReferenceAssets(c.slug, referenceAssets)
    : [];

  return {
    officialProfileSheetUrl,
    mainCharacterImageUrl,
    characterCardImageUrl,
    profileSheetSource,
    hasOfficialProfileSheet: Boolean(officialProfileSheetUrl),
    hasMainImage: Boolean(c.image?.main?.trim()),
    supplementalAssets,
    profileAssetWarnings: warnings,
  };
}
