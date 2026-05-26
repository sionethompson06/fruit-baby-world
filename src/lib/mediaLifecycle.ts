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

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

// ─── Labels ───────────────────────────────────────────────────────────────────

export function getMediaLifecycleLabel(stage: MediaLifecycleStage): string {
  switch (stage) {
    case "temporary-draft":
      return "Temporary Draft";
    case "saved-to-media-storage":
      return "Saved to Media Storage";
    case "attached-to-episode":
      return "Attached to Episode";
    case "public-ready":
      return "Public Ready";
    case "hidden":
      return "Hidden";
    default:
      return "Unknown";
  }
}

export function getMediaLifecycleDescription(stage: MediaLifecycleStage): string {
  switch (stage) {
    case "temporary-draft":
      return "Created by AI/provider and review-only, not saved to storage.";
    case "saved-to-media-storage":
      return "Stored in Blob media storage but not attached to episode JSON yet.";
    case "attached-to-episode":
      return "Saved in episode JSON and visible in admin production workflow.";
    case "public-ready":
      return "Approved to appear on public story pages when the public feature is enabled.";
    case "hidden":
      return "Attached or saved but intentionally hidden from public display.";
    default:
      return "Status cannot be determined from available metadata.";
  }
}

// ─── Badge CSS classes ────────────────────────────────────────────────────────

export function getMediaLifecycleBadgeClass(stage: MediaLifecycleStage): string {
  switch (stage) {
    case "temporary-draft":
      return "bg-pineapple-yellow/15 text-tiki-brown/70 border border-pineapple-yellow/30";
    case "saved-to-media-storage":
      return "bg-sky-blue/15 text-sky-blue/80 border border-sky-blue/30";
    case "attached-to-episode":
      return "bg-ube-purple/15 text-ube-purple border border-ube-purple/30";
    case "public-ready":
      return "bg-tropical-green/15 text-tropical-green border border-tropical-green/30";
    case "hidden":
      return "bg-warm-coral/15 text-warm-coral/80 border border-warm-coral/30";
    default:
      return "bg-tiki-brown/10 text-tiki-brown/60 border border-tiki-brown/20";
  }
}

// ─── Visibility string → stage mapping ───────────────────────────────────────

export function getMediaVisibilityStage(visibility: string): MediaLifecycleStage {
  if (visibility === "public-ready") return "public-ready";
  if (visibility === "hidden") return "hidden";
  if (visibility === "admin-only") return "attached-to-episode";
  if (visibility === "public") return "public-ready";   // story panels use "public"
  return "unknown";
}

export function getMediaVisibilityLabel(visibility: unknown): string {
  const normalized = getString(visibility).toLowerCase();
  if (normalized === "public-ready" || normalized === "public") return "Public Ready";
  if (normalized === "admin-only") return "Attached to Episode";
  if (normalized === "hidden") return "Hidden";
  return "Unknown";
}

// ─── Media object → stage mapping ────────────────────────────────────────────

export function getMediaLifecycleStage(
  media: unknown,
  mediaType?: string
): MediaLifecycleStage {
  if (!isRecord(media)) return "unknown";

  const visibility = getString(media.visibility).toLowerCase();
  if (visibility === "hidden") return "hidden";
  if (visibility === "public-ready" || visibility === "public") return "public-ready";
  if (visibility === "admin-only") return "attached-to-episode";

  const asset = isRecord(media.asset) ? media.asset : null;
  const draft = isRecord(media.draft) ? media.draft : null;
  const url = getString(media.url) || getString(asset?.url);
  const hasAttachedAt = Boolean(getString(media.attachedAt));
  const hasUploadPath = Boolean(getString(media.pathname));

  const hasDraftData =
    getString(media.audioBase64) ||
    getString(media.videoUrl) ||
    getString(draft?.videoUrl) ||
    getString(asset?.base64) ||
    getString(media.base64);

  if (hasDraftData) return "temporary-draft";
  if (url && !visibility && !hasAttachedAt && !hasUploadPath) return "saved-to-media-storage";
  if (url) return "attached-to-episode";
  if (asset) return "saved-to-media-storage";
  return "unknown";
}

export function getMediaLifecycleActionLabel(
  stage: MediaLifecycleStage,
  mediaType?: string
): string {
  switch (stage) {
    case "temporary-draft":
      return "Review Temporary Draft";
    case "saved-to-media-storage":
      return "Save to Media Storage";
    case "attached-to-episode":
      return "Attach to Episode";
    case "public-ready":
      return "Make Public Ready";
    case "hidden":
      return "Hide from Public";
    default:
      return "Review Media";
  }
}

// ─── Boolean helpers ──────────────────────────────────────────────────────────

export function isMediaPublicReady(media: unknown): boolean {
  return getMediaLifecycleStage(media) === "public-ready";
}

export function isMediaHidden(media: unknown): boolean {
  return getMediaLifecycleStage(media) === "hidden";
}

export function isMediaAttached(media: unknown): boolean {
  const stage = getMediaLifecycleStage(media);
  return stage === "attached-to-episode" || stage === "public-ready" || stage === "hidden";
}

export function isMediaSavedToStorage(media: unknown): boolean {
  return getMediaLifecycleStage(media) === "saved-to-media-storage";
}

export function isMediaAttachedToEpisode(visibility: string): boolean {
  return visibility === "admin-only";
}
