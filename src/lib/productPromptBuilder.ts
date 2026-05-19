// Product prompt builder — pure functions, no server-only imports.
// Safe for both client and server use.

import type {
  ProductConceptCategory,
  CharacterSeedData,
  ProductPromptPackage,
  ProductConceptAudience,
} from "@/lib/productConceptTypes";

// ─── Category labels ──────────────────────────────────────────────────────────

export const PRODUCT_CATEGORY_LABELS: Record<ProductConceptCategory, string> = {
  plush: "Plush Toy",
  "squish-toy": "Squish Toy",
  book: "Board / Picture Book",
  card: "Trading Card",
  sticker: "Sticker Sheet",
  poster: "Classroom Poster",
  playset: "Playset",
  apparel: "Apparel Concept",
  "classroom-material": "Classroom Material",
  collectible: "Collectible Figure",
  bundle: "Story Bundle",
  other: "Other Product",
};

// ─── Product-specific guidance blocks ────────────────────────────────────────

export function buildProductCategoryPromptBlock(
  category: ProductConceptCategory
): string[] {
  switch (category) {
    case "plush":
      return [
        "Soft, rounded plush figure (approx 8–12 inches)",
        "Embroidered facial features — eyes, smile, cheeks (no printed decals on face)",
        "All surfaces soft and child-safe; no hard plastic or sharp edges",
        "Baby-like proportions — large head, small rounded body",
        "Leaf crown, accessories, or character details as soft sewn elements",
        "Use official color palette exactly; no color substitutions",
        "Include hang tag area for retail branding",
        "ASTM F963 toy safety compliance expected",
      ];

    case "squish-toy":
      return [
        "Soft foam or gel-filled squishy form (approx 4–6 inches)",
        "Smooth, rounded silhouette optimized for squeezing and stress relief",
        "Face and features embossed or printed — not sharp or dangerously raised",
        "Matte or glossy finish using official character colors",
        "Collectible-friendly sizing for display and play",
        "Slow-rising foam preferred for satisfying tactile experience",
        "Simple, clean design suitable for all ages",
      ];

    case "book":
      return [
        "Front cover: character prominently centered in welcoming, expressive pose",
        "Title area at top with readable, kid-friendly typography",
        "Bright, saturated color palette matching official character colors",
        "Soft, warm illustrative style consistent with Fruit Baby World aesthetic",
        "Board book (ages 0–4) or picture book (ages 3–8) format",
        "Interior: clean full-bleed spreads with large illustration area",
        "Back cover and spine considerations for series branding",
      ];

    case "card":
      return [
        "Standard trading card dimensions (2.5\" × 3.5\")",
        "Character in a signature, expressive pose centered on card face",
        "Character name and role label clearly visible",
        "Background evokes character's home environment or fruit theme",
        "High contrast, visually readable at arm's length",
        "Card back: character fun facts, stats, or collectible number",
        "Optional: foil or holo finish for premium variant",
      ];

    case "sticker":
      return [
        "Clean character silhouette optimized for sticker die-cut",
        "Expressive, energetic pose — character at its most recognizable",
        "White or clear border for visual separation from backgrounds",
        "Bold, saturated colors for sharp print reproduction",
        "Sheet layout with multiple character poses or sizes",
        "Mix of large (2\"–3\") and mini (0.5\"–1\") stickers recommended",
        "Vinyl-safe design for weatherproof durability if applicable",
      ];

    case "poster":
      return [
        "Large format: approx 18\"×24\" or A2 educational/decorative poster",
        "Character prominently featured — full body or portrait format",
        "Character name, role, and fun fact label included",
        "Optional: lesson theme, character trait, or episode tie-in",
        "Readable from classroom distance — bold typography, accessible design",
        "Bright, engaging colors appealing to ages 3–10",
        "Optional: activity prompt or discussion question at bottom",
      ];

    case "playset":
      return [
        "Scene setting includes character's home environment or story location",
        "Character figure with poseable or fixed iconic pose",
        "Multiple accessories: signature fruit item, props, landmarks",
        "Child-safe pieces — no small parts hazardous for ages under 3",
        "Bright, bold colors matching character and environment palette",
        "Approx 1:12 or 1:18 scale figures; durable ABS plastic or soft rubber",
        "Optional: themed carrying case or display base",
      ];

    case "apparel":
      return [
        "Front graphic design — character facing forward in iconic pose",
        "Clean vector-style artwork suitable for screen printing or embroidery",
        "Character name and/or brand wordmark included",
        "White, cream, or character-appropriate garment color background",
        "Design centered chest or all-over print concept",
        "Colors print-safe in official palette; fade-resistant",
        "Embroidery alternative: simplified icon for hats or bags",
      ];

    case "classroom-material":
      return [
        "Educational layout with character as friendly guide or mascot",
        "Include lesson theme, activity, or learning objective element",
        "Teacher-friendly — readable and functional from across the room",
        "Bright, engaging design for young learners (ages 3–10)",
        "Character integrated naturally into educational content",
        "Inclusive, accessible design language",
        "Printable or laminated format consideration",
      ];

    case "collectible":
      return [
        "Premium figure (approx 3–5 inches) in signature or iconic pose",
        "High-detail paint/finish using official colors exactly",
        "Display base or stand included in concept",
        "Collector box art: character illustration, name, series number",
        "Limited-edition feel: matte or gloss finish, optional metallic accents",
        "PVC or resin construction concept",
        "Series numbering for collectible set cohesion",
      ];

    case "bundle":
      return [
        "Multiple products bundled: e.g., plush + book + sticker sheet",
        "Unified gift set packaging — character-branded box or bag",
        "All bundle items visually consistent with official character identity",
        "Bundle positioning: birthday, holiday, or classroom gift set",
        "Interior layout organized for satisfying unboxing experience",
        "Bundle label: character name, included item list, age range",
      ];

    case "other":
    default:
      return [
        "Describe the specific product type in the product goal field",
        "Preserve official character visual identity across all elements",
        "Use official color palette; no color substitutions",
        "Maintain kid-friendly, warm, cheerful brand aesthetic",
        "Apply all safety standards relevant to the product type",
        "Character features — body, face, colors — must remain canonical",
      ];
  }
}

