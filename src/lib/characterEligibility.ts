// Shared character eligibility helpers.
// Safe to import in server components. Do NOT import in client components.
// Original characters (no approvalMode) are treated as public/admin-usable when status === "active".

import type { Character } from "@/lib/content";

export type CharacterOption = {
  slug: string;
  label: string;
  approvalMode?: string;
};

export function isDraftCharacter(c: Character): boolean {
  return c.approvalMode === "draft";
}

export function isArchivedCharacter(c: Character): boolean {
  return c.approvalMode === "archived";
}

export function isOfficialInternalCharacter(c: Character): boolean {
  return c.approvalMode === "official-internal";
}

export function isPublicCharacter(c: Character): boolean {
  if (
    c.approvalMode === "draft" ||
    c.approvalMode === "official-internal" ||
    c.approvalMode === "archived"
  )
    return false;
  if (c.approvalMode === "public") return true;
  // Legacy: original characters with status=active and no approvalMode
  return c.status === "active" && c.publicUseAllowed !== false;
}

export function isCharacterApprovedForAdminUse(c: Character): boolean {
  if (c.approvalMode === "official-internal" || c.approvalMode === "public")
    return true;
  if (c.approvalMode === "draft" || c.approvalMode === "archived") return false;
  // Legacy: original characters
  return c.status === "active" && c.publicUseAllowed !== false;
}

export function getCharacterApprovalMode(c: Character): string {
  return c.approvalMode ?? (c.status === "active" ? "public" : "draft");
}

export function getCharacterDisplayName(c: Character): string {
  return c.name ?? c.slug;
}

export function getEligibleAdminStoryCharacters(
  characters: Character[]
): Character[] {
  return characters.filter(isCharacterApprovedForAdminUse);
}

export function getPublicCharacters(characters: Character[]): Character[] {
  return characters.filter(isPublicCharacter);
}

export function characterHasPrimaryReference(c: Character): boolean {
  return (
    typeof c.primaryReferenceAssetUrl === "string" &&
    c.primaryReferenceAssetUrl.startsWith("http")
  );
}

export function characterHasApprovedReferenceAsset(
  characterSlug: string,
  referenceAssets: {
    characterSlug: string;
    reviewStatus?: string;
    approvedForGeneration?: boolean;
  }[]
): boolean {
  return referenceAssets.some(
    (a) =>
      a.characterSlug === characterSlug &&
      (a.reviewStatus === "approved-for-generation" ||
        a.approvedForGeneration === true)
  );
}

export function isCharacterGenerationReady(
  c: Character,
  referenceAssets: {
    characterSlug: string;
    reviewStatus?: string;
    approvedForGeneration?: boolean;
  }[]
): boolean {
  if (!isCharacterApprovedForAdminUse(c)) return false;
  return (
    characterHasPrimaryReference(c) ||
    characterHasApprovedReferenceAsset(c.slug, referenceAssets)
  );
}

export function toCharacterOption(
  c: Character,
  slugOverride?: string
): CharacterOption {
  return {
    slug: slugOverride ?? c.slug,
    label: c.name,
    approvalMode: c.approvalMode,
  };
}
