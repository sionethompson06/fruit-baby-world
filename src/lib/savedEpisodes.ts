// Server-side helper for reading saved episode draft JSON files.
// Uses Node.js fs to discover all JSON files in src/content/episodes/.
// Only call from Server Components or Server Actions — never from client code.

import fs from "fs";
import path from "path";

// ─── Raw shape ────────────────────────────────────────────────────────────────

// Flexible type matching both the simple sample-episode shape and the
// AI-generated shape. All fields are optional to handle varied JSON gracefully.

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

// ─── Normalised shape ─────────────────────────────────────────────────────────

// Derived display-ready fields so the page never needs conditional logic.

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

function normalise(raw: RawEpisodeDraft, filename: string): SavedEpisodeDraft {
  const slug = raw.slug ?? filename.replace(/\.json$/, "");
  return {
    title:             raw.title?.trim()                                   || "Untitled Episode",
    slug,
    status:            raw.status                                          || "draft",
    productionStatus:  raw.productionStatus                                || "draft",
    reviewStatus:      raw.review?.status ?? raw.reviewStatus              ?? "draft",
    approvedForSave:   Boolean(raw.review?.approvedForSave),
    publicStatus:      raw.publishing?.publicStatus                        || "not-published",
    readyForPublicSite: Boolean(raw.publishing?.readyForPublicSite),
    featuredCharacters: raw.featuredCharacters                             ?? [],
    shortDescription:  raw.shortDescription ?? raw.episodeSummary          ?? "",
    lesson:            raw.lesson?.trim()                                  ?? "",
    setting:           raw.setting?.trim()                                 ?? "",
    tone:              raw.tone                                            ?? "",
    targetAgeRange:    raw.targetAgeRange                                  ?? "",
    sceneCount:        raw.sceneBreakdown?.length ?? raw.scenes?.length    ?? 0,
    reviewNotes:       raw.review?.notes                                   ?? "",
    createdAt:         raw.createdAt ?? raw.generatedAt                    ?? "",
    updatedAt:         raw.updatedAt                                       ?? "",
    _filename:         filename,
    _filePath:         `src/content/episodes/${filename}`,
  };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export function getAllSavedEpisodeDrafts(): SavedEpisodeDraft[] {
  const dir = path.join(process.cwd(), "src", "content", "episodes");

  let filenames: string[];
  try {
    filenames = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const results: SavedEpisodeDraft[] = [];

  for (const filename of filenames) {
    const fullPath = path.join(dir, filename);
    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const parsed = JSON.parse(raw) as RawEpisodeDraft;
      results.push(normalise(parsed, filename));
    } catch {
      // Skip files that are malformed or unreadable
    }
  }

  // Sort by updatedAt descending (newest first), fall back to filename
  results.sort((a, b) => {
    const ta = a.updatedAt || a.createdAt;
    const tb = b.updatedAt || b.createdAt;
    if (tb > ta) return 1;
    if (ta > tb) return -1;
    return a._filename.localeCompare(b._filename);
  });

  return results;
}
