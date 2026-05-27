// Pure helper — no async, no filesystem, no GitHub.
// Pass the raw episode JSON object from loadEpisodeBySlug or GitHub.

export type StorybookPublishReadiness = {
  ready: boolean;
  blockers: string[];
  warnings: string[];
  stats: {
    totalBookImages: number;
    publicBookImages: number;
    draftBookImages: number;
    hasTitle: boolean;
    hasAbout: boolean;
    hasFrontCover: boolean;
    hasStoryContent: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function buildStorybookPublishReadiness(
  raw: Record<string, unknown>
): StorybookPublishReadiness {
  const title =
    typeof raw.title === "string" ? raw.title.trim() : "";
  const about =
    typeof raw.shortDescription === "string"
      ? raw.shortDescription.trim()
      : typeof raw.episodeSummary === "string"
      ? raw.episodeSummary.trim()
      : "";

  const hasTitle = title.length > 0;
  const hasAbout = about.length > 0;

  const rawPages = Array.isArray(raw.storybookPages)
    ? (raw.storybookPages as unknown[])
    : [];

  const pages = rawPages.filter(isRecord);
  const nonArchived = pages.filter((p) => p.status !== "archived");
  const publicPages = nonArchived.filter(
    (p) => p.status === "approved" && p.visibility === "public"
  );
  const draftPages = nonArchived.filter(
    (p) => !(p.status === "approved" && p.visibility === "public")
  );

  const totalBookImages = nonArchived.length;
  const publicBookImages = publicPages.length;
  const draftBookImages = draftPages.length;

  const hasFrontCover = nonArchived.some((p) => p.pageRole === "front-cover");
  const hasStoryContent = nonArchived.some(
    (p) => p.pageRole === "story-page" || p.pageRole === "story-spread"
  );

  // Audio: storybookNarration with non-archived audioUrl
  const sn = raw.storybookNarration;
  const hasAudio =
    isRecord(sn) &&
    typeof sn.audioUrl === "string" &&
    sn.audioUrl.startsWith("https://") &&
    sn.status !== "archived";

  // Video: storybookVideo with non-archived videoUrl
  const sv = raw.storybookVideo;
  const hasVideo =
    isRecord(sv) &&
    typeof sv.videoUrl === "string" &&
    sv.videoUrl.startsWith("https://") &&
    sv.status !== "archived";

  // ── Required blockers ──────────────────────────────────────────────────────
  const blockers: string[] = [];
  if (!hasTitle) blockers.push("Title is required.");
  if (!hasAbout) blockers.push("About this story is required.");
  if (totalBookImages === 0) blockers.push("At least one book image is required.");

  // ── Recommended warnings (never blocking) ─────────────────────────────────
  const warnings: string[] = [];
  if (!hasFrontCover) warnings.push("Front cover is recommended.");
  if (!hasStoryContent) warnings.push("Story pages or spreads are recommended.");

  if (totalBookImages > 0 && publicBookImages === 0) {
    warnings.push(
      'No book images are set to Approved + Public. Use "Mark all book images Approved + Public" when publishing.'
    );
  }

  if (!hasAudio)
    warnings.push("Audio narration is optional — not yet attached.");
  if (!hasVideo)
    warnings.push("Video/cartoon is optional — not yet attached.");

  const missingCaptions = nonArchived.filter(
    (p) => !p.caption && !p.readAloudText
  ).length;
  const missingAlt = nonArchived.filter((p) => !p.altText).length;
  if (missingCaptions > 0)
    warnings.push(
      `${missingCaptions} page${missingCaptions !== 1 ? "s" : ""} missing captions.`
    );
  if (missingAlt > 0)
    warnings.push(
      `${missingAlt} page${missingAlt !== 1 ? "s" : ""} missing alt text.`
    );

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    stats: {
      totalBookImages,
      publicBookImages,
      draftBookImages,
      hasTitle,
      hasAbout,
      hasFrontCover,
      hasStoryContent,
      hasAudio,
      hasVideo,
    },
  };
}
