// Shared media lifecycle helpers for the admin production workflow.
// Maps existing panel/audio/video statuses into consistent admin-facing labels
// without changing any underlying data models or JSON fields.

// ─── Stage type ───────────────────────────────────────────────────────────────

export type MediaLifecycleStage =
  | "temporary-draft"
  | "saved-to-media-storage"
  | "attached-to-episode"
  | "public-ready"
  | "hidden"
  | "unknown";

// ─── Labels ───────────────────────────────────────────────────────────────────

export function getMediaLifecycleLabel(stage: MediaLifecycleStage): string {
  const labels: Record<MediaLifecycleStage, string> = {
    "temporary-draft":       "Temporary Draft",
    "saved-to-media-storage": "Saved to Media Storage",
    "attached-to-episode":   "Attached to Episode",
    "public-ready":          "Public Ready",
    "hidden":                "Hidden",
    "unknown":               "Unknown",
  };
  return labels[stage];
}

export function getMediaLifecycleDescription(stage: MediaLifecycleStage): string {
  const descriptions: Record<MediaLifecycleStage, string> = {
    "temporary-draft":       "Created by AI provider for review only. Not saved or published.",
    "saved-to-media-storage": "Uploaded to Vercel Blob storage. Not yet attached to the episode.",
    "attached-to-episode":   "Saved to episode JSON. Visible in admin workflow. Not yet public.",
    "public-ready":          "Approved to appear on the public story page.",
    "hidden":                "Attached or saved but intentionally not shown publicly.",
    "unknown":               "Status unknown.",
  };
  return descriptions[stage];
}

// ─── Badge CSS classes ────────────────────────────────────────────────────────

export function getMediaLifecycleBadgeClass(stage: MediaLifecycleStage): string {
  const classes: Record<MediaLifecycleStage, string> = {
    "temporary-draft":       "bg-pineapple-yellow/25 text-tiki-brown/70",
    "saved-to-media-storage": "bg-sky-blue/20 text-sky-blue/80",
    "attached-to-episode":   "bg-ube-purple/15 text-ube-purple",
    "public-ready":          "bg-tropical-green/20 text-tropical-green",
    "hidden":                "bg-warm-coral/15 text-warm-coral/80",
    "unknown":               "bg-tiki-brown/8 text-tiki-brown/50",
  };
  return classes[stage];
}

// ─── Visibility → stage mapping ───────────────────────────────────────────────

export function getMediaVisibilityStage(visibility: string): MediaLifecycleStage {
  if (visibility === "public-ready") return "public-ready";
  if (visibility === "hidden") return "hidden";
  if (visibility === "admin-only") return "attached-to-episode";
  if (visibility === "public") return "public-ready";   // story panels use "public"
  return "unknown";
}

export function getMediaVisibilityLabel(visibility: string): string {
  return getMediaLifecycleLabel(getMediaVisibilityStage(visibility));
}

// ─── Boolean helpers ──────────────────────────────────────────────────────────

export function isMediaPublicReady(visibility: string): boolean {
  return visibility === "public-ready" || visibility === "public";
}

export function isMediaHidden(visibility: string): boolean {
  return visibility === "hidden";
}

export function isMediaAttachedToEpisode(visibility: string): boolean {
  return visibility === "admin-only";
}
