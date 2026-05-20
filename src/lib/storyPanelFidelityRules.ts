// Centralised fidelity rules for story panel generation.
// Single source of truth for global + per-character rules included in every
// panel generation prompt. Server-safe — do NOT import in client components.

import type { Character } from "@/lib/content";
import type { CharacterReferencePackage, SceneReferencePackage } from "@/lib/referenceAssetLoader";
import { getCharacterRules } from "@/lib/characterProfileNormalizer";

// ─── Global rules ─────────────────────────────────────────────────────────────

export const GLOBAL_PANEL_FIDELITY_RULES: string[] = [
  "These are trademarked characters. Do not redesign or reinterpret them.",
  "Match the approved reference images exactly — they are the primary source of truth.",
  "Preserve body shape, silhouette, fruit identity, and proportions for every character.",
  "Preserve cute baby-like proportions — do not make characters taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve leaf/crown shape and all signature features.",
  "Do not create generic fruit mascots — these are specific named characters.",
  "Do not create loose 'inspired by' substitutions.",
  "Generate a new scene or pose — but keep the official character design identical.",
  "Every character must be immediately recognizable as their official Fruit Baby self.",
  "Keep all content kid-friendly, warm, playful, and emotionally safe.",
  "No violence, horror, adult themes, or inappropriate content.",
];

// ─── Tiki guardrail ───────────────────────────────────────────────────────────

export const TIKI_GUARDRAIL_RULES: string[] = [
  "Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly.",
  "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
  "Tiki should feel like a mischievous rival — not a villain.",
];

// ─── Block builders ───────────────────────────────────────────────────────────

export function buildGlobalFidelityBlock(): string {
  return (
    "STRICT GLOBAL FIDELITY RULES:\n" +
    GLOBAL_PANEL_FIDELITY_RULES.map((r) => `• ${r}`).join("\n")
  );
}

export function buildTikiGuardrailBlock(): string {
  return (
    "TIKI TROUBLE GUARDRAIL:\n" +
    TIKI_GUARDRAIL_RULES.map((r) => `• ${r}`).join("\n")
  );
}

export function buildPerCharacterFidelityBlock(
  charPkg: CharacterReferencePackage,
  character?: Character
): string {
  const isTiki =
    charPkg.characterSlug === "tiki" || charPkg.characterSlug === "tiki-trouble";
  const lines: string[] = [`Fidelity rules for ${charPkg.characterName}:`];

  if (isTiki) {
    TIKI_GUARDRAIL_RULES.forEach((r) => lines.push(`  • ${r}`));
  }

  lines.push(
    "  • Preserve official body shape, silhouette, and fruit identity exactly.",
    "  • Preserve cute baby-like proportions.",
    "  • Preserve color palette exactly — no hue shifts.",
    "  • Preserve eye style, mouth style, and blush/cheek details."
  );

  if (character) {
    const rules = getCharacterRules(character);
    const restrictionRules = [
      ...rules.doNotChangeRules,
      ...rules.neverRules,
    ].slice(0, 4);
    restrictionRules.forEach((r) => lines.push(`  • ${r}`));
  }

  return lines.join("\n");
}

// ─── Full fidelity mandate ────────────────────────────────────────────────────

export function buildStrictFidelityMandate(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character> = {}
): string {
  const hasTiki = sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );

  const sections: string[] = [buildGlobalFidelityBlock()];

  if (hasTiki) sections.push(buildTikiGuardrailBlock());

  const charBlocks = sceneRefPkg.characterPackages.map((pkg) =>
    buildPerCharacterFidelityBlock(pkg, charBySlug[pkg.characterSlug])
  );
  if (charBlocks.length > 0) sections.push(charBlocks.join("\n\n"));

  sections.push(
    "FINAL MANDATE:\n" +
      "This is a strict reference-anchored production pipeline. " +
      "The reference bundle above defines the exact appearance of every character. " +
      "Do not substitute, approximate, or reinterpret. " +
      "Generate the requested scene while keeping every character identical to their official references."
  );

  return sections.join("\n\n");
}

// ─── Fruit label helper (internal) ───────────────────────────────────────────

function getFruitLabel(slug: string, char?: Character): string {
  if (char) {
    const raw = char as Character & Record<string, unknown>;
    const fruitType = typeof raw.fruitType === "string" ? raw.fruitType.trim() : "";
    if (fruitType) return `${fruitType}-specific `;
  }
  const match = slug.match(/^([a-z]+(?:-[a-z]+)?)-baby$/);
  if (match) return `${match[1]}-specific `;
  if (slug === "tiki" || slug === "tiki-trouble") return "tiki-specific ";
  return "";
}

// ─── Production-mode fidelity prompt (stronger, for Fal.ai path) ─────────────

