// Centralized character and reference asset readiness helpers.
// Provides simple, admin-facing status labels and derived readiness checks.
// Safe to import in server components. Do NOT import in client components without "use client".

import type { Character } from "@/lib/content";

export type UploadedReferenceAsset = {
  id: string;
  characterSlug: string;
  title?: string;
  reviewStatus?: string;
  approvedForGeneration?: boolean;
  generationUseAllowed?: boolean;
  publicUseAllowed?: boolean;
  isOfficialReference?: boolean;
  requiresReview?: boolean;
  [key: string]: unknown;
};

export type CharacterApprovalMode = "draft" | "official-internal" | "public" | "archived";
export type ReferenceAssetStatus = "needs-review" | "approved-reference" | "rejected" | "archived";
export type GenerationReadiness = "generation-ready" | "needs-approved-reference" | "needs-primary-reference" | "not-active";

// ─── Character Status Mapping ─────────────────────────────────────────────

/**
 * Get the current approval mode for a character.
 * Maps new approvalMode field and legacy fields to a canonical mode.
 */
export function getCharacterApprovalMode(character: Character): CharacterApprovalMode {
  // Explicit approvalMode takes precedence
  if (character.approvalMode === "official-internal") return "official-internal";
  if (character.approvalMode === "public") return "public";
  if (character.approvalMode === "archived") return "archived";
  if (character.approvalMode === "draft") return "draft";

  // Legacy: derive from existing fields for original characters
  if (character.status === "active" && character.publicUseAllowed !== false) {
    return "public";
  }
  if (character.approvedForGeneration === true || character.generationUseAllowed === true) {
    return "official-internal";
  }
  if (character.status === "archived" || character.approvalMode === "archived") {
    return "archived";
  }

  return "draft";
}

/**
 * Get the simple admin-facing status label for a character.
 */
export function getCharacterStatusLabel(character: Character): string {
  const mode = getCharacterApprovalMode(character);
  switch (mode) {
    case "draft":
      return "Draft";
    case "official-internal":
      return "Official Internal";
    case "public":
      return "Public";
    case "archived":
      return "Archived";
  }
}

/**
 * Get CSS class for character status badge.
 */
export function getCharacterStatusBadgeClass(character: Character): string {
  const mode = getCharacterApprovalMode(character);
  switch (mode) {
    case "draft":
      return "bg-warm-coral/15 text-warm-coral/80";
    case "official-internal":
      return "bg-sky-blue/20 text-tiki-brown/65";
    case "public":
      return "bg-tropical-green/15 text-tropical-green";
    case "archived":
      return "bg-tiki-brown/12 text-tiki-brown/50";
  }
}

/**
 * Check if character is active for admin use (not draft/archived).
 */
export function isCharacterActiveForAdmin(character: Character): boolean {
  const mode = getCharacterApprovalMode(character);
  return mode === "official-internal" || mode === "public";
}

/**
 * Check if character is publicly visible.
 */
export function isCharacterPubliclyVisible(character: Character): boolean {
  return getCharacterApprovalMode(character) === "public";
}

// ─── Reference Asset Status Mapping ──────────────────────────────────────────

/**
 * Get the simple admin-facing status for a reference asset.
 */
export function getReferenceAssetStatus(asset: UploadedReferenceAsset): ReferenceAssetStatus {
  if (asset.reviewStatus === "archived") return "archived";
  if (asset.reviewStatus === "rejected") return "rejected";
  if (asset.reviewStatus === "approved-for-generation" && asset.approvedForGeneration === true) {
    return "approved-reference";
  }
  return "needs-review";
}

/**
 * Get the simple admin-facing status label for a reference asset.
 */
export function getReferenceAssetStatusLabel(asset: UploadedReferenceAsset): string {
  const status = getReferenceAssetStatus(asset);
  switch (status) {
    case "needs-review":
      return "Needs Review";
    case "approved-reference":
      return "Approved Reference";
    case "rejected":
      return "Rejected";
    case "archived":
      return "Archived";
  }
}

/**
 * Get CSS class for reference asset status badge.
 */
export function getReferenceAssetStatusBadgeClass(asset: UploadedReferenceAsset): string {
  const status = getReferenceAssetStatus(asset);
  switch (status) {
    case "needs-review":
      return "bg-pineapple-yellow/25 text-tiki-brown/65";
    case "approved-reference":
      return "bg-tropical-green/15 text-tropical-green";
    case "rejected":
      return "bg-warm-coral/20 text-warm-coral/80";
    case "archived":
      return "bg-tiki-brown/12 text-tiki-brown/50";
  }
}

/**
 * Check if reference asset is approved.
 */
