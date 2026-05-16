// Canonical server-side character registry.
// Single source of truth for character loading, filtering, lookup, and display.
// Server-only — do NOT import in client components (uses fs).

import fs from "fs";
import path from "path";
import type { Character } from "@/lib/content";
import {
  normalizeCharacterProfile,
  normalizeCharacterProfiles,
  type NormalizedCharacterProfile,
  type ReferenceAssetInput,
} from "@/lib/characterProfileNormalizer";

export type { NormalizedCharacterProfile, ReferenceAssetInput };

const CHARACTERS_DIR = path.join(process.cwd(), "src/content/characters");

// Original canonical characters that are public/admin-usable without approvalMode.
const ORIGINAL_CANONICAL_SLUGS = new Set([
  "pineapple-baby",
  "ube-baby",
  "kiwi-baby",
  "coconut-baby",
  "mango-baby",
  "tiki",
]);

// Friendly display names for known slugs — fallback when JSON not available.
const SLUG_DISPLAY_NAMES: Record<string, string> = {
  "pineapple-baby": "Pineapple Baby",
  "ube-baby": "Ube Baby",
  "kiwi-baby": "Kiwi Baby",
  "coconut-baby": "Coconut Baby",
  "mango-baby": "Mango Baby",
  tiki: "Tiki Trouble",
  "tiki-trouble": "Tiki Trouble",
};

// ─── Loading ───────────────────────────────────────────────────────────────────

export function getAllCharacterProfiles(): Character[] {
  try {
    const files = fs
      .readdirSync(CHARACTERS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();
    const results: Character[] = [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(CHARACTERS_DIR, f), "utf8");
        results.push(JSON.parse(raw) as Character);
      } catch {
        // Skip invalid files silently
      }
    }
    return results;
  } catch {
    return [];
  }
}

// ─── Lookup ────────────────────────────────────────────────────────────────────

/**
 * Returns a map keyed by slug. "tiki-trouble" is aliased to "tiki" JSON.
 * Also keyed by character id so legacy id-based lookups still work.
 */
export function getCharacterMap(): Record<string, Character> {
  const chars = getAllCharacterProfiles();
  const map: Record<string, Character> = {};
  for (const c of chars) {
    map[c.slug] = c;
    if (c.id) map[c.id] = c;
    if (c.slug === "tiki") map["tiki-trouble"] = c;
  }
  return map;
}

export function getCharacterBySlug(slug: string): Character | undefined {
  return getCharacterMap()[slug];
}

// ─── Eligibility checks ────────────────────────────────────────────────────────

export function isOriginalCanonicalCharacter(slugOrChar: string | Character): boolean {
  const slug = typeof slugOrChar === "string" ? slugOrChar : slugOrChar.slug;
  return ORIGINAL_CANONICAL_SLUGS.has(slug);
}

function isPublicEligible(c: Character): boolean {
  if (
    c.approvalMode === "draft" ||
    c.approvalMode === "official-internal" ||
    c.approvalMode === "archived"
  )
    return false;
  if (c.approvalMode === "public") return true;
  // Legacy: original active characters without approvalMode
  return c.status === "active" && c.publicUseAllowed !== false;
}

function isAdminEligible(c: Character): boolean {
  if (c.approvalMode === "official-internal" || c.approvalMode === "public") return true;
  if (c.approvalMode === "draft" || c.approvalMode === "archived") return false;
  // Legacy: original active characters without approvalMode
  return c.status === "active" && c.publicUseAllowed !== false;
}

// ─── Filtered lists ────────────────────────────────────────────────────────────

export function getPublicCharacterProfiles(): Character[] {
  return getAllCharacterProfiles().filter(isPublicEligible);
}

/** Characters available in admin story/scene/media builders (not draft/archived). */
export function getAdminUsableCharacterProfiles(): Character[] {
  return getAllCharacterProfiles().filter(isAdminEligible);
}

/** Same as admin-usable — original + official-internal + public. */
export function getActiveCharacterProfiles(): Character[] {
  return getAllCharacterProfiles().filter(isAdminEligible);
}

