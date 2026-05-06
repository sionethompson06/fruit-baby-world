// Helper for story panel image generation: validation, character data loading,
// and prompt building. All functions are pure text/data — no image generation.

import { getAllCharacters } from "@/lib/content";

// ─── Slug validation ──────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9-]+$/;

export function validateSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length > 0 && SAFE_SLUG.test(slug);
}

// ─── Character-specific fidelity rules ───────────────────────────────────────

const CHARACTER_FIDELITY: Record<string, string[]> = {
  "pineapple-baby": [
    "Preserve sunny yellow/golden body, green leafy crown, warm friendly face, rounded baby-like shape, and kind expression.",
    "Keep Pineapple Baby warm, encouraging, and heart-centered.",
  ],
  "ube-baby": [
    "Preserve purple/lavender ube identity, gentle dreamy expression, cozy magical feeling, and rounded baby-like shape.",
    "Keep Ube Baby soft, calm, dreamy, and comforting.",
  ],
  "kiwi-baby": [
    "Preserve fuzzy kiwi-brown body, green kiwi top, leaf crown, white blossom accent, warm eyes, blush, and sweet smile.",
    "Keep Kiwi Baby fresh, gentle, curious, and nature-loving.",
  ],
  "coconut-baby": [
    "Preserve warm coconut-brown and cream identity, calm comforting expression, and rounded baby-like shape.",
    "Keep Coconut Baby dependable, nurturing, cozy, and peaceful.",
  ],
  "mango-baby": [
    "Preserve mango yellow/orange identity, playful joyful expression, tropical green leaf accents, and energetic baby-like personality.",
    "Keep Mango Baby bright, cheerful, silly, and full of tropical energy.",
  ],
  tiki: [
    "Preserve carved wooden tiki body, leafy green crown, orange/red band, and mischievous kid-friendly expression.",
    "Keep Tiki funny, dramatic, sneaky, and kid-friendly.",
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
    "Tiki should feel like a mischievous rival, not a villain.",
  ],
};

const GLOBAL_FIDELITY_RULES = [
  "Preserve official body shape and silhouette.",
  "Preserve proportions — do not make characters taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve cute baby-like design language throughout.",
  "Do not redesign characters — no new features, altered silhouettes, or style changes.",
  "Do not create generic fruit mascots.",
  "Do not create loose 'inspired by' versions.",
  "Do not make characters older, realistic, scarier, sharper, or off-brand.",
  "Keep the scene kid-friendly, warm, playful, and educational.",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type CharacterRef = {
  slug: string;
  name: string;
  type: string;
  visualStyleNotes: string;
  fidelityRules: string[];
  imageMainPath: string;
  profileSheetPath: string;
};

// ─── Load character reference data ───────────────────────────────────────────

export function loadCharacterRefs(
  slugs: string[]
): { refs: CharacterRef[]; missing: string[] } {
  const all = getAllCharacters();
  const refs: CharacterRef[] = [];
  const missing: string[] = [];

  for (const slug of slugs) {
    const character = all.find((c) => c.id === slug || c.slug === slug);
    if (!character) {
      missing.push(slug);
      continue;
    }
    refs.push({
      slug: character.slug,
      name: character.name,
      type: character.type,
      visualStyleNotes: character.visualIdentity?.styleNotes ?? "",
      fidelityRules: CHARACTER_FIDELITY[character.id] ?? CHARACTER_FIDELITY[character.slug] ?? [],
      imageMainPath: character.image.main ?? "",
      profileSheetPath: character.image.profileSheet ?? "",
    });
  }

  return { refs, missing };
}

// ─── Build generation prompt ──────────────────────────────────────────────────

export function buildGenerationPrompt(
  panelPrompt: string,
  refs: CharacterRef[],
  sceneNumber?: number
): string {
  const hasTiki = refs.some((r) => r.type === "villain" || r.slug === "tiki");
  const lines: string[] = [];

  // Task
  lines.push("TASK:");
  lines.push(
    `Create a kid-friendly still storybook panel${sceneNumber != null ? ` for Scene ${sceneNumber}` : ""}.`
  );
  lines.push("");

  // Panel prompt
  lines.push("PANEL DESCRIPTION:");
  lines.push(panelPrompt);
  lines.push("");

  // Reference requirement
  lines.push("REFERENCE REQUIREMENT:");
  lines.push(
    "Use the official character visual identities described below as the source of truth."
  );
  lines.push(
    "Future generations must use official uploaded profile sheet images as reference anchors."
  );
  lines.push("");

  // Character-specific rules
  for (const ref of refs) {
    lines.push(`CHARACTER: ${ref.name}`);
    if (ref.visualStyleNotes) {
      lines.push(`Visual identity: ${ref.visualStyleNotes}`);
    }
    if (ref.fidelityRules.length > 0) {
      lines.push("Fidelity rules:");
      ref.fidelityRules.forEach((rule) => lines.push(`• ${rule}`));
    }
    lines.push("");
  }

  // Global fidelity
  lines.push("GLOBAL VISUAL FIDELITY RULES:");
  GLOBAL_FIDELITY_RULES.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  // Tiki guardrail
  if (hasTiki) {
    lines.push("TIKI TROUBLE GUARDRAIL:");
    lines.push(
      "Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly. " +
        "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."
    );
    lines.push("");
  }

  // Safety
  lines.push("SAFETY AND BRAND RULES:");
  lines.push("• Keep kid-friendly throughout — warm, playful, and emotionally safe.");
  lines.push("• No scary, violent, cruel, realistic, harsh, or off-brand styling.");
  lines.push("• No adult themes.");
  lines.push("");

  // Output reminder
  lines.push("OUTPUT:");
  lines.push(
    "Create a new scene composition, not a new character design. " +
      "Every character must be immediately recognizable as their official Fruit Baby self."
  );

  return lines.join("\n");
}
