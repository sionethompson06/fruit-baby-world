// Golden Reference Memory for Fruit Baby World story panels (Phase 18E).
// Admin-only — stores approved generation outputs as trusted references for future use.
// Server-safe — uses fs. Do NOT import in client components.

import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GoldenReferenceSourceType =
  | "story-panel"
  | "harmonized-panel"
  | "assembled-panel"
  | "background-layer"
  | "character-layer";

export type GoldenReferenceRole =
  | "character-fidelity"
  | "environment"
  | "pose-expression"
  | "scene-composition"
  | "multi-character-interaction"
  | "style-polish";

export type StoryPanelGoldenReference = {
  id: string;
  type: "golden-reference";

  sourceType: GoldenReferenceSourceType;
  sourceId?: string;
  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  panelId?: string;

  characterSlugs: string[];
  primaryCharacterSlug?: string;

  referenceRole: GoldenReferenceRole;

  title: string;
  description?: string;

  imageUrl: string;
  pathname?: string;
  mimeType?: string;

  tags: string[];

  qualityNotes?: string;
  approvedByAdmin: true;
  visibility: "admin-only";

  createdAt: string;
  updatedAt?: string;
};

export type GoldenReferenceSelectionResult = {
  references: StoryPanelGoldenReference[];
  count: number;
  titles: string[];
  roles: GoldenReferenceRole[];
  mode: "none" | "prompt-guided";
};

export type GoldenReferenceReplaySummary = {
  used: boolean;
  count: number;
  titles: string[];
  roles: string[];
  mode: "none" | "prompt-guided" | "image-conditioned";
};

// ─── Storage path ─────────────────────────────────────────────────────────────

export const GOLDEN_REFS_FILE_PATH = "src/content/golden-references.json";

const GOLDEN_REFS_DISK_PATH = path.join(process.cwd(), GOLDEN_REFS_FILE_PATH);

// ─── Load ─────────────────────────────────────────────────────────────────────

export function loadGoldenReferences(): StoryPanelGoldenReference[] {
  try {
    if (!fs.existsSync(GOLDEN_REFS_DISK_PATH)) return [];
    const raw = JSON.parse(fs.readFileSync(GOLDEN_REFS_DISK_PATH, "utf-8")) as {
      goldenReferences?: unknown;
    };
    return Array.isArray(raw.goldenReferences)
      ? (raw.goldenReferences as StoryPanelGoldenReference[])
      : [];
  } catch {
    return [];
  }
}

// ─── Selection helpers ────────────────────────────────────────────────────────

const MAX_SCENE_REFS = 3;
const MAX_BACKGROUND_REFS = 2;
const MAX_CHAR_REFS = 2;
const MAX_HARMONIZE_REFS = 2;

function scoreRef(
  ref: StoryPanelGoldenReference,
  opts: { characterSlugs?: string[]; tags?: string[] }
): number {
  let score = new Date(ref.createdAt).getTime() / 1e13; // recency

  if (opts.characterSlugs) {
    score += ref.characterSlugs.filter((s) => opts.characterSlugs!.includes(s)).length * 10;
  }
  if (opts.tags) {
    score += ref.tags.filter((t) => opts.tags!.includes(t)).length * 5;
  }
  return score;
}

export function selectGoldenReferencesForScene(opts: {
  all: StoryPanelGoldenReference[];
  characterSlugs: string[];
  settingLabel?: string;
  tags?: string[];
  limit?: number;
}): GoldenReferenceSelectionResult {
  const { all, characterSlugs, settingLabel, tags = [], limit = MAX_SCENE_REFS } = opts;

  const settingTokens = settingLabel
    ? settingLabel.toLowerCase().split(/[\s,/]+/).filter(Boolean)
    : [];

  const allTags = [...tags, ...settingTokens];
  const eligible = all
    .filter(
      (r) =>
        r.referenceRole === "scene-composition" ||
        r.referenceRole === "multi-character-interaction" ||
        r.referenceRole === "style-polish"
    )
    .filter((r) => r.characterSlugs.some((s) => characterSlugs.includes(s)));

  const sorted = [...eligible].sort(
    (a, b) =>
      scoreRef(b, { characterSlugs, tags: allTags }) -
      scoreRef(a, { characterSlugs, tags: allTags })
  );
  return buildSelectionResult(sorted.slice(0, limit));
}

export function selectGoldenReferencesForCharacter(opts: {
  all: StoryPanelGoldenReference[];
  characterSlug: string;
  emotion?: string;
  action?: string;
  limit?: number;
}): GoldenReferenceSelectionResult {
  const { all, characterSlug, emotion, action, limit = MAX_CHAR_REFS } = opts;

  const tags = [
    ...(emotion ? emotion.toLowerCase().split(/\s+/) : []),
    ...(action ? action.toLowerCase().split(/\s+/) : []),
  ];

  const eligible = all.filter(
    (r) =>
      (r.referenceRole === "character-fidelity" || r.referenceRole === "pose-expression") &&
      (r.characterSlugs.includes(characterSlug) || r.primaryCharacterSlug === characterSlug)
  );
  const sorted = [...eligible].sort(
    (a, b) =>
      scoreRef(b, { characterSlugs: [characterSlug], tags }) -
      scoreRef(a, { characterSlugs: [characterSlug], tags })
  );
  return buildSelectionResult(sorted.slice(0, limit));
}

