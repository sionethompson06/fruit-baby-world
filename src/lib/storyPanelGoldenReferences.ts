import fs from "fs";
import path from "path";
import type { SceneReferencePackage } from "./referenceAssetLoader";

// ─── Settings ───────────────────────────────────────────────────────────────
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

export const DEFAULT_GOLDEN_REFERENCE_REPLAY_SETTINGS: GoldenReferenceReplaySettings = {
  enabled: true,
  maxSceneReferences: 2,
  maxCharacterReferences: 1,
  maxEnvironmentReferences: 1,
  maxHarmonizationReferences: 1,
  requireCharacterOverlap: true,
  requireRoleMatch: true,
  officialReferencesRemainPrimary: true,
};

// ─── Golden reference shape (defensive) ──────────────────────────────────────
export type GoldenReference = {
  id: string;
  title: string;
  role: string;
  characterSlugs?: string[];
  primaryCharacterSlug?: string | null;
  settingTags?: string[];
  imageUrl?: string | null;
  notes?: string;
  qualityNotes?: string;
  createdAt?: string;
};

export type GoldenReferenceReplayDiagnostics = {
  enabled: boolean;
  consideredCount: number;
  selectedCount: number;
  skippedReason?: string;
  selected: { id: string; title: string; role: string; matchReason: string }[];
  warnings: string[];
};

const GOLDEN_REFERENCE_PROMPT_HEADER =
  "Golden References are supporting examples only. Official character profile images, official main references, official environment/home references, and required feature locks remain the source of truth. If a Golden Reference conflicts with official references, ignore the Golden Reference and follow the official references.";

const DEFAULT_PROMPT_SECTION_LENGTH = 800;
const CHARACTER_ROLES = new Set(["character-fidelity", "pose-expression", "style-polish"]);
const SCENE_ROLES = new Set(["scene-composition", "multi-character-interaction", "style-polish", "environment"]);
const BACKGROUND_ROLES = new Set(["environment", "style-polish", "scene-composition"]);
const HARMONIZATION_ROLES = new Set(["style-polish", "scene-composition", "multi-character-interaction"]);
const CHARACTER_ONLY_ROLES = new Set(["character-fidelity", "pose-expression"]);

// ─── Loaders ─────────────────────────────────────────────────────────────────
export function loadGoldenReferences(): GoldenReference[] {
  try {
    const filePath = path.join(process.cwd(), "src/content/golden-references.json");
    if (!fs.existsSync(filePath)) return [];
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (Array.isArray(raw)) return raw as GoldenReference[];
    if (Array.isArray(raw.references)) return raw.references as GoldenReference[];
    return [];
  } catch {
    return [];
  }
}

// ─── Selection helpers ───────────────────────────────────────────────────────
function arrayEquals(a: string[] | undefined, b: string[] | undefined) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

function intersectCount(a?: string[], b?: string[]) {
  if (!a || !b) return 0;
  const set = new Set(b);
  return a.filter((x) => set.has(x)).length;
}

function makeMatchReason(
  golden: GoldenReference,
  opts: { castOverlap: number; exactCast: boolean; tagOverlap: number; roleMatch: boolean }
) {
  const parts: string[] = [];
  if (opts.exactCast) parts.push("exact cast match");
  if (opts.castOverlap > 0) parts.push(`${opts.castOverlap} character overlap`);
  if (opts.tagOverlap > 0) parts.push("setting match");
  if (opts.roleMatch) parts.push("role match");
  if (parts.length === 0) parts.push("fuzzy match");
  return parts.join(" + ");
}

