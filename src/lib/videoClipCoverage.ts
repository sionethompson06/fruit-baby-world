// Video clip coverage helpers — reads attached video clips from episode scene data.
// Pure data — no fs, no network. Safe to call from any server context.

import type { AttachedVideoClipAsset } from "@/lib/videoGenerationTypes";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ─── Read video clips from a scene ───────────────────────────────────────────

export function getVideoClipsForScene(
  scene: Record<string, unknown>
): AttachedVideoClipAsset[] {
  const clips = scene.videoClips;
  if (!Array.isArray(clips)) return [];
  return clips.filter(isRecord).map((c) => ({
    id: str(c.id) || `video-${Date.now()}`,
    type: "animated-clip" as const,
    status: "approved" as const,
    provider: str(c.provider),
    providerJobId: str(c.providerJobId),
    modelId: str(c.modelId),
    videoStyle: str(c.videoStyle),
    durationSeconds: typeof c.durationSeconds === "number" ? c.durationSeconds : 0,
    url: str(c.url),
    pathname: str(c.pathname),
    thumbnailUrl: str(c.thumbnailUrl),
    mimeType: str(c.mimeType) || "video/mp4",
    sizeBytes: typeof c.sizeBytes === "number" ? c.sizeBytes : 0,
    promptText: str(c.promptText),
    referenceMode: str(c.referenceMode),
    reviewNotes: str(c.reviewNotes),
    approvedBy: str(c.approvedBy) || "admin",
    approvedAt: str(c.approvedAt),
    attachedAt: str(c.attachedAt),
    visibility: (str(c.visibility) as AttachedVideoClipAsset["visibility"]) || "admin-only",
  }));
}

export function sceneHasAttachedVideoClip(scene: Record<string, unknown>): boolean {
  return getVideoClipsForScene(scene).length > 0;
}

export function getApprovedPublicVideoClipsForScene(
  scene: Record<string, unknown>
): AttachedVideoClipAsset[] {
  return getVideoClipsForScene(scene).filter(
    (c) => c.visibility === "public-ready" && c.url.startsWith("https://")
  );
}

export function getAdminOnlyVideoClipsForScene(
  scene: Record<string, unknown>
): AttachedVideoClipAsset[] {
  return getVideoClipsForScene(scene).filter((c) => c.visibility === "admin-only");
}
