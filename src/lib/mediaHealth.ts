// Admin-only media health diagnostics.
// Pure data — no fs, no network calls. Takes pre-loaded data from server loaders.
// All types are JSON-serializable for client component handoff.

import type { Character } from "@/lib/content";
import type { ReferenceAsset } from "@/lib/referenceAssetLoader";
import { getActiveEpisodeScenes, getEpisodeScenes, isSceneArchived } from "@/lib/episodeScenes";
import {
  sceneHasApprovedStoryPanel,
  sceneHasPublicStoryPanel,
  getHiddenPanelsForScene,
} from "@/lib/storyPanelCoverage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthIssue = {
  id: string;
  scope: "character" | "episode" | "scene" | "story-panel" | "reference-asset" | "public-page";
  severity: "info" | "warning" | "blocker";
  title: string;
  message: string;
  characterSlug?: string;
  episodeSlug?: string;
  sceneId?: string;
  assetId?: string;
  suggestedAction?: string;
};

export type CharacterHealthRow = {
  slug: string;
  name: string;
  approvalMode: string;
  isPublic: boolean;
  hasProfileSheet: boolean;
  hasMainImage: boolean;
  supportingRefsCount: number;
  envRefsCount: number;
  hasColorPalette: boolean;
  issueCount: number;
  hasBlocker: boolean;
  hasWarning: boolean;
};

export type EpisodeHealthRow = {
  slug: string;
  title: string;
  publicStatus: string;
  isPublished: boolean;
  activeScenes: number;
  scenesWithPanels: number;
  missingPanels: number;
  missingAltCount: number;
  issueCount: number;
  hasBlocker: boolean;
};

export type RefAssetStats = {
  totalAssets: number;
  needsReviewCount: number;
  missingUrlCount: number;
  unknownCharacterCount: number;
  unsupportedTypeCount: number;
};

export type MediaHealthSummary = {
  totalCharacters: number;
  publicCharacters: number;
  charactersWithMissingProfileSheet: number;
  charactersMissingSupportingRefs: number;
  totalEpisodesChecked: number;
  episodesWithMissingPanels: number;
  totalBlockers: number;
  totalWarnings: number;
};

export type EpisodeRawInput = {
  slug: string;
  title: string;
  readyForPublicSite: boolean;
  publicStatus: string;
  raw: Record<string, unknown>;
};

export type MediaHealthReport = {
  issues: HealthIssue[];
  summary: MediaHealthSummary;
  characterRows: CharacterHealthRow[];
  episodeRows: EpisodeHealthRow[];
  refStats: RefAssetStats;
};

// ─── Private constants & helpers ──────────────────────────────────────────────

const PROFILE_SHEET_TYPES = new Set(["official-profile-reference", "profile-sheet"]);
const MAIN_REF_TYPES = new Set(["isolated-character-reference", "main-character-reference"]);
const ENV_REF_TYPES = new Set([
  "character-environment-reference",
  "environment-reference",
  "home-reference",
]);
const SUPPORTING_TYPES = new Set([
  "supporting-reference",
  "expression-sheet",
  "pose-reference",
  "turnaround-reference",
  "supplemental-reference",
  "other",
]);
const KNOWN_ASSET_TYPES = new Set([
  ...PROFILE_SHEET_TYPES,
  ...MAIN_REF_TYPES,
  ...ENV_REF_TYPES,
  ...SUPPORTING_TYPES,
  "brand-guide",
  "product-reference",
  "scene-style-reference",
]);

