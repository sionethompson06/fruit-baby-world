// Read-time character profile normalizer.
// Converts any character JSON (original or new) into one consistent profile shape.
// Server-safe — does not write JSON, does not import fs.
// Do NOT import in client components without verifying no fs-importing deps.

import type { Character, ColorSwatch } from "@/lib/content";
import { formatCharacterSlug } from "@/lib/characterRegistry";

// ─── Shared reference asset type ──────────────────────────────────────────────

export type ReferenceAssetInput = {
  characterSlug: string;
  reviewStatus?: string;
  approvedForGeneration?: boolean;
  generationUseAllowed?: boolean;
  isOfficialReference?: boolean;
  blobUrl?: string;
  [key: string]: unknown;
};

// ─── Normalized profile type ──────────────────────────────────────────────────

export type NormalizedCharacterProfile = {
  slug: string;
  name: string;
  shortName: string;
  displayName: string;
  role: string;
  type: string;
  fruitType: string;
  home: string;
  approvalMode: "draft" | "official-internal" | "public" | "archived" | string;
  statusLabel: string;
  publicStatus: string;
  isOriginalCanonical: boolean;
  isPublic: boolean;
  isAdminUsable: boolean;

  tagline: string;
  shortDescription: string;
  storyRole: string;
  about: string;
  personalityTraits: string[];
  personalitySummary: string;
  voiceGuide: string;
  favoriteQuote: string;
  signatureQuote: string;

  visualIdentitySummary: string;
  colorPalette: Array<{ name: string; hex?: string; usage?: string }>;

  bodyShapeRules: string[];
  faceAndExpressionRules: string[];
  textureAndSurfaceRules: string[];
  leafCrownAccessoryRules: string[];
  poseAndGestureRules: string[];

  alwaysRules: string[];
  neverRules: string[];
  characterRules: string[];
  doNotChangeRules: string[];
  generationRestrictions: string[];
  trademarkNotes: string;

  profileImageUrl: string;
  mainImageUrl: string;
  profileSheetUrl: string;
  primaryReferenceAssetId: string;
  primaryReferenceAssetUrl: string;
  primaryReferenceAssetType: string;
  imageAlt: string;

  approvedReferenceCount: number;
  hasPrimaryReference: boolean;
  hasProfileImage: boolean;
  hasColorPalette: boolean;
  hasVisualIdentity: boolean;
  hasCharacterRules: boolean;
  hasGenerationRestrictions: boolean;
  profileComplete: boolean;
  readinessWarnings: string[];
};

// ─── Original canonical slugs ──────────────────────────────────────────────────

const ORIGINAL_SLUGS = new Set([
  "pineapple-baby",
  "ube-baby",
  "kiwi-baby",
  "coconut-baby",
  "mango-baby",
  "tiki",
]);

const SLUG_DISPLAY_NAMES: Record<string, string> = {
  "pineapple-baby": "Pineapple Baby",
  "ube-baby": "Ube Baby",
  "kiwi-baby": "Kiwi Baby",
  "coconut-baby": "Coconut Baby",
  "mango-baby": "Mango Baby",
  tiki: "Tiki Trouble",
  "tiki-trouble": "Tiki Trouble",
};

// ─── Internal field extractors ────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function safeStrArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Extract color palette from whichever structure exists. */
export function getCharacterColorPalette(
  c: Character
): Array<{ name: string; hex?: string; usage?: string }> {
  const raw = c as Character & Record<string, unknown>;

  // 1. Top-level colorPalette array (new style, if ever added)
  if (Array.isArray(raw.colorPalette)) {
    const result: Array<{ name: string; hex?: string; usage?: string }> = [];
    for (const item of raw.colorPalette as unknown[]) {
      if (typeof item === "string" && item.trim()) {
        result.push({ name: item.trim() });
      } else if (typeof item === "object" && item !== null) {
        const o = item as Record<string, unknown>;
        if (typeof o.name === "string" || typeof o.hex === "string") {
          result.push({
            name: safeStr(o.name) || safeStr(o.hex) || "Color",
            hex: typeof o.hex === "string" ? o.hex : undefined,
            usage: typeof o.usage === "string" ? o.usage : undefined,
          });
        }
      }
    }
    if (result.length > 0) return result;
  }

  // 2. visualIdentity.palette (rich swatch objects)
  const vi = c.visualIdentity as Record<string, unknown> | undefined;
  if (vi && Array.isArray(vi.palette)) {
    const result: Array<{ name: string; hex?: string; usage?: string }> = [];
    for (const swatch of vi.palette as unknown[]) {
      if (typeof swatch === "string" && swatch.trim()) {
        result.push({ name: swatch.trim() });
      } else if (typeof swatch === "object" && swatch !== null) {
        const s = swatch as Partial<ColorSwatch> & Record<string, unknown>;
        if (s.name || s.hex) {
          result.push({
            name: safeStr(s.name) || safeStr(s.hex) || "Color",
            hex: typeof s.hex === "string" ? s.hex : undefined,
            usage: typeof s.usage === "string" ? s.usage : undefined,
          });
        }
      }
    }
    if (result.length > 0) return result;
  }

  // 3. Derive from primaryColors + accentColors hex arrays
  if (vi && (Array.isArray(vi.primaryColors) || Array.isArray(vi.accentColors))) {
    const result: Array<{ name: string; hex?: string }> = [];
    const primaries = safeStrArr(vi.primaryColors);
    const accents = safeStrArr(vi.accentColors);
    primaries.forEach((hex, i) =>
      result.push({ name: i === 0 ? "Primary color" : `Primary color ${i + 1}`, hex })
    );
    accents.forEach((hex, i) =>
      result.push({ name: i === 0 ? "Accent color" : `Accent color ${i + 1}`, hex })
    );
    if (result.length > 0) return result;
  }

  return [];
}