// ─── Display helpers ───────────────────────────────────────────────────────────

/** Title-case a slug: "dragonfruit-baby" → "Dragonfruit Baby". */
export function formatCharacterSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Returns a friendly display name for a character slug or raw name string.
 * Priority: hardcoded map → character JSON name → title-cased slug.
 */
export function getCharacterDisplayName(slugOrName: string): string {
  const key = slugOrName.toLowerCase().trim();
  if (SLUG_DISPLAY_NAMES[key]) return SLUG_DISPLAY_NAMES[key];
  const char = getCharacterMap()[slugOrName];
  if (char) return char.shortName ?? char.name ?? formatCharacterSlug(slugOrName);
  return formatCharacterSlug(slugOrName);
}

// ─── Normalized profile variants (via characterProfileNormalizer) ───────────────

export function getAllNormalizedCharacterProfiles(
  referenceAssets?: ReferenceAssetInput[]
): NormalizedCharacterProfile[] {
  return normalizeCharacterProfiles(getAllCharacterProfiles(), referenceAssets);
}

export function getPublicNormalizedCharacterProfiles(
  referenceAssets?: ReferenceAssetInput[]
): NormalizedCharacterProfile[] {
  return normalizeCharacterProfiles(getPublicCharacterProfiles(), referenceAssets);
}

export function getAdminUsableNormalizedCharacterProfiles(
  referenceAssets?: ReferenceAssetInput[]
): NormalizedCharacterProfile[] {
  return normalizeCharacterProfiles(getAdminUsableCharacterProfiles(), referenceAssets);
}

export function getNormalizedCharacterBySlug(
  slug: string,
  referenceAssets?: ReferenceAssetInput[]
): NormalizedCharacterProfile | undefined {
  const c = getCharacterBySlug(slug);
  if (!c) return undefined;
  return normalizeCharacterProfile(c, referenceAssets);
}

// ─── Normalization ─────────────────────────────────────────────────────────────

export type NormalizedCharacter = {
  slug: string;
  name: string;
  shortName: string;
  displayName: string;
  approvalMode: string;
  status: string;
  publicStatus?: string;
  image: { main: string; profileSheet?: string; alt: string };
  primaryReferenceAssetId?: string;
  primaryReferenceAssetUrl?: string;
  visualIdentity?: Character["visualIdentity"];
  colorPalette?: unknown[];
  characterRules?: Character["characterRules"];
  generationRestrictions?: string[];
  doNotChangeRules?: string[];
  personalityTraits?: string[];
  voiceGuide?: string;
};

/**
 * Lightweight read-time normalizer.
 * Returns common fields safely without rewriting JSON or migrating data.
 */
export function normalizeCharacterForRegistry(c: Character): NormalizedCharacter {
  const raw = c as Character & Record<string, unknown>;
  const slug = c.slug;
  const name = c.name ?? formatCharacterSlug(slug);
  const shortName = c.shortName ?? name.split(" ")[0];
  const displayName = SLUG_DISPLAY_NAMES[slug] ?? name;
  const approvalMode = c.approvalMode ?? (c.status === "active" ? "public" : "draft");

  return {
    slug,
    name,
    shortName,
    displayName,
    approvalMode,
    status: c.status ?? "draft",
    publicStatus: c.publicStatus,
    image: {
      main: c.image?.main ?? "",
      profileSheet: c.image?.profileSheet,
      alt: c.image?.alt ?? name,
    },
    primaryReferenceAssetId: c.primaryReferenceAssetId,
    primaryReferenceAssetUrl: c.primaryReferenceAssetUrl,
    visualIdentity: c.visualIdentity,
    colorPalette: (raw.colorPalette as unknown[] | undefined) ?? c.visualIdentity?.palette,
    characterRules: c.characterRules,
    generationRestrictions: c.generationRestrictions,
    doNotChangeRules: raw.doNotChangeRules as string[] | undefined,
    personalityTraits: Array.isArray(c.personality) ? c.personality : undefined,
    voiceGuide: c.voiceGuide,
  };
}
