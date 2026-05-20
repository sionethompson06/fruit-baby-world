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

// ─── Canonical character feature locks ───────────────────────────────────────
// Hardcoded official feature requirements per character slug.
// Used as the primary source for REQUIRED CHARACTER FEATURE LOCKS prompt block.

type CanonicalFeatureLock = {
  requiredBodyColor: string;
  requiredBodyShape: string;
  requiredTopFeature: string;
  requiredArms: string;
  forbiddenTraits: string[];
};

const CANONICAL_FEATURE_LOCKS: Record<string, CanonicalFeatureLock> = {
  "pineapple-baby": {
    requiredBodyColor: "warm golden-yellow pineapple — NEVER green or purple or orange",
    requiredBodyShape: "short, plump rounded pineapple oval — compact and baby-like",
    requiredTopFeature: "layered green pineapple crown leaves — multi-leaf, spiky, only on Pineapple Baby",
    requiredArms: "two short rounded baby arms",
    forbiddenTraits: [
      "Do NOT color the body green (green is for the crown leaves only, not the body)",
      "Do NOT remove pineapple diamond/crosshatch texture from body",
      "Do NOT replace pineapple crown with Mango Baby's brown stem and single leaf",
      "Do NOT replace pineapple crown with Ube Baby's heart-shaped leaf cluster",
      "Do NOT apply Ube Baby's smooth purple body texture to this character",
      "Do NOT apply Mango Baby's smooth mango gradient to this character",
    ],
  },
  "ube-baby": {
    requiredBodyColor: "soft purple/lavender ube taro — smooth round body, no pineapple texture",
    requiredBodyShape: "round, plump, smooth, soft oval — no sharp edges",
    requiredTopFeature: "official green heart-shaped leaf cluster on top — rounded heart shape, only on Ube Baby",
    requiredArms: "two short rounded baby arms",
    forbiddenTraits: [
      "Do NOT give the body pineapple diamond/crosshatch texture",
      "Do NOT replace heart-shaped leaf cluster with Mango Baby's brown stem and single mango leaf",
      "Do NOT replace heart-shaped leaf cluster with Pineapple Baby's layered spiky pineapple crown",
      "Do NOT color the body golden-yellow or orange (body must stay purple/lavender)",
      "Do NOT apply mango color gradient to this character",
    ],
  },
  "mango-baby": {
    requiredBodyColor: "mango yellow/orange/green gradient — smooth, ripe mango tones",
    requiredBodyShape: "plump rounded mango oval — smooth surface, no pineapple texture",
    requiredTopFeature: "small brown mango stem with single green mango leaf — only on Mango Baby",
    requiredArms: "two short rounded baby arms — MUST be visible in normal standing or sitting poses",
    forbiddenTraits: [
      "Do NOT omit both arms in normal standing or sitting poses — arms must be visible",
      "Do NOT give the body pineapple diamond/crosshatch texture",
      "Do NOT replace mango stem/leaf with Pineapple Baby's layered pineapple crown",
      "Do NOT replace mango stem/leaf with Ube Baby's heart-shaped leaf cluster",
      "Do NOT color the body purple (body must stay mango yellow/orange/green gradient)",
    ],
  },
  "kiwi-baby": {
    requiredBodyColor: "warm brown/fuzzy kiwi exterior with green kiwi interior hints",
    requiredBodyShape: "oval kiwi shape — plump, compact, baby-like",
    requiredTopFeature: "kiwi stem or small leaf feature — only on Kiwi Baby",
    requiredArms: "two short rounded baby arms",
    forbiddenTraits: [
      "Do NOT apply pineapple diamond texture to this character",
      "Do NOT borrow top features from other Fruit Baby characters",
    ],
  },
  "coconut-baby": {
    requiredBodyColor: "natural coconut brown/tan body",
    requiredBodyShape: "rounded coconut oval — plump and compact, baby-like",
    requiredTopFeature: "coconut palm sprout or husk feature on top — only on Coconut Baby",
    requiredArms: "two short rounded baby arms",
    forbiddenTraits: [
      "Do NOT apply pineapple diamond texture to this character",
      "Do NOT borrow top features from other Fruit Baby characters",
    ],
  },
  tiki: {
    requiredBodyColor: "warm carved wood tones — tropical tiki look",
    requiredBodyShape: "compact totem-like shape",
    requiredTopFeature: "tiki carved face / totem top feature",
    requiredArms: "short stubby tiki arms",
    forbiddenTraits: [
      "Do NOT make Tiki scary, evil, or villain-like — keep mischievous and funny",
      "Do NOT make Tiki violent or cruel",
    ],
  },
  "tiki-trouble": {
    requiredBodyColor: "warm carved wood tones — tropical tiki look",
    requiredBodyShape: "compact totem-like shape",
    requiredTopFeature: "tiki carved face / totem top feature",
    requiredArms: "short stubby tiki arms",
    forbiddenTraits: [
      "Do NOT make Tiki Trouble scary, evil, or villain-like — keep mischievous and funny",
      "Do NOT make Tiki Trouble violent or cruel",
    ],
  },
};

