// Harmonization prompt builder for assembled story panel drafts (Phase 18D.13).
// Produces a preservation-first prompt that improves visual cohesion without
// changing character identity, placement, or the scene composition.
// Server-safe — do NOT import in client components.

import { PROVIDER_PROMPT_HARD_LIMIT } from "@/lib/storyPanelPromptCompactor";

// ─── Main prompt builder ───────────────────────────────────────────────────────

export function buildHarmonizationPrompt(options?: {
  sceneCharacterCount?: number;
  settingLabel?: string;
  mood?: string;
}): string {
  const { sceneCharacterCount, settingLabel, mood } = options ?? {};

  const lines: string[] = [
    "FINAL HARMONIZATION PASS — Fruit Baby World Story Panel",
    "",
    "Use the attached/provided assembled image as the base.",
    "This is a polish-only pass — do NOT regenerate the image from scratch.",
    "Do not redesign any character. Do not change the story moment.",
    "",
    "ALLOWED IMPROVEMENTS:",
    "- Smooth any hard edges between character layers and the background",
    "- Add subtle natural shadows underneath each character",
    "- Harmonize lighting so all characters feel part of the same scene",
    "- Blend character layers into the background naturally",
    "- Improve overall storybook polish and visual cohesion",
    "- Reduce any pasted-on or layered look",
    "- Ensure a warm, kid-friendly color balance throughout",
    "",
    "STRICT DO-NOT-CHANGE RULES:",
    "- Do not move, resize, or reposition any character",
    "- Do not add, remove, or duplicate characters",
    "- Do not change character emotions, expressions, or actions",
    "- Do not change character colors, body shape, or proportions",
    "- Do not change character top features (crowns, leaves, stems)",
    "- Do not change Ube Baby's distinctive heart-shaped leaves",
    "- Do not change Mango Baby's stem/leaf or remove short rounded arms",
    "- Do not change Pineapple Baby's golden-yellow pineapple body and crown",
    "- Do not change the background setting, environment, or composition",
    "- Do not convert the image into a grid, reference sheet, lineup, or separate portraits",
    "",
    "OUTPUT REQUIREMENTS:",
    "- Return one finished, unified children's storybook panel",
    "- All characters and elements must remain in their existing positions",
    "- Style: flat digital illustration, warm storybook color palette, kid-friendly and inviting",
  ];

  if (settingLabel && settingLabel !== "General Scene") {
    lines.push(`- Setting: ${settingLabel} — preserve exactly as shown`);
  }
  if (mood && mood !== "warm and playful") {
    lines.push(`- Mood: ${mood} — preserve exactly as shown`);
  }
  if (sceneCharacterCount !== undefined && sceneCharacterCount > 0) {
    lines.push(
      `- Scene contains ${sceneCharacterCount} character${sceneCharacterCount !== 1 ? "s" : ""} — keep all present, no additions or removals`
    );
  }

  return lines.join("\n");
}

// ─── Preservation rules block ──────────────────────────────────────────────────

export function buildHarmonizationPreservationRules(options?: {
  characterSlugs?: string[];
}): string {
  const { characterSlugs = [] } = options ?? {};
  const hasTiki = characterSlugs.some((s) => s === "tiki" || s === "tiki-trouble");

  const lines = [
    "CHARACTER FIDELITY — preserve for all characters:",
    "• Official fruit identity, body color, body shape, and texture",
    "• Top feature (crown / leaves / stem) — exact per character, do not swap",
    "• Short rounded baby arms — must remain visible where shown",
    "• Baby proportions — short, round, plump body",
    "• Do not redesign, replace, add, remove, or duplicate any character",
  ];

  if (hasTiki) {
    lines.push("• Tiki Trouble: keep mischievous and funny — not scary, cruel, or violent");
  }

  return lines.join("\n");
}

// ─── Compact if over provider limit ───────────────────────────────────────────

export function compactHarmonizationPromptIfNeeded(prompt: string): {
  prompt: string;
  wasCompacted: boolean;
  originalLength: number;
  compactedLength: number;
} {
  const originalLength = prompt.length;
  if (originalLength <= PROVIDER_PROMPT_HARD_LIMIT) {
    return { prompt, wasCompacted: false, originalLength, compactedLength: originalLength };
  }

  const suffix =
    "\n\nPreserve all characters, positions, and composition. Polish only — do not regenerate.";
  const available = PROVIDER_PROMPT_HARD_LIMIT - suffix.length;
  const compacted = prompt.slice(0, available) + suffix;

  return {
    prompt: compacted,
    wasCompacted: true,
    originalLength,
    compactedLength: compacted.length,
  };
}
