// Product mockup prompt builder — pure functions, no server-only imports.
// Builds finalized image-generation prompts from product + character data.
// Safe for both client and server use.

import type { ProductConceptCategory } from "@/lib/productConceptTypes";
import type { ProductMockupStyle } from "@/lib/productMockupTypes";

// ─── Input shape (subset of ProductPromptPackage — safe to pass from server) ──

export type ProductMockupPromptInput = {
  characterSlug: string;
  characterName: string;
  characterFruitType?: string;
  characterRole?: string;
  visualIdentitySummary?: string;
  colorPalette?: string[];
  alwaysRules?: string[];
  neverRules?: string[];
  doNotChangeRules?: string[];
  category: ProductConceptCategory;
  productTitle: string;
  promptText: string;
  mockupStyle?: ProductMockupStyle;
  referenceAssetTitles?: string[];
};

// ─── Style guidance ───────────────────────────────────────────────────────────

export function buildProductMockupStyleBlock(
  category: ProductConceptCategory,
  style: ProductMockupStyle = "clean-product-mockup"
): string[] {
  const base = (() => {
    switch (style) {
      case "clean-product-mockup":
        return [
          "Clean white or light studio background",
          "Product centered and clearly visible",
          "Professional product photography / concept art style",
          "No clutter, no competing elements",
          "Soft shadows acceptable for depth",
        ];
      case "storybook-product":
        return [
          "Warm, illustrated storybook setting",
          "Product integrated naturally into a gentle scene",
          "Soft pastel tones consistent with Fruit Baby World palette",
          "Inviting, cozy, child-friendly atmosphere",
        ];
      case "collector-display":
        return [
          "Premium display background — dark gradient or collector shelf",
          "Product shown as a collectible item with careful lighting",
          "Subtle spotlight or soft bokeh background",
          "High-end collector figure / collectible card aesthetic",
        ];
      case "classroom-display":
        return [
          "Bright, cheerful classroom or educational setting",
          "Product shown in context of learning or play",
          "Bold, easy-to-read visual design language",
          "Welcoming teacher/student-friendly aesthetic",
        ];
    }
  })();

  const categoryExtra = (() => {
    switch (category) {
      case "plush":
        return ["Show plush from slight three-quarter angle to convey softness and dimension"];
      case "squish-toy":
        return ["Show squishy form with slightly squished edges to suggest tactile quality"];
      case "book":
        return ["Show front cover prominently; optional slight spine view for context"];
      case "card":
        return ["Show trading card face-on; card stock and finish should read clearly"];
      case "sticker":
        return ["Show sticker sheet layout with die-cut outlines visible; bright on white/light"];
      case "poster":
        return ["Show poster flat or slightly rolled; full illustration visible"];
      case "playset":
        return ["Show all playset components arranged together in a clear, inviting layout"];
      case "apparel":
        return ["Show garment front-facing; graphic centered and clearly visible"];
      case "classroom-material":
        return ["Show material flat, readable from standard viewing distance"];
      case "collectible":
        return ["Show figure from front or slight three-quarter angle on display base"];
      case "bundle":
        return ["Show all bundle items arranged together; unified packaging visible"];
      default:
        return [];
    }
  })();

  return [...base, ...categoryExtra];
}

// ─── Safety / fidelity block ──────────────────────────────────────────────────

