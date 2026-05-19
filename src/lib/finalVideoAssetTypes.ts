// Types for a saved final story video asset.
// Used for future attach/display — no rendering in this phase.

export type FinalVideoVisibility = "admin-only" | "public-ready" | "hidden";

export type FinalVideoSourceSummary = {
  totalSegments: number;
  animatedClipSegments: number;
  storyPanelSegments: number;
  textOnlySegments: number;
  hasNarrationAudio: boolean;
};

export type FinalVideoAsset = {
  id: string;
  type: "final-story-video";
  status: "saved";
  visibility: FinalVideoVisibility;
  url: string;
  pathname?: string;
  mimeType: "video/mp4" | string;
  sizeBytes?: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  sourceAssemblySummary?: FinalVideoSourceSummary;
  createdAt: string;
  attachedAt?: string;
  renderEngine?: string;
};

// ─── Type guard ───────────────────────────────────────────────────────────────

export function isFinalVideoAsset(v: unknown): v is FinalVideoAsset {
  if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
  const r = v as Record<string, unknown>;
  return (
    r.type === "final-story-video" &&
    r.status === "saved" &&
    typeof r.id === "string" &&
    typeof r.url === "string" &&
    r.url.startsWith("https://")
  );
}