// Characters whose top features may conflict and need explicit separation rules
const TOP_FEATURE_CONFLICT_SLUGS = new Set([
  "pineapple-baby",
  "ube-baby",
  "mango-baby",
]);

// ─── Production fidelity result ───────────────────────────────────────────────

export type ProductionFidelityResult = {
  prompt: string;
  requiredFeatureLocksUsed: boolean;
  characterFeatureLockCount: number;
  missingPartPreventionUsed: boolean;
  babyProportionLockUsed: boolean;
  topFeatureSeparationUsed: boolean;
  characterFeatureWarnings: string[];
};

// ─── Feature lock block builders (internal) ───────────────────────────────────

function buildRequiredCharacterFeatureLockLines(
  slugs: string[],
  charBySlug: Record<string, Character>,
  featureWarnings: string[]
): string[] {
  const lines: string[] = [
    "REQUIRED CHARACTER FEATURE LOCKS:",
    "The following features are mandatory for each character. They take priority over scene style.",
    "",
  ];

  for (const slug of slugs) {
    const lock = CANONICAL_FEATURE_LOCKS[slug];
    const char = charBySlug[slug];
    const displayName = char?.name ?? slug;

    if (!lock) {
      featureWarnings.push(`No canonical feature lock for ${slug} — using generic rules only.`);
      lines.push(`[${displayName}] — No specific feature locks. Preserve official design from reference image.`);
      lines.push("");
      continue;
    }

    lines.push(`[${displayName}]`);
    lines.push(`  Body color:   ${lock.requiredBodyColor}`);
    lines.push(`  Body shape:   ${lock.requiredBodyShape}`);
    lines.push(`  Top feature:  ${lock.requiredTopFeature}`);
    lines.push(`  Arms:         ${lock.requiredArms}`);
    if (lock.forbiddenTraits.length > 0) {
      lines.push("  FORBIDDEN:");
      lock.forbiddenTraits.forEach((t) => lines.push(`    ✗ ${t}`));
    }
    lines.push("");
  }

  return lines;
}

function buildTopFeatureSeparationLines(slugs: string[]): string[] {
  const conflictSlugs = slugs.filter((s) => TOP_FEATURE_CONFLICT_SLUGS.has(s));
  if (conflictSlugs.length < 2) return [];

  const lines: string[] = [
    "TOP FEATURE SEPARATION RULES:",
    "Each character's head/top feature is part of their trademarked identity. Do not swap, blend, or transfer these.",
    "",
  ];

  if (conflictSlugs.includes("pineapple-baby")) {
    lines.push("  • PINEAPPLE BABY: layered green pineapple crown — appears ONLY on Pineapple Baby");
  }
  if (conflictSlugs.includes("ube-baby")) {
    lines.push("  • UBE BABY: green heart-shaped leaf cluster — appears ONLY on Ube Baby");
  }
  if (conflictSlugs.includes("mango-baby")) {
    lines.push("  • MANGO BABY: small brown mango stem + single green mango leaf — appears ONLY on Mango Baby");
  }

  lines.push(
    "",
    "  ✗ Do NOT put Pineapple Baby's crown on Ube Baby or Mango Baby.",
    "  ✗ Do NOT put Ube Baby's heart-leaf cluster on Pineapple Baby or Mango Baby.",
    "  ✗ Do NOT put Mango Baby's stem on Ube Baby or Pineapple Baby.",
    "  ✗ Do NOT create a hybrid top feature that blends two characters' styles.",
    ""
  );

  return lines;
}

function buildMissingPartPreventionLines(slugs: string[]): string[] {
  const hasMango = slugs.includes("mango-baby");

  const lines: string[] = [
    "MISSING PART PREVENTION:",
    "  • Every visible character must include all required body parts from their reference image.",
    "  • Do NOT omit arms unless they are clearly hidden behind the body or another object.",
    "  • Do NOT omit feet unless hidden by a table, floor, or scene composition.",
    "  • Do NOT remove top features (crowns, leaves, stems) — they are part of official character design.",
    "  • Do NOT simplify characters into featureless round blobs.",
    "  • Do NOT replace one character's top feature with another character's top feature.",
  ];

  if (hasMango) {
    lines.push(
      "  • MANGO BABY: must show two short rounded arms in normal standing or sitting poses — do not hide or omit."
    );
  }

  lines.push("");
  return lines;
}