export function buildProductMockupSafetyBlock(input: {
  characterName: string;
  characterFruitType?: string;
  alwaysRules?: string[];
  neverRules?: string[];
  doNotChangeRules?: string[];
}): string[] {
  const { characterName, characterFruitType, alwaysRules = [], neverRules = [], doNotChangeRules = [] } = input;

  const baseFidelity = [
    `Preserve ${characterName}'s exact official fruit identity (${characterFruitType ?? "fruit character"})`,
    "Preserve exact body shape and silhouette — do not alter proportions",
    "Preserve official color palette exactly — no hue shifts, no desaturation",
    "Preserve face style — eyes, mouth, cheeks, expression system",
    "Preserve leaf crown and signature accessories exactly",
    "Preserve baby-like, soft, rounded proportions",
    "Do not redesign the character — no new features, altered silhouettes, or style changes",
    "Do not make the character realistic, sharp, adult, scary, or off-brand",
    "Do not create a generic fruit mascot — this is a specific official character",
    "Keep the character design kid-friendly, warm, soft, and cheerful throughout",
  ];

  const combined = [
    ...baseFidelity,
    ...alwaysRules,
    ...(doNotChangeRules.length > 0 ? doNotChangeRules : neverRules),
  ];

  return combined.filter((r, i, arr) => arr.indexOf(r) === i);
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

export function buildProductMockupWarnings(input: ProductMockupPromptInput): string[] {
  const warnings: string[] = [];

  if (!input.visualIdentitySummary) {
    warnings.push(
      `No visual identity summary for ${input.characterName}. Character appearance rules may be incomplete.`
    );
  }
  if (!input.colorPalette || input.colorPalette.length === 0) {
    warnings.push(
      `No official color palette found for ${input.characterName}. Verify colors from reference materials before using the generated image.`
    );
  }
  if (!input.alwaysRules || input.alwaysRules.length === 0) {
    warnings.push(
      "No character brand rules found. Apply general Fruit Baby World integrity guidelines."
    );
  }
  if (!input.doNotChangeRules || input.doNotChangeRules.length === 0) {
    warnings.push(
      "No explicit do-not-change rules. Verify character canon before using the generated image."
    );
  }
  if (!input.referenceAssetTitles || input.referenceAssetTitles.length === 0) {
    warnings.push(
      "Product mockup generation used prompt-only reference guidance. Reference-image input can be added later."
    );
  }

  return warnings;
}

// ─── Final image prompt assembly ──────────────────────────────────────────────

export function buildProductMockupImagePrompt(
  input: ProductMockupPromptInput,
  options?: { includeFullPromptText?: boolean }
): string {
  const style = input.mockupStyle ?? "clean-product-mockup";
  const lines: string[] = [];

  // ── Task header ──────────────────────────────────────────────────────────────
  lines.push(
    `Create a product concept mockup image for: "${input.productTitle}"`
  );
  lines.push(
    `This is a ${input.category} product featuring ${input.characterName} from Fruit Baby World.`
  );
  lines.push("");

  // ── Character identity ───────────────────────────────────────────────────────
  lines.push("CHARACTER:");
  lines.push(`  ${input.characterName}`);
  if (input.characterFruitType) lines.push(`  Fruit Identity: ${input.characterFruitType}`);
  if (input.characterRole) lines.push(`  Role: ${input.characterRole}`);
  if (input.visualIdentitySummary) {
    lines.push(`  Visual Identity: ${input.visualIdentitySummary}`);
  }
  lines.push("");

  // ── Color palette ────────────────────────────────────────────────────────────
  if (input.colorPalette && input.colorPalette.length > 0) {
    lines.push("OFFICIAL COLOR PALETTE (use exactly):");
    input.colorPalette.slice(0, 6).forEach((c) => lines.push(`  • ${c}`));
    lines.push("");
  }

  // ── Reference context ────────────────────────────────────────────────────────
  if (input.referenceAssetTitles && input.referenceAssetTitles.length > 0) {
    lines.push("REFERENCE ASSETS (visual context):");
    input.referenceAssetTitles.forEach((t) => lines.push(`  • ${t}`));
    lines.push("");
  }

  // ── Character fidelity rules ─────────────────────────────────────────────────
  const fidelityRules = buildProductMockupSafetyBlock(input);
  if (fidelityRules.length > 0) {
    lines.push("CHARACTER FIDELITY RULES (mandatory):");
    fidelityRules.slice(0, 12).forEach((r) => lines.push(`  ✓ ${r}`));
    lines.push("");
  }

  // ── Style requirements ───────────────────────────────────────────────────────
  const styleBlock = buildProductMockupStyleBlock(input.category, style);
  lines.push("PRODUCT MOCKUP STYLE:");
  styleBlock.forEach((s) => lines.push(`  • ${s}`));
  lines.push("");

  // ── Product brief (from prompt builder) ──────────────────────────────────────
  if (options?.includeFullPromptText !== false && input.promptText) {
    lines.push("PRODUCT BRIEF:");
    lines.push(input.promptText.slice(0, 2000));
    lines.push("");
  }

  // ── Global brand style ───────────────────────────────────────────────────────
  lines.push("BRAND STYLE REQUIREMENTS:");
  lines.push("  • Soft, warm, cheerful illustration style — not realistic or scary");
  lines.push("  • Kid-friendly throughout — appropriate for children, families, teachers, collectors");
  lines.push("  • Preserve official Fruit Baby World character design exactly");
  lines.push("  • No horror, violence, crude humor, or adult themes");
  lines.push("  • Output: clean product concept / mockup image");
  lines.push("");

  // ── Output instruction ───────────────────────────────────────────────────────
  lines.push(
    `OUTPUT: A clear product mockup concept image of "${input.productTitle}" featuring ` +
    `${input.characterName} in exact official character form, ` +
    `optimized for ${input.category} product presentation, ` +
    `kid-friendly and brand-consistent throughout.`
  );

  return lines.join("\n");
}
