// Public product concept helpers — server-only.

import { getAllProductConcepts } from "@/lib/productConcepts";
import { getPublicCharactersFromDisk } from "@/lib/characterContent";
import type { ProductConcept, ProductConceptCategory } from "@/lib/productConceptTypes";
import type { ProductMockupAsset } from "@/lib/productConceptTypes";

// ─── Public card type ─────────────────────────────────────────────────────────

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

export function getPublicReadyProductConcepts(): ProductConcept[] {
  return getAllProductConcepts().filter(isPublicReadyProductConcept);
}

// ─── Safe public card builder ─────────────────────────────────────────────────

export function buildPublicProductCards(): PublicProductCard[] {
  const publicConcepts = getPublicReadyProductConcepts();
  const allChars = getPublicCharactersFromDisk();

  return publicConcepts.map((concept): PublicProductCard => {
    const title = concept.publicTitle?.trim() || concept.title;
    const description = concept.publicDescription?.trim() || concept.shortDescription;

    let characterName: string | undefined;
    let characterSlug: string | undefined;
    let characterIsPublic = false;
    let characterFallbackImageUrl: string | undefined;

    if (concept.characterSlug) {
      const rawChar = allChars.find(
        (c) => c.slug === concept.characterSlug || (c as { id?: string }).id === concept.characterSlug
      );
      if (rawChar) {
        characterName = rawChar.shortName ?? rawChar.name;
        characterSlug = rawChar.slug;
        characterIsPublic = true;
        characterFallbackImageUrl = rawChar.image?.main || undefined;
      }
    }

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
      mockupImageAlt: primaryMockup ? `${title} — product mockup` : undefined,
      characterFallbackImageUrl,
    };
  });
}
