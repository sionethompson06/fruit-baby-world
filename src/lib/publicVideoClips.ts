// Public-safe video clip helpers — server-only, no browser APIs.
// Extracts public-ready animated clips from episode scene data for the public story page.

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ─── Types ────────────────────────────────────────────────────────────────────

// Public-safe: no provider, promptText, referenceMode, reviewNotes, pathname, or internal IDs
export type PublicVideoClip = {
  id: string;
  sceneNumber: number;
  sceneTitle: string;
  url: string;
  mimeType: string;
  durationSeconds: number | null;
};

// ─── Eligibility check ────────────────────────────────────────────────────────

export function isPublicReadyVideoClip(clip: unknown): boolean {
  if (!isRecord(clip)) return false;
  const url = str(clip.url);
  if (!url.startsWith("https://") || url.length < 10) return false;
  if (clip.status !== "approved") return false;
  if (str(clip.visibility) !== "public-ready") return false;
  return true;
}

// ─── Scene-level extraction ───────────────────────────────────────────────────

export function getPublicReadyVideoClipsForScene(
  scene: Record<string, unknown>
): PublicVideoClip[] {
  if (str(scene.status) === "archived") return [];
  const clips = Array.isArray(scene.videoClips) ? scene.videoClips : [];
  const sceneNumber = typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
  const sceneTitle = str(scene.title);

  return clips
    .filter(isPublicReadyVideoClip)
    .map((clip) => {
      const c = clip as Record<string, unknown>;
      return {
        id: str(c.id) || `clip-${sceneNumber}`,
        sceneNumber,
        sceneTitle,
        url: str(c.url),
        mimeType: str(c.mimeType) || "video/mp4",
        durationSeconds: typeof c.durationSeconds === "number" ? c.durationSeconds : null,
      };
    });
}

// ─── Episode-level extraction ─────────────────────────────────────────────────

export function getPublicReadyVideoClipsForEpisode(
  scenes: Record<string, unknown>[]
): PublicVideoClip[] {
  return scenes.flatMap(getPublicReadyVideoClipsForScene);
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export function getVideoClipDisplayLabel(clip: PublicVideoClip): string {
  const base = clip.sceneTitle || `Scene ${clip.sceneNumber}`;
  return clip.durationSeconds ? `${base} — ${clip.durationSeconds}s` : base;
}
