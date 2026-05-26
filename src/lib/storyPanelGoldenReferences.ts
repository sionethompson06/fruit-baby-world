// Golden Reference Memory for Fruit Baby World story panels (Phase 18E).
// Admin-only — stores approved generation outputs as trusted references for future use.
// Phase 18E.1 adds replay guardrails, settings, tighter selection, and diagnostics.
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
  consideredCount: number;
  titles: string[];
  roles: GoldenReferenceRole[];
  mode: "none" | "prompt-guided";
  skippedReason?: string;
  matchReasons: string[];
};

export type GoldenReferenceReplaySummary = {
  used: boolean;
  count: number;
  titles: string[];
  roles: string[];
  mode: "none" | "prompt-guided" | "image-conditioned";
};

// ─── Replay settings ──────────────────────────────────────────────────────────

export type GoldenReferenceReplaySettings = {
  enabled: boolean;
  maxSceneReferences: number;
  maxCharacterReferences: number;
  maxEnvironmentReferences: number;
  maxHarmonizationReferences: number;
  requireCharacterOverlap: boolean;
  requireRoleMatch: boolean;
  officialReferencesRemainPrimary: true;
};

export const DEFAULT_REPLAY_SETTINGS: GoldenReferenceReplaySettings = {
  enabled: true,
  maxSceneReferences: 2,
  maxCharacterReferences: 1,
  maxEnvironmentReferences: 1,
  maxHarmonizationReferences: 1,
  requireCharacterOverlap: true,
  requireRoleMatch: true,
  officialReferencesRemainPrimary: true,
};

// ─── Diagnostics type ─────────────────────────────────────────────────────────

