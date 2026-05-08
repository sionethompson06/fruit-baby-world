// Shared episode scene helpers — used by public pages and admin pages.
// No Node.js fs, no browser-only APIs — safe to call from any server context.

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// ─── Public types ─────────────────────────────────────────────────────────────

export type ApprovedPanel = {
  sceneNumber: number;
  sceneId?: string;
  displayOrder?: number;
  panelTitle: string;
  referenceCharacters: string[];
  caption: string;
  asset: {
    url: string;
    mimeType: string;
    alt: string;
  };
};

// ─── Scene array access ───────────────────────────────────────────────────────

export function getEpisodeScenes(
  episode: Record<string, unknown>
): Record<string, unknown>[] {
  const fromBreakdown = Array.isArray(episode.sceneBreakdown)
    ? (episode.sceneBreakdown as unknown[]).filter(isRecord)
    : [];
  if (fromBreakdown.length > 0) return fromBreakdown;
  return Array.isArray(episode.scenes)
    ? (episode.scenes as unknown[]).filter(isRecord)
    : [];
}

// ─── Archive status ───────────────────────────────────────────────────────────

export function isSceneArchived(scene: Record<string, unknown>): boolean {
  return str(scene.status) === "archived";
}

export function getActiveEpisodeScenes(
  episode: Record<string, unknown>
): Record<string, unknown>[] {
  return getEpisodeScenes(episode).filter((s) => !isSceneArchived(s));
}

export function getArchivedEpisodeScenes(
  episode: Record<string, unknown>
): Record<string, unknown>[] {
  return getEpisodeScenes(episode).filter(isSceneArchived);
}

// ─── Scene identity ───────────────────────────────────────────────────────────

export function getSceneKey(scene: Record<string, unknown>): string {
  const id = str(scene.sceneId);
  if (id) return id;
  const num =
    typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
  return `scene-${num}`;
}

export function getSceneDisplayName(
  scene: Record<string, unknown>,
  index?: number
): string {
  const title = str(scene.title);
  if (title) return title;
  const num =
    typeof scene.sceneNumber === "number"
      ? scene.sceneNumber
      : index !== undefined
      ? index + 1
      : 0;
  return `Scene ${num}`;
}

// ─── Scene lookup ─────────────────────────────────────────────────────────────

export function findSceneForPanel(
  episode: Record<string, unknown>,
  panel: Record<string, unknown>
): Record<string, unknown> | undefined {
  const scenes = getEpisodeScenes(episode);
  const panelSceneId = str(panel.sceneId);
  if (panelSceneId) {
    const byId = scenes.find((s) => str(s.sceneId) === panelSceneId);
    if (byId) return byId;
  }
  const panelSceneNumber =
    typeof panel.sceneNumber === "number" ? panel.sceneNumber : -1;
  return scenes.find(
    (s) =>
      typeof s.sceneNumber === "number" && s.sceneNumber === panelSceneNumber
  );
}

export function findSceneForClip(
  episode: Record<string, unknown>,
  clip: Record<string, unknown>
): Record<string, unknown> | undefined {
  return findSceneForPanel(episode, clip);
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

export function sortScenesBySceneNumber(
  scenes: Record<string, unknown>[]
): Record<string, unknown>[] {
  return [...scenes].sort((a, b) => {
    const an = typeof a.sceneNumber === "number" ? a.sceneNumber : 0;
    const bn = typeof b.sceneNumber === "number" ? b.sceneNumber : 0;
    return an - bn;
  });
}

export function sortPanelsForPublicDisplay(panels: ApprovedPanel[]): ApprovedPanel[] {
  return [...panels].sort(
    (a, b) =>
      (a.displayOrder ?? a.sceneNumber) - (b.displayOrder ?? b.sceneNumber)
  );
}

// ─── Approved public story panels ─────────────────────────────────────────────
// Full approval check: vercel-blob URL, characterFidelityApproved, publicUse,
// status/approvalStatus, and archived scene exclusion.

export function getApprovedPublicStoryPanels(
  episode: Record<string, unknown>
): ApprovedPanel[] {
  const media = isRecord(episode.media) ? episode.media : null;
  if (!media) return [];
  const spm = isRecord(media.storyPanelMode) ? media.storyPanelMode : null;
  if (!spm) return [];
  const panels = Array.isArray(spm.panels) ? spm.panels : [];

  // Build archived sets once so each panel check is O(1)
  const archivedScenes = getArchivedEpisodeScenes(episode);
  const archivedSceneNumbers = new Set(
    archivedScenes
      .map((s) => (typeof s.sceneNumber === "number" ? s.sceneNumber : -1))
      .filter((n) => n > 0)
  );
  const archivedSceneIds = new Set(
    archivedScenes.map((s) => str(s.sceneId)).filter(Boolean)
  );

  const approved: ApprovedPanel[] = [];

  for (const p of panels) {
    if (!isRecord(p)) continue;

    const asset = isRecord(p.asset) ? p.asset : null;
    if (!asset) continue;

    const url = str(asset.url);
    if (!url.startsWith("https://")) continue;
    if (asset.storageProvider !== "vercel-blob") continue;

    const review = isRecord(p.review) ? p.review : null;
    if (!review || review.characterFidelityApproved !== true) continue;

    const publicUse = isRecord(p.publicUse) ? p.publicUse : null;
    if (
      !publicUse ||
      publicUse.allowed !== true ||
      publicUse.appearsOnPublicStoryPage !== true
    )
      continue;

    if (p.status !== "approved" && p.approvalStatus !== "approved") continue;

    const sceneNumber =
      typeof p.sceneNumber === "number" && p.sceneNumber >= 1
        ? p.sceneNumber
        : 0;
    if (sceneNumber < 1) continue;

    const sceneId = str(p.sceneId) || undefined;

    if (archivedSceneNumbers.has(sceneNumber)) continue;
    if (sceneId && archivedSceneIds.has(sceneId)) continue;

    const displayOrder =
      typeof p.displayOrder === "number" && p.displayOrder >= 1
        ? p.displayOrder
        : undefined;

    approved.push({
      sceneNumber,
      sceneId,
      displayOrder,
      caption: str(asset.caption) || str(p.publicCaption),
      panelTitle: str(p.panelTitle) || `Scene ${sceneNumber}`,
      referenceCharacters: Array.isArray(p.referenceCharacters)
        ? (p.referenceCharacters as unknown[]).filter(
            (x): x is string => typeof x === "string"
          )
        : [],
      asset: {
        url,
        mimeType: str(asset.mimeType) || "image/png",
        alt: str(asset.alt) || `Story panel for Scene ${sceneNumber}`,
      },
    });
  }

  return sortPanelsForPublicDisplay(approved);
}
