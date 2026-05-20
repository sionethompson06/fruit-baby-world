// Provider prompt compactor for story panel generation (Phase 18D.5).
// Ensures prompts sent to Fal.ai / OpenAI stay within safe provider character limits
// while preserving the highest-priority character fidelity and scene instructions.
// Server-safe — do NOT import in client components.

import type { CharacterReferencePackage } from "@/lib/referenceAssetLoader";

// ─── Limits ───────────────────────────────────────────────────────────────────

export const PROVIDER_PROMPT_SOFT_LIMIT = 4800;
export const PROVIDER_PROMPT_HARD_LIMIT = 5000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompactionResult = {
  prompt: string;
  originalLength: number;
  compactedLength: number;
  wasCompacted: boolean;
  removedSections: string[];
  warnings: string[];
};

// ─── Compact feature lock text (one line per character slug) ──────────────────
// Intentionally brief — preserves must-have identity info in minimal space.

const COMPACT_FEATURE_LOCKS: Record<string, string> = {
  "pineapple-baby":
    "[Pineapple Baby] Golden-yellow pineapple body, diamond/crosshatch texture, layered green multi-leaf crown (spiky). Short baby arms. NEVER green body. No other character's crown on Pineapple Baby.",
  "ube-baby":
    "[Ube Baby] Soft purple/lavender smooth round body (no pineapple texture). Green heart-shaped leaf cluster on top. Short baby arms. No pineapple texture. No mango stem on Ube Baby.",
  "mango-baby":
    "[Mango Baby] Mango yellow/orange/green gradient smooth body. Brown mango stem + single green mango leaf on top. Short baby arms — MUST be visible in standing/sitting poses. No pineapple texture on Mango Baby.",
  "kiwi-baby":
    "[Kiwi Baby] Warm brown/fuzzy kiwi body, green interior hints, kiwi stem on top. Short baby arms. No pineapple texture. No borrowed top features.",
  "coconut-baby":
    "[Coconut Baby] Natural brown/tan round coconut body, coconut palm sprout on top. Short baby arms. No pineapple texture. No borrowed top features.",
  tiki:
    "[Tiki Trouble] Warm carved wood tones, compact totem shape, tiki carved face on top. Short stubby arms. Mischievous and funny — NOT scary, violent, or evil.",
  "tiki-trouble":
    "[Tiki Trouble] Warm carved wood tones, compact totem shape, tiki carved face on top. Short stubby arms. Mischievous and funny — NOT scary, violent, or evil.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function countPromptCharacters(text: string): number {
  return text.length;
}

// ─── Main compactor ───────────────────────────────────────────────────────────

export function compactStoryPanelPrompt(options: {
  fullPrompt: string;
  panelPrompt: string;
  charPkgs: CharacterReferencePackage[];
  adminSceneDirection?: string;
}): CompactionResult {
  const { fullPrompt, panelPrompt, charPkgs, adminSceneDirection } = options;
  const originalLength = fullPrompt.length;

  // Under the soft limit — send as-is
  if (originalLength <= PROVIDER_PROMPT_SOFT_LIMIT) {
    return {
      prompt: fullPrompt,
      originalLength,
      compactedLength: originalLength,
      wasCompacted: false,
      removedSections: [],
      warnings: [],
    };
  }

  const removed: string[] = [];
  const warnings: string[] = [];

  // No character data — fall back to simple truncation
  if (charPkgs.length === 0) {
    const truncated = fullPrompt.slice(0, PROVIDER_PROMPT_SOFT_LIMIT);
    return {
      prompt: truncated,
      originalLength,
      compactedLength: truncated.length,
      wasCompacted: true,
      removedSections: ["tail of prompt (no character package data for structured rebuild)"],
      warnings: ["Prompt was truncated — no character data available for structured compaction."],
    };
  }

  const lines: string[] = [];

  // 1. Header
  lines.push("PRODUCTION STORY SCENE GENERATION — Fruit Baby World");
  lines.push("");

  // 2. Scene directive (compact)
  lines.push(
    "SCENE DIRECTIVE: Exactly one continuous storybook illustration. NOT a reference sheet, grid, quadrant layout, lineup, or collage. All characters present in one environment, one moment."
  );
  lines.push("");

  // 3. Exact cast
  const castList = charPkgs.map((p, i) => `${p.characterName} [Ref ${i + 1}]`).join(", ");
  lines.push(`CAST (one instance each, no duplicates): ${castList}`);
  lines.push("");

  // 4. Character feature locks (compact one-liner per character — must-keep)
  lines.push("CHARACTER FEATURE LOCKS:");
  for (const pkg of charPkgs) {
    const lock = COMPACT_FEATURE_LOCKS[pkg.characterSlug];
    lines.push(
      lock ?? `[${pkg.characterName}] Preserve official design from reference image exactly.`
    );
  }
  lines.push(
    "ALL characters: Short, round, plump, baby-like proportions. Stubby limbs. Do NOT transfer any feature between characters."
  );
  lines.push("");

  // 5. Admin scene direction (preserve fully — admin typed this)
  if (adminSceneDirection?.trim()) {
    lines.push(`ADMIN DIRECTION: "${adminSceneDirection.trim()}"`);
    lines.push(
      "Use for staging, props, emotion, positions, environment. Cannot override character fidelity locks."
    );
    lines.push("");
  }

  // 6. Scene description (truncate only if very long)
  const sceneText = panelPrompt.trim();
  const MAX_SCENE_CHARS = 900;
  if (sceneText.length > MAX_SCENE_CHARS) {
    lines.push(`SCENE: ${sceneText.slice(0, MAX_SCENE_CHARS)}…`);
    removed.push(`scene description (shortened from ${sceneText.length} to ${MAX_SCENE_CHARS} chars)`);
    warnings.push(
      `Scene description was shortened to ${MAX_SCENE_CHARS} characters to meet provider limits.`
    );
  } else {
    lines.push(`SCENE: ${sceneText}`);
  }
  lines.push("");

  // 7. Reference usage (compact)
  lines.push(
    "REFERENCE RULES: Attached images are character identity guides only — not layout templates. Use each image to reproduce that character's colors, shape, and features in the new scene."
  );
  lines.push("Character identity locks override all other instructions.");
  lines.push("");

  // 8. Safety
  lines.push("OUTPUT: Kid-friendly, warm, playful storybook art. No violence, horror, or adult content.");

  removed.push(
    "verbose character identity lock blocks",
    "cross-character contamination rule details",
    "full composition lock wording",
    "repeated style rule blocks",
    "reference bundle asset listing"
  );

  let compact = lines.join("\n");

  // Emergency hard truncation (very unlikely after structured rebuild)
  if (compact.length > PROVIDER_PROMPT_HARD_LIMIT) {
    compact =
      compact.slice(0, PROVIDER_PROMPT_HARD_LIMIT - 80) +
      "\nCharacter fidelity rules apply. Generate the requested story scene.";
    warnings.push(
      "Prompt required emergency truncation. Consider shortening the scene description or admin direction."
    );
  }

  return {
    prompt: compact,
    originalLength,
    compactedLength: compact.length,
    wasCompacted: true,
    removedSections: removed,
    warnings,
  };
}
