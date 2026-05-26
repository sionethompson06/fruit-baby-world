// Helpers for reading storybookPages[] from episode JSON.
// Server-only (reads from raw episode objects).

import type { StorybookPage, StorybookPageRole, StorybookLayoutType } from "@/lib/storybookPageTypes";

type BookSection = "cover" | "front-matter" | "story" | "end-matter" | "back-cover";
const BOOK_SECTIONS: BookSection[] = ["cover", "front-matter", "story", "end-matter", "back-cover"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const PAGE_ROLES: StorybookPageRole[] = [
  "front-cover", "title-page", "publication-page", "acknowledgement-page",
  "introduction-page", "inside-cover", "story-page", "story-spread", "end-page", "back-cover",
];
const LAYOUT_TYPES: StorybookLayoutType[] = [
  "single-page", "two-page-spread", "cover", "back-cover",
];

// Role fallback order for pages without a saved pageNumber
const ROLE_ORDER: Record<StorybookPageRole, number> = {
  "front-cover":          0,
  "title-page":           1,
  "publication-page":     2,
  "acknowledgement-page": 3,
  "introduction-page":    4,
  "inside-cover":         5,
  "story-spread":         6,
  "story-page":           6,
  "end-page":             7,
  "back-cover":           8,
};

function parseStorybookPage(v: unknown): StorybookPage | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || !v.id) return null;
  if (typeof v.imageUrl !== "string" || !v.imageUrl) return null;
  const pageNumber = typeof v.pageNumber === "number" ? v.pageNumber : 0;
  const mimeType = typeof v.mimeType === "string" ? v.mimeType : "image/png";
  const altText = typeof v.altText === "string" ? v.altText : "";
  const status = v.status === "approved" || v.status === "archived" ? v.status : "draft";
  const visibility = v.visibility === "public" ? "public" : "admin-only";
  const pageRole = PAGE_ROLES.includes(v.pageRole as StorybookPageRole)
    ? (v.pageRole as StorybookPageRole)
    : undefined;
  const layoutType = LAYOUT_TYPES.includes(v.layoutType as StorybookLayoutType)
    ? (v.layoutType as StorybookLayoutType)
    : undefined;
  return {
    id: v.id,
    pageNumber,
    title: typeof v.title === "string" ? v.title : undefined,
    caption: typeof v.caption === "string" ? v.caption : undefined,
    readAloudText: typeof v.readAloudText === "string" ? v.readAloudText : undefined,
    imageUrl: v.imageUrl,
    pathname: typeof v.pathname === "string" ? v.pathname : undefined,
    mimeType,
    altText,
    sceneNumber: typeof v.sceneNumber === "number" ? v.sceneNumber : undefined,
    characters: Array.isArray(v.characters)
      ? (v.characters as unknown[]).filter((c): c is string => typeof c === "string")
      : undefined,
    status,
    visibility,
    sourceType: "admin-uploaded",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : new Date().toISOString(),
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : new Date().toISOString(),
    pageRole,
    layoutType,
    spreadNumber: typeof v.spreadNumber === "number" ? v.spreadNumber : undefined,
    leftPageLabel: typeof v.leftPageLabel === "string" ? v.leftPageLabel : undefined,
    rightPageLabel: typeof v.rightPageLabel === "string" ? v.rightPageLabel : undefined,
    displayMode: v.displayMode === "spread" ? "spread" : v.displayMode === "single" ? "single" : undefined,
    displayLabel: typeof v.displayLabel === "string" ? v.displayLabel : undefined,
    bookSection: BOOK_SECTIONS.includes(v.bookSection as BookSection) ? (v.bookSection as BookSection) : undefined,
  } satisfies StorybookPage;
}

function roleOf(p: StorybookPage): StorybookPageRole {
  return p.pageRole ?? "story-page";
}

// Sort by admin's saved pageNumber first; fall back to role order for unordered pages.
export function sortStorybookPagesForBook(pages: StorybookPage[]): StorybookPage[] {
  return [...pages].sort((a, b) => {
    const aHasOrder = a.pageNumber > 0;
    const bHasOrder = b.pageNumber > 0;

    if (aHasOrder && bHasOrder) return a.pageNumber - b.pageNumber;

    if (!aHasOrder && !bHasOrder) {
      const roleA = ROLE_ORDER[roleOf(a)];
      const roleB = ROLE_ORDER[roleOf(b)];
      if (roleA !== roleB) return roleA - roleB;
      const spreadA = a.spreadNumber ?? 0;
      const spreadB = b.spreadNumber ?? 0;
      return spreadA - spreadB;
    }

    // One ordered, one not — ordered comes first
    return aHasOrder ? -1 : 1;
  });
}

export function getStorybookPages(raw: Record<string, unknown>): StorybookPage[] {
  if (!Array.isArray(raw.storybookPages)) return [];
  const parsed = raw.storybookPages
    .map(parseStorybookPage)
    .filter((p): p is StorybookPage => p !== null);
  return sortStorybookPagesForBook(parsed);
}

export function getPublicStorybookPages(raw: Record<string, unknown>): StorybookPage[] {
  return getStorybookPages(raw).filter(
    (p) => p.status === "approved" && p.visibility === "public"
  );
}

export function getPublicStorybookBookPages(raw: Record<string, unknown>): StorybookPage[] {
  const parsed = Array.isArray(raw.storybookPages)
    ? raw.storybookPages
        .map(parseStorybookPage)
        .filter((p): p is StorybookPage => p !== null)
        .filter((p) => p.status === "approved" && p.visibility === "public")
    : [];
  return sortStorybookPagesForBook(parsed);
}

export function shouldUseStorybookPagesForPublicReader(raw: Record<string, unknown>): boolean {
  return getPublicStorybookPages(raw).length > 0;
}
