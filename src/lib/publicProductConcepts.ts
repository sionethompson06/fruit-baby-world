// Public product concept helpers — server-only.
// Only surfaces public-ready, non-archived concepts and public-ready mockups.
// Never exposes admin-only mockups, hidden concepts, internal prompts, or paths.

import { getAllProductConcepts } from "@/lib/productConcepts";
import { getPublicCharactersFromDisk } from "@/lib/characterContent";
import { isPublicCharacter } from "@/lib/characterEligibility";
import { normalizeCharacterProfile } from "@/lib/characterProfileNormalizer";
import type { ProductConcept, ProductConceptCategory } from "@/lib/productConceptTypes";
import type { ProductMockupAsset } from "@/lib/productMockupTypes";

// ─── Public card type ─────────────────────────────────────────────────────────
// Safe, minimal shape — no internal fields exposed to public pages.

export type PublicProductCard = {
  id: string;
  title: string;
  description: string;
  category: ProductConceptCategory;
  audience?: string;
  characterName?: string;
  characterSlug?: string;
  characterIsPublic: boolean;
  mockupImageUrl?: string;
  mockupImageAlt?: string;
  characterFallbackImageUrl?: string;
};

// ─── Visibility checks ────────────────────────────────────────────────────────

export function isPublicReadyProductConcept(concept: ProductConcept): boolean {
  return (
    concept.publicPreviewStatus === "public-ready" &&
    concept.status !== "archived"
  );
}

export function getPublicReadyMockupsForConcept(
  concept: ProductConcept
): ProductMockupAsset[] {
  return (concept.mockups ?? []).filter((m) => m.visibility === "public-ready");
}

export function getPrimaryPublicProductMockup(
  concept: ProductConcept
): ProductMockupAsset | null {
  return getPublicReadyMockupsForConcept(concept)[0] ?? null;
}

// ─── Main public query ────────────────────────────────────────────────────────

export function getPublicReadyProductConcepts(): ProductConcept[] {
  return getAllProductConcepts().filter(isPublicReadyProductConcept);
}

// ─── Safe public card builder ─────────────────────────────────────────────────
// Strips all internal fields; only surfaces public-safe data.

export function buildPublicProductCards(): PublicProductCard[] {
  const publicConcepts = getPublicReadyProductConcepts();
  const allChars = getPublicCharactersFromDisk();

  return publicConcepts.map((concept): PublicProductCard => {
    const title = concept.publicTitle?.trim() || concept.title;
    const description =
      concept.publicDescription?.trim() || concept.shortDescription;

    // Resolve linked character — only if public
    let characterName: string | undefined;
    let characterSlug: string | undefined;
    let characterIsPublic = false;
    let characterFallbackImageUrl: string | undefined;

    if (concept.characterSlug) {
      const rawChar = allChars.find(
        (c) =>
          c.slug === concept.characterSlug || (c as { id?: string }).id === concept.characterSlug
      );
      if (rawChar && isPublicCharacter(rawChar)) {
        const norm = normalizeCharacterProfile(rawChar);
        characterName = norm.displayName;
        characterSlug = norm.slug;
        characterIsPublic = true;
        characterFallbackImageUrl =
          norm.mainCharacterImageUrl || norm.officialProfileSheetUrl || undefined;
      }
    }

    // Public-ready mockup only
    const primaryMockup = getPrimaryPublicProductMockup(concept);

    return {
      id: concept.id,
      title,
      description,
      category: concept.category,
      audience: concept.audience,
      characterName,
      characterSlug,
      characterIsPublic,
      mockupImageUrl: primaryMockup?.url,
      mockupImageAlt: primaryMockup
        ? `${title} — product mockup`
        : undefined,
      characterFallbackImageUrl,
    };
  });
}