export function selectGoldenReferencesForEnvironment(opts: {
  all: StoryPanelGoldenReference[];
  characterSlugs: string[];
  settingLabel?: string;
  limit?: number;
}): GoldenReferenceSelectionResult {
  const { all, characterSlugs, settingLabel, limit = MAX_BACKGROUND_REFS } = opts;

  const settingTokens = settingLabel
    ? settingLabel.toLowerCase().split(/[\s,/]+/).filter(Boolean)
    : [];

  const eligible = all.filter((r) => r.referenceRole === "environment");
  const sorted = [...eligible].sort(
    (a, b) =>
      scoreRef(b, { characterSlugs, tags: settingTokens }) -
      scoreRef(a, { characterSlugs, tags: settingTokens })
  );
  return buildSelectionResult(sorted.slice(0, limit));
}

export function selectGoldenReferencesForHarmonization(opts: {
  all: StoryPanelGoldenReference[];
  characterSlugs: string[];
  limit?: number;
}): GoldenReferenceSelectionResult {
  const { all, characterSlugs, limit = MAX_HARMONIZE_REFS } = opts;

  const eligible = all
    .filter(
      (r) => r.referenceRole === "style-polish" || r.referenceRole === "scene-composition"
    )
    .filter((r) => r.characterSlugs.some((s) => characterSlugs.includes(s)));

  const sorted = [...eligible].sort(
    (a, b) => scoreRef(b, { characterSlugs }) - scoreRef(a, { characterSlugs })
  );
  return buildSelectionResult(sorted.slice(0, limit));
}

function buildSelectionResult(
  selected: StoryPanelGoldenReference[]
): GoldenReferenceSelectionResult {
  return {
    references: selected,
    count: selected.length,
    titles: selected.map((r) => r.title),
    roles: selected.map((r) => r.referenceRole),
    mode: selected.length > 0 ? "prompt-guided" : "none",
  };
}

// ─── Prompt section builder ────────────────────────────────────────────────────

export function buildGoldenReferencePromptSection(
  references: StoryPanelGoldenReference[],
  context: "scene" | "character" | "environment" | "harmonize"
): string | undefined {
  if (references.length === 0) return undefined;

  const headers: Record<typeof context, string> = {
    scene: "=== GOLDEN REFERENCES — Approved Scene Compositions ===",
    character: "=== GOLDEN REFERENCES — Approved Character Examples ===",
    environment: "=== GOLDEN REFERENCES — Approved Environment Examples ===",
    harmonize: "=== GOLDEN REFERENCES — Approved Style Examples ===",
  };

  const lines: string[] = [
    headers[context],
    "These are admin-approved examples of successful prior outputs. Replay their " +
      "quality, style, and character integrity.",
    "If any golden reference conflicts with official character profile/reference images, " +
      "always follow the official character references instead.",
    "",
  ];

  for (const ref of references) {
    lines.push(`• ${ref.title} [${ref.referenceRole}]`);
    if (ref.description) lines.push(`  ${ref.description}`);
    if (ref.qualityNotes) lines.push(`  Quality: ${ref.qualityNotes}`);
    if (ref.tags.length > 0) lines.push(`  Tags: ${ref.tags.join(", ")}`);
  }

  lines.push(
    "",
    "Official character reference sheets and profiles remain the primary source of truth."
  );
  return lines.join("\n");
}

// ─── Replay summary for API response ─────────────────────────────────────────

export function summarizeGoldenReferenceReplay(
  result: GoldenReferenceSelectionResult
): GoldenReferenceReplaySummary {
  return {
    used: result.count > 0,
    count: result.count,
    titles: result.titles,
    roles: result.roles,
    mode: result.mode,
  };
}

// ─── Factory: create a new golden reference object ────────────────────────────

export function createGoldenReferenceFromSource(opts: {
  sourceType: GoldenReferenceSourceType;
  sourceId?: string;
  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  panelId?: string;
  characterSlugs: string[];
  primaryCharacterSlug?: string;
  referenceRole: GoldenReferenceRole;
  title: string;
  description?: string;
  imageUrl: string;
  pathname?: string;
  mimeType?: string;
  tags?: string[];
  qualityNotes?: string;
}): StoryPanelGoldenReference {
  return {
    id: `gr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: "golden-reference",
    sourceType: opts.sourceType,
    sourceId: opts.sourceId,
    episodeSlug: opts.episodeSlug,
    sceneId: opts.sceneId,
    sceneNumber: opts.sceneNumber,
    panelId: opts.panelId,
    characterSlugs: opts.characterSlugs,
    primaryCharacterSlug: opts.primaryCharacterSlug,
    referenceRole: opts.referenceRole,
    title: opts.title,
    description: opts.description,
    imageUrl: opts.imageUrl,
    pathname: opts.pathname,
    mimeType: opts.mimeType,
    tags: opts.tags ?? [],
    qualityNotes: opts.qualityNotes,
    approvedByAdmin: true,
    visibility: "admin-only",
    createdAt: new Date().toISOString(),
  };
}
