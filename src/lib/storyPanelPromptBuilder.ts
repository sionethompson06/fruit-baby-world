// Reference-aware story panel prompt builder.
// Produces structured, brand-faithful prompt text for each story panel.
// Server-safe. Do NOT import in client components.

import type { Character } from "@/lib/content";
import type {
  SceneReferencePackage,
  CharacterReferencePackage,
} from "@/lib/referenceAssetLoader";
import {
  getCharacterPersonalityTraits,
  getCharacterColorPalette,
  getCharacterRules,
  getCharacterVisualIdentitySummary,
} from "@/lib/characterProfileNormalizer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PanelPromptWarning = {
  characterSlug: string;
  characterName: string;
  message: string;
  severity: "missing-ref" | "missing-profile" | "info";
};

export type ReferenceAwarePanelPromptOptions = {
  sceneNumber?: number | string;
  title?: string;
  summary?: string;
  setting?: string;
  mood?: string;
  emotionalBeat?: string;
  visualNotes?: string;
};

// ─── Private helpers ──────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function assetTitleList(assets: { title?: string; description?: string }[], max: number): string {
  return assets
    .slice(0, max)
    .map((a) => a.title || a.description || "")
    .filter(Boolean)
    .join("; ");
}

// ─── Section builders ─────────────────────────────────────────────────────────

/** Section C: visual identity block per character. */
export function buildCharacterVisualPromptBlock(
  charPkg: CharacterReferencePackage,
  character?: Character
): string {
  if (!character) {
    return (
      `${charPkg.characterName}:\n` +
      `  Character profile not found in registry. ` +
      `Preserve any uploaded reference images exactly. ` +
      `Keep design baby-like, fruit-themed, and kid-friendly.`
    );
  }

  const raw = character as Character & Record<string, unknown>;
  const viSummary = getCharacterVisualIdentitySummary(character);
  const palette = getCharacterColorPalette(character);
  const traits = getCharacterPersonalityTraits(character);
  const rules = getCharacterRules(character);

  const lines: string[] = [`${charPkg.characterName}:`];

  if (character.shortDescription) {
    lines.push(`  Description: ${character.shortDescription}`);
  }
  if (traits.length > 0) {
    lines.push(`  Personality: ${traits.slice(0, 4).join(", ")}`);
  }
  if (character.storyRole) {
    lines.push(`  Story role: ${character.storyRole}`);
  }
  if (viSummary) {
    lines.push(`  Visual identity: ${viSummary}`);
  }
  if (palette.length > 0) {
    const colorText = palette
      .slice(0, 5)
      .map((c) => (c.hex ? `${c.name} (${c.hex})` : c.name))
      .join(", ");
    lines.push(`  Color palette: ${colorText}`);
  }

  const home = safeStr(raw.home as unknown);
  if (home) lines.push(`  Home / environment: ${home}`);

  if (rules.alwaysRules.length > 0) {
    lines.push(`  Always: ${rules.alwaysRules.slice(0, 3).join("; ")}`);
  }
  if (rules.neverRules.length > 0) {
    lines.push(`  Never: ${rules.neverRules.slice(0, 3).join("; ")}`);
  }
  if (rules.doNotChangeRules.length > 0) {
    lines.push(`  Do not change: ${rules.doNotChangeRules.slice(0, 3).join("; ")}`);
  }
  if (rules.generationRestrictions.length > 0) {
    lines.push(
      `  Generation notes: ${rules.generationRestrictions.slice(0, 2).join("; ")}`
    );
  }

  return lines.join("\n");
}

/** Section G (per-character): fidelity rules. */
export function buildCharacterFidelityPromptBlock(
  charPkg: CharacterReferencePackage,
  character?: Character
): string {
  const isTiki =
    charPkg.characterSlug === "tiki" || charPkg.characterSlug === "tiki-trouble";
  const lines: string[] = [`Fidelity rules for ${charPkg.characterName}:`];

  if (isTiki) {
    lines.push(
      "  Tiki should remain mischievous, funny, dramatic, and kid-friendly.",
      "  Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."
    );
  }

  lines.push(
    "  Preserve official body shape, silhouette, and fruit identity exactly.",
    "  Preserve cute baby-like proportions — do not make the character taller, thinner, older, or more realistic.",
    "  Preserve color palette exactly — do not shift hues or desaturate.",
    "  Preserve eye style, mouth style, and blush/cheek details."
  );

  if (character) {
    const rules = getCharacterRules(character);
    const doNotChange =
      rules.doNotChangeRules.length > 0 ? rules.doNotChangeRules : rules.neverRules;
    doNotChange.slice(0, 4).forEach((r) => lines.push(`  • ${r}`));
  }

  return lines.join("\n");
}

