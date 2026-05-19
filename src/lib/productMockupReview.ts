// Product mockup review helpers — pure functions, no server-only imports.
// Builds fidelity checklists and review context for admin review UI.

import type { ProductConceptCategory, CharacterSeedData } from "@/lib/productConceptTypes";
import type { ProductMockupDraftResult } from "@/lib/productMockupTypes";

// ─── Checklist item ───────────────────────────────────────────────────────────

export type ProductMockupChecklistItem = {
  id: string;
  label: string;
};

// ─── Checklist builder ────────────────────────────────────────────────────────

export function buildProductMockupFidelityChecklist(
  char: CharacterSeedData,
  _category: ProductConceptCategory
): ProductMockupChecklistItem[] {
  const items: ProductMockupChecklistItem[] = [
    { id: "body-shape", label: "Character body shape matches official reference" },
    { id: "colors", label: "Character colors match official reference" },
    { id: "face", label: "Face, eyes, mouth, cheeks, and expression style match official reference" },
    { id: "accessories", label: "Leaf, crown, and signature accessories are correct" },
    { id: "fruit-identity", label: `Fruit identity is preserved (${char.fruitType || "fruit character"})` },
    { id: "baby-like", label: "Character remains baby-like, soft, warm, and kid-friendly" },
    { id: "product-clear", label: "Product category and form are clear in the mockup" },
    { id: "no-redesign", label: "Mockup does not redesign or genericize the character" },
    { id: "brand-safe", label: "Mockup is appropriate for children, families, teachers, and collectors" },
    { id: "no-offbrand", label: "No scary, adult, realistic, sharp, or off-brand styling" },
  ];

  if (char.type === "villain") {
    items.push({
      id: "villain-tone",
      label: `${char.displayName} is mischievous and funny — not scary, evil, cruel, or too intense`,
    });
  }

  return items;
}

// ─── Reference thumbnails ─────────────────────────────────────────────────────

export function getProductMockupReferenceThumbnails(
  char: CharacterSeedData
): Array<{ url: string; title: string }> {
  const results: Array<{ url: string; title: string }> = [];
  if (char.profileImageUrl) {
    results.push({ url: char.profileImageUrl, title: "Official Profile Sheet" });
  }
  return results;
}

// ─── Review warnings ──────────────────────────────────────────────────────────

export function buildProductMockupReviewWarnings(
  char: CharacterSeedData,
  draft: ProductMockupDraftResult
): string[] {
  const warnings: string[] = [];

  if (!char.hasProfileImage) {
    warnings.push(
      "No official profile sheet available for this character. Review character fidelity carefully."
    );
  }
  if (!char.hasColorPalette) {
    warnings.push(
      "No official color palette on file. Verify character colors manually before approving."
    );
  }
  if (!char.hasCharacterRules) {
    warnings.push(
      "No character brand rules found. Apply general Fruit Baby World integrity guidelines."
    );
  }

  for (const w of draft.warnings ?? []) {
    if (!warnings.includes(w)) warnings.push(w);
  }

  return warnings;
}

// ─── Review summary ───────────────────────────────────────────────────────────

export function getProductMockupReviewSummary(reviewState: {
  checkedIds: Set<string>;
  totalItems: number;
  looksGood: boolean;
}): { isReady: boolean; label: string } {
  const { checkedIds, totalItems, looksGood } = reviewState;
  const allChecked = checkedIds.size === totalItems;
  const isReady = looksGood || allChecked;
  const label = allChecked
    ? "All checklist items confirmed"
    : looksGood
    ? "Marked as looks good"
    : `${checkedIds.size}/${totalItems} items checked`;
  return { isReady, label };
}
