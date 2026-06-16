import fs from "fs";
import path from "path";
import type {
  AnimatedStoriesContent,
  AnimatedStory,
  AnimatedStoryClip,
  AnimatedStoryStatus,
  AnimatedStoryVisibility,
  AnimatedStoryClipStatus,
  AnimatedStoryClipVisibility,
} from "./animatedStoriesTypes";

const CONTENT_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "animated-stories",
  "animated-stories.json"
);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const VALID_STORY_STATUSES: AnimatedStoryStatus[] = ["draft", "published", "archived"];
const VALID_STORY_VISIBILITIES: AnimatedStoryVisibility[] = ["hidden", "public"];
const VALID_CLIP_STATUSES: AnimatedStoryClipStatus[] = ["draft", "approved", "archived"];
const VALID_CLIP_VISIBILITIES: AnimatedStoryClipVisibility[] = ["hidden", "public"];

// ── Slug ───────────────────────────────────────────────────────────────────────

export function slugifyAnimatedStoryTitle(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Sorters ────────────────────────────────────────────────────────────────────

export function sortAnimatedStories(stories: AnimatedStory[]): AnimatedStory[] {
  return [...stories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sortAnimatedStoryClips(clips: AnimatedStoryClip[]): AnimatedStoryClip[] {
  return [...clips].sort((a, b) => a.sortOrder - b.sortOrder);
}

// ── Normalizers ────────────────────────────────────────────────────────────────

export function normalizeAnimatedStoryClip(
  raw: unknown,
  fallback?: Partial<AnimatedStoryClip>
): AnimatedStoryClip {
  const r = isRecord(raw) ? raw : {};
  const id =
    typeof r.id === "string" && r.id
      ? r.id
      : fallback?.id ?? `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const title =
    typeof r.title === "string" ? r.title : fallback?.title ?? "Untitled Clip";
  const videoUrl =
    typeof r.videoUrl === "string" ? r.videoUrl : fallback?.videoUrl ?? "";
  const sortOrder =
    typeof r.sortOrder === "number" ? r.sortOrder : fallback?.sortOrder ?? 9999;
  const status = VALID_CLIP_STATUSES.includes(r.status as AnimatedStoryClipStatus)
    ? (r.status as AnimatedStoryClipStatus)
    : fallback?.status ?? "approved";
  const visibility = VALID_CLIP_VISIBILITIES.includes(
    r.visibility as AnimatedStoryClipVisibility
  )
    ? (r.visibility as AnimatedStoryClipVisibility)
    : fallback?.visibility ?? "public";

  return {
    id,
    title,
    videoUrl,
    ...(typeof r.pathname === "string" ? { pathname: r.pathname } : {}),
    ...(typeof r.originalFilename === "string"
      ? { originalFilename: r.originalFilename }
      : {}),
    ...(typeof r.mimeType === "string" ? { mimeType: r.mimeType } : {}),
    ...(typeof r.sizeBytes === "number" ? { sizeBytes: r.sizeBytes } : {}),
    ...(typeof r.durationSeconds === "number"
      ? { durationSeconds: r.durationSeconds }
      : {}),
    sortOrder,
    status,
    visibility,
    ...(typeof r.uploadedAt === "string" ? { uploadedAt: r.uploadedAt } : {}),
    ...(typeof r.updatedAt === "string" ? { updatedAt: r.updatedAt } : {}),
  };
}

export function normalizeAnimatedStory(
  raw: unknown,
  fallback?: Partial<AnimatedStory>
): AnimatedStory {
  const r = isRecord(raw) ? raw : {};
  const id =
    typeof r.id === "string" && r.id
      ? r.id
      : fallback?.id ?? `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const slug =
    typeof r.slug === "string" && r.slug ? r.slug : fallback?.slug ?? "untitled-story";
  const title =
    typeof r.title === "string" && r.title ? r.title : fallback?.title ?? "Untitled Story";
  const description =
    typeof r.description === "string" && r.description ? r.description : undefined;
  const status = VALID_STORY_STATUSES.includes(r.status as AnimatedStoryStatus)
    ? (r.status as AnimatedStoryStatus)
    : "draft";
  const visibility = VALID_STORY_VISIBILITIES.includes(r.visibility as AnimatedStoryVisibility)
    ? (r.visibility as AnimatedStoryVisibility)
    : "hidden";
  const sortOrder =
    typeof r.sortOrder === "number" ? r.sortOrder : fallback?.sortOrder ?? 9999;

  const rawClips = Array.isArray(r.clips) ? r.clips : [];
  const clips = rawClips.map((c, idx) => normalizeAnimatedStoryClip(c, { sortOrder: idx }));

  // Normalize characterSlugs to unique, safe, non-empty slugs
  const rawCharSlugs = Array.isArray(r.characterSlugs) ? r.characterSlugs : [];
  const characterSlugs = [
    ...new Set(
      rawCharSlugs
        .filter((s): s is string => typeof s === "string" && Boolean(s.trim()))
        .map((s) =>
          s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        )
        .filter(Boolean)
    ),
  ];

  return {
    id,
    slug,
    title,
    ...(description !== undefined ? { description } : {}),
    status,
    visibility,
    ...(characterSlugs.length > 0 ? { characterSlugs } : {}),
    ...(typeof r.coverImageUrl === "string" ? { coverImageUrl: r.coverImageUrl } : {}),
    ...(typeof r.coverImagePathname === "string" ? { coverImagePathname: r.coverImagePathname } : {}),
    ...(typeof r.coverImageOriginalFilename === "string" ? { coverImageOriginalFilename: r.coverImageOriginalFilename } : {}),
    ...(typeof r.posterImageUrl === "string" ? { posterImageUrl: r.posterImageUrl } : {}),
    ...(typeof r.posterImagePathname === "string" ? { posterImagePathname: r.posterImagePathname } : {}),
    ...(typeof r.posterImageOriginalFilename === "string" ? { posterImageOriginalFilename: r.posterImageOriginalFilename } : {}),
    sortOrder,
    clips: sortAnimatedStoryClips(clips),
    ...(typeof r.createdAt === "string" ? { createdAt: r.createdAt } : {}),
    ...(typeof r.updatedAt === "string" ? { updatedAt: r.updatedAt } : {}),
  };
}

export function normalizeAnimatedStoriesContent(input: unknown): AnimatedStoriesContent {
  const r = isRecord(input) ? input : {};
  const version = typeof r.version === "number" ? r.version : 1;
  const rawStories = Array.isArray(r.stories) ? r.stories : [];
  const stories = rawStories.map((s, idx) => normalizeAnimatedStory(s, { sortOrder: idx }));
  return {
    version,
    stories: sortAnimatedStories(stories),
  };
}

// ── Factories ──────────────────────────────────────────────────────────────────

export function createAnimatedStoryDraft(fields: {
  title: string;
  slug: string;
  description?: string;
  sortOrder?: number;
}): AnimatedStory {
  const now = new Date().toISOString();
  return {
    id: `story-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    slug: fields.slug,
    title: fields.title,
    ...(fields.description ? { description: fields.description } : {}),
    status: "draft",
    visibility: "hidden",
    sortOrder: fields.sortOrder ?? 9999,
    clips: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function createAnimatedStoryClipFromUpload(
  uploadResult: {
    videoUrl: string;
    pathname?: string;
    originalFilename?: string;
    mimeType?: string;
    sizeBytes?: number;
    uploadedAt?: string;
  },
  opts?: { title?: string; sortOrder?: number }
): AnimatedStoryClip {
  const now = new Date().toISOString();
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title:
      opts?.title ??
      uploadResult.originalFilename?.replace(/\.[^.]+$/, "") ??
      "Untitled Clip",
    videoUrl: uploadResult.videoUrl,
    ...(uploadResult.pathname ? { pathname: uploadResult.pathname } : {}),
    ...(uploadResult.originalFilename
      ? { originalFilename: uploadResult.originalFilename }
      : {}),
    ...(uploadResult.mimeType ? { mimeType: uploadResult.mimeType } : {}),
    ...(uploadResult.sizeBytes ? { sizeBytes: uploadResult.sizeBytes } : {}),
    sortOrder: opts?.sortOrder ?? 9999,
    status: "approved",
    visibility: "public",
    uploadedAt: uploadResult.uploadedAt ?? now,
    updatedAt: now,
  };
}

// ── Readers ────────────────────────────────────────────────────────────────────

export function getAnimatedStoriesContent(): AnimatedStoriesContent {
  try {
    const raw = fs.readFileSync(CONTENT_PATH, "utf-8");
    return normalizeAnimatedStoriesContent(JSON.parse(raw));
  } catch {
    return { version: 1, stories: [] };
  }
}

export function getAnimatedStoryBySlug(slug: string): AnimatedStory | undefined {
  return getAnimatedStoriesContent().stories.find((s) => s.slug === slug);
}

export function getPublicAnimatedStoryClips(story: AnimatedStory): AnimatedStoryClip[] {
  return sortAnimatedStoryClips(
    story.clips.filter(
      (c) =>
        c.status === "approved" &&
        c.visibility === "public" &&
        Boolean(c.videoUrl)
    )
  );
}

export function getPublicAnimatedStories(): AnimatedStory[] {
  return getAnimatedStoriesContent().stories.filter(
    (s) =>
      s.status === "published" &&
      s.visibility === "public" &&
      s.clips.some(
        (c) => c.status === "approved" && c.visibility === "public" && Boolean(c.videoUrl)
      )
  );
}

export function getPublicAnimatedStoryBySlug(slug: string): AnimatedStory | undefined {
  return getPublicAnimatedStories().find((s) => s.slug === slug);
}