// ─── Character identity block ─────────────────────────────────────────────────

export function buildCharacterProductIdentityBlock(
  char: CharacterSeedData
): string {
  const lines: string[] = [];
  lines.push(`Character: ${char.displayName}`);
  if (char.fruitType) lines.push(`Fruit Identity: ${char.fruitType}`);
  if (char.role) lines.push(`Role: ${char.role}`);
  if (char.home) lines.push(`Home: ${char.home}`);
  if (char.tagline) lines.push(`Tagline: "${char.tagline}"`);
  if (char.shortDescription) {
    lines.push("");
    lines.push(char.shortDescription);
  }
  if (char.visualIdentitySummary) {
    lines.push("");
    lines.push(`Visual Identity: ${char.visualIdentitySummary}`);
  }
  return lines.join("\n");
}

// ─── Fidelity rules block ─────────────────────────────────────────────────────

export function buildProductFidelityRulesBlock(char: CharacterSeedData): string[] {
  const base = [
    `Preserve ${char.displayName}'s official fruit identity (${char.fruitType || "fruit character"})`,
    "Preserve official body shape — do not alter proportions",
    "Preserve official color palette — no substitutions or additions",
    "Preserve face style — eyes, mouth, cheeks, expression system",
    "Preserve baby-like, rounded, soft proportions",
    "Preserve any signature accessories (leaf crown, etc.)",
    "Preserve kid-friendly, warm, cheerful character tone",
  ];
  const combined = [...base, ...char.alwaysRules];
  // Deduplicate while preserving order
  return combined.filter((r, i, arr) => arr.indexOf(r) === i);
}

// ─── Do not change block ──────────────────────────────────────────────────────

