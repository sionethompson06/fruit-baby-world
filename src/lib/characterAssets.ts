// Character asset reference integrity checker.
// Uses Node.js fs — call only from server components, server actions, or API routes.
// Do not import this in client components.

import fs from "fs";
import path from "path";
import type { Character } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssetRecommendedUse =
  | "primary-reference"
  | "fallback-reference"
  | "display-only"
  | "missing"
  | "invalid"
  | "do-not-use";

export type AssetStatus = {
  field: string;
  label: string;
  path: string;
  exists: boolean;
  valid: boolean;
  sizeBytes?: number;
  issue?: string;
  recommendedUse: AssetRecommendedUse;
};

export type CharacterAssetSummary = {
  characterId: string;
  assets: AssetStatus[];
  hasValidMainImage: boolean;
  hasValidProfileSheet: boolean;
  hasValidCharacterSheet: boolean;
  hasAnyValidReference: boolean;
  readyForReferenceAnchoredGeneration: boolean;
  bestReferenceField: string | null;
  warnings: string[];
};

export type OverallReadinessSummary = {
  totalCharacters: number;
  readyCount: number;
  notReadyCount: number;
  invalidAssetCount: number;
  profileSheetsAvailable: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_IMAGE_BYTES = 100;
const VALID_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

// File signature bytes
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];
const RIFF_SIG = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
const WEBP_SIG = [0x57, 0x45, 0x42, 0x50]; // "WEBP"

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isSafeCharacterPath(urlPath: string): boolean {
  if (!urlPath.startsWith("/characters/")) return false;
  // Reject any path traversal attempts
  const normalized = path.posix.normalize(urlPath);
  return !normalized.includes("..");
}

function matchesSig(buf: Buffer, sig: number[], offset = 0): boolean {
  if (buf.length < offset + sig.length) return false;
  return sig.every((byte, i) => buf[offset + i] === byte);
}

function hasValidMagicBytes(buf: Buffer, ext: string): boolean {
  switch (ext) {
    case ".png":
      return matchesSig(buf, PNG_SIG);
    case ".jpg":
    case ".jpeg":
      return matchesSig(buf, JPEG_SIG);
    case ".webp":
      return matchesSig(buf, RIFF_SIG) && matchesSig(buf, WEBP_SIG, 8);
    default:
      return false;
  }
}

// ─── Single asset check ───────────────────────────────────────────────────────

export function checkAsset(
  urlPath: string | undefined,
  field: string,
  label: string
): AssetStatus {
  const trimmed = (urlPath ?? "").trim();

  if (!trimmed) {
    return {
      field, label, path: "",
      exists: false, valid: false,
      issue: "No path specified.",
      recommendedUse: "missing",
    };
  }

  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    const recommendedUse: AssetRecommendedUse =
      field === "image.profileSheet" || field === "image.main"
        ? "primary-reference"
        : "display-only";
    return { field, label, path: trimmed, exists: true, valid: true, recommendedUse };
  }

  if (!isSafeCharacterPath(trimmed)) {
    return {
      field, label, path: trimmed,
      exists: false, valid: false,
      issue: "Not a safe character asset path.",
      recommendedUse: "do-not-use",
    };
  }

  const ext = path.extname(trimmed).toLowerCase();
  if (!VALID_EXTENSIONS.has(ext)) {
    return {
      field, label, path: trimmed,
      exists: false, valid: false,
      issue: `Extension "${ext}" is not a recognized image type.`,
      recommendedUse: "do-not-use",
    };
  }

  const fsPath = path.join(process.cwd(), "public", trimmed);

  let size: number;
  try {
    const stat = fs.statSync(fsPath);
    if (!stat.isFile()) {
      return {
        field, label, path: trimmed,
        exists: false, valid: false,
        issue: "Path does not point to a regular file.",
        recommendedUse: "missing",
      };
    }
    size = stat.size;
  } catch {
    return {
      field, label, path: trimmed,
      exists: false, valid: false,
      issue: "File does not exist on disk.",
      recommendedUse: "missing",
    };
  }

  if (size < MIN_IMAGE_BYTES) {
    return {
      field, label, path: trimmed,
      exists: true, valid: false, sizeBytes: size,
      issue: `File is too small (${size} bytes) to be a valid image.`,
      recommendedUse: "do-not-use",
    };
  }

  // Check magic bytes (12 bytes covers PNG, JPEG, and WebP signatures)
  try {
    const buf = Buffer.alloc(12);
    const fd = fs.openSync(fsPath, "r");
    const bytesRead = fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);

    if (bytesRead >= 3 && !hasValidMagicBytes(buf.slice(0, bytesRead), ext)) {
      return {
        field, label, path: trimmed,
        exists: true, valid: false, sizeBytes: size,
        issue: "File header does not match the expected image format.",
        recommendedUse: "do-not-use",
      };
    }
  } catch {
    // If magic byte check errors, the size check passed so treat as valid
  }

  const recommendedUse: AssetRecommendedUse =
    field === "image.profileSheet" ? "primary-reference" :
    field === "image.main" ? "primary-reference" :
    field === "image.characterSheet" ? "fallback-reference" :
    "display-only";

  return {
    field, label, path: trimmed,
    exists: true, valid: true, sizeBytes: size,
    recommendedUse,
  };
}