export type GoldenReferenceReplayDiagnostics = {
  enabled: boolean;
  consideredCount: number;
  selectedCount: number;
  skippedReason?: string;
  selected: Array<{ id: string; title: string; role: string; matchReason: string }>;
  warnings: string[];
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

function scoreRef(
  ref: StoryPanelGoldenReference,
  opts: { characterSlugs?: string[]; tags?: string[] }
): number {
  let score = new Date(ref.createdAt).getTime() / 1e13; // recency

  if (opts.characterSlugs) {
    const overlap = ref.characterSlugs.filter((s) => opts.characterSlugs!.includes(s)).length;
    // Prefer exact cast match
    const isExactCast =
      overlap === opts.characterSlugs.length && overlap === ref.characterSlugs.length;
    score += overlap * 10;
    if (isExactCast) score += 20;
  }
  if (opts.tags) {
    score += ref.tags.filter((t) => opts.tags!.includes(t)).length * 5;
  }
  return score;
}

function buildMatchReason(
  ref: StoryPanelGoldenReference,
  opts: { characterSlugs?: string[]; settingLabel?: string }
): string {
  const parts: string[] = [];
  if (opts.characterSlugs) {
    const overlap = ref.characterSlugs.filter((s) => opts.characterSlugs!.includes(s));
    if (overlap.length === opts.characterSlugs.length && overlap.length === ref.characterSlugs.length) {
      parts.push("exact cast match");
    } else if (overlap.length > 0) {
      parts.push(`${overlap.length} shared character(s)`);
    }
  }
  if (opts.settingLabel && ref.tags.some((t) => opts.settingLabel!.toLowerCase().includes(t))) {
    parts.push("setting match");
  }
  parts.push(`role: ${ref.referenceRole}`);
  return parts.join(", ");
}

export function selectGoldenReferencesForScene(opts: {
  all: StoryPanelGoldenReference[];
  characterSlugs: string[];
  settingLabel?: string;
  tags?: string[];
  limit?: number;
  useGoldenReferences?: boolean;
}): GoldenReferenceSelectionResult {
  const {
    all,
    characterSlugs,
    settingLabel,
    tags = [],
    limit = DEFAULT_REPLAY_SETTINGS.maxSceneReferences,
    useGoldenReferences = true,
  } = opts;

  if (!useGoldenReferences) {
    return buildEmptyResult(all.length, "disabled by admin");
  }

  const settingTokens = settingLabel
    ? settingLabel.toLowerCase().split(/[\s,/]+/).filter(Boolean)
    : [];
  const allTags = [...tags, ...settingTokens];

  // Eligible: scene-composition, multi-character-interaction, style-polish
  // Require character overlap except for style-polish (which applies globally)
  const eligible = all.filter((r) => {
    if (
      r.referenceRole !== "scene-composition" &&
      r.referenceRole !== "multi-character-interaction" &&
      r.referenceRole !== "style-polish"
    ) return false;
    // style-polish doesn't require character overlap
    if (r.referenceRole === "style-polish") return true;
    // scene-composition and multi-character-interaction require at least one character overlap
    return r.characterSlugs.some((s) => characterSlugs.includes(s));
  });

  const sorted = [...eligible].sort(
    (a, b) =>
      scoreRef(b, { characterSlugs, tags: allTags }) -
      scoreRef(a, { characterSlugs, tags: allTags })
  );
  const selected = sorted.slice(0, limit);
  const matchReasons = selected.map((r) =>
    buildMatchReason(r, { characterSlugs, settingLabel })
  );
  return buildSelectionResult(selected, eligible.length, matchReasons);
}

export function selectGoldenReferencesForCharacter(opts: {
  all: StoryPanelGoldenReference[];
  characterSlug: string;
  emotion?: string;
  action?: string;
  limit?: number;
  useGoldenReferences?: boolean;
}): GoldenReferenceSelectionResult {
  const {
    all,
    characterSlug,
    emotion,
    action,
    limit = DEFAULT_REPLAY_SETTINGS.maxCharacterReferences,
    useGoldenReferences = true,
  } = opts;

  if (!useGoldenReferences) {
    return buildEmptyResult(all.length, "disabled by admin");
  }

  const tags = [
    ...(emotion ? emotion.toLowerCase().split(/\s+/) : []),
    ...(action ? action.toLowerCase().split(/\s+/) : []),
  ];

  // Strict: must be character-fidelity or pose-expression AND match this specific character
  const eligible = all.filter(
    (r) =>
      (r.referenceRole === "character-fidelity" || r.referenceRole === "pose-expression") &&
      (r.primaryCharacterSlug === characterSlug || r.characterSlugs.includes(characterSlug))
  );

  const sorted = [...eligible].sort(
    (a, b) =>
      scoreRef(b, { characterSlugs: [characterSlug], tags }) -
      scoreRef(a, { characterSlugs: [characterSlug], tags })
  );
  const selected = sorted.slice(0, limit);
  const matchReasons = selected.map((r) =>
    buildMatchReason(r, { characterSlugs: [characterSlug] })
  );
  return buildSelectionResult(selected, eligible.length, matchReasons);
}

export function selectGoldenReferencesForEnvironment(opts: {
  all: StoryPanelGoldenReference[];
  characterSlugs: string[];
  settingLabel?: string;
  limit?: number;
  useGoldenReferences?: boolean;
}): GoldenReferenceSelectionResult {
  const {
    all,
    characterSlugs,
    settingLabel,
    limit = DEFAULT_REPLAY_SETTINGS.maxEnvironmentReferences,
    useGoldenReferences = true,
  } = opts;

  if (!useGoldenReferences) {
    return buildEmptyResult(all.length, "disabled by admin");
  }

  const settingTokens = settingLabel
    ? settingLabel.toLowerCase().split(/[\s,/]+/).filter(Boolean)
    : [];

  // Environment only — never use character-fidelity or pose-expression refs here
  const eligible = all.filter((r) => r.referenceRole === "environment");

  const sorted = [...eligible].sort(
    (a, b) =>
      scoreRef(b, { characterSlugs, tags: settingTokens }) -
      scoreRef(a, { characterSlugs, tags: settingTokens })
  );
  const selected = sorted.slice(0, limit);
  const matchReasons = selected.map((r) =>
    buildMatchReason(r, { characterSlugs, settingLabel })
  );
  return buildSelectionResult(selected, eligible.length, matchReasons);
}

export function selectGoldenReferencesForHarmonization(opts: {
  all: StoryPanelGoldenReference[];
  characterSlugs: string[];
  limit?: number;
  useGoldenReferences?: boolean;
}): GoldenReferenceSelectionResult {
  const {
    all,
    characterSlugs,
    limit = DEFAULT_REPLAY_SETTINGS.maxHarmonizationReferences,
    useGoldenReferences = true,
  } = opts;

  if (!useGoldenReferences) {
    return buildEmptyResult(all.length, "disabled by admin");
  }

  // Harmonization: style-polish or scene-composition only
  // Prefer refs that match most/all scene characters; skip single-char refs unless they cover all
  const eligible = all.filter((r) => {
    if (r.referenceRole !== "style-polish" && r.referenceRole !== "scene-composition") return false;
    const overlap = r.characterSlugs.filter((s) => characterSlugs.includes(s)).length;
    // For multi-character scenes, require at least half the scene characters to be covered
    if (characterSlugs.length >= 2) {
      return overlap >= Math.ceil(characterSlugs.length / 2);
    }
    return overlap > 0;
  });

  const sorted = [...eligible].sort(
    (a, b) => scoreRef(b, { characterSlugs }) - scoreRef(a, { characterSlugs })
  );
  const selected = sorted.slice(0, limit);
  const matchReasons = selected.map((r) =>
    buildMatchReason(r, { characterSlugs })
  );
  return buildSelectionResult(selected, eligible.length, matchReasons);
}

function buildSelectionResult(
  selected: StoryPanelGoldenReference[],
  consideredCount: number,
  matchReasons: string[]
): GoldenReferenceSelectionResult {
  return {
    references: selected,
    count: selected.length,
    consideredCount,
    titles: selected.map((r) => r.title),
    roles: selected.map((r) => r.referenceRole),
    mode: selected.length > 0 ? "prompt-guided" : "none",
    matchReasons,
  };
}

function buildEmptyResult(
  totalCount: number,
  skippedReason: string
): GoldenReferenceSelectionResult {
  return {
    references: [],
    count: 0,
    consideredCount: totalCount,
    titles: [],
    roles: [],
    mode: "none",
    skippedReason,
    matchReasons: [],
  };
}

// ─── Prompt section builder ────────────────────────────────────────────────────
// Cap: 800 chars max. Always includes official reference priority disclaimer.

const GOLDEN_REF_PROMPT_CAP = 800;

const OFFICIAL_PRIORITY_DISCLAIMER =
  "Golden References are supporting examples only. " +
  "Official character profile images, official main references, official environment/home references, " +
  "and required feature locks remain the source of truth. " +
  "If a Golden Reference conflicts with official references, ignore the Golden Reference and follow the official references.";

export function buildGoldenReferencePromptSection(
  references: StoryPanelGoldenReference[],
  context: "scene" | "character" | "environment" | "harmonize"
): string | undefined {
  if (references.length === 0) return undefined;

  const headers: Record<typeof context, string> = {
    scene: "=== GOLDEN REFERENCES — Approved Scene Examples ===",
    character: "=== GOLDEN REFERENCES — Approved Character Examples ===",
    environment: "=== GOLDEN REFERENCES — Approved Environment Examples ===",
    harmonize: "=== GOLDEN REFERENCES — Approved Style Examples ===",
  };

  const lines: string[] = [
    headers[context],
    OFFICIAL_PRIORITY_DISCLAIMER,
    "",
  ];

  for (const ref of references) {
    // Compact per-reference: title + role + short description only, no qualityNotes
    const descPart = ref.description ? ` — ${ref.description.slice(0, 80)}` : "";
    const tagPart = ref.tags.length > 0 ? ` [${ref.tags.slice(0, 3).join(", ")}]` : "";
    lines.push(`• ${ref.title} [${ref.referenceRole}]${descPart}${tagPart}`);
  }

  const raw = lines.join("\n");
  return raw.length > GOLDEN_REF_PROMPT_CAP ? raw.slice(0, GOLDEN_REF_PROMPT_CAP) : raw;
}

// ─── Diagnostics builder ──────────────────────────────────────────────────────

export function buildGoldenReferenceReplayDiagnostics(
  result: GoldenReferenceSelectionResult,
  enabled: boolean
): GoldenReferenceReplayDiagnostics {
  const warnings: string[] = [];

  if (!enabled) {
    return {
      enabled: false,
      consideredCount: result.consideredCount,
      selectedCount: 0,
      skippedReason: result.skippedReason ?? "disabled by admin",
      selected: [],
      warnings: [],
    };
  }

  if (result.count === 0 && result.consideredCount === 0) {
    warnings.push("No Golden References have been saved yet.");
  } else if (result.count === 0 && result.consideredCount > 0) {
    warnings.push(
      `${result.consideredCount} Golden Reference(s) exist but none matched this scene/character/role.`
    );
  }

  return {
    enabled: true,
    consideredCount: result.consideredCount,
    selectedCount: result.count,
    skippedReason: result.skippedReason,
    selected: result.references.map((r, i) => ({
      id: r.id,
      title: r.title,
      role: r.referenceRole,
      matchReason: result.matchReasons[i] ?? "matched",
    })),
    warnings,
  };
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
