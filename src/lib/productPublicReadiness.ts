// Admin-only product public readiness checks.
// Use in /admin/products to surface readiness warnings before marking public.

import type { ProductConcept } from "@/lib/productConceptTypes";
import { getPublicReadyMockupsForConcept } from "@/lib/publicProductConcepts";

export type ProductReadinessResult = {
  conceptId: string;
  conceptTitle: string;
  warnings: string[];
  isReady: boolean;
};

export function checkProductConceptPublicReadiness(
  concept: ProductConcept,
  publicCharacterSlugs: Set<string>
): ProductReadinessResult {
  const warnings: string[] = [];

  if (!getPublicReadyMockupsForConcept(concept).length) {
    warnings.push(
      "No public-ready mockup. Visitors will see a character placeholder or generic card."
    );
  }

  if (concept.characterSlug && !publicCharacterSlugs.has(concept.characterSlug)) {
    warnings.push(
      `Linked character (${concept.characterSlug}) is not public. This concept will not appear on /shop until the character is public.`
    );
  }

  if (
    !concept.publicTitle?.trim() &&
    !concept.shortDescription?.trim()
  ) {
    warnings.push("No public title or description. Add one before marking public.");
  }

  return {
    conceptId: concept.id,
    conceptTitle: concept.title,
    warnings,
    isReady: warnings.length === 0,
  };
}