// ─── Character-level check ────────────────────────────────────────────────────

export function checkCharacterAssets(character: Character): CharacterAssetSummary {
  const { id, image } = character;
  // Cast to access any extra fields not in the typed interface
  const imageRaw = image as Record<string, string | undefined>;

  const mainStatus = checkAsset(image.main, "image.main", "Main Image");
  const profileStatus = checkAsset(image.profileSheet, "image.profileSheet", "Profile Sheet");
  const sheetStatus = checkAsset(imageRaw.characterSheet, "image.characterSheet", "Character Sheet");

  // Always report main and profileSheet; only report characterSheet if a path was provided
  const assets: AssetStatus[] = [
    mainStatus,
    profileStatus,
    ...(sheetStatus.path ? [sheetStatus] : []),
  ];

  const hasValidMainImage = mainStatus.valid;
  const hasValidProfileSheet = profileStatus.valid;
  const hasValidCharacterSheet = sheetStatus.valid;
  const hasAnyValidReference =
    hasValidMainImage || hasValidProfileSheet || hasValidCharacterSheet;
  const readyForReferenceAnchoredGeneration = hasAnyValidReference;

  // Prefer profileSheet > main > characterSheet as the best reference
  const bestReferenceField =
    hasValidProfileSheet ? "image.profileSheet" :
    hasValidMainImage ? "image.main" :
    hasValidCharacterSheet ? "image.characterSheet" :
    null;

  const warnings: string[] = [];
  if (mainStatus.path && !mainStatus.valid) {
    warnings.push(
      `image.main appears invalid. Use profileSheet as fallback until a valid isolated image is uploaded.`
    );
  }
  if (!hasAnyValidReference) {
    warnings.push(
      `No valid reference assets found. Reference-anchored generation should not proceed for this character.`
    );
  }

  return {
    characterId: id,
    assets,
    hasValidMainImage,
    hasValidProfileSheet,
    hasValidCharacterSheet,
    hasAnyValidReference,
    readyForReferenceAnchoredGeneration,
    bestReferenceField,
    warnings,
  };
}

// ─── Overall readiness summary ────────────────────────────────────────────────

export function buildReadinessSummary(
  summaries: CharacterAssetSummary[]
): OverallReadinessSummary {
  let invalidAssetCount = 0;
  let profileSheetsAvailable = 0;

  for (const s of summaries) {
    for (const a of s.assets) {
      if (a.exists && !a.valid) invalidAssetCount++;
    }
    if (s.hasValidProfileSheet) profileSheetsAvailable++;
  }

  const readyCount = summaries.filter(
    (s) => s.readyForReferenceAnchoredGeneration
  ).length;

  return {
    totalCharacters: summaries.length,
    readyCount,
    notReadyCount: summaries.length - readyCount,
    invalidAssetCount,
    profileSheetsAvailable,
  };
}

// ─── Serializable readiness map (safe to pass to client components) ───────────

export type ClientCharacterReadiness = {
  ready: boolean;
  validRefs: { label: string; field: string }[];
  warnings: string[];
};

export function buildClientReadinessMap(
  summaries: CharacterAssetSummary[]
): Record<string, ClientCharacterReadiness> {
  const map: Record<string, ClientCharacterReadiness> = {};
  for (const s of summaries) {
    map[s.characterId] = {
      ready: s.readyForReferenceAnchoredGeneration,
      validRefs: s.assets
        .filter((a) => a.valid)
        .map((a) => ({ label: a.label, field: a.field })),
      warnings: s.warnings,
    };
  }
  return map;
}
