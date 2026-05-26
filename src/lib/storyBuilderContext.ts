// Server-safe context helpers for story, prompt, and media planning.
// Combines reference package data with character profile data to produce
// richer, brand-aware context for admin prompt builders.
// Do NOT import in client components.

import type { Character } from "@/lib/content";
import type {
  SceneReferencePackage,
  CharacterReferencePackage,
  EpisodeReferencePackageSummary,
} from "@/lib/referenceAssetLoader";
import {
  getCharacterPersonalityTraits,
  getCharacterColorPalette,
  getCharacterRules,
  getCharacterVisualIdentitySummary,
} from "@/lib/characterProfileNormalizer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryCharacterContext = {
  slug: string;
  displayName: string;
  shortDescription: string;
  storyRole: string;
  personalityTraits: string[];
  voiceGuide: string;
  home: string;
  visualIdentitySummary: string;
  colorPaletteSummary: string;
  alwaysRules: string[];
  neverRules: string[];
  doNotChangeRules: string[];
  generationRestrictions: string[];
  hasSupportingReferences: boolean;
  hasEnvironmentReferences: boolean;
  supportingReferenceCount: number;
  environmentReferenceCount: number;
  isGenerationReady: boolean;
  readinessWarnings: string[];
};

export type SceneStoryContext = {
  sceneNumber: number;
  characters: StoryCharacterContext[];
  environmentNotes: string;
  visualRulesSummary: string;
  voicePersonalitySummary: string;
  adminWarnings: string[];
  hasAnyMissingReferences: boolean;
};

export type EpisodeStoryContext = {
  episodeSlug: string;
  totalCharacters: number;
  readyCharacters: number;
  totalApprovedAssets: number;
  charactersSummary: string;
  adminWarnings: string[];
};

// ─── Private helpers ──────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function tikiGuardrail(): string {
  return (
    "Tiki should remain mischievous, funny, dramatic, and kid-friendly. " +
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."
  );
}

function buildCharacterContext(
  charPkg: CharacterReferencePackage,
  character?: Character
): StoryCharacterContext {
  const warnings: string[] = [];

  if (!character) {
    return {
      slug: charPkg.characterSlug,
      displayName: charPkg.characterName,
      shortDescription: "",
      storyRole: "",
      personalityTraits: [],
      voiceGuide: "",
      home: "",
      visualIdentitySummary: "",
      colorPaletteSummary: "",
      alwaysRules: [],
      neverRules: [],
      doNotChangeRules: [],
      generationRestrictions: [],
      hasSupportingReferences: charPkg.supportingReferences.length > 0,
      hasEnvironmentReferences: charPkg.environmentReferences.length > 0,
      supportingReferenceCount: charPkg.supportingReferences.length,
      environmentReferenceCount: charPkg.environmentReferences.length,
      isGenerationReady: charPkg.isGenerationReady,
      readinessWarnings: [
        `Character "${charPkg.characterName}" (${charPkg.characterSlug}) not found in character registry.`,
      ],
    };
  }

  const traits = getCharacterPersonalityTraits(character);
  const palette = getCharacterColorPalette(character);
  const viSummary = getCharacterVisualIdentitySummary(character);
  const rules = getCharacterRules(character);
  const raw = character as Character & Record<string, unknown>;

  const colorPaletteSummary =
    palette.length > 0
      ? palette
          .slice(0, 5)
          .map((c) => (c.hex ? `${c.name} (${c.hex})` : c.name))
          .join(", ")
      : "";

  if (!viSummary) warnings.push(`Visual identity summary missing for ${charPkg.characterName}.`);
  if (traits.length === 0) warnings.push(`Personality traits missing for ${charPkg.characterName}.`);
  if (!charPkg.isGenerationReady) {
    warnings.push(`${charPkg.characterName} has no approved reference assets.`);
  }

  return {
    slug: charPkg.characterSlug,
    displayName: charPkg.characterName,
    shortDescription: safeStr(character.shortDescription),
    storyRole: safeStr(character.storyRole),
    personalityTraits: traits,
    voiceGuide: safeStr(character.voiceGuide as unknown),
    home: safeStr(raw.home as unknown),
    visualIdentitySummary: viSummary,
    colorPaletteSummary,
    alwaysRules: rules.alwaysRules,
    neverRules: rules.neverRules,
    doNotChangeRules: rules.doNotChangeRules,
    generationRestrictions: rules.generationRestrictions,
    hasSupportingReferences: charPkg.supportingReferences.length > 0,
    hasEnvironmentReferences: charPkg.environmentReferences.length > 0,
    supportingReferenceCount: charPkg.supportingReferences.length,
    environmentReferenceCount: charPkg.environmentReferences.length,
    isGenerationReady: charPkg.isGenerationReady,
    readinessWarnings: warnings,
  };
}