export function selectGoldenReferencesForGeneration(
  scenePkg: SceneReferencePackage,
  goldenRefs: GoldenReference[] | null | undefined,
  generationKind: "scene" | "character" | "background" | "harmonization",
  options?: { characterSlug?: string; settingTags?: string[]; settings?: GoldenReferenceReplaySettings }
) {
  const settings = options?.settings ?? DEFAULT_GOLDEN_REFERENCE_REPLAY_SETTINGS;
  const sceneChars = scenePkg.characterSlugs ?? [];
  const considered: GoldenReference[] = [];

  if (!settings.enabled) {
    return {
      diagnostics: {
        enabled: false,
        consideredCount: 0,
        selectedCount: 0,
        skippedReason: "Golden Reference replay is disabled.",
        selected: [],
        warnings: [],
      } as GoldenReferenceReplayDiagnostics,
      selected: [] as GoldenReference[],
      promptSection: "",
    };
  }

  const candidates = (goldenRefs ?? []).filter(Boolean);

  for (const g of candidates) {
    if (!g.imageUrl) continue;
    const role = (g.role || "").trim();
    const overlap = intersectCount(g.characterSlugs, sceneChars);
    const isCharacterOnly = CHARACTER_ONLY_ROLES.has(role);

    if (generationKind === "character") {
      const target = options?.characterSlug;
      if (!target) continue;
      const matchesPrimary = g.primaryCharacterSlug === target;
      const includes = Array.isArray(g.characterSlugs) && g.characterSlugs.includes(target);
      if (!matchesPrimary && !includes) continue;
      if (settings.requireRoleMatch && !CHARACTER_ROLES.has(role)) continue;
      considered.push(g);
      continue;
    }

    if (generationKind === "scene") {
      const isEnvOrStyle = role === "environment" || role === "style-polish";
      if (settings.requireCharacterOverlap && !isEnvOrStyle && overlap === 0) continue;
      considered.push(g);
      continue;
    }

    if (generationKind === "background") {
      if (role === "character-fidelity") continue;
      if (settings.requireRoleMatch && role && !BACKGROUND_ROLES.has(role)) continue;
      considered.push(g);
      continue;
    }

    if (generationKind === "harmonization") {
      if (isCharacterOnly && overlap < Math.max(1, Math.ceil(sceneChars.length * 0.75))) continue;
      if (settings.requireRoleMatch && role && !HARMONIZATION_ROLES.has(role)) continue;
      considered.push(g);
      continue;
    }
  }

  const ranked = considered
    .map((g) => {
      const exactCast = arrayEquals(g.characterSlugs, sceneChars);
      const castOverlap = intersectCount(g.characterSlugs, sceneChars);
      const tagOverlap = intersectCount(g.settingTags, options?.settingTags);
      let score = 0;
      if (exactCast) score += 50;
      score += castOverlap * 10;
      score += tagOverlap * 15;
      const role = (g.role || "").trim();
      if (generationKind === "scene") {
        if (role === "scene-composition") score += 30;
        if (role === "multi-character-interaction") score += 25;
        if (role === "style-polish") score += 15;
      }
      if (generationKind === "character") {
        if (role === "character-fidelity") score += 30;
        if (role === "pose-expression") score += 20;
      }
      if (generationKind === "background") {
        if (role === "environment") score += 30;
        if (role === "scene-composition") score += 10;
      }
      if (generationKind === "harmonization") {
        if (role === "style-polish") score += 25;
        if (role === "scene-composition") score += 20;
        if (role === "multi-character-interaction") score += 10;
      }
      return {
        g,
        score,
        exactCast,
        castOverlap,
        tagOverlap,
        roleMatch: settings.requireRoleMatch ? Boolean(role) : false,
      };
    })
    .sort((a, b) => b.score - a.score);

  const cap =
    generationKind === "scene"
      ? settings.maxSceneReferences
      : generationKind === "character"
      ? settings.maxCharacterReferences
      : generationKind === "background"
      ? settings.maxEnvironmentReferences
      : settings.maxHarmonizationReferences;

  const selected = ranked.slice(0, cap).map((r) => r.g);

  const selectedDetails = ranked.slice(0, cap).map((r) => ({
    id: r.g.id,
    title: r.g.title,
    role: r.g.role,
    matchReason: makeMatchReason(r.g, {
      castOverlap: r.castOverlap,
      exactCast: r.exactCast,
      tagOverlap: r.tagOverlap,
      roleMatch: r.roleMatch,
    }),
  }));

  const diagnostics: GoldenReferenceReplayDiagnostics = {
    enabled: settings.enabled,
    consideredCount: considered.length,
    selectedCount: selected.length,
    skippedReason:
      selected.length === 0
        ? considered.length === 0
          ? "No matching character or role found."
          : "No Golden References were selected after filtering to preserve official references."
        : undefined,
    selected: selectedDetails,
    warnings: [],
  };

  function buildPromptSection(items: GoldenReference[]) {
    if (!items || items.length === 0) return "";
    const lines: string[] = ["=== GOLDEN REFERENCES (ADMIN-APPROVED) ===", GOLDEN_REFERENCE_PROMPT_HEADER, ""];
    for (const item of items) {
      const tags = (item.settingTags || []).slice(0, 4).join(", ");
      const desc = (item.qualityNotes || item.notes || "").trim();
      const reason = makeMatchReason(item, {
        castOverlap: intersectCount(item.characterSlugs, sceneChars),
        exactCast: arrayEquals(item.characterSlugs, sceneChars),
        tagOverlap: intersectCount(item.settingTags, options?.settingTags),
        roleMatch: settings.requireRoleMatch ? Boolean(item.role) : false,
      });
      const parts = [`${item.title}`, `role: ${item.role}`, `reason: ${reason}`];
      if (tags) parts.push(`tags: ${tags}`);
      lines.push(parts.join(" — "));
      if (desc) lines.push(`  ${desc.slice(0, 160)}`);
    }
    const block = lines.join("\n");
    if (block.length > DEFAULT_PROMPT_SECTION_LENGTH) return block.slice(0, DEFAULT_PROMPT_SECTION_LENGTH) + "...";
    return block;
  }

  return { diagnostics, selected, promptSection: buildPromptSection(selected) };
}

export function buildGoldenReferenceReplayDiagnosticsStub(reason: string): GoldenReferenceReplayDiagnostics {
  return {
    enabled: false,
    consideredCount: 0,
    selectedCount: 0,
    skippedReason: reason,
    selected: [],
    warnings: [],
  };
}
