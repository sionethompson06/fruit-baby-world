// Background-only story panel prompt builder (Phase 18D.10).
// Generates clean environment prompts with strict no-character rules.
// Uses the assembly plan's pre-built background prompt as source of truth.
// Server-safe — do NOT import in client components.

import { PROVIDER_PROMPT_HARD_LIMIT } from "@/lib/storyPanelPromptCompactor";

// ─── Strict no-character rules ─────────────────────────────────────────────────

const BACKGROUND_ONLY_RULES = [
  "Generate only the environment/background layer.",
  "No characters.",
  "No Fruit Babies.",
  "No fruit mascots.",
  "No faces.",
  "No eyes.",
  "No arms or legs.",
  "No crowns, stems, leaves, or character-like shapes.",
  "No silhouettes of characters.",
  "No placeholder shapes where characters will go.",
  "Leave natural open space for characters to be composited later.",
  "Do not place any figure, creature, or organic shape that could be read as a character.",
] as const;

export function buildBackgroundNegativeRules(): string {
  return (
    "BACKGROUND ONLY RULES:\n" +
    BACKGROUND_ONLY_RULES.map((r) => `- ${r}`).join("\n")
  );
}

// ─── Main background prompt builder ────────────────────────────────────────────

export function buildBackgroundOnlyPrompt(options: {
  backgroundPrompt: string;
  adminSceneDirection?: string | null;
  backgroundDirection?: string | null;
  settingLabel?: string;
  mood?: string;
  environmentReferenceSummary?: string;
  goldenReferenceSummary?: string;
}): string {
  const {
    backgroundPrompt,
    adminSceneDirection,
    backgroundDirection,
    settingLabel,
    mood,
    environmentReferenceSummary,
    goldenReferenceSummary,
  } = options;

  const parts: string[] = [];

  // 1. Header
  parts.push("BACKGROUND LAYER — Fruit Baby World Story Panel");
  parts.push("");

  // 2. Core background intent
  parts.push(buildBackgroundNegativeRules());
  parts.push("");

  // 3. Scene description from assembly plan
  parts.push("SCENE DESCRIPTION:");
  parts.push(backgroundPrompt.trim());
  parts.push("");

  // 4. Official environment references (when available — visual source of truth)
  if (environmentReferenceSummary?.trim()) {
    parts.push(environmentReferenceSummary.trim());
    parts.push("");
  }

  // 5. Golden References (approved prior examples — lower priority than official references)
  if (goldenReferenceSummary?.trim()) {
    parts.push(goldenReferenceSummary.trim());
    parts.push("");
  }

  // 6. Optional background direction (admin-specified)
  if (backgroundDirection?.trim()) {
    parts.push(`BACKGROUND DIRECTION: "${backgroundDirection.trim()}"`);
    parts.push("");
  }

  // 7. Optional admin scene direction (passed through for environment guidance only)
  if (adminSceneDirection?.trim()) {
    parts.push(`SCENE DIRECTION (environment context only): "${adminSceneDirection.trim()}"`);
    parts.push("Apply only to environment choices — ignore any character positioning implied here.");
    parts.push("");
  }

  // 8. Style mandate
  const styleParts: string[] = [
    "Style: flat digital illustration, warm storybook color palette, kid-friendly and inviting.",
    "Background art only — this layer will have characters composited onto it later.",
    "Leave compositional breathing room in the scene for foreground character placement.",
  ];
  if (settingLabel && settingLabel !== "General Scene") {
    styleParts.unshift(`Setting: ${settingLabel}.`);
  }
  if (mood && mood !== "warm and playful") {
    styleParts.unshift(`Mood: ${mood}.`);
  }
  parts.push(styleParts.join(" "));
  parts.push("");

  // 9. Explicit character prohibition (repeated at end for emphasis)
  parts.push("CRITICAL: This background must contain ZERO characters, figures, faces, eyes, or character-like shapes. Background environment only.");

  return parts.join("\n");
}

// ─── Compact background prompt if needed ────────────────────────────────────────

export function compactBackgroundPromptIfNeeded(prompt: string): {
  prompt: string;
  wasCompacted: boolean;
  originalLength: number;
  compactedLength: number;
} {
  const originalLength = prompt.length;

  if (originalLength <= PROVIDER_PROMPT_HARD_LIMIT) {
    return {
      prompt,
      wasCompacted: false,
      originalLength,
      compactedLength: originalLength,
    };
  }

  // Truncate at hard limit with character prohibition always appended
  const prohibition = "\n\nCRITICAL: No characters, faces, eyes, or character-like shapes. Background environment only.";
  const available = PROVIDER_PROMPT_HARD_LIMIT - prohibition.length;
  const compacted = prompt.slice(0, available) + prohibition;

  return {
    prompt: compacted,
    wasCompacted: true,
    originalLength,
    compactedLength: compacted.length,
  };
}
