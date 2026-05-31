// Pure helpers for normalizing and checking storybook-level visibility status.
// Safe for both server and client contexts — no Node.js imports.
//
// Canonical status: "draft" | "coming-soon" | "published" | "hidden" | "archived"
// - archived: wins over all other states; safe delete without file removal
// - hidden: temporarily removed from public; still editable
// - published: visible on /stories and /stories/[slug]; fully readable
// - coming-soon: visible as a public teaser; NOT readable in the storybook reader
// - draft: editable in admin; not visible publicly
//
// Backward-compatible: storybooks with publishing.readyForPublicSite === true
// and no explicit status field are treated as "published".

export type StorybookStatus = "draft" | "coming-soon" | "published" | "hidden" | "archived";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function normalizeStorybookStatus(
  raw: Record<string, unknown>
): StorybookStatus {
  // archived wins over everything — once archived, must be explicitly restored
  if (raw.status === "archived") return "archived";
  // hidden wins over published/coming-soon
  if (raw.status === "hidden") return "hidden";
  // explicit published
  if (raw.status === "published") return "published";
  // coming-soon — accept all spellings
  if (
    raw.status === "coming-soon" ||
    raw.status === "comingSoon" ||
    raw.status === "coming soon"
  ) return "coming-soon";
  // legacy: publishing object flags (older storybooks without top-level status)
  const pub = isRecord(raw.publishing) ? raw.publishing : null;
  if (pub?.readyForPublicSite === true || pub?.publicStatus === "published") {
    return "published";
  }
  if (pub?.publicStatus === "coming-soon") return "coming-soon";
  return "draft";
}

// True only for fully readable published storybooks.
// Does NOT include coming-soon — those are teasers only.
export function isStorybookPublic(raw: Record<string, unknown>): boolean {
  return normalizeStorybookStatus(raw) === "published";
}

// True for storybooks that should appear in the public Coming Soon section.
export function isStorybookComingSoon(raw: Record<string, unknown>): boolean {
  return normalizeStorybookStatus(raw) === "coming-soon";
}

export function getStorybookStatusLabel(raw: Record<string, unknown>): string {
  switch (normalizeStorybookStatus(raw)) {
    case "published":   return "Published";
    case "coming-soon": return "Coming Soon";
    case "hidden":      return "Hidden";
    case "archived":    return "Archived";
    default:            return "Draft";
  }
}