function buildBabyProportionLockLines(): string[] {
  return [
    "BABY PROPORTION LOCK:",
    "  • Characters must look short, round, plump, soft, and baby-like — not tall mascots.",
    "  • Arms and legs must be short, rounded, and stubby — do not elongate.",
    "  • Heads and bodies must remain compact and toy-like.",
    "  • Do NOT draw taller, thinner, older, or more realistic body proportions.",
    "  • Do NOT add mature or humanoid proportions.",
    "",
  ];
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
): ProductionFidelityResult {
  const charPkgs = sceneRefPkg.characterPackages;
  const slugs = charPkgs.map((p) => p.characterSlug);
  const charNames = charPkgs.map((p) => p.characterName).join(", ");
  const hasTiki = slugs.some((s) => s === "tiki" || s === "tiki-trouble");
  const isMultiCharacter = charPkgs.length > 1;

  const featureWarnings: string[] = [];

  // ── 1. Required character feature locks ───────────────────────────────────
  const featureLockLines = buildRequiredCharacterFeatureLockLines(slugs, charBySlug, featureWarnings);
  const lockedCount = slugs.filter((s) => CANONICAL_FEATURE_LOCKS[s] !== undefined).length;

  // ── 2. Top-feature separation ──────────────────────────────────────────────
  const topFeatureLines = buildTopFeatureSeparationLines(slugs);
  const topFeatureSeparationUsed = topFeatureLines.length > 0;

  // ── 3. Missing-part prevention ────────────────────────────────────────────
  const missingPartLines = buildMissingPartPreventionLines(slugs);

  // ── 4. Baby proportion lock ───────────────────────────────────────────────
  const proportionLines = buildBabyProportionLockLines();

  // ── 5. Character identity locks (numbered, tied to reference images) ──────
  const identityLockLines: string[] = [
    "CHARACTER IDENTITY LOCKS:",
    "Each reference image belongs exclusively to ONE character. Do not mix, blend, or transfer features.",
    "",
  ];
  charPkgs.forEach((pkg, i) => {
    const refNum = i + 1;
    const char = charBySlug[pkg.characterSlug];
    const fruitLabel = getFruitLabel(pkg.characterSlug, char);
    identityLockLines.push(`[LOCK ${refNum}] ${pkg.characterName} → Reference Image ${refNum}`);
    identityLockLines.push(
      `  • Reference Image ${refNum} defines ${pkg.characterName} ONLY. Do NOT apply it to any other character.`
    );
    identityLockLines.push(
      `  • Match ${pkg.characterName}'s exact ${fruitLabel}body shape, color palette, and expression from this image.`
    );
    if (char) {
      const rules = getCharacterRules(char);
      const topRules = [...rules.doNotChangeRules, ...rules.neverRules].slice(0, 2);
      topRules.forEach((r) => identityLockLines.push(`  • ${r}`));
    }
    identityLockLines.push("");
  });

  // ── 6. Cross-character contamination bans ─────────────────────────────────
  const contaminationLines: string[] = [];
  if (isMultiCharacter) {
    contaminationLines.push(
      "CROSS-CHARACTER TRAIT SEPARATION RULES:",
      "No color, texture, crown shape, or body feature may transfer between characters."
    );
    charPkgs.forEach((pkg, i) => {
      const otherNames = charPkgs
        .filter((_, j) => j !== i)
        .map((p) => p.characterName)
        .join(" or ");
      const fruitLabel = getFruitLabel(pkg.characterSlug, charBySlug[pkg.characterSlug]);
      contaminationLines.push(
        `• ${pkg.characterName}'s ${fruitLabel}body design and palette (Ref ${i + 1}) must NOT appear on ${otherNames}.`
      );
    });
    contaminationLines.push(
      "• Each character must remain visually distinct — different fruit identity, different colors, different top feature.",
      ""
    );
  }

  // ── Assemble prompt (priority order) ──────────────────────────────────────
  const lines: string[] = [
    "PRODUCTION CHARACTER FIDELITY GENERATION — Fruit Baby World",
    "",
    "The attached reference images are official, trademark-protected Fruit Baby character designs.",
    "Each reference image is the PRIMARY and ONLY visual source of truth for one specific character.",
    "CHARACTER ACCURACY IS MORE IMPORTANT THAN SCENE STYLE. Apply feature locks before stylistic choices.",
    "",
    ...featureLockLines,
    ...topFeatureLines,
    ...missingPartLines,
    ...proportionLines,
    ...identityLockLines,
    ...contaminationLines,
    "SCENE TO GENERATE:",
    panelPrompt,
    "",
    "STRICT PRODUCTION REQUIREMENTS — DO NOT DEVIATE:",
    "• Reproduce each character's exact body shape, silhouette, and proportions from their reference image.",
    "• Match each character's exact color palette — no hue shifts, no saturation changes, no approximation.",
    "• Match each character's exact eye shape, pupil style, and expression style.",
    "• Match each character's exact mouth style, blush marks, and cheek details.",
    "• Match each character's exact leaf/crown/stem shape and all character-specific features.",
    "• Do NOT redesign, reinterpret, or loosely approximate any character.",
    "• Do NOT create an 'inspired by' version — every character must match their official design exactly.",
    "• All content must remain kid-friendly, warm, playful, and emotionally safe.",
    "• No violence, horror, adult themes, or scary imagery.",
  ];

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

  return {
    prompt: lines.join("\n"),
    requiredFeatureLocksUsed: lockedCount > 0,
    characterFeatureLockCount: lockedCount,
    missingPartPreventionUsed: true,
    babyProportionLockUsed: true,
    topFeatureSeparationUsed,
    characterFeatureWarnings: featureWarnings,
  };
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