export function isReferenceAssetApproved(asset: UploadedReferenceAsset): boolean {
  return getReferenceAssetStatus(asset) === "approved-reference";
}

// ─── Character Reference Helpers ──────────────────────────────────────────

/**
 * Check if character has a valid primary reference URL.
 */
export function characterHasPrimaryReference(character: Character): boolean {
  return (
    typeof character.primaryReferenceAssetUrl === "string" &&
    character.primaryReferenceAssetUrl.trim().length > 0 &&
    character.primaryReferenceAssetUrl.startsWith("http")
  );
}

/**
 * Count approved reference assets for a character.
 */
export function getCharacterApprovedReferenceCount(
  characterSlug: string,
  referenceAssets: UploadedReferenceAsset[]
): number {
  return referenceAssets.filter(
    (a) => a.characterSlug === characterSlug && isReferenceAssetApproved(a)
  ).length;
}

/**
 * Get label for primary reference status.
 */
export function getCharacterPrimaryReferenceStatus(character: Character): string {
  if (characterHasPrimaryReference(character)) {
    return "Primary Reference Assigned";
  }
  return "No Primary Reference";
}

// ─── Generation Readiness ──────────────────────────────────────────────────

/**
 * Determine the character's generation readiness.
 * This is a derived, display-only status.
 */
export function getCharacterGenerationReadiness(
  character: Character,
  referenceAssets: UploadedReferenceAsset[]
): GenerationReadiness {
  const mode = getCharacterApprovalMode(character);

  // Not active if draft or archived
  if (mode === "draft" || mode === "archived") {
    return "not-active";
  }

  // Character must be Official Internal or Public
  const hasPrimaryRef = characterHasPrimaryReference(character);
  const approvedRefCount = getCharacterApprovedReferenceCount(character.slug, referenceAssets);

  // Generation Ready: has Primary Reference OR at least one Approved Reference
  if (hasPrimaryRef || approvedRefCount > 0) {
    return "generation-ready";
  }

  // If no primary reference but has approved refs
  if (approvedRefCount > 0 && !hasPrimaryRef) {
    return "needs-primary-reference";
  }

  // No approved references
  return "needs-approved-reference";
}

/**
 * Get label for generation readiness.
 */
export function getGenerationReadinessLabel(readiness: GenerationReadiness): string {
  switch (readiness) {
    case "generation-ready":
      return "Generation Ready";
    case "needs-approved-reference":
      return "Needs Approved Reference";
    case "needs-primary-reference":
      return "Needs Primary Reference";
    case "not-active":
      return "Not Active";
  }
}

/**
 * Get CSS class for generation readiness badge.
 */
export function getGenerationReadinessBadgeClass(readiness: GenerationReadiness): string {
  switch (readiness) {
    case "generation-ready":
      return "bg-tropical-green/15 text-tropical-green";
    case "needs-approved-reference":
      return "bg-pineapple-yellow/25 text-tiki-brown/65";
    case "needs-primary-reference":
      return "bg-sky-blue/20 text-tiki-brown/65";
    case "not-active":
      return "bg-tiki-brown/8 text-tiki-brown/40";
  }
}

// ─── Readiness Summary ──────────────────────────────────────────────────

/**
 * Check if character profile appears complete.
 * For display only — does not block saves.
 */
export function isCharacterProfileComplete(character: Character): boolean {
  return !!(
    character.shortDescription &&
    character.visualIdentity &&
    ((character.characterRules?.always?.length ?? 0) > 0 ||
     (character.characterRules?.never?.length ?? 0) > 0) &&
    (character.visualIdentity.palette?.length ?? 0) > 0
  );
}

/**
 * Get a readiness summary for a character.
 * Returns simple booleans for display in admin UI.
 */
export function getCharacterReadinessSummary(
  character: Character,
  referenceAssets: UploadedReferenceAsset[]
): {
  approvalMode: CharacterApprovalMode;
  statusLabel: string;
  hasPrimaryReference: boolean;
  approvedReferenceCount: number;
  profileComplete: boolean;
  generationReadiness: GenerationReadiness;
  isActive: boolean;
  isPublic: boolean;
} {
  const approvalMode = getCharacterApprovalMode(character);
  const approvedCount = getCharacterApprovedReferenceCount(character.slug, referenceAssets);
  const readiness = getCharacterGenerationReadiness(character, referenceAssets);

  return {
    approvalMode,
    statusLabel: getCharacterStatusLabel(character),
    hasPrimaryReference: characterHasPrimaryReference(character),
    approvedReferenceCount: approvedCount,
    profileComplete: isCharacterProfileComplete(character),
    generationReadiness: readiness,
    isActive: isCharacterActiveForAdmin(character),
    isPublic: isCharacterPubliclyVisible(character),
  };
}