export function buildProductionFidelityPrompt(
  sceneRefPkg: SceneReferencePackage,
  panelPrompt: string,
  charBySlug: Record<string, Character> = {}
): string {
  const charPkgs = sceneRefPkg.characterPackages;
  const charNames = charPkgs.map((p) => p.characterName).join(", ");
  const hasTiki = charPkgs.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );
  const isMultiCharacter = charPkgs.length > 1;

  const lines: string[] = [
    "PRODUCTION CHARACTER FIDELITY GENERATION — Fruit Baby World",
    "",
    "The attached reference images are official, trademark-protected Fruit Baby character designs.",
    "Each image is the PRIMARY and ONLY visual source of truth for the one specific character it shows.",
    "",
  ];

  // CHARACTER IDENTITY LOCKS
  if (charPkgs.length > 0) {
    lines.push("CHARACTER IDENTITY LOCKS:");
    lines.push(
      "Each reference image is bound exclusively to ONE character. Do not mix, blend, or transfer features between images."
    );
    lines.push("");
    charPkgs.forEach((pkg, i) => {
      const refNum = i + 1;
      const char = charBySlug[pkg.characterSlug];
      const fruitLabel = getFruitLabel(pkg.characterSlug, char);
      lines.push(`[LOCK ${refNum}] ${pkg.characterName} → Reference Image ${refNum}`);
      lines.push(
        `  • Reference Image ${refNum} defines ${pkg.characterName} ONLY. Do NOT apply its appearance to any other character.`
      );
      lines.push(
        `  • Match ${pkg.characterName}'s exact ${fruitLabel}body shape, proportions, color palette, and expression from this image.`
      );
      if (char) {
        const rules = getCharacterRules(char);
        const topRules = [...rules.doNotChangeRules, ...rules.neverRules].slice(0, 2);
        topRules.forEach((r) => lines.push(`  • ${r}`));
      }
      lines.push("");
    });
  }

  // CROSS-CHARACTER CONTAMINATION BANS
  if (isMultiCharacter) {
    lines.push("CROSS-CHARACTER TRAIT SEPARATION RULES:");
    lines.push(
      "No visual feature, color, texture, crown shape, or body design may transfer between characters."
    );
    charPkgs.forEach((pkg, i) => {
      const otherNames = charPkgs
        .filter((_, j) => j !== i)
        .map((p) => p.characterName)
        .join(" or ");
      const fruitLabel = getFruitLabel(pkg.characterSlug, charBySlug[pkg.characterSlug]);
      lines.push(
        `• ${pkg.characterName}'s ${fruitLabel}body design and color palette (Reference Image ${i + 1}) must NOT appear on ${otherNames}.`
      );
    });
    lines.push(
      "• Each character must remain visually distinct — different fruit identity, different colors, different crown/leaf shape.",
      ""
    );
  }

  // SCENE TO GENERATE
  lines.push("SCENE TO GENERATE:");
  lines.push(panelPrompt);
  lines.push("");

  // STRICT PRODUCTION REQUIREMENTS
  lines.push("STRICT PRODUCTION REQUIREMENTS — DO NOT DEVIATE:");
  lines.push(
    "• Reproduce each character's exact body shape, silhouette, and proportions from their reference image.",
    "• Match each character's exact color palette — no hue shifts, no saturation changes, no approximation.",
    "• Match each character's exact eye shape, pupil style, and expression style.",
    "• Match each character's exact mouth style, blush marks, and cheek details.",
    "• Match each character's exact leaf/crown shape and all character-specific fruit features.",
    "• Preserve cute baby-like proportions — do not make characters taller, older, or more realistic.",
    "• Do NOT redesign, reinterpret, or loosely approximate any character.",
    "• Do NOT create an 'inspired by' version — every character must match their official design exactly.",
    "• Do NOT add features, accessories, or details not present in the official reference.",
    "• All content must remain kid-friendly, warm, playful, and emotionally safe.",
    "• No violence, horror, adult themes, or scary imagery."
  );

  if (hasTiki) {
    lines.push(
      "• Tiki Trouble must appear mischievous and funny — NOT scary, cruel, evil, or threatening.",
      "• Tiki is a mischievous rival character — keep this tone strictly playful and comedic."
    );
  }

  if (charNames) {
    lines.push("", `Characters in this scene: ${charNames}`);
  }

  lines.push(
    "",
    "Generate the scene exactly as described while preserving every character's official appearance with full production fidelity."
  );

  return lines.join("\n");
}

// ─── Image-conditioned edit prompt ────────────────────────────────────────────

export function buildImageConditionedEditPrompt(
  sceneRefPkg: SceneReferencePackage,
  panelPrompt: string
): string {
  const charNames = sceneRefPkg.characterPackages
    .map((p) => p.characterName)
    .join(", ");
  const hasTiki = sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );

  const lines: string[] = [
    "The attached images are the official approved character designs for this scene.",
    "Use them as the PRIMARY visual source of truth for every character's appearance.",
    "Match each character's colors, body shape, proportions, and style exactly as shown.",
    "",
    panelPrompt,
    "",
    "STRICT REQUIREMENTS:",
    "• Match the attached official designs exactly — do not redesign or reinterpret.",
    "• Preserve cute baby-like proportions — do not make characters taller, older, or more realistic.",
    "• Preserve color palette, eye style, mouth style, blush/cheek details, and all signature features.",
    "• Keep all content kid-friendly, warm, playful, and emotionally safe.",
    "• Do not create generic fruit mascots — use the specific characters shown in the reference images.",
  ];

  if (hasTiki) {
    lines.push(
      "• Tiki Trouble must remain mischievous and funny — not scary, violent, cruel, or too intense."
    );
  }

  if (charNames) {
    lines.push(`Characters in this scene: ${charNames}`);
  }

  return lines.join("\n");
}

// ─── Summary string (for API response metadata) ───────────────────────────────

export function getFidelityRulesSummary(
  sceneRefPkg: SceneReferencePackage
): string {
  const chars = sceneRefPkg.characterPackages
    .map((p) => p.characterName)
    .join(", ");
  const hasTiki = sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );
  return [
    `Characters: ${chars || "none"}`,
    "Mode: strict",
    `Tiki guardrail: ${hasTiki ? "active" : "not applicable"}`,
    `Global rules: ${GLOBAL_PANEL_FIDELITY_RULES.length}`,
  ].join(" | ");
}
