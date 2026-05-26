// Admin Media Studio helpers — server-only, read-only.
// Aggregates all production media from episodes, products, and character references.
// Never writes to any file or storage.

import { loadEpisodeDrafts, loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { getAllProductConcepts } from "@/lib/productConcepts";
import { loadReferenceAssets } from "@/lib/referenceAssetLoader";
import {
  getMediaVisibilityStage,
  type MediaLifecycleStage,
} from "@/lib/mediaLifecycle";
import type {
  MediaLibraryItem,
  MediaLibraryItemType,
  MediaLibrarySummary,
  MediaLibraryFilter,
} from "@/lib/mediaLibraryTypes";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function num(v: unknown): number | undefined {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function isValidHttpUrl(url: unknown): boolean {
  return typeof url === "string" && url.startsWith("https://");
}

// Map a story panel's public use fields + visibility → lifecycle stage.
function getPanelLifecycleStage(panel: Record<string, unknown>): MediaLifecycleStage {
  const visibility = str(panel.visibility);
  if (visibility === "hidden") return "hidden";

  const publicUse = isRecord(panel.publicUse) ? panel.publicUse : null;
  const review = isRecord(panel.review) ? panel.review : null;

  if (
    publicUse?.allowed === true &&
    publicUse?.appearsOnPublicStoryPage === true &&
    review?.characterFidelityApproved === true &&
    (panel.status === "approved" || panel.approvalStatus === "approved")
  ) {
    return "public-ready";
  }

  return "attached-to-episode";
}

// ─── Episode media ────────────────────────────────────────────────────────────

export function getEpisodeMediaItems(
  episodeSlug: string,
  episodeTitle: string,
  raw: Record<string, unknown>
): MediaLibraryItem[] {
  const items: MediaLibraryItem[] = [];

  // Story panels
  const media = isRecord(raw.media) ? raw.media : null;
  const spm = media && isRecord(media.storyPanelMode) ? media.storyPanelMode : null;
  const panels = spm && Array.isArray(spm.panels) ? (spm.panels as unknown[]) : [];

  for (const p of panels) {
    if (!isRecord(p)) continue;
    const asset = isRecord(p.asset) ? p.asset : null;
    const url = str(asset?.url ?? "");
    const sceneNum = num(p.sceneNumber);
    const panelTitle = str(p.panelTitle) || `Scene ${sceneNum ?? "?"}`;

    const warnings: string[] = [];
    if (!isValidHttpUrl(url)) warnings.push("Missing or invalid URL");

    items.push({
      id: str(p.sceneId) || `panel-${episodeSlug}-${sceneNum ?? Math.random()}`,
      type: "story-panel",
      title: panelTitle,
      sourceLabel: `${episodeTitle} · Scene ${sceneNum ?? "?"}`,
      ownerType: "episode",
      ownerTitle: episodeTitle,
      ownerSlug: episodeSlug,
      sceneId: str(p.sceneId) || undefined,
      sceneNumber: sceneNum,
      url: url || undefined,
      mimeType: str(asset?.mimeType ?? "") || "image/png",
      lifecycleStage: getPanelLifecycleStage(p),
      visibility: str(p.visibility) || undefined,
      status: str(p.status) || str(p.approvalStatus) || undefined,
      createdAt: str(asset?.createdAt ?? "") || undefined,
      warnings,
    });
  }

  // Audio narration
  const audioNarration = isRecord(raw.audioNarration) ? raw.audioNarration : null;
  if (audioNarration) {
    const url = str(audioNarration.url);
    const visibility = str(audioNarration.visibility);
    const warnings: string[] = [];
    if (!isValidHttpUrl(url)) warnings.push("Missing or invalid URL");

    items.push({
      id: str(audioNarration.id) || `audio-${episodeSlug}`,
      type: "narration-audio",
      title: `${episodeTitle} — Audio Narration`,
      sourceLabel: episodeTitle,
      ownerType: "episode",
      ownerTitle: episodeTitle,
      ownerSlug: episodeSlug,
      url: url || undefined,
      mimeType: str(audioNarration.mimeType) || "audio/mpeg",
      lifecycleStage: getMediaVisibilityStage(visibility || "admin-only"),
      visibility: visibility || undefined,
      status: str(audioNarration.status) || undefined,
      createdAt: str(audioNarration.attachedAt) || undefined,
      warnings,
    });
  }

  // Video clips (per-scene)
  const sceneArray = Array.isArray(raw.sceneBreakdown)
    ? (raw.sceneBreakdown as unknown[])
    : Array.isArray(raw.scenes)
    ? (raw.scenes as unknown[])
    : [];

  for (const scene of sceneArray) {
    if (!isRecord(scene)) continue;
    if (str(scene.status) === "archived") continue;

    const sceneNum = num(scene.sceneNumber);
    const sceneTitle = str(scene.title) || `Scene ${sceneNum ?? "?"}`;
    const clips = Array.isArray(scene.videoClips) ? (scene.videoClips as unknown[]) : [];

    for (const clip of clips) {
      if (!isRecord(clip)) continue;
      const url = str(clip.url);
      const visibility = str(clip.visibility);
      const warnings: string[] = [];
      if (!isValidHttpUrl(url)) warnings.push("Missing or invalid URL");

      items.push({
        id: str(clip.id) || `clip-${episodeSlug}-${sceneNum}-${Math.random()}`,
        type: "animated-clip",
        title: `${sceneTitle} — Animated Clip`,
        sourceLabel: `${episodeTitle} · Scene ${sceneNum ?? "?"}`,
        ownerType: "scene",
        ownerTitle: episodeTitle,
        ownerSlug: episodeSlug,
        sceneId: str(scene.sceneId) || undefined,
        sceneNumber: sceneNum,
        url: url || undefined,
        thumbnailUrl: str(clip.thumbnailUrl) || undefined,
        mimeType: str(clip.mimeType) || "video/mp4",
        lifecycleStage: getMediaVisibilityStage(visibility || "admin-only"),
        visibility: visibility || undefined,
        status: str(clip.status) || undefined,
        createdAt: str(clip.approvedAt) || str(clip.attachedAt) || undefined,
        warnings,
      });
    }
  }

  // Final video
  const finalVideo = isRecord(raw.finalVideo) ? raw.finalVideo : null;
  if (finalVideo && str(finalVideo.type) === "final-story-video") {
    const url = str(finalVideo.url);
    const visibility = str(finalVideo.visibility);
    const warnings: string[] = [];
    if (!isValidHttpUrl(url)) warnings.push("Missing or invalid URL");

    items.push({
      id: str(finalVideo.id) || `final-${episodeSlug}`,
      type: "final-video",
      title: `${episodeTitle} — Final Story Video`,
      sourceLabel: episodeTitle,
      ownerType: "episode",
      ownerTitle: episodeTitle,
      ownerSlug: episodeSlug,
      url: url || undefined,
      mimeType: str(finalVideo.mimeType) || "video/mp4",
      lifecycleStage: getMediaVisibilityStage(visibility || "admin-only"),
      visibility: visibility || undefined,
      status: str(finalVideo.status) || undefined,
      createdAt: str(finalVideo.createdAt) || undefined,
      warnings,
    });
  }

  return items;
}

// ─── Product media ────────────────────────────────────────────────────────────

export function getProductMediaItems(): MediaLibraryItem[] {
  const concepts = getAllProductConcepts();
  const items: MediaLibraryItem[] = [];

  for (const concept of concepts) {
    for (const mockup of concept.mockups ?? []) {
      const url = mockup.url;
      const warnings: string[] = [];
      if (!isValidHttpUrl(url)) warnings.push("Missing or invalid URL");

      items.push({
        id: mockup.id,
        type: "product-mockup",
        title: mockup.productTitle || concept.title,
        sourceLabel: concept.title,
        ownerType: "product",
        ownerTitle: concept.title,
        ownerSlug: concept.id,
        url: url || undefined,
        mimeType: mockup.mimeType || "image/png",
        lifecycleStage: getMediaVisibilityStage(mockup.visibility || "admin-only"),
        visibility: mockup.visibility || undefined,
        status: mockup.status,
        createdAt: mockup.approvedAt || mockup.createdAt,
        warnings,
      });
    }
  }

  return items;
}

// ─── Character references ─────────────────────────────────────────────────────

export function getCharacterReferenceItems(): MediaLibraryItem[] {
  let assets: ReturnType<typeof loadReferenceAssets> = [];
  try {
    assets = loadReferenceAssets();
  } catch {
    return [];
  }

  return assets
    .filter((a) => isValidHttpUrl(a.blobUrl))
    .map((a) => {
      const warnings: string[] = [];
      if (!isValidHttpUrl(a.blobUrl)) warnings.push("Missing or invalid URL");

      const genAllowed = a.generationUseAllowed as unknown;
      const pubAllowed = a.publicUseAllowed as unknown;

      let lifecycleStage: MediaLifecycleStage = "saved-to-media-storage";
      if (
        a.reviewStatus === "approved-for-generation" ||
        a.approvedForGeneration === true ||
        genAllowed === true ||
        genAllowed === "True" ||
        genAllowed === "true"
      ) {
        lifecycleStage = "attached-to-episode";
      }
      if (pubAllowed === true || pubAllowed === "True" || pubAllowed === "true") {
        lifecycleStage = "public-ready";
      }

      return {
        id: a.id,
        type: "character-reference" as MediaLibraryItemType,
        title: a.title || a.assetType,
        sourceLabel: a.characterSlug,
        ownerType: "character" as const,
        ownerTitle: a.characterSlug,
        ownerSlug: a.characterSlug,
        url: a.blobUrl || undefined,
        mimeType: a.mimeType || "image/png",
        lifecycleStage,
        visibility: undefined,
        status: a.reviewStatus,
        createdAt: a.uploadedAt,
        warnings,
      };
    });
}

// ─── Full library build ───────────────────────────────────────────────────────

export function buildMediaLibrary(): MediaLibraryItem[] {
  const items: MediaLibraryItem[] = [];

  // Episode media
  try {
    const { drafts } = loadEpisodeDrafts();
    for (const draft of drafts) {
      try {
        const result = loadEpisodeBySlug(draft.slug);
        if (result) {
          items.push(...getEpisodeMediaItems(draft.slug, draft.title, result.raw));
        }
      } catch { /* skip individual episode */ }
    }
  } catch { /* ignore */ }

  // Product mockups
  try {
    items.push(...getProductMediaItems());
  } catch { /* ignore */ }

  // Character references
  try {
    items.push(...getCharacterReferenceItems());
  } catch { /* ignore */ }

  return items;
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export function getMediaLibrarySummary(items: MediaLibraryItem[]): MediaLibrarySummary {
  const byType: Record<MediaLibraryItemType, number> = {
    "story-panel": 0,
    "narration-audio": 0,
    "animated-clip": 0,
    "final-video": 0,
    "product-mockup": 0,
    "character-reference": 0,
  };

  let publicReady = 0;
  let adminOnly = 0;
  let hidden = 0;
  let missingUrl = 0;

  for (const item of items) {
    byType[item.type]++;
    if (item.lifecycleStage === "public-ready") publicReady++;
    else if (item.lifecycleStage === "hidden") hidden++;
    else if (item.lifecycleStage === "attached-to-episode") adminOnly++;
    if (item.warnings.length > 0) missingUrl++;
  }

  return { total: items.length, publicReady, adminOnly, hidden, missingUrl, byType };
}

// ─── Filter ───────────────────────────────────────────────────────────────────

export function filterMediaLibraryItems(
  items: MediaLibraryItem[],
  filter: MediaLibraryFilter
): MediaLibraryItem[] {
  switch (filter) {
    case "all":
      return items;
    case "story-panel":
    case "narration-audio":
    case "animated-clip":
    case "final-video":
    case "product-mockup":
    case "character-reference":
      return items.filter((i) => i.type === filter);
    case "public-ready":
      return items.filter((i) => i.lifecycleStage === "public-ready");
    case "hidden":
      return items.filter((i) => i.lifecycleStage === "hidden");
    case "needs-attention":
      return items.filter((i) => i.warnings.length > 0);
    default:
      return items;
  }
}

// ─── URL status ───────────────────────────────────────────────────────────────

export function getMediaLibraryItemUrlStatus(
  item: MediaLibraryItem
): "ok" | "missing" | "invalid" {
  if (!item.url) return "missing";
  if (!item.url.startsWith("https://") && !item.url.startsWith("/")) return "invalid";
  return "ok";
}
