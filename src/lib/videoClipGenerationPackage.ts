// Video clip generation package builder (Phase 14B).
// Server-only — imports characterProfileNormalizer which depends on server modules.
// Do NOT import this file in client components; use videoClipGenerationTypes.ts for types.

import type { Character } from "@/lib/content";
import type { SceneReferencePackage, CharacterReferencePackage } from "@/lib/referenceAssetLoader";
import type { VideoGenerationProvider } from "@/lib/videoGenerationTypes";
import {
  getCharacterPersonalityTraits,
  getCharacterColorPalette,
  getCharacterRules,
  getCharacterVisualIdentitySummary,
} from "@/lib/characterProfileNormalizer";
import {
  ALLOWED_VIDEO_STYLES,
  type VideoClipRequestStyle,
  type VideoReferenceImage,
  type VideoClipCharacterContext,
  type VideoClipGenerationPackage,
} from "@/lib/videoClipGenerationTypes";

export {
  ALLOWED_VIDEO_STYLES,
  type VideoClipRequestStyle,
  type VideoReferenceImage,
  type VideoClipCharacterContext,
  type VideoClipGenerationPackage,
} from "@/lib/videoClipGenerationTypes";

// ─── Global fidelity rules ────────────────────────────────────────────────────

const GLOBAL_VIDEO_FIDELITY_RULES = [
  "Preserve official body shape and silhouette in motion.",
  "Preserve proportions — do not make characters taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details throughout all frames.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve cute baby-like design language throughout all frames.",
  "Use gentle kid-friendly motion — soft, bouncy, warm, and expressive.",
  "Avoid scary, violent, intense, harsh, or jarring movement.",
  "Do not redesign characters — no new features, altered silhouettes, or style changes.",
  "Do not use generic fruit mascots or loose 'inspired by' versions.",
  "Do not publish generated animation without human approval.",
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isTikiSlug(slug: string, name: string): boolean {
  return slug.includes("tiki") || name.toLowerCase().includes("tiki");
}

// ─── Character context builder ────────────────────────────────────────────────

function buildVideoClipCharacterContext(
  charPkg: CharacterReferencePackage,
  character?: Character
): VideoClipCharacterContext {
  const isTiki = isTikiSlug(charPkg.characterSlug, charPkg.characterName);

  if (!character) {
    return {
      slug: charPkg.characterSlug,
      displayName: charPkg.characterName,
      shortDescription: "",
      personalityTraits: [],
      visualIdentitySummary: "",
      colorPaletteSummary: "",
      alwaysRules: [],
      neverRules: [],
      doNotChangeRules: [],
      generationRestrictions: isTiki
        ? ["Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."]
        : [],
      isTiki,
    };
  }

  const traits = getCharacterPersonalityTraits(character);
  const palette = getCharacterColorPalette(character);
  const viSummary = getCharacterVisualIdentitySummary(character);
  const rules = getCharacterRules(character);

  const colorPaletteSummary =
    palette.length > 0
      ? palette
          .slice(0, 5)
          .map((c) => (c.hex ? `${c.name} (${c.hex})` : c.name))
          .join(", ")
      : "";

  return {
    slug: charPkg.characterSlug,
    displayName: charPkg.characterName,
    shortDescription: safeStr(character.shortDescription),
    personalityTraits: traits,
    visualIdentitySummary: viSummary,
    colorPaletteSummary,
    alwaysRules: rules.alwaysRules,
    neverRules: rules.neverRules,
    doNotChangeRules: rules.doNotChangeRules,
    generationRestrictions: rules.generationRestrictions,
    isTiki,
  };
}

// ─── Reference image selection ────────────────────────────────────────────────

export function getVideoReferenceImages(
  sceneRefPkg: SceneReferencePackage,
  maxTotal = 8
): VideoReferenceImage[] {
  const selected: VideoReferenceImage[] = [];

  // Profile sheet (1 per character — highest fidelity)
  for (const charPkg of sceneRefPkg.characterPackages) {
    if (selected.length >= maxTotal) break;
    const sheet = charPkg.profileSheets.find((a) => a.blobUrl);
    if (sheet) {
      selected.push({
        url: sheet.blobUrl,
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        assetType: sheet.assetType,
        role: "profile-sheet",
      });
    }
  }

  // Main reference (1 per character)
  for (const charPkg of sceneRefPkg.characterPackages) {
    if (selected.length >= maxTotal) break;
    const main = charPkg.mainReferences.find((a) => a.blobUrl);
    if (main) {
      selected.push({
        url: main.blobUrl,
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        assetType: main.assetType,
        role: "main-reference",
      });
    }
  }

  // Up to 2 supporting refs per character
  for (const charPkg of sceneRefPkg.characterPackages) {
    let addedSupporting = 0;
    for (const ref of charPkg.supportingReferences) {
      if (selected.length >= maxTotal) break;
      if (addedSupporting >= 2) break;
      if (!ref.blobUrl) continue;
      selected.push({
        url: ref.blobUrl,
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        assetType: ref.assetType,
        role: "supporting",
      });
      addedSupporting++;
    }
  }

  // Up to 2 environment refs total
  let envAdded = 0;
  for (const charPkg of sceneRefPkg.characterPackages) {
    if (selected.length >= maxTotal) break;
    if (envAdded >= 2) break;
    for (const ref of charPkg.environmentReferences) {
      if (selected.length >= maxTotal) break;
      if (envAdded >= 2) break;
      if (!ref.blobUrl) continue;
      selected.push({
        url: ref.blobUrl,
        characterSlug: charPkg.characterSlug,
        characterName: charPkg.characterName,
        assetType: ref.assetType,
        role: "environment",
      });
      envAdded++;
    }
  }

  return selected;
}

// ─── Admin reference summary ──────────────────────────────────────────────────

export function summarizeVideoReferenceInputsForAdmin(
  pkg: VideoClipGenerationPackage
): string {
  const lines: string[] = [];
  lines.push(`Reference mode: ${pkg.referenceMode}`);
  lines.push(`Reference images selected: ${pkg.referenceImages.length}`);
  if (pkg.referenceImages.length > 0) {
    const byChar: Record<string, string[]> = {};
    for (const img of pkg.referenceImages) {
      if (!byChar[img.characterName]) byChar[img.characterName] = [];
      byChar[img.characterName].push(`${img.role} (${img.assetType})`);
    }
    for (const [char, roles] of Object.entries(byChar)) {
      lines.push(`  ${char}: ${roles.join(", ")}`);
    }
  }
  return lines.join("\n");
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

type PromptInput = Omit<VideoClipGenerationPackage, "finalPromptText">;

export function buildVideoPromptText(pkg: PromptInput): string {
  const lines: string[] = [];

  // A. Task
  lines.push("TASK:");
  lines.push(
    `Create a short animated children's story clip for Scene ${pkg.sceneNumber}${
      pkg.sceneTitle ? ` — "${pkg.sceneTitle}"` : ""
    } (${pkg.durationSeconds} seconds).`
  );
  lines.push("Animate the existing characters — do not redesign or reimagine them.");
  lines.push("");

  // B. Scene
  lines.push("SCENE:");
  if (pkg.sceneSetting) lines.push(`Setting: ${pkg.sceneSetting}.`);
  if (pkg.sceneMood) lines.push(`Mood/tone: ${pkg.sceneMood}.`);
  if (pkg.sceneSummary) lines.push(`Scene summary: ${pkg.sceneSummary}.`);
  if (pkg.sceneAction) lines.push(`Action: ${pkg.sceneAction}`);
  lines.push("");

  // C. Characters
  if (pkg.characters.length > 0) {
    lines.push("CHARACTERS:");
    for (const char of pkg.characters) {
      lines.push(`${char.displayName}:`);
      if (char.shortDescription) lines.push(`  Role: ${char.shortDescription}`);
      if (char.personalityTraits.length > 0) {
        lines.push(`  Personality: ${char.personalityTraits.slice(0, 4).join(", ")}.`);
      }
      if (char.visualIdentitySummary) lines.push(`  Visual: ${char.visualIdentitySummary}`);
      if (char.colorPaletteSummary) lines.push(`  Colors: ${char.colorPaletteSummary}.`);
      if (char.alwaysRules.length > 0) {
        lines.push(`  Always: ${char.alwaysRules.slice(0, 3).join(" ")}`);
      }
      if (char.doNotChangeRules.length > 0) {
        lines.push(`  Do not change: ${char.doNotChangeRules.slice(0, 3).join(" ")}`);
      }
      if (char.generationRestrictions.length > 0) {
        lines.push(`  Restrictions: ${char.generationRestrictions.slice(0, 2).join(" ")}`);
      }
      if (char.isTiki) {
        lines.push(
          `  Tiki rule: Tiki should remain mischievous, funny, dramatic, and kid-friendly. ` +
            `Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.`
        );
      }
      lines.push("");
    }
  }

  // D. Motion
  lines.push("MOTION:");
  lines.push("Use simple child-friendly movement — gentle expressive gestures.");
  lines.push("No fast intense action unless the scene specifically requires it.");
  lines.push("Maintain character proportions and shape while moving.");
  lines.push("Keep movement bouncy, warm, soft, and emotionally clear.");
  lines.push("");

  // E. Environment
  if (pkg.referenceImages.some((r) => r.role === "environment")) {
    lines.push("ENVIRONMENT:");
    lines.push("Use environment/home reference images for background and setting consistency.");
    lines.push("Preserve setting mood, props, and visual atmosphere.");
    lines.push("");
  }

  // F. Style
  const styleDesc: Record<VideoClipRequestStyle, string> = {
    "storybook-cartoon":  "Soft colorful cartoon storybook animation, warm and gentle.",
    "gentle-animation":   "Gentle soft animation with slow smooth movement and warm tones.",
    "playful-short":      "Bright playful short-form cartoon animation, energetic but kid-safe.",
    "classroom-friendly": "Clear calm animation suitable for classroom settings, educational pacing.",
    "cinematic-soft":     "Soft cinematic children's story animation with gentle camera movement.",
  };
  lines.push("STYLE:");
  lines.push(styleDesc[pkg.videoStyle]);
  lines.push("Kid-friendly, warm storybook animation. Gentle pacing. Classroom and family safe.");
  lines.push("");

  // G. Strict fidelity
  lines.push("STRICT FIDELITY RULES:");
  for (const rule of pkg.globalFidelityRules) {
    lines.push(`- ${rule}`);
  }
  if (pkg.hasTiki) {
    lines.push(
      "- Tiki Trouble: must remain mischievous, funny, dramatic, and kid-friendly. " +
        "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense."
    );
  }

  return lines.join("\n");
}

// ─── Main package builder ─────────────────────────────────────────────────────

export function buildVideoClipGenerationPackage(
  options: {
    episodeSlug: string;
    sceneId: string;
    sceneNumber: number;
    sceneTitle: string;
    sceneSummary: string;
    sceneAction: string;
    sceneSetting: string;
    sceneMood: string;
    videoStyle: VideoClipRequestStyle;
    durationSeconds: number;
    provider: VideoGenerationProvider;
    modelId: string | undefined;
    promptOverride?: string;
  },
  sceneRefPkg: SceneReferencePackage,
  charBySlug: Record<string, Character>,
  warnings: string[] = []
): VideoClipGenerationPackage {
  const characters: VideoClipCharacterContext[] = sceneRefPkg.characterPackages.map((charPkg) =>
    buildVideoClipCharacterContext(charPkg, charBySlug[charPkg.characterSlug])
  );

  const hasTiki = characters.some((c) => c.isTiki);
  const referenceImages = getVideoReferenceImages(sceneRefPkg);
  const referenceMode: VideoClipGenerationPackage["referenceMode"] =
    referenceImages.length > 0 ? "reference-ready" : "prompt-only";

  if (referenceImages.length === 0) {
    warnings.push("No approved reference images found. Generation will be prompt-only.");
  }

  const partialPkg: PromptInput = {
    ...options,
    characters,
    hasTiki,
    referenceImages,
    referenceMode,
    warnings,
    globalFidelityRules: GLOBAL_VIDEO_FIDELITY_RULES,
  };

  const finalPromptText =
    options.promptOverride?.trim() || buildVideoPromptText(partialPkg);

  return { ...partialPkg, finalPromptText };
}
