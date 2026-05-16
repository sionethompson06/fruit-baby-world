// Server-only character content helpers.
// Delegates to characterRegistry — the canonical character loader.
// Do not import this in client components.

import {
  getAllCharacterProfiles,
  getPublicCharacterProfiles,
} from "@/lib/characterRegistry";
import type { Character } from "@/lib/content";

// Original export name — used throughout the app
export function loadAllCharactersFromDisk(): Character[] {
  return getAllCharacterProfiles();
}

export function getPublicCharactersFromDisk(): Character[] {
  return getPublicCharacterProfiles();
}

export function getPublicCharacterBySlugFromDisk(slug: string): Character | undefined {
  return getPublicCharacterProfiles().find((c) => c.slug === slug);
}