// ─── Character summary ────────────────────────────────────────────────────────

export function summarizeCharacterForStory(
  charPkg: CharacterReferencePackage,
  character?: Character
): string {
  if (!character) {
    return `${charPkg.characterName}: character profile not found. Add to character registry for full context.`;
  }

  const viSummary = getCharacterVisualIdentitySummary(character);
  const traits = getCharacterPersonalityTraits(character);
  const palette = getCharacterColorPalette(character);

  const parts: string[] = [];

  let opening = charPkg.characterName;
  if (character.shortDescription) {
    opening += ` — ${character.shortDescription}`;
  } else if (traits.length > 0) {
    opening += ` — ${traits.slice(0, 3).join(", ")}`;
  }
  parts.push(opening + ".");

  if (viSummary) parts.push(viSummary);

  if (palette.length > 0) {
    const colors = palette
      .slice(0, 4)
      .map((c) => c.name)
      .join(", ");
    parts.push(`Key colors: ${colors}.`);
  }

  parts.push(
    "Keep the character baby-like, soft, rounded, and warm. Preserve the official color palette, face style, and fruit identity."
  );

  return parts.join(" ");
}

// ─── Environment summary ──────────────────────────────────────────────────────

export function summarizeEnvironmentForStory(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  setting?: string
): string {
  const lines: string[] = [];

  if (setting) lines.push(`Scene setting: ${setting}.`);

  const envByChar: string[] = [];
  for (const charPkg of sceneRefPkg.characterPackages) {
    if (charPkg.environmentReferences.length === 0) continue;
    const char = charBySlug[charPkg.characterSlug];
    const raw = char as (Character & Record<string, unknown>) | undefined;
    const home = raw ? safeStr(raw.home as unknown) : "";
    const label = charPkg.characterName;
    const note = home
      ? `${label} (${charPkg.environmentReferences.length} refs — home: ${home})`
      : `${label} (${charPkg.environmentReferences.length} approved environment refs)`;
    envByChar.push(note);
  }

  if (envByChar.length > 0) {
    lines.push(
      `Approved environment/home references available: ${envByChar.join("; ")}.`
    );
    lines.push(
      "Use these references to inform background elements, home spaces, scene props, and setting mood."
    );
  } else {
    lines.push(
      "No approved environment references found for this scene. Use scene setting description and character home fields for context."
    );
  }

  return lines.join(" ");
}

// ─── Visual rules summary ─────────────────────────────────────────────────────

export function summarizeVisualRulesForStory(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): string {
  const rules: string[] = [
    "Preserve official body shape and silhouette for all characters.",
    "Preserve proportions — do not make characters taller, thinner, older, or more realistic.",
    "Preserve cute baby-like design language throughout.",
    "Do not redesign characters — no new features, altered silhouettes, or style changes.",
    "Keep the scene kid-friendly, warm, playful, and educational.",
  ];

  const colorNotes: string[] = [];
  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];
    if (!char) continue;
    const palette = getCharacterColorPalette(char);
    if (palette.length > 0) {
      const colors = palette
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ");
      colorNotes.push(`${charPkg.characterName}: ${colors}`);
    }
  }

  if (colorNotes.length > 0) {
    rules.push(`Preserve official color palettes — ${colorNotes.join("; ")}.`);
  }

  const tikiBabySlug = sceneRefPkg.characterPackages.find(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );
  if (tikiBabySlug) {
    rules.push(tikiGuardrail());
  }

  return rules.map((r) => `• ${r}`).join("\n");
}

// ─── Voice / personality summary ─────────────────────────────────────────────

export function summarizeVoiceAndPersonalityForStory(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>
): string {
  const lines: string[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];
    if (!char) continue;

    const voice = safeStr((char as Character & Record<string, unknown>).voiceGuide as unknown);
    const traits = getCharacterPersonalityTraits(char);
    const role = safeStr(char.storyRole);

    const parts: string[] = [];
    if (voice) parts.push(voice);
    else if (traits.length > 0) parts.push(traits.slice(0, 3).join(", ") + ".");
    if (role) parts.push(`Story role: ${role}.`);

    if (parts.length > 0) {
      lines.push(`${charPkg.characterName}: ${parts.join(" ")}`);
    }
  }

  if (lines.length === 0) {
    return "No voice or personality data found for scene characters.";
  }

  return lines.join("\n");
}

// ─── Story panel prompt context ───────────────────────────────────────────────