/** Extract visual identity summary string. */
export function getCharacterVisualIdentitySummary(c: Character): string {
  const vi = c.visualIdentity as Record<string, unknown> | undefined;
  if (!vi) return "";
  if (typeof vi === "string") return vi;
  if (typeof vi.styleNotes === "string" && vi.styleNotes.trim()) return vi.styleNotes.trim();
  return "";
}

/** Extract personality traits as a clean string array. */
export function getCharacterPersonalityTraits(c: Character): string[] {
  const raw = c as Character & Record<string, unknown>;

  // Array of strings
  if (Array.isArray(c.personality)) {
    return safeStrArr(c.personality);
  }

  // Object with named keys
  if (typeof c.personality === "object" && c.personality !== null) {
    const obj = c.personality as Record<string, unknown>;
    return Object.values(obj)
      .filter((v): v is string => typeof v === "string")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // String — split on common delimiters (runtime guard for JSON data)
  if (typeof (c.personality as unknown) === "string") {
    return (c.personality as unknown as string)
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // personalityTraits (if ever a top-level field)
  if (Array.isArray(raw.personalityTraits)) {
    return safeStrArr(raw.personalityTraits);
  }

  return [];
}

/** Extract character rules (always, never, doNotChange, generationRestrictions). */
export function getCharacterRules(c: Character): {
  alwaysRules: string[];
  neverRules: string[];
  characterRules: string[];
  doNotChangeRules: string[];
  generationRestrictions: string[];
} {
  const raw = c as Character & Record<string, unknown>;
  const rules = c.characterRules as Record<string, unknown> | string[] | undefined;

  let alwaysRules: string[] = [];
  let neverRules: string[] = [];

  if (Array.isArray(rules)) {
    // characterRules is a flat array
    alwaysRules = safeStrArr(rules);
  } else if (rules && typeof rules === "object") {
    alwaysRules = safeStrArr((rules as Record<string, unknown>).always);
    neverRules = safeStrArr((rules as Record<string, unknown>).never);
  }

  const doNotChangeRules = safeStrArr(raw.doNotChangeRules);
  const generationRestrictions = safeStrArr(c.generationRestrictions);

  return {
    alwaysRules,
    neverRules,
    characterRules: [...alwaysRules, ...neverRules],
    doNotChangeRules,
    generationRestrictions,
  };
}

/** Extract doNotChangeRules (explicit field or fallback to neverRules). */
export function getCharacterDoNotChangeRules(c: Character): string[] {
  const raw = c as Character & Record<string, unknown>;
  const explicit = safeStrArr(raw.doNotChangeRules);
  if (explicit.length > 0) return explicit;
  // Fallback: neverRules convey "do not change" intent
  const rules = c.characterRules as Record<string, unknown> | undefined;
  if (rules && typeof rules === "object") {
    return safeStrArr((rules as Record<string, unknown>).never);
  }
  return [];
}

/** Extract generation restrictions. */
export function getCharacterGenerationRestrictions(c: Character): string[] {
  return safeStrArr(c.generationRestrictions);
}

/** Resolve the best profile image URL. */
export function getCharacterProfileImage(c: Character): string {
  const img = c.image as Record<string, string | undefined> | undefined;
  // 1. profileSheet (official profile image)
  const profileSheet = img?.profileSheet?.trim() ?? "";
  if (profileSheet) return profileSheet;
  // 2. primaryReferenceAssetUrl (uploaded primary reference)
  const primaryRef = c.primaryReferenceAssetUrl?.trim() ?? "";
  if (primaryRef) return primaryRef;
  // 3. main image
  const main = img?.main?.trim() ?? "";
  if (main) return main;
  // 4. characterSheet (extra field)
  const sheet = (img?.characterSheet as string | undefined)?.trim() ?? "";
  if (sheet) return sheet;
  return "";
}

/** Resolve the best main display image URL. */
export function getCharacterPrimaryReference(c: Character): string {
  const primaryRef = c.primaryReferenceAssetUrl?.trim() ?? "";
  if (primaryRef) return primaryRef;
  const img = c.image as Record<string, string | undefined> | undefined;
  const main = img?.main?.trim() ?? "";
  if (main) return main;
  return img?.profileSheet?.trim() ?? "";
}

/** Count approved reference assets for a character. */
function countApprovedRefs(slug: string, refs: ReferenceAssetInput[]): number {
  return refs.filter(
    (a) =>
      a.characterSlug === slug &&
      (a.reviewStatus === "approved-for-generation" ||
        a.approvedForGeneration === true ||
        a.generationUseAllowed === true)
  ).length;
}

// ─── Profile completeness ─────────────────────────────────────────────────────

export type ProfileCompleteness = {
  profileComplete: boolean;
  readinessWarnings: string[];
};

export function getCharacterProfileCompleteness(
  c: Character,
  referenceAssets?: ReferenceAssetInput[]
): ProfileCompleteness {
  const warnings: string[] = [];

  const hasDesc = Boolean(safeStr(c.shortDescription));
  if (!hasDesc) warnings.push("Missing short description");

  const viSummary = getCharacterVisualIdentitySummary(c);
  const hasVI = Boolean(viSummary);
  if (!hasVI) warnings.push("Missing visual identity");

  const palette = getCharacterColorPalette(c);
  const hasColors = palette.length > 0;
  if (!hasColors) warnings.push("Missing color palette");

  const { alwaysRules, doNotChangeRules } = getCharacterRules(c);
  const hasRules = alwaysRules.length > 0 || doNotChangeRules.length > 0;
  if (!hasRules) warnings.push("Missing character rules");

  const profileImg = getCharacterProfileImage(c);
  if (!profileImg) warnings.push("Missing Primary Official Reference");

  const hasPrimary =
    Boolean(c.primaryReferenceAssetUrl?.trim()) ||
    Boolean((c.image as Record<string, string | undefined>)?.profileSheet?.trim());
  if (!hasPrimary && !ORIGINAL_SLUGS.has(c.slug)) {
    // Only warn for new characters — originals have profile images in /public
    if (!warnings.includes("Missing Primary Official Reference")) {
      warnings.push("Missing Primary Official Reference");
    }
  }

  const hasGenRestrictions = (c.generationRestrictions?.length ?? 0) > 0;
  if (!hasGenRestrictions && !ORIGINAL_SLUGS.has(c.slug)) {
    warnings.push("Missing generation restrictions");
  }

  if (referenceAssets) {
    const approvedCount = countApprovedRefs(c.slug, referenceAssets);
    if (approvedCount === 0 && !ORIGINAL_SLUGS.has(c.slug)) {
      warnings.push("No approved reference assets");
    }
  }

  const profileComplete =
    hasDesc && hasVI && hasColors && hasRules && Boolean(profileImg);

  return { profileComplete, readinessWarnings: warnings };
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function deriveApprovalMode(c: Character): string {
  if (c.approvalMode) return c.approvalMode;
  return c.status === "active" ? "public" : "draft";
}

function deriveStatusLabel(mode: string): string {
  switch (mode) {
    case "public": return "Public";
    case "official-internal": return "Official Internal";
    case "archived": return "Archived";
    default: return "Draft";
  }
}

function deriveIsPublic(c: Character): boolean {
  const mode = deriveApprovalMode(c);
  if (mode === "draft" || mode === "official-internal" || mode === "archived") return false;
  if (mode === "public") return true;
  return c.status === "active" && c.publicUseAllowed !== false;
}

function deriveIsAdminUsable(c: Character): boolean {
  const mode = deriveApprovalMode(c);
  if (mode === "official-internal" || mode === "public") return true;
  if (mode === "draft" || mode === "archived") return false;
  return c.status === "active" && c.publicUseAllowed !== false;
}

// ─── Main normalizer ──────────────────────────────────────────────────────────

export function normalizeCharacterProfile(
  c: Character,
  referenceAssets?: ReferenceAssetInput[]
): NormalizedCharacterProfile {
  const raw = c as Character & Record<string, unknown>;

  const slug = c.slug;
  const name = c.name ?? formatCharacterSlug(slug);
  const shortName = c.shortName ?? name.split(" ")[0];
  const displayName = SLUG_DISPLAY_NAMES[slug] ?? name;

  const approvalMode = deriveApprovalMode(c);
  const statusLabel = deriveStatusLabel(approvalMode);
  const isPublic = deriveIsPublic(c);
  const isAdminUsable = deriveIsAdminUsable(c);
  const isOriginalCanonical = ORIGINAL_SLUGS.has(slug);

  const img = c.image as Record<string, string | undefined> | undefined;
  const profileSheetUrl = img?.profileSheet?.trim() ?? "";
  const mainImageUrl = img?.main?.trim() ?? "";
  const primaryReferenceAssetUrl = c.primaryReferenceAssetUrl?.trim() ?? "";
  const profileImageUrl = getCharacterProfileImage(c);
  const imageAlt = img?.alt?.trim() ?? `${name} character`;

  const colorPalette = getCharacterColorPalette(c);
  const visualIdentitySummary = getCharacterVisualIdentitySummary(c);
  const personalityTraits = getCharacterPersonalityTraits(c);
  const { alwaysRules, neverRules, characterRules, doNotChangeRules, generationRestrictions } =
    getCharacterRules(c);

  const approvedReferenceCount = referenceAssets
    ? countApprovedRefs(slug, referenceAssets)
    : 0;
  const hasPrimaryReference = Boolean(primaryReferenceAssetUrl) || Boolean(profileSheetUrl);

  const trademarkNotesRaw = c.trademarkNotes;
  const trademarkNotes = Array.isArray(trademarkNotesRaw)
    ? trademarkNotesRaw.join("\n")
    : safeStr(trademarkNotesRaw as unknown);

  const { profileComplete, readinessWarnings } = getCharacterProfileCompleteness(
    c,
    referenceAssets
  );

  return {
    slug,
    name,
    shortName,
    displayName,
    role: safeStr(c.role),
    type: safeStr(c.type) || "fruit-baby",
    fruitType: safeStr(c.fruitType),
    home: safeStr(c.home),
    approvalMode,
    statusLabel,
    publicStatus: safeStr(c.publicStatus),
    isOriginalCanonical,
    isPublic,
    isAdminUsable,

    tagline: safeStr(c.tagline),
    shortDescription: safeStr(c.shortDescription),
    storyRole: safeStr(c.storyRole),
    about: safeStr(c.about),
    personalityTraits,
    personalitySummary: personalityTraits.join(", "),
    voiceGuide: safeStr(c.voiceGuide),
    favoriteQuote: safeStr(c.favoriteQuote),
    signatureQuote: safeStr(c.signatureQuote),

    visualIdentitySummary,
    colorPalette,

    // These fields don't exist in current JSON — return empty arrays as safe defaults
    bodyShapeRules: safeStrArr(raw.bodyShapeRules),
    faceAndExpressionRules: safeStrArr(raw.faceAndExpressionRules),
    textureAndSurfaceRules: safeStrArr(raw.textureAndSurfaceRules),
    leafCrownAccessoryRules: safeStrArr(raw.leafCrownAccessoryRules),
    poseAndGestureRules: safeStrArr(raw.poseAndGestureRules),

    alwaysRules,
    neverRules,
    characterRules,
    doNotChangeRules,
    generationRestrictions,
    trademarkNotes,

    profileImageUrl,
    mainImageUrl,
    profileSheetUrl,
    primaryReferenceAssetId: safeStr(c.primaryReferenceAssetId),
    primaryReferenceAssetUrl,
    primaryReferenceAssetType: safeStr(c.primaryReferenceAssetType),
    imageAlt,

    approvedReferenceCount,
    hasPrimaryReference,
    hasProfileImage: Boolean(profileImageUrl),
    hasColorPalette: colorPalette.length > 0,
    hasVisualIdentity: Boolean(visualIdentitySummary),
    hasCharacterRules: alwaysRules.length > 0 || doNotChangeRules.length > 0,
    hasGenerationRestrictions: generationRestrictions.length > 0,
    profileComplete,
    readinessWarnings,
  };
}

export function normalizeCharacterProfiles(
  characters: Character[],
  referenceAssets?: ReferenceAssetInput[]
): NormalizedCharacterProfile[] {
  return characters.map((c) => normalizeCharacterProfile(c, referenceAssets));
}
