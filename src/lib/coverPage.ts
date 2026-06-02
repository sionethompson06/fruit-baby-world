import fs from "fs";
import path from "path";
import type { CoverPageSettings, CoverPageVideo } from "./coverPageTypes";

export function getDefaultCoverPageSettings(): CoverPageSettings {
  return {
    enabled: false,
    unveilingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    title: "Pineapple Baby and the Fruit Baby Universe",
    eyebrow: "Something sunny is growing...",
    subtitle:
      "A bright new world of storybooks, characters, songs, surprises, and collectible friends is almost ready.",
    footerTeaser: "Watch closely. Tiny clues are hidden in every sneak peek.",
    countdownLabel: "Unveiling in",
    completeMessage: "The Adventure Begins Now!",
    completeSubtext:
      "The Fruit Baby Universe is ready to bloom. The grand opening is almost here.",
    videoSectionTitle: "Sneak Peek Theater",
    videoPlaceholderText: "Sneak peeks are growing behind the leaves.",
    videoLoop: true,
    autoplayMuted: false,
    videos: [],
    updatedAt: "",
  };
}

export function normalizeCoverVideo(raw: unknown): CoverPageVideo | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.id !== "string" || !v.id) return null;
  if (typeof v.videoUrl !== "string" || !v.videoUrl) return null;
  return {
    id: v.id,
    title: typeof v.title === "string" ? v.title : "",
    videoUrl: v.videoUrl,
    pathname: typeof v.pathname === "string" ? v.pathname : undefined,
    originalFilename:
      typeof v.originalFilename === "string" ? v.originalFilename : undefined,
    mimeType: typeof v.mimeType === "string" ? v.mimeType : undefined,
    sizeBytes: typeof v.sizeBytes === "number" ? v.sizeBytes : undefined,
    isActive: typeof v.isActive === "boolean" ? v.isActive : true,
    sortOrder: typeof v.sortOrder === "number" ? v.sortOrder : 0,
    uploadedAt: typeof v.uploadedAt === "string" ? v.uploadedAt : undefined,
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : undefined,
    archivedAt: typeof v.archivedAt === "string" ? v.archivedAt : undefined,
  };
}

export function sortCoverVideos(videos: CoverPageVideo[]): CoverPageVideo[] {
  return [...videos].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getActiveCoverVideos(settings: CoverPageSettings): CoverPageVideo[] {
  return sortCoverVideos(
    settings.videos.filter((v) => v.isActive && !v.archivedAt)
  );
}

export function normalizeCoverPageSettings(raw: unknown): CoverPageSettings {
  const d = getDefaultCoverPageSettings();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;

  const rawVideos = Array.isArray(r.videos) ? r.videos : [];
  const videos: CoverPageVideo[] = rawVideos
    .map(normalizeCoverVideo)
    .filter((v): v is CoverPageVideo => v !== null);

  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    unveilingAt: typeof r.unveilingAt === "string" ? r.unveilingAt : d.unveilingAt,
    title: typeof r.title === "string" ? r.title : d.title,
    eyebrow: typeof r.eyebrow === "string" ? r.eyebrow : d.eyebrow,
    subtitle: typeof r.subtitle === "string" ? r.subtitle : d.subtitle,
    footerTeaser:
      typeof r.footerTeaser === "string" ? r.footerTeaser : d.footerTeaser,
    countdownLabel:
      typeof r.countdownLabel === "string" ? r.countdownLabel : d.countdownLabel,
    completeMessage:
      typeof r.completeMessage === "string" ? r.completeMessage : d.completeMessage,
    completeSubtext:
      typeof r.completeSubtext === "string" ? r.completeSubtext : d.completeSubtext,
    videoSectionTitle:
      typeof r.videoSectionTitle === "string" ? r.videoSectionTitle : d.videoSectionTitle,
    videoPlaceholderText:
      typeof r.videoPlaceholderText === "string"
        ? r.videoPlaceholderText
        : d.videoPlaceholderText,
    videoLoop: typeof r.videoLoop === "boolean" ? r.videoLoop : d.videoLoop,
    autoplayMuted:
      typeof r.autoplayMuted === "boolean" ? r.autoplayMuted : d.autoplayMuted,
    videos,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : d.updatedAt,
  };
}

export function getCoverPageSettings(): CoverPageSettings {
  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "content",
      "site",
      "cover-page.json"
    );
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8")) as unknown;
    return normalizeCoverPageSettings(raw);
  } catch {
    return getDefaultCoverPageSettings();
  }
}

export function isCoverPageEnabled(settings: CoverPageSettings): boolean {
  return settings.enabled === true;
}