function isValidUrl(url: string): boolean {
  return Boolean(url) && (url.startsWith("https://") || url.startsWith("/"));
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isApproved(a: ReferenceAsset): boolean {
  return (
    a.reviewStatus === "approved-for-generation" ||
    a.approvedForGeneration === true ||
    a.generationUseAllowed === true
  );
}

// ─── Character health ─────────────────────────────────────────────────────────

function buildCharacterIssues(
  characters: Character[],
  assetsBySlug: Record<string, ReferenceAsset[]>
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  for (const char of characters) {
    if (char.approvalMode === "archived") continue;
    const slug = char.slug;
    const name = char.name;
    const isPublic = char.approvalMode === "public";
    const isInternal = char.approvalMode === "official-internal";
    const approved = (assetsBySlug[slug] ?? []).filter(isApproved);

    const hasCanonicalSheet = Boolean(char.image?.profileSheet?.trim());
    const hasApprovedSheet = approved.some((a) => PROFILE_SHEET_TYPES.has(a.assetType));
    if (!hasCanonicalSheet && !hasApprovedSheet) {
      issues.push({
        id: `char-${slug}-no-profile-sheet`,
        scope: "character",
        severity: isPublic ? "blocker" : isInternal ? "warning" : "info",
        title: `${name}: No official profile sheet`,
        message: isPublic
          ? `${name} is public but has no official profile sheet. Required before publishing or generating artwork.`
          : `${name} has no official profile sheet. Upload one in Character Studio.`,
        characterSlug: slug,
        suggestedAction: "Upload an official profile sheet in Character Studio",
      });
    }

    const hasMainImage =
      Boolean(char.image?.main?.trim()) && isValidUrl(char.image.main);
    const hasApprovedMain = approved.some((a) => MAIN_REF_TYPES.has(a.assetType));
    if (!hasMainImage && !hasApprovedMain) {
      issues.push({
        id: `char-${slug}-no-main-image`,
        scope: "character",
        severity: isPublic ? "warning" : "info",
        title: `${name}: No main character image`,
        message: `${name} has no main character image defined.`,
        characterSlug: slug,
        suggestedAction:
          "Upload a main reference image or set image.main in the character JSON",
      });
    }

    if (!approved.some((a) => SUPPORTING_TYPES.has(a.assetType))) {
      issues.push({
        id: `char-${slug}-no-supporting-refs`,
        scope: "character",
        severity: isPublic || isInternal ? "warning" : "info",
        title: `${name}: No approved supporting references`,
        message: `${name} has no approved supporting reference assets (expressions, poses, etc.).`,
        characterSlug: slug,
        suggestedAction: "Upload supporting references in Character Studio",
      });
    }

    if (!approved.some((a) => ENV_REF_TYPES.has(a.assetType))) {
      issues.push({
        id: `char-${slug}-no-env-refs`,
        scope: "character",
        severity: "info",
        title: `${name}: No environment/home references`,
        message: `${name} has no approved environment or home references. These help generate accurate scene backgrounds.`,
        characterSlug: slug,
        suggestedAction: "Upload environment/home references in Character Studio",
      });
    }

    const hasColors =
      (char.visualIdentity?.primaryColors?.length ?? 0) > 0 ||
      (char.visualIdentity?.palette?.length ?? 0) > 0;
    if (!hasColors) {
      issues.push({
        id: `char-${slug}-no-color-palette`,
        scope: "character",
        severity: isPublic ? "warning" : "info",
        title: `${name}: No color palette defined`,
        message: `${name} has no color palette in the visual identity section.`,
        characterSlug: slug,
        suggestedAction: "Add primaryColors or palette to the character JSON",
      });
    }

    const hasAlways = (char.characterRules?.always?.length ?? 0) > 0;
    const hasNever = (char.characterRules?.never?.length ?? 0) > 0;
    if (!hasAlways && !hasNever) {
      issues.push({
        id: `char-${slug}-no-character-rules`,
        scope: "character",
        severity: "info",
        title: `${name}: No character rules defined`,
        message: `${name} has no always/never character rules. These guide AI generation fidelity.`,
        characterSlug: slug,
        suggestedAction:
          "Add characterRules.always and characterRules.never to the character JSON",
      });
    }

    if (isPublic && !char.tagline?.trim()) {
      issues.push({
        id: `char-${slug}-no-tagline`,
        scope: "public-page",
        severity: "warning",
        title: `${name}: Missing tagline on public profile`,
        message: `${name} is public but has no tagline. The character profile page will look incomplete.`,
        characterSlug: slug,
        suggestedAction: "Add a tagline to the character JSON",
      });
    }

    if (isPublic && !char.shortDescription?.trim()) {
      issues.push({
        id: `char-${slug}-no-description`,
        scope: "public-page",
        severity: "warning",
        title: `${name}: Missing description on public profile`,
        message: `${name} is public but has no shortDescription.`,
        characterSlug: slug,
        suggestedAction: "Add a shortDescription to the character JSON",
      });
    }
  }

  return issues;
}

// ─── Reference asset health ───────────────────────────────────────────────────

function buildReferenceIssues(
  assets: ReferenceAsset[],
  knownSlugs: Set<string>
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const seenIds = new Map<string, number>();
  let needsReviewCount = 0;

  for (const a of assets) {
    seenIds.set(a.id, (seenIds.get(a.id) ?? 0) + 1);

    if (!a.characterSlug) {
      issues.push({
        id: `ref-${a.id}-no-char-slug`,
        scope: "reference-asset",
        severity: "warning",
        title: `Reference asset missing characterSlug`,
        message: `Asset "${a.title || a.id}" has no characterSlug assigned.`,
        assetId: a.id,
        suggestedAction: "Assign a characterSlug to this reference asset",
      });
    } else if (!knownSlugs.has(a.characterSlug) && a.characterSlug !== "tiki-trouble") {
      issues.push({
        id: `ref-${a.id}-unknown-char`,
        scope: "reference-asset",
        severity: "warning",
        title: `Reference asset: unknown character "${a.characterSlug}"`,
        message: `Asset "${a.title || a.id}" references "${a.characterSlug}" which is not in the character registry.`,
        characterSlug: a.characterSlug,
        assetId: a.id,
        suggestedAction: "Verify the characterSlug or add the character to the registry",
      });
    }

    if (!a.blobUrl) {
      issues.push({
        id: `ref-${a.id}-no-url`,
        scope: "reference-asset",
        severity: "blocker",
        title: `Reference asset has no URL`,
        message: `Asset "${a.title || a.id}" (${a.characterSlug ?? "unknown"}) has no blobUrl.`,
        characterSlug: a.characterSlug,
        assetId: a.id,
        suggestedAction: "Re-upload this asset or remove the broken record",
      });
    } else if (!isValidUrl(a.blobUrl)) {
      issues.push({
        id: `ref-${a.id}-bad-url`,
        scope: "reference-asset",
        severity: "warning",
        title: `Reference asset has malformed URL`,
        message: `Asset "${a.title || a.id}" has an invalid blobUrl: "${a.blobUrl.slice(0, 60)}…"`,
        characterSlug: a.characterSlug,
        assetId: a.id,
        suggestedAction: "Check the blobUrl for this asset",
      });
    }

    if (a.assetType && !KNOWN_ASSET_TYPES.has(a.assetType)) {
      issues.push({
        id: `ref-${a.id}-unknown-type`,
        scope: "reference-asset",
        severity: "info",
        title: `Reference asset has unsupported type: "${a.assetType}"`,
        message: `Asset "${a.title || a.id}" uses type "${a.assetType}" which is not in the supported list.`,
        characterSlug: a.characterSlug,
        assetId: a.id,
        suggestedAction: "Update the assetType to a supported value",
      });
    }

    if (
      a.reviewStatus === "needs-review" ||
      (a.requiresReview === true && a.reviewStatus !== "approved-for-generation")
    ) {
      needsReviewCount++;
    }
  }

  if (needsReviewCount > 0) {
    issues.push({
      id: "ref-assets-needs-review",
      scope: "reference-asset",
      severity: "info",
      title: `${needsReviewCount} reference asset${needsReviewCount !== 1 ? "s" : ""} pending review`,
      message: `${needsReviewCount} reference asset${needsReviewCount !== 1 ? "s" : ""} have "needs-review" status and have not been approved or rejected.`,
      suggestedAction: "Review pending reference assets in Character Studio",
    });
  }

  for (const [id, count] of seenIds.entries()) {
    if (count > 1) {
      issues.push({
        id: `ref-dup-${id}`,
        scope: "reference-asset",
        severity: "warning",
        title: `Duplicate reference asset ID: ${id}`,
        message: `Asset ID "${id}" appears ${count} times in the registry.`,
        assetId: id,
        suggestedAction: "Remove duplicate entries from character-reference-assets.json",
      });
    }
  }

  return issues;
}

// ─── Episode + scene + panel health ──────────────────────────────────────────

function buildEpisodeIssues(
  episode: EpisodeRawInput,
  knownSlugs: Set<string>
): HealthIssue[] {
  const issues: HealthIssue[] = [];
  const { slug: episodeSlug, title: episodeTitle, raw } = episode;
  const isPublished = episode.readyForPublicSite || episode.publicStatus === "published";

  const allScenes = getEpisodeScenes(raw);
  const activeScenes = getActiveEpisodeScenes(raw);

  if (activeScenes.length === 0) {
    issues.push({
      id: `ep-${episodeSlug}-no-active-scenes`,
      scope: "episode",
      severity: "warning",
      title: `"${episodeTitle}": No active scenes`,
      message: `Episode "${episodeTitle}" has no active scenes.`,
      episodeSlug,
      suggestedAction: "Add scenes or restore archived ones",
    });
  }

  if (!str(raw.lesson)) {
    issues.push({
      id: `ep-${episodeSlug}-no-lesson`,
      scope: "episode",
      severity: "info",
      title: `"${episodeTitle}": No lesson defined`,
      message: `Episode "${episodeTitle}" has no lesson or educational theme.`,
      episodeSlug,
      suggestedAction: "Add a lesson field to the episode",
    });
  }

  // Panel-level checks
  const media = isRecord(raw.media) ? raw.media : null;
  const spm = media && isRecord(media.storyPanelMode) ? media.storyPanelMode : null;
  const allPanels = spm && Array.isArray(spm.panels)
    ? (spm.panels as unknown[]).filter(isRecord)
    : [];

  const seenPanelNums = new Map<number, number>();
  for (const panel of allPanels) {
    const pNum = typeof panel.sceneNumber === "number" ? panel.sceneNumber : -1;
    const pId = str(panel.sceneId);
    const panelTitle = str(panel.panelTitle) || `Scene ${pNum}`;
    const asset = isRecord(panel.asset) ? panel.asset : null;
    const assetUrl = asset ? str(asset.url) : "";
    const altText = asset ? str(asset.alt) : "";
    const caption = asset ? str(asset.caption) : "";

    if (!assetUrl || !isValidUrl(assetUrl)) {
      issues.push({
        id: `ep-${episodeSlug}-panel-${pNum}-no-url`,
        scope: "story-panel",
        severity: "blocker",
        title: `"${episodeTitle}" Scene ${pNum}: Panel missing image URL`,
        message: `Story panel "${panelTitle}" has no valid image URL and will not display.`,
        episodeSlug,
        sceneId: pId || undefined,
        suggestedAction: "Re-upload the story panel image for this scene",
      });
    }

    if (assetUrl && !altText) {
      issues.push({
        id: `ep-${episodeSlug}-panel-${pNum}-no-alt`,
        scope: "story-panel",
        severity: "warning",
        title: `"${episodeTitle}" Scene ${pNum}: Panel missing alt text`,
        message: `Story panel "${panelTitle}" has no alt text. This affects accessibility.`,
        episodeSlug,
        sceneId: pId || undefined,
        suggestedAction: "Add alt text to the story panel",
      });
    }

    if (assetUrl && !caption) {
      issues.push({
        id: `ep-${episodeSlug}-panel-${pNum}-no-caption`,
        scope: "story-panel",
        severity: "info",
        title: `"${episodeTitle}" Scene ${pNum}: Panel missing caption`,
        message: `Story panel "${panelTitle}" has no caption.`,
        episodeSlug,
        sceneId: pId || undefined,
        suggestedAction: "Add a caption to the story panel",
      });
    }

    if (pNum > 0) seenPanelNums.set(pNum, (seenPanelNums.get(pNum) ?? 0) + 1);

    const matchingScene = allScenes.find(
      (s) =>
        (pId && str(s.sceneId) === pId) ||
        (pNum > 0 && typeof s.sceneNumber === "number" && s.sceneNumber === pNum)
    );
    if (matchingScene && isSceneArchived(matchingScene)) {
      issues.push({
        id: `ep-${episodeSlug}-panel-${pNum}-archived-scene`,
        scope: "story-panel",
        severity: "warning",
        title: `"${episodeTitle}" Scene ${pNum}: Panel attached to archived scene`,
        message: `Story panel "${panelTitle}" is attached to a scene that has been archived.`,
        episodeSlug,
        sceneId: pId || undefined,
        suggestedAction: "Detach this panel or restore the scene",
      });
    }
  }

  for (const [sceneNum, count] of seenPanelNums.entries()) {
    if (count > 1) {
      issues.push({
        id: `ep-${episodeSlug}-panel-dup-${sceneNum}`,
        scope: "story-panel",
        severity: "warning",
        title: `"${episodeTitle}": Duplicate panels for Scene ${sceneNum}`,
        message: `Scene ${sceneNum} has ${count} panels assigned. Only one panel should be attached per scene.`,
        episodeSlug,
        suggestedAction: "Remove duplicate panel assignments",
      });
    }
  }

  // Scene-level checks
  for (const scene of activeScenes) {
    const sceneNum =
      typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
    const sceneId = str(scene.sceneId);
    const sceneTitle = str(scene.title) || `Scene ${sceneNum}`;
    const characters = Array.isArray(scene.characters)
      ? (scene.characters as unknown[]).filter(
          (x): x is string => typeof x === "string"
        )
      : [];

    if (!sceneId) {
      issues.push({
        id: `ep-${episodeSlug}-scene-${sceneNum}-no-id`,
        scope: "scene",
        severity: "warning",
        title: `"${episodeTitle}" Scene ${sceneNum}: Missing scene ID`,
        message: `Scene "${sceneTitle}" has no sceneId. Scene IDs are needed for stable panel attachment.`,
        episodeSlug,
        suggestedAction: "Run Scene ID Backfill in the episode admin page",
      });
    }

    if (!str(scene.title)) {
      issues.push({
        id: `ep-${episodeSlug}-scene-${sceneNum}-no-title`,
        scope: "scene",
        severity: "info",
        title: `"${episodeTitle}" Scene ${sceneNum}: Missing title`,
        message: `Scene ${sceneNum} has no title.`,
        episodeSlug,
        sceneId: sceneId || undefined,
      });
    }

    if (!str(scene.summary)) {
      issues.push({
        id: `ep-${episodeSlug}-scene-${sceneNum}-no-summary`,
        scope: "scene",
        severity: "info",
        title: `"${episodeTitle}" Scene ${sceneNum}: Missing summary`,
        message: `Scene "${sceneTitle}" has no summary.`,
        episodeSlug,
        sceneId: sceneId || undefined,
      });
    }

    if (characters.length === 0) {
      issues.push({
        id: `ep-${episodeSlug}-scene-${sceneNum}-no-chars`,
        scope: "scene",
        severity: "warning",
        title: `"${episodeTitle}" Scene ${sceneNum}: No characters assigned`,
        message: `Scene "${sceneTitle}" has no characters listed.`,
        episodeSlug,
        sceneId: sceneId || undefined,
        suggestedAction: "Assign characters to this scene",
      });
    }

    for (const charSlug of characters) {
      if (!knownSlugs.has(charSlug) && charSlug !== "tiki-trouble") {
        issues.push({
          id: `ep-${episodeSlug}-scene-${sceneNum}-unknown-char-${charSlug}`,
          scope: "scene",
          severity: "info",
          title: `"${episodeTitle}" Scene ${sceneNum}: Unknown character "${charSlug}"`,
          message: `Scene "${sceneTitle}" references "${charSlug}" which is not in the character registry.`,
          episodeSlug,
          characterSlug: charSlug,
          sceneId: sceneId || undefined,
          suggestedAction: "Verify the character slug or add the character",
        });
      }
    }

    const hiddenPanels = getHiddenPanelsForScene(scene, raw);
    const hasPublicPanel = sceneHasPublicStoryPanel(scene, raw);
    const hasAnyPanel = sceneHasApprovedStoryPanel(scene, raw) || hiddenPanels.length > 0;

    if (hiddenPanels.length > 0 && !hasPublicPanel) {
      issues.push({
        id: `ep-${episodeSlug}-scene-${sceneNum}-panel-hidden`,
        scope: "story-panel",
        severity: "warning",
        title: `"${episodeTitle}" Scene ${sceneNum}: Story panel is hidden`,
        message: `Scene ${sceneNum} (${sceneTitle}) has a story panel that is hidden from public display. The scene will appear without a panel.`,
        episodeSlug,
        sceneId: sceneId || undefined,
        suggestedAction: "Restore the panel or attach a new one in Saved Story Panel Assets",
      });
    } else if (!hasAnyPanel) {
      issues.push({
        id: `ep-${episodeSlug}-scene-${sceneNum}-no-panel`,
        scope: "story-panel",
        severity: isPublished ? "blocker" : "warning",
        title: `"${episodeTitle}" Scene ${sceneNum}: Missing approved story panel`,
        message: isPublished
          ? `Published episode "${episodeTitle}" Scene ${sceneNum} (${sceneTitle}) has no approved panel. This may affect public display.`
          : `Scene ${sceneNum} (${sceneTitle}) has no approved story panel yet.`,
        episodeSlug,
        sceneId: sceneId || undefined,
        suggestedAction: "Generate and attach a story panel for this scene",
      });
    }
  }

  return issues;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildMediaHealthReport(
  characters: Character[],
  referenceAssets: ReferenceAsset[],
  episodes: EpisodeRawInput[]
): MediaHealthReport {
  const knownSlugs = new Set(characters.map((c) => c.slug));
  const nonArchived = characters.filter((c) => c.approvalMode !== "archived");

  const assetsBySlug: Record<string, ReferenceAsset[]> = {};
  for (const a of referenceAssets) {
    if (!a.characterSlug) continue;
    if (!assetsBySlug[a.characterSlug]) assetsBySlug[a.characterSlug] = [];
    assetsBySlug[a.characterSlug].push(a);
  }

  const charIssues = buildCharacterIssues(nonArchived, assetsBySlug);
  const refIssues = buildReferenceIssues(referenceAssets, knownSlugs);
  const epIssues = episodes.flatMap((ep) => buildEpisodeIssues(ep, knownSlugs));
  const allIssues = [...charIssues, ...refIssues, ...epIssues];

  // ── Character rows ────────────────────────────────────────────────────────
  const characterRows: CharacterHealthRow[] = nonArchived.map((char) => {
    const slug = char.slug;
    const approved = (assetsBySlug[slug] ?? []).filter(isApproved);
    const hasProfileSheet =
      Boolean(char.image?.profileSheet?.trim()) ||
      approved.some((a) => PROFILE_SHEET_TYPES.has(a.assetType));
    const hasMainImage =
      (Boolean(char.image?.main?.trim()) && isValidUrl(char.image.main)) ||
      approved.some((a) => MAIN_REF_TYPES.has(a.assetType));
    const supportingCount = approved.filter((a) =>
      SUPPORTING_TYPES.has(a.assetType)
    ).length;
    const envCount = approved.filter((a) => ENV_REF_TYPES.has(a.assetType)).length;
    const hasColors =
      (char.visualIdentity?.primaryColors?.length ?? 0) > 0 ||
      (char.visualIdentity?.palette?.length ?? 0) > 0;
    const charIssueList = allIssues.filter((i) => i.characterSlug === slug);
    return {
      slug,
      name: char.name,
      approvalMode: char.approvalMode ?? "draft",
      isPublic: char.approvalMode === "public",
      hasProfileSheet,
      hasMainImage,
      supportingRefsCount: supportingCount,
      envRefsCount: envCount,
      hasColorPalette: hasColors,
      issueCount: charIssueList.length,
      hasBlocker: charIssueList.some((i) => i.severity === "blocker"),
      hasWarning: charIssueList.some((i) => i.severity === "warning"),
    };
  });

  // ── Episode rows ──────────────────────────────────────────────────────────
  const episodeRows: EpisodeHealthRow[] = episodes.map((ep) => {
    const activeScenes = getActiveEpisodeScenes(ep.raw);
    const scenesWithPanels = activeScenes.filter((s) =>
      sceneHasPublicStoryPanel(s, ep.raw)
    ).length;

    const media = isRecord(ep.raw.media) ? ep.raw.media : null;
    const spm =
      media && isRecord(media.storyPanelMode) ? media.storyPanelMode : null;
    const panels =
      spm && Array.isArray(spm.panels)
        ? (spm.panels as unknown[]).filter(isRecord)
        : [];
    const missingAltCount = panels.filter((p) => {
      const asset = isRecord(p.asset) ? p.asset : null;
      const url = asset ? str(asset.url) : "";
      const alt = asset ? str(asset.alt) : "";
      return url && !alt;
    }).length;

    const epIssueList = allIssues.filter((i) => i.episodeSlug === ep.slug);
    return {
      slug: ep.slug,
      title: ep.title,
      publicStatus: ep.publicStatus,
      isPublished: ep.readyForPublicSite || ep.publicStatus === "published",
      activeScenes: activeScenes.length,
      scenesWithPanels,
      missingPanels: activeScenes.length - scenesWithPanels,
      missingAltCount,
      issueCount: epIssueList.length,
      hasBlocker: epIssueList.some((i) => i.severity === "blocker"),
    };
  });

  // ── Ref stats ─────────────────────────────────────────────────────────────
  const refStats: RefAssetStats = {
    totalAssets: referenceAssets.length,
    needsReviewCount: referenceAssets.filter(
      (a) =>
        a.reviewStatus === "needs-review" ||
        (a.requiresReview === true &&
          a.reviewStatus !== "approved-for-generation")
    ).length,
    missingUrlCount: referenceAssets.filter((a) => !a.blobUrl).length,
    unknownCharacterCount: referenceAssets.filter(
      (a) =>
        a.characterSlug &&
        !knownSlugs.has(a.characterSlug) &&
        a.characterSlug !== "tiki-trouble"
    ).length,
    unsupportedTypeCount: referenceAssets.filter(
      (a) => a.assetType && !KNOWN_ASSET_TYPES.has(a.assetType)
    ).length,
  };

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalBlockers = allIssues.filter((i) => i.severity === "blocker").length;
  const totalWarnings = allIssues.filter((i) => i.severity === "warning").length;
  const publicChars = nonArchived.filter((c) => c.approvalMode === "public");
  const missingProfileSheets = characterRows.filter((r) => !r.hasProfileSheet).length;
  const missingSupportingRefs = characterRows.filter(
    (r) => r.supportingRefsCount === 0
  ).length;
  const episodesWithMissingPanels = episodeRows.filter(
    (r) => r.missingPanels > 0
  ).length;

  return {
    issues: allIssues,
    summary: {
      totalCharacters: nonArchived.length,
      publicCharacters: publicChars.length,
      charactersWithMissingProfileSheet: missingProfileSheets,
      charactersMissingSupportingRefs: missingSupportingRefs,
      totalEpisodesChecked: episodes.length,
      episodesWithMissingPanels,
      totalBlockers,
      totalWarnings,
    },
    characterRows,
    episodeRows,
    refStats,
  };
}
