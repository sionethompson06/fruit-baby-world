// Helpers for page-level storybook audio.
// Server-safe (no browser APIs). Works with raw episode JSON.

import type {
  StorybookPageAudioConfig,
  StorybookPageAudioItem,
  StorybookPageAudioStatus,
  StorybookPageAudioVisibility,
} from "@/lib/storybookPageAudioTypes";
import type { StorybookPage } from "@/lib/storybookPageTypes";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const VALID_STATUSES: StorybookPageAudioStatus[] = ["draft", "approved", "archived"];
const VALID_VISIBILITIES: StorybookPageAudioVisibility[] = ["hidden", "public"];

function parsePageAudioItem(v: unknown): StorybookPageAudioItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.pageId !== "string" || !v.pageId) return null;
  if (typeof v.audioUrl !== "string" || !v.audioUrl) return null;
  const status: StorybookPageAudioStatus = VALID_STATUSES.includes(v.status as StorybookPageAudioStatus)
    ? (v.status as StorybookPageAudioStatus)
    : "draft";
  const visibility: StorybookPageAudioVisibility = VALID_VISIBILITIES.includes(v.visibility as StorybookPageAudioVisibility)
    ? (v.visibility as StorybookPageAudioVisibility)
    : "hidden";
  return {
    pageId: v.pageId,
    audioUrl: v.audioUrl,
    pathname: typeof v.pathname === "string" ? v.pathname : undefined,
    originalAudioFilename: typeof v.originalAudioFilename === "string" ? v.originalAudioFilename : undefined,
    mimeType: typeof v.mimeType === "string" ? v.mimeType : "audio/mpeg",
    sizeBytes: typeof v.sizeBytes === "number" ? v.sizeBytes : undefined,
    durationSeconds: typeof v.durationSeconds === "number" ? v.durationSeconds : undefined,
    status,
    visibility,
    uploadedAt: typeof v.uploadedAt === "string" ? v.uploadedAt : new Date().toISOString(),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : undefined,
  };
}

export function normalizeStorybookPageAudio(
  raw: unknown,
  storybookPages: StorybookPage[]
): StorybookPageAudioConfig {
  const now = new Date().toISOString();
  const pageIdSet = new Set(storybookPages.map((p) => p.id));

  if (!isRecord(raw)) {
    return { version: 1, status: "draft", visibility: "hidden", pages: [], updatedAt: now };
  }

  const rawPages = Array.isArray(raw.pages) ? raw.pages : [];
  const pages = rawPages
    .map(parsePageAudioItem)
    .filter((p): p is StorybookPageAudioItem => p !== null)
    // Drop items referencing pageIds not in the storybook (only when pages are known)
    .filter((p) => pageIdSet.size === 0 || pageIdSet.has(p.pageId));

  const status: StorybookPageAudioStatus = VALID_STATUSES.includes(raw.status as StorybookPageAudioStatus)
    ? (raw.status as StorybookPageAudioStatus)
    : "draft";
  const visibility: StorybookPageAudioVisibility = VALID_VISIBILITIES.includes(raw.visibility as StorybookPageAudioVisibility)
    ? (raw.visibility as StorybookPageAudioVisibility)
    : "hidden";

  return {
    version: 1,
    status,
    visibility,
    pages,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : now,
  };
}

// Returns the non-archived audio item for a page, or null if none.
export function getPageAudioForPage(
  config: StorybookPageAudioConfig,
  pageId: string
): StorybookPageAudioItem | null {
  return config.pages.find((p) => p.pageId === pageId && p.status !== "archived") ?? null;
}

export function isPageAudioPublic(item: StorybookPageAudioItem | null | undefined): boolean {
  if (!item) return false;
  return item.status === "approved" && item.visibility === "public";
}

// Returns pageId → audioUrl map for all approved+public items.
export function getPublicPageAudioMap(config: StorybookPageAudioConfig): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of config.pages) {
    if (isPageAudioPublic(item)) {
      map[item.pageId] = item.audioUrl;
    }
  }
  return map;
}

// Replaces an existing item by pageId or appends a new one.
export function upsertPageAudioItem(
  config: StorybookPageAudioConfig,
  item: StorybookPageAudioItem
): StorybookPageAudioConfig {
  const existingIndex = config.pages.findIndex((p) => p.pageId === item.pageId);
  const pages =
    existingIndex >= 0
      ? config.pages.map((p, i) => (i === existingIndex ? item : p))
      : [...config.pages, item];
  return { ...config, pages, updatedAt: new Date().toISOString() };
}

// Marks a page's audio as archived + hidden without deleting the asset.
export function archivePageAudioItem(
  config: StorybookPageAudioConfig,
  pageId: string
): StorybookPageAudioConfig {
  const pages = config.pages.map((p) =>
    p.pageId === pageId
      ? {
          ...p,
          status: "archived" as StorybookPageAudioStatus,
          visibility: "hidden" as StorybookPageAudioVisibility,
          updatedAt: new Date().toISOString(),
        }
      : p
  );
  return { ...config, pages, updatedAt: new Date().toISOString() };
}

// Returns a display name for a page:
// priority: originalFilename → imagePathname basename → imageUrl basename → "Page N"
export function getPageDisplayFilename(page: StorybookPage): string {
  if (page.originalFilename) return page.originalFilename;
  if (page.pathname) {
    const parts = page.pathname.split("/");
    const last = parts[parts.length - 1];
    if (last) return last;
  }
  try {
    const url = new URL(page.imageUrl);
    const parts = url.pathname.split("/");
    const last = parts[parts.length - 1];
    if (last) return decodeURIComponent(last);
  } catch {
    // not a valid URL — fall through
  }
  return `Page ${page.pageNumber}`;
}
