// Server-side helper for reading saved episode draft JSON files.
// Uses Node.js fs to discover all JSON files in src/content/episodes/.
// Only call from Server Components or Server Actions — never from client code.

import fs from "fs";
import path from "path";

// ─── Raw shape ────────────────────────────────────────────────────────────────

type RawEpisodeDraft = {
  id?: string;
  slug?: string;
  title?: string;
  status?: string;
  reviewStatus?: string;
  productionStatus?: string;
  featuredCharacters?: string[];
  shortDescription?: string;
  episodeSummary?: string;
  lesson?: string;
  setting?: string;
  targetAgeRange?: string;
  tone?: string;
  scenes?: unknown[];
  sceneBreakdown?: unknown[];
  merchTieIns?: string[];
  characterFidelityChecklist?: string[];
  imagePromptDrafts?: string[];
  animationPromptDrafts?: string[];
  review?: {
    status?: string;
    notes?: string;
    requiresHumanReview?: boolean;
    approvedForSave?: boolean;
  };
  publishing?: {
    publicStatus?: string;
    readyForPublicSite?: boolean;
  };
  generatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

// ─── Normalised display shape ─────────────────────────────────────────────────

export type SavedEpisodeDraft = {
  title: string;
  slug: string;
  status: string;
  productionStatus: string;
  reviewStatus: string;
  approvedForSave: boolean;
  publicStatus: string;
  readyForPublicSite: boolean;
  featuredCharacters: string[];
  shortDescription: string;
  lesson: string;
  setting: string;
  tone: string;
  targetAgeRange: string;
  sceneCount: number;
  reviewNotes: string;
  createdAt: string;
  updatedAt: string;
  _filename: string;
  _filePath: string;
};

// ─── Diagnostic info (admin-facing, no secrets) ───────────────────────────────

export type EpisodeLoadDiag = {
  cwd: string;
  dir: string;
  dirExists: boolean;
  jsonFilesFound: number;
  filenames: string[];
  parseErrors: string[];
};

// ─── Load result ──────────────────────────────────────────────────────────────

export type EpisodeLoadResult = {
  drafts: SavedEpisodeDraft[];
  diag: EpisodeLoadDiag;
};

// ─── Normalise ────────────────────────────────────────────────────────────────

function normalise(raw: RawEpisodeDraft, filename: string): SavedEpisodeDraft {
  const slug = raw.slug ?? filename.replace(/\.json$/, "");
  return {
    title:              raw.title?.trim()                                || "Untitled Episode",
    slug,
    status:             raw.status                                       || "draft",
    productionStatus:   raw.productionStatus                             || "draft",
    reviewStatus:       raw.review?.status ?? raw.reviewStatus           ?? "draft",
    approvedForSave:    Boolean(raw.review?.approvedForSave),
    publicStatus:       raw.publishing?.publicStatus                     || "not-published",
    readyForPublicSite: Boolean(raw.publishing?.readyForPublicSite),
    featuredCharacters: raw.featuredCharacters                           ?? [],
    shortDescription:   raw.shortDescription ?? raw.episodeSummary       ?? "",
    lesson:             raw.lesson?.trim()                               ?? "",
    setting:            raw.setting?.trim()                              ?? "",
    tone:               raw.tone                                         ?? "",
    targetAgeRange:     raw.targetAgeRange                               ?? "",
    sceneCount:         raw.sceneBreakdown?.length ?? raw.scenes?.length ?? 0,
    reviewNotes:        raw.review?.notes                                ?? "",
    createdAt:          raw.createdAt ?? raw.generatedAt                 ?? "",
    updatedAt:          raw.updatedAt                                    ?? "",
    _filename:          filename,
    _filePath:          `src/content/episodes/${filename}`,
  };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export function loadEpisodeDrafts(): EpisodeLoadResult {
  const cwd = process.cwd();
  const dir = path.join(cwd, "src", "content", "episodes");

  const diag: EpisodeLoadDiag = {
    cwd,
    dir,
    dirExists: false,
    jsonFilesFound: 0,
    filenames: [],
    parseErrors: [],
  };

  let filenames: string[];
  try {
    const all = fs.readdirSync(dir);
    filenames = all.filter((f) => f.endsWith(".json"));
    diag.dirExists = true;
    diag.jsonFilesFound = filenames.length;
    diag.filenames = filenames;
  } catch (err) {
    diag.dirExists = false;
    diag.parseErrors.push(
      `Could not read directory: ${err instanceof Error ? err.message : String(err)}`
    );
    return { drafts: [], diag };
  }

  const drafts: SavedEpisodeDraft[] = [];

  for (const filename of filenames) {
    const fullPath = path.join(dir, filename);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const parsed = JSON.parse(raw) as RawEpisodeDraft;
      drafts.push(normalise(parsed, filename));
    } catch (err) {
      diag.parseErrors.push(
        `${filename}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  drafts.sort((a, b) => {
    const ta = a.updatedAt || a.createdAt;
    const tb = b.updatedAt || b.createdAt;
    if (tb > ta) return 1;
    if (ta > tb) return -1;
    return a._filename.localeCompare(b._filename);
  });

  return { drafts, diag };
}
