// Helper for animation clip generation: package building and fidelity rules.
// All functions are pure text/data — no video generation or file I/O.

import type { CharacterRef } from "@/lib/storyPanelImageGeneration";

// ─── Animation rule constants ─────────────────────────────────────────────────

const ANIMATION_STYLE_RULES = [
  "Use gentle cartoon-style movement appropriate for young children.",
  "Use simple, child-friendly camera framing — avoid dramatic zooms or fast cuts.",
  "Use a warm storybook-inspired visual tone throughout.",
  "Show soft, clear expressions that young children can easily read.",
  "No harsh camera motion or rapid cuts.",
  "No scary lighting, shadows, or horror-style visual effects.",
  "No violence, aggression, or physically intense action.",
  "No intense or horror-like energy.",
  "Express emotion clearly and warmly for a young audience.",
  "Keep all visual style consistent with official Fruit Baby character designs.",
];

const ANIMATION_SAFETY_RULES = [
  "Keep kid-friendly throughout — warm, playful, gentle, and emotionally safe.",
  "No scary, violent, cruel, realistic, harsh, or off-brand elements.",
  "No adult themes.",
  "No intense sound effects, flashing lights, or startling motion.",
  "Suitable for children ages 2–8.",
];

const ANIMATION_FIDELITY_RULES = [
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
  "Keep movement kid-friendly, gentle, warm, playful, and educational.",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnimationPackage = {
  episodeSlug: string;
  sceneNumber: number;
  durationSeconds: number;
  animationPrompt: string;
  finalGenerationInstructions: string;
  referenceCharacters: CharacterRef[];
  safetyRules: string[];
  fidelityRules: string[];
};

// ─── Package builder ──────────────────────────────────────────────────────────

export function buildAnimationPackage(
  episodeSlug: string,
  sceneNumber: number,
  durationSeconds: number,
  animationPrompt: string,
  refs: CharacterRef[]
): AnimationPackage {
  const hasTiki = refs.some((r) => r.type === "villain" || r.slug === "tiki");
  const lines: string[] = [];

  // Task
  lines.push("TASK:");
  lines.push(
    `Create a short animated story clip for Scene ${sceneNumber} (${durationSeconds} seconds).`
  );
  lines.push(
    "Animate existing characters — do not redesign or reimagine them."
  );
  lines.push("");

  // Animation description
  lines.push("ANIMATION DESCRIPTION:");
  lines.push(animationPrompt);
  lines.push("");

  // Reference requirement
  lines.push("REFERENCE REQUIREMENT:");
  lines.push(
    "Use the official character visual identities described below as the source of truth."
  );
  lines.push(
    "Provider-specific reference image attachment (profile sheets) will be completed in a later phase."
  );
  lines.push("Official reference image paths are included for future use:");
  for (const ref of refs) {
    if (ref.imageMainPath)
      lines.push(`  • ${ref.name} main image: ${ref.imageMainPath}`);
    if (ref.profileSheetPath)
      lines.push(`  • ${ref.name} profile sheet: ${ref.profileSheetPath}`);
  }
  lines.push("");

  // Animation style rules
  lines.push("ANIMATION STYLE RULES:");
  ANIMATION_STYLE_RULES.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  // Character-specific fidelity
  for (const ref of refs) {
    lines.push(`CHARACTER: ${ref.name}`);
    if (ref.visualStyleNotes) {
      lines.push(`Visual identity: ${ref.visualStyleNotes}`);
    }
    if (ref.fidelityRules.length > 0) {
      lines.push("Fidelity rules:");
      ref.fidelityRules.forEach((rule) => lines.push(`  • ${rule}`));
    }
    lines.push("");
  }

  // Global fidelity rules
  lines.push("GLOBAL VISUAL FIDELITY RULES:");
  ANIMATION_FIDELITY_RULES.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  // Tiki-specific guardrail
  if (hasTiki) {
    lines.push("TIKI TROUBLE GUARDRAIL:");
    lines.push(
      "Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly."
    );
    lines.push(
      "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."
    );
    lines.push("Tiki should feel like a mischievous rival, not a villain.");
    lines.push("");
  }

  // Safety rules
  lines.push("KID-FRIENDLY ANIMATION SAFETY RULES:");
  ANIMATION_SAFETY_RULES.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  // Output instruction
  lines.push("OUTPUT:");
  lines.push(
    "Create a short animated clip of this scene. Animate existing characters — do not redesign them."
  );
  lines.push(
    "Every character must be immediately recognizable as their official Fruit Baby self."
  );
  lines.push(
    "Keep movement gentle, expressive, and emotionally clear for young children."
  );

  return {
    episodeSlug,
    sceneNumber,
    durationSeconds,
    animationPrompt,
    finalGenerationInstructions: lines.join("\n"),
    referenceCharacters: refs,
    safetyRules: ANIMATION_SAFETY_RULES,
    fidelityRules: ANIMATION_FIDELITY_RULES,
  };
}
