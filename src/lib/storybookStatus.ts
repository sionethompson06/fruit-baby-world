// Pure helpers for normalizing and checking storybook-level visibility status.
// Safe for both server and client contexts — no Node.js imports.
//
// Canonical status: "draft" | "published" | "hidden" | "archived"
// - archived: wins over all other states; safe delete without file removal
// - hidden: temporarily removed from public; still editable
// - published: visible on /stories and /stories/[slug]
// - draft: editable in admin; not visible publicly
//
// Backward-compatible: storybooks with publishing.readyForPublicSite === true
// and no explicit status field are treated as "published".

export type StorybookStatus = "draft" | "published" | "hidden" | "archived";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeStorybookStatus(
  raw: Record<string, unknown>
): StorybookStatus {
  // archived wins over everything — once archived, must be explicitly restored
  if (raw.status === "archived") return "archived";
  // hidden wins over published
  if (raw.status === "hidden") return "hidden";
  // explicit published
  if (raw.status === "published") return "published";
  // legacy: publishing object flags (older storybooks without top-level status)
  const pub = isRecord(raw.publishing) ? raw.publishing : null;
  if (pub?.readyForPublicSite === true || pub?.publicStatus === "published") {
    return "published";
  }
  return "draft";
}

export function isStorybookPublic(raw: Record<string, unknown>): boolean {
  return normalizeStorybookStatus(raw) === "published";
}

export function getStorybookStatusLabel(raw: Record<string, unknown>): string {
  switch (normalizeStorybookStatus(raw)) {
    case "published": return "Published";
    case "hidden":    return "Hidden";
    case "archived":  return "Archived";
    default:          return "Draft";
  }
}
