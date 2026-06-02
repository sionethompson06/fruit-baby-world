import fs from "fs";
import path from "path";
import type { CoverPageSettings } from "./coverPageTypes";

export function getDefaultCoverPageSettings(): CoverPageSettings {
  return {
    enabled: false,
    unveilingAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    title: "Pineapple Baby and the Fruit Baby Universe",
    eyebrow: "A bright new world is growing...",
    subtitle:
      "Storybooks, characters, songs, surprises, and collectible friends are almost ready.",
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

export function normalizeCoverPageSettings(raw: unknown): CoverPageSettings {
  const d = getDefaultCoverPageSettings();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return d;
  const r = raw as Record<string, unknown>;
  return {
    enabled: typeof r.enabled === "boolean" ? r.enabled : d.enabled,
    unveilingAt: typeof r.unveilingAt === "string" ? r.unveilingAt : d.unveilingAt,
    title: typeof r.title === "string" ? r.title : d.title,
    eyebrow: typeof r.eyebrow === "string" ? r.eyebrow : d.eyebrow,
    subtitle: typeof r.subtitle === "string" ? r.subtitle : d.subtitle,
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
    videos: Array.isArray(r.videos) ? r.videos : d.videos,
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
