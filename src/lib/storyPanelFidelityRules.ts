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