export function buildStoryPanelPromptContext(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  opts?: {
    setting?: string;
    mood?: string;
    summary?: string;
  }
): string {
  const sections: string[] = [];

  if (opts?.setting || opts?.mood) {
    const meta: string[] = [];
    if (opts.setting) meta.push(`Setting: ${opts.setting}`);
    if (opts.mood) meta.push(`Mood: ${opts.mood}`);
    sections.push(meta.join(" | "));
  }

  if (opts?.summary) {
    sections.push(`Scene: ${opts.summary}`);
  }

  // Character summaries
  const charSummaries: string[] = [];
  const adminWarnings: string[] = [];
  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];
    const summary = summarizeCharacterForStory(charPkg, char);
    charSummaries.push(`• ${summary}`);

    if (!charPkg.isGenerationReady) {
      adminWarnings.push(
        `[Admin] ${charPkg.characterName} has no approved reference assets assigned.`
      );
    }
    if (char && !getCharacterVisualIdentitySummary(char)) {
      adminWarnings.push(`[Admin] ${charPkg.characterName} is missing a visual identity summary.`);
    }
  }

  if (charSummaries.length > 0) {
    sections.push("CHARACTERS:\n" + charSummaries.join("\n"));
  }

  // Environment notes
  const envNotes = summarizeEnvironmentForStory(sceneRefPkg, charBySlug, opts?.setting);
  sections.push("ENVIRONMENT / SETTING:\n" + envNotes);

  // Visual rules
  const visualRules = summarizeVisualRulesForStory(sceneRefPkg, charBySlug);
  sections.push("VISUAL FIDELITY RULES:\n" + visualRules);

  // Supporting references summary
  const supportingLines: string[] = [];
  for (const charPkg of sceneRefPkg.characterPackages) {
    const parts: string[] = [];
    if (charPkg.mainReferences.length > 0)
      parts.push(`${charPkg.mainReferences.length} main ref`);
    if (charPkg.supportingReferences.length > 0)
      parts.push(`${charPkg.supportingReferences.length} supporting`);
    if (charPkg.profileSheets.length > 0)
      parts.push(`${charPkg.profileSheets.length} profile sheet`);
    if (parts.length > 0) {
      supportingLines.push(`• ${charPkg.characterName}: ${parts.join(", ")}`);
    }
  }
  if (supportingLines.length > 0) {
    sections.push(
      "APPROVED REFERENCE ASSETS:\n" +
        supportingLines.join("\n") +
        "\nUse official uploaded reference images when generating visuals for this scene."
    );
  }

  if (adminWarnings.length > 0) {
    sections.push("ADMIN NOTES:\n" + adminWarnings.map((w) => `• ${w}`).join("\n"));
  }

  return sections.join("\n\n");
}

// ─── Animation prompt context ─────────────────────────────────────────────────

export function buildAnimationPromptContext(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  opts?: {
    setting?: string;
    mood?: string;
  }
): string {
  const sections: string[] = [];

  if (opts?.setting || opts?.mood) {
    const meta: string[] = [];
    if (opts.setting) meta.push(`Setting: ${opts.setting}`);
    if (opts.mood) meta.push(`Mood: ${opts.mood}`);
    sections.push(meta.join(" | "));
  }

  // Character movement / personality
  const charLines: string[] = [];
  const hasTiki = sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );

  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];
    if (!char) continue;
    const traits = getCharacterPersonalityTraits(char);
    const voice = safeStr((char as Character & Record<string, unknown>).voiceGuide as unknown);
    const role = safeStr(char.storyRole);

    const personality =
      traits.length > 0 ? traits.slice(0, 3).join(", ") : "friendly, kid-safe";
    let note = `${charPkg.characterName}: ${personality} movement style.`;
    if (role) note += ` Role: ${role}.`;
    if (voice) note += ` Voice feel: ${voice}`;
    charLines.push(`• ${note}`);
  }

  if (charLines.length > 0) {
    sections.push("CHARACTER MOVEMENT & PERSONALITY:\n" + charLines.join("\n"));
  }

  // Visual fidelity
  const visualRules = summarizeVisualRulesForStory(sceneRefPkg, charBySlug);
  sections.push("ANIMATION FIDELITY RULES:\n" + visualRules);

  // Environment/home refs for motion context
  const envSummary = summarizeEnvironmentForStory(sceneRefPkg, charBySlug, opts?.setting);
  sections.push("ENVIRONMENT / HOME REFERENCES:\n" + envSummary);

  // Motion safety
  sections.push(
    "ANIMATION TONE:\n" +
      "• Use gentle, soft, bouncy, kid-friendly motion throughout.\n" +
      "• Avoid scary, violent, intense, harsh, or jarring movement.\n" +
      "• Keep expressions warm, expressive, and emotionally safe."
  );

  if (hasTiki) {
    sections.push("TIKI GUARDRAIL:\n• " + tikiGuardrail());
  }

  return sections.join("\n\n");
}

// ─── Read-aloud context ───────────────────────────────────────────────────────