/** Section D: reference guidance per character. */
export function buildCharacterReferenceGuidanceBlock(
  charPkg: CharacterReferencePackage
): string {
  const lines: string[] = [`Reference guidance for ${charPkg.characterName}:`];

  if (charPkg.profileSheets.length > 0) {
    lines.push(
      `  Official Profile Sheet: ${charPkg.profileSheets.length} available — use for exact character appearance and proportions`
    );
  } else {
    lines.push(
      "  Official Profile Sheet: not yet available — rely on visual identity description and color palette"
    );
  }

  if (charPkg.mainReferences.length > 0) {
    lines.push(`  Main Character Reference: ${charPkg.mainReferences.length} available`);
  } else {
    lines.push("  Main Character Reference: not yet available");
  }

  if (charPkg.supportingReferences.length > 0) {
    const titles = assetTitleList(charPkg.supportingReferences, 4);
    const desc = titles
      ? `${charPkg.supportingReferences.length} approved — includes: ${titles}`
      : `${charPkg.supportingReferences.length} approved for pose, expression, and style consistency`;
    lines.push(`  Supporting References: ${desc}`);
  } else {
    lines.push("  Supporting References: none approved yet");
  }

  if (charPkg.primaryReferenceUrl) {
    lines.push("  Primary Reference: assigned");
  }

  return lines.join("\n");
}

/** Section E: environment and home context. */
export function buildEnvironmentPromptBlock(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  setting?: string
): string {
  const lines: string[] = [];

  if (setting) {
    lines.push(`Scene setting: ${setting}`);
  }

  for (const charPkg of sceneRefPkg.characterPackages) {
    if (charPkg.environmentReferences.length === 0) continue;

    const char = charBySlug[charPkg.characterSlug];
    const raw = char as (Character & Record<string, unknown>) | undefined;
    const home = raw ? safeStr(raw.home as unknown) : "";

    const titles = assetTitleList(charPkg.environmentReferences, 4);
    const parts: string[] = [];
    if (home) parts.push(`home: ${home}`);
    if (titles) parts.push(titles);

    const countNote = `${charPkg.environmentReferences.length} approved environment/home reference${charPkg.environmentReferences.length !== 1 ? "s" : ""}`;

    if (parts.length > 0) {
      lines.push(
        `${charPkg.characterName} (${countNote}): ${parts.join("; ")}.`
      );
    } else {
      lines.push(
        `${charPkg.characterName}: ${countNote} available — use to inform background and setting.`
      );
    }

    lines.push(
      `Use these references to guide background shapes, colors, props, and scene mood for ${charPkg.characterName}.`
    );
  }

  if (lines.length === 0) {
    const fallback = setting
      ? `Use the scene setting (${setting}) to guide background, props, and mood.`
      : "Use a warm, kid-friendly, storybook-style background appropriate for the scene.";
    lines.push(fallback);
  }

  return lines.join("\n");
}

/** Section F: composition and style guidelines. */
export function buildSceneCompositionPromptBlock(
  _sceneRefPkg: SceneReferencePackage
): string {
  return [
    "Composition and style guidelines:",
    "• Style: colorful, soft, rounded cartoon storybook illustration",
    "• Lighting: warm, gentle, natural — soft shadows, no harsh contrast",
    "• Mood: kid-friendly, warm, emotionally safe",
    "• Characters: expressive but gentle faces, friendly and open body language",
    "• Layout: clear scene readable at a glance for young children",
    "• Background: simple, setting-appropriate, not competing with characters",
    "• Format: single still illustration panel, no text overlay or captions",
  ].join("\n");
}