export function buildProductDoNotChangeBlock(char: CharacterSeedData): string[] {
  if (char.doNotChangeRules.length > 0) return char.doNotChangeRules;
  return char.neverRules;
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

export function buildProductPromptWarnings(pkg: {
  char: CharacterSeedData;
  productTitle: string;
}): string[] {
  const { char, productTitle } = pkg;
  const warnings: string[] = [];

  if (!productTitle.trim()) {
    warnings.push("No product title entered — a generic title will be used in the prompt.");
  }
  if (!char.hasProfileImage) {
    warnings.push(
      "No official profile sheet attached. Include reference images when sending this prompt to an image generator."
    );
  }
  if (!char.hasVisualIdentity) {
    warnings.push(
      "No visual identity summary available. Character appearance rules may be incomplete."
    );
  }
  if (!char.hasColorPalette) {
    warnings.push(
      "No color palette found. Verify official character colors from reference materials before generating."
    );
  }
  if (!char.hasCharacterRules) {
    warnings.push(
      "No character brand rules found. Apply general Fruit Baby World integrity guidelines."
    );
  }
  if (char.doNotChangeRules.length === 0 && char.neverRules.length === 0) {
    warnings.push(
      "No explicit do-not-change rules. Verify character canon before using this prompt."
    );
  }
  return warnings;
}

// ─── Final prompt assembly (internal) ────────────────────────────────────────

function assemblePromptText(pkg: Omit<ProductPromptPackage, "finalPrompt" | "warnings">): string {
  const catLabel = PRODUCT_CATEGORY_LABELS[pkg.category] ?? pkg.category;
  const lines: string[] = [];

  const title = pkg.productTitle.trim() || `${pkg.characterName} ${catLabel}`;

  lines.push(`PRODUCT MOCKUP BRIEF: ${title}`);
  lines.push("─".repeat(60));
  lines.push("");

  lines.push("PRODUCT");
  lines.push(`  Type:      ${catLabel}`);
  if (pkg.audience) lines.push(`  Audience:  ${pkg.audience}`);
  if (pkg.productGoal?.trim()) lines.push(`  Goal:      ${pkg.productGoal.trim()}`);
  lines.push("");

  lines.push("CHARACTER");
  lines.push(`  Name:           ${pkg.characterName}`);
  if (pkg.characterFruitType) lines.push(`  Fruit Identity: ${pkg.characterFruitType}`);
  if (pkg.characterRole) lines.push(`  Role:           ${pkg.characterRole}`);
  if (pkg.characterHome) lines.push(`  Home:           ${pkg.characterHome}`);
  if (pkg.characterTagline) lines.push(`  Tagline:        "${pkg.characterTagline}"`);
  lines.push("");

  if (pkg.characterShortDescription) {
    lines.push("CHARACTER DESCRIPTION");
    lines.push(`  ${pkg.characterShortDescription}`);
    lines.push("");
  }

  if (pkg.visualIdentitySummary) {
    lines.push("VISUAL IDENTITY");
    lines.push(`  ${pkg.visualIdentitySummary}`);
    lines.push("");
  }

  if (pkg.colorPalette.length > 0) {
    lines.push("OFFICIAL COLOR PALETTE");
    pkg.colorPalette.forEach((c) => lines.push(`  • ${c}`));
    lines.push("");
  }

  if (pkg.productSpecificGuidance.length > 0) {
    lines.push(`PRODUCT GUIDANCE — ${catLabel.toUpperCase()}`);
    pkg.productSpecificGuidance.forEach((g) => lines.push(`  • ${g}`));
    lines.push("");
  }

  if (pkg.alwaysRules.length > 0) {
    lines.push("ALWAYS (BRAND RULES)");
    pkg.alwaysRules.forEach((r) => lines.push(`  ✓ ${r}`));
    lines.push("");
  }

  if (pkg.neverRules.length > 0) {
    lines.push("NEVER (BRAND RULES)");
    pkg.neverRules.forEach((r) => lines.push(`  ✕ ${r}`));
    lines.push("");
  }

  if (pkg.doNotChangeRules.length > 0) {
    lines.push("DO NOT CHANGE");
    pkg.doNotChangeRules.forEach((r) => lines.push(`  🔒 ${r}`));
    lines.push("");
  }

  lines.push("STYLE REQUIREMENTS");
  lines.push("  • Soft, warm, and cheerful — never scary or realistic");
  lines.push("  • Kid-friendly proportions and color palette throughout");
  lines.push("  • Preserve official character design exactly");
  lines.push("  • No horror, violence, crude humor, or adult themes");
  lines.push("  • Brand-consistent Fruit Baby World visual identity");
  lines.push("");

  if (pkg.characterPersonalityTraits.length > 0) {
    lines.push("CHARACTER PERSONALITY NOTES");
    lines.push(
      `  ${pkg.characterPersonalityTraits.slice(0, 3).join("  •  ")}`
    );
    lines.push("");
  }

  lines.push("OUTPUT REQUESTED");
  lines.push(
    `  Create a detailed product mockup concept for "${title}". The design must be clearly recognizable as ${pkg.characterName} from Fruit Baby World, preserved in exact official character form, and optimized for ${catLabel.toLowerCase()} production.`
  );

  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function buildProductMockupPrompt(pkg: ProductPromptPackage): string {
  return assemblePromptText(pkg);
}

export function buildProductPromptPackage(options: {
  char: CharacterSeedData;
  category: ProductConceptCategory;
  productTitle: string;
  audience?: string;
  productGoal?: string;
}): ProductPromptPackage {
  const { char, category, productTitle, audience, productGoal } = options;

  const colorPalette = char.colorPalette.map(
    (c) =>
      `${c.name}${c.hex ? ` (${c.hex})` : ""}${c.usage ? ` — ${c.usage}` : ""}`
  );

  const alwaysRules = char.alwaysRules;
  const neverRules = char.neverRules;
  const characterRules = [...alwaysRules, ...neverRules];
  const doNotChangeRules = buildProductDoNotChangeBlock(char);
  const productSpecificGuidance = buildProductCategoryPromptBlock(category);

  const resolvedTitle =
    productTitle.trim() ||
    `${char.displayName} ${PRODUCT_CATEGORY_LABELS[category] ?? category}`;

  const base: Omit<ProductPromptPackage, "finalPrompt" | "warnings"> = {
    characterSlug: char.slug,
    characterName: char.displayName,
    characterTagline: char.tagline,
    characterShortDescription: char.shortDescription,
    characterFruitType: char.fruitType,
    characterRole: char.role,
    characterHome: char.home,
    characterType: char.type,
    characterPersonalityTraits: char.personalityTraits,
    category,
    productTitle: resolvedTitle,
    audience: audience as ProductConceptAudience | undefined,
    productGoal: productGoal?.trim() || undefined,
    visualIdentitySummary: char.visualIdentitySummary,
    colorPalette,
    alwaysRules,
    neverRules,
    characterRules,
    doNotChangeRules,
    productSpecificGuidance,
  };

  const warnings = buildProductPromptWarnings({ char, productTitle });
  const finalPrompt = assemblePromptText(base);

  return { ...base, finalPrompt, warnings };
}