export function buildReadAloudContext(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  opts?: {
    lesson?: string;
    tone?: string;
    mood?: string;
    targetAgeRange?: string;
  }
): string {
  const sections: string[] = [];

  const meta: string[] = [];
  if (opts?.tone) meta.push(`Tone: ${opts.tone}`);
  if (opts?.mood) meta.push(`Mood: ${opts.mood}`);
  if (opts?.targetAgeRange) meta.push(`Age range: ${opts.targetAgeRange}`);
  if (meta.length > 0) sections.push(meta.join(" | "));

  if (opts?.lesson) {
    sections.push(`Lesson: ${opts.lesson}`);
  }

  // Character voices and personality
  const voiceLines: string[] = [];
  const hasTiki = sceneRefPkg.characterPackages.some(
    (p) => p.characterSlug === "tiki" || p.characterSlug === "tiki-trouble"
  );

  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];
    if (!char) continue;

    const voice = safeStr((char as Character & Record<string, unknown>).voiceGuide as unknown);
    const traits = getCharacterPersonalityTraits(char);
    const role = safeStr(char.storyRole);

    const parts: string[] = [];
    if (voice) {
      parts.push(voice);
    } else if (traits.length > 0) {
      parts.push(`${traits.slice(0, 3).join(", ")} — keep voice warm and kid-friendly.`);
    }
    if (role) parts.push(`Role: ${role}.`);

    if (parts.length > 0) {
      voiceLines.push(`• ${charPkg.characterName}: ${parts.join(" ")}`);
    }
  }

  if (voiceLines.length > 0) {
    sections.push("CHARACTER VOICE GUIDES:\n" + voiceLines.join("\n"));
  }

  // Read-aloud safety
  sections.push(
    "READ-ALOUD GUIDELINES:\n" +
      "• Keep narration warm, slow, and emotionally safe for young children.\n" +
      "• Use simple, clear language appropriate for the target age range.\n" +
      "• Reinforce kindness, friendship, empathy, courage, or problem-solving.\n" +
      "• Pause naturally between sentences.\n" +
      "• Avoid harsh, scary, or jarring delivery."
  );

  if (hasTiki) {
    sections.push(
      "TIKI NOTE:\n• " +
        "Keep Tiki playful and funny rather than frightening. " + tikiGuardrail()
    );
  }

  return sections.join("\n\n");
}

// ─── Scene story context (structured) ────────────────────────────────────────

export function buildSceneStoryContext(
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  opts?: {
    setting?: string;
    mood?: string;
    summary?: string;
  }
): SceneStoryContext {
  const allWarnings: string[] = [];
  const characters: StoryCharacterContext[] = [];

  for (const charPkg of sceneRefPkg.characterPackages) {
    const char = charBySlug[charPkg.characterSlug];
    const ctx = buildCharacterContext(charPkg, char);
    characters.push(ctx);
    allWarnings.push(...ctx.readinessWarnings);
  }

  const environmentNotes = summarizeEnvironmentForStory(
    sceneRefPkg,
    charBySlug,
    opts?.setting
  );
  const visualRulesSummary = summarizeVisualRulesForStory(sceneRefPkg, charBySlug);
  const voicePersonalitySummary = summarizeVoiceAndPersonalityForStory(sceneRefPkg, charBySlug);

  return {
    sceneNumber: sceneRefPkg.sceneNumber,
    characters,
    environmentNotes,
    visualRulesSummary,
    voicePersonalitySummary,
    adminWarnings: allWarnings,
    hasAnyMissingReferences: characters.some((c) => !c.isGenerationReady),
  };
}

// ─── Episode story context ────────────────────────────────────────────────────

export function buildEpisodeStoryContext(
  summary: EpisodeReferencePackageSummary,
  charBySlug: Record<string, Character>
): EpisodeStoryContext {
  const readyChars = summary.charactersSummary.filter((c) => c.isReady);
  const warnings: string[] = [];

  summary.charactersSummary.forEach((c) => {
    if (!c.isReady) {
      warnings.push(`${c.name} has no approved reference assets.`);
    }
  });

  const charSummaryLines = summary.charactersSummary.map((c) => {
    const char = charBySlug[c.slug];
    const traits = char ? getCharacterPersonalityTraits(char).slice(0, 2).join(", ") : "";
    const status = c.isReady ? "reference-ready" : "no refs";
    return `${c.name} (${status}${traits ? ", " + traits : ""})`;
  });

  return {
    episodeSlug: summary.episodeSlug,
    totalCharacters: summary.charactersSummary.length,
    readyCharacters: readyChars.length,
    totalApprovedAssets: summary.totalApprovedAssets,
    charactersSummary: charSummaryLines.join("; "),
    adminWarnings: warnings,
  };
}
