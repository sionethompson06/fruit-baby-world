// Helpers for reading storybookPages[] from episode JSON.
// Server-only (reads from raw episode objects).

import type { StorybookPage } from "@/lib/storybookPageTypes";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseStorybookPage(v: unknown): StorybookPage | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || !v.id) return null;
  if (typeof v.imageUrl !== "string" || !v.imageUrl) return null;
  const pageNumber = typeof v.pageNumber === "number" ? v.pageNumber : 0;
  const mimeType = typeof v.mimeType === "string" ? v.mimeType : "image/png";
  const altText = typeof v.altText === "string" ? v.altText : "";
  const status = v.status === "approved" || v.status === "archived" ? v.status : "draft";
  const visibility = v.visibility === "public" ? "public" : "admin-only";
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
  } satisfies StorybookPage;
}

export function getStorybookPages(raw: Record<string, unknown>): StorybookPage[] {
  if (!Array.isArray(raw.storybookPages)) return [];
  return raw.storybookPages
    .map(parseStorybookPage)
    .filter((p): p is StorybookPage => p !== null)
    .sort((a, b) => a.pageNumber - b.pageNumber);
}

export function getPublicStorybookPages(raw: Record<string, unknown>): StorybookPage[] {
  return getStorybookPages(raw).filter(
    (p) => p.status === "approved" && p.visibility === "public"
  );
}

export function shouldUseStorybookPagesForPublicReader(raw: Record<string, unknown>): boolean {
  return getPublicStorybookPages(raw).length > 0;
}