/** Section G: strict fidelity and safety rules. */
export function buildPanelSafetyPromptBlock(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): string {
  const hasTiki = sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );

  const lines: string[] = [
    "Strict fidelity and safety rules:",
    "• Do not redesign characters — no new features, altered silhouettes, or style changes.",
    "• Do not change fruit identity or core body type for any character.",
    "• Do not alter official color palettes — hues must match exactly.",
    "• Do not make characters more realistic, adult-like, or scary.",
    "• Keep baby-like proportions for all Fruit Baby characters throughout.",
    "• Preserve trademark character look — every character must be immediately recognizable.",
    "• Keep all content kid-friendly, warm, and emotionally safe.",
    "• No violence, horror, adult themes, or inappropriate content.",
    "• Do not publish generated images without human approval.",
  ];

  if (hasTiki) {
    lines.push(
      "• Tiki Trouble: must remain mischievous, funny, dramatic, and kid-friendly. " +
        "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."
    );
  }

  return lines.join("\n");
}

/** Section H: admin-only warnings for missing profile/reference data. */
export function buildPanelPromptWarnings(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): PanelPromptWarning[] {
  const warnings: PanelPromptWarning[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];

    if (!char) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message: "Character not found in registry. Cannot load profile or visual identity data.",
        severity: "missing-profile",
      });
      continue;
    }

    if (!charPkg.isGenerationReady) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message:
          "No approved reference assets found. Upload and approve an official profile sheet before generation.",
        severity: "missing-ref",
      });
    } else if (charPkg.profileSheets.length === 0 && charPkg.mainReferences.length === 0) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message:
          "No official profile sheet or main character reference found. Supporting references are available.",
        severity: "missing-ref",
      });
    }

    const viSummary = getCharacterVisualIdentitySummary(char);
    if (!viSummary) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message: "Visual identity summary missing from character profile.",
        severity: "missing-profile",
      });
    }

    const palette = getCharacterColorPalette(char);
    if (palette.length === 0) {
      warnings.push({
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        message: "Color palette missing from character profile.",
        severity: "missing-profile",
      });
    }
  }

  return warnings;
}

// ─── Main prompt builder ──────────────────────────────────────────────────────

export function buildReferenceAwareStoryPanelPrompt(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  opts: ReferenceAwarePanelPromptOptions = {}
): string {
  const {
    sceneNumber,
    title,
    summary,
    setting,
    mood,
    emotionalBeat,
    visualNotes,
  } = opts;

  const num = sceneNumber ?? sceneRefPkg.sceneNumber;
  const sections: string[] = [];

  // A. Panel Task
  const taskLines: string[] = [
    `Create a single still storybook illustration panel for Scene ${num}${title ? ` — "${title}"` : ""}.`,
    "Style: children's picture book, colorful, warm, soft, and rounded.",
    "Capture a single clear, readable story moment for young children.",
  ];
  sections.push("=== A. PANEL TASK ===\n" + taskLines.join("\n"));

  // B. Scene Content
  const sceneLines: string[] = [];
  if (summary) sceneLines.push(`Scene: ${summary}`);
  if (setting) sceneLines.push(`Setting: ${setting}`);
  if (mood) sceneLines.push(`Mood/tone: ${mood}`);
  if (emotionalBeat) sceneLines.push(`Emotional beat: ${emotionalBeat}`);
  if (visualNotes) sceneLines.push(`Visual notes: ${visualNotes}`);
  if (sceneLines.length > 0) {
    sections.push("=== B. SCENE CONTENT ===\n" + sceneLines.join("\n"));
  }

  // C. Characters in Scene
  if (sceneRefPkg.characterPackages.length > 0) {
    const charBlocks = sceneRefPkg.characterPackages.map((charPkg) =>
      buildCharacterVisualPromptBlock(charPkg, charBySlug[charPkg.characterSlug])
    );
    sections.push("=== C. CHARACTERS IN SCENE ===\n" + charBlocks.join("\n\n"));
  }

  // D. Character Reference Guidance
  const refGuideBlocks = sceneRefPkg.characterPackages.map((charPkg) =>
    buildCharacterReferenceGuidanceBlock(charPkg)
  );
  if (refGuideBlocks.length > 0) {
    sections.push("=== D. CHARACTER REFERENCE GUIDANCE ===\n" + refGuideBlocks.join("\n\n"));
  }

  // E. Environment / Home Guidance
  const envBlock = buildEnvironmentPromptBlock(sceneRefPkg, charBySlug, setting);
  sections.push("=== E. ENVIRONMENT / HOME GUIDANCE ===\n" + envBlock);

  // F. Composition and Style
  sections.push(buildSceneCompositionPromptBlock(sceneRefPkg));

  // G. Strict Fidelity Rules
  sections.push(buildPanelSafetyPromptBlock(sceneRefPkg, charBySlug));

  return sections.join("\n\n");
}
