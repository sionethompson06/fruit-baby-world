// Episode-level publish readiness helper.
// Pure data — no fs, no network. Takes pre-loaded raw episode JSON + optional context.
// All types are JSON-serializable for passing to server/client components.

import type { Character } from "@/lib/content";
import type { SceneReferencePackage } from "@/lib/referenceAssetLoader";
import {
  getActiveEpisodeScenes,
  getEpisodeScenes,
  isSceneArchived,
} from "@/lib/episodeScenes";
import {
  getAttachedPanelForScene,
  sceneHasApprovedStoryPanel,
  sceneHasPublicStoryPanel,
  getHiddenPanelsForScene,
} from "@/lib/storyPanelCoverage";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReadinessCheckStatus = "pass" | "warning" | "fail";

export type ReadinessCheckItem = {
  id: string;
  label: string;
  status: ReadinessCheckStatus;
  message?: string;
  suggestedAction?: string;
};

export type SceneReadiness = {
  sceneNumber: number;
  sceneId: string;
  title: string;
  characters: string[];
  isArchived: boolean;
  hasPanel: boolean;
  panelIsHidden: boolean;
  panelHasValidUrl: boolean;
  panelHasAltText: boolean;
  panelHasCaption: boolean;
  hasReferencePackage: boolean;
  referencesReady: boolean;
  blockers: string[];
  warnings: string[];
};

export type EpisodePublishReadinessSummary = {
  activeScenes: number;
  archivedScenes: number;
  scenesWithPanels: number;
  scenesMissingPanels: number;
  scenesMissingAltText: number;
  scenesMissingCaptions: number;
  charactersResolved: number;
  charactersMissingReferences: number;
  blockers: number;
  warnings: number;
};

export type EpisodePublishReadiness = {
  episodeSlug: string;
  episodeTitle: string;
  status: "ready" | "needs-work" | "blocked";
  readyToPublish: boolean;
  summary: EpisodePublishReadinessSummary;
  checklist: ReadinessCheckItem[];
  sceneReadiness: SceneReadiness[];
  blockers: string[];
  warnings: string[];
};

export type EpisodePublishReadinessOptions = {
  charBySlug?: Record<string, Character>;
  sceneRefPackages?: SceneReferencePackage[];
};

// ─── Private helpers ──────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidUrl(url: string): boolean {
  return Boolean(url) && (url.startsWith("https://") || url.startsWith("/"));
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return (v as unknown[])
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─── Scene readiness builder ──────────────────────────────────────────────────

function buildSceneReadiness(
  scene: Record<string, unknown>,
  raw: Record<string, unknown>,
  sceneRefPackages: SceneReferencePackage[]
): SceneReadiness {
  const sceneNum =
    typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
  const sceneId = str(scene.sceneId);
  const sceneTitle = str(scene.title);
  const characters = strArr(scene.characters);
  const archived = isSceneArchived(scene);

  const panel = getAttachedPanelForScene(scene, raw);
  const panelIsHidden =
    panel !== undefined &&
    getHiddenPanelsForScene(scene, raw).length > 0 &&
    !sceneHasPublicStoryPanel(scene, raw);
  const hasPanel = sceneHasPublicStoryPanel(scene, raw);
  const asset = panel && isRecord(panel.asset) ? panel.asset : null;
  const assetUrl = asset ? str(asset.url) : "";
  const panelHasValidUrl = hasPanel && isValidUrl(assetUrl);
  const panelHasAltText = hasPanel && Boolean(asset && str(asset.alt));
  const panelHasCaption = hasPanel && Boolean(asset && str(asset.caption));

  const scenePkg = sceneRefPackages.find((p) => p.sceneNumber === sceneNum);
  const hasRefPkg = Boolean(scenePkg && scenePkg.characterPackages.length > 0);
  const refsReady = hasRefPkg
    ? scenePkg!.characterPackages.every((cp) => cp.isGenerationReady)
    : false;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!archived) {
    if (!sceneId) blockers.push("Missing scene ID");
    if (!sceneTitle && !str(scene.summary)) blockers.push("Missing title and summary");
    if (characters.length === 0) blockers.push("No characters assigned");
    if (panelIsHidden) {
      blockers.push("Story panel is hidden from public");
    } else if (!hasPanel) {
      blockers.push("Missing approved story panel");
    } else if (!panelHasValidUrl) {
      blockers.push("Panel has invalid or missing image URL");
    }
    if (hasPanel && !panelHasAltText) warnings.push("Panel missing alt text");
    if (hasPanel && !panelHasCaption) warnings.push("Panel missing caption");
    if (hasRefPkg && !refsReady) warnings.push("Character references not fully approved");
  }

  return {
    sceneNumber: sceneNum,
    sceneId,
    title: sceneTitle,
    characters,
    isArchived: archived,
    hasPanel,
    panelIsHidden,
    panelHasValidUrl,
    panelHasAltText,
    panelHasCaption,
    hasReferencePackage: hasRefPkg,
    referencesReady: refsReady,
    blockers,
    warnings,
  };
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildEpisodePublishReadiness(
  raw: Record<string, unknown>,
  options: EpisodePublishReadinessOptions = {}
): EpisodePublishReadiness {
  const { charBySlug = {}, sceneRefPackages = [] } = options;
  const hasCharRegistry = Object.keys(charBySlug).length > 0;

  const slug = str(raw.slug) || str(raw.id) || "unknown";
  const title = str(raw.title) || "Untitled Episode";

  const allScenes = getEpisodeScenes(raw);
  const activeScenes = getActiveEpisodeScenes(raw);
  const archivedScenes = allScenes.filter(isSceneArchived);

  // ── Per-scene readiness ───────────────────────────────────────────────────
  const sceneReadiness = allScenes.map((s) =>
    buildSceneReadiness(s, raw, sceneRefPackages)
  );
  const activeReadiness = sceneReadiness.filter((s) => !s.isArchived);

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const scenesWithPanels = activeReadiness.filter((s) => s.hasPanel).length;
  const scenesMissingPanels = activeReadiness.filter((s) => !s.hasPanel).length;
  const scenesMissingAlt = activeReadiness.filter(
    (s) => s.hasPanel && !s.panelHasAltText
  ).length;
  const scenesMissingCaptions = activeReadiness.filter(
    (s) => s.hasPanel && !s.panelHasCaption
  ).length;

  // Characters
  const uniqueCharSlugs = new Set<string>();
  for (const s of activeReadiness) {
    for (const c of s.characters) uniqueCharSlugs.add(c);
  }
  const unresolvedChars = hasCharRegistry
    ? [...uniqueCharSlugs].filter(
        (s) => !charBySlug[s] && s !== "tiki-trouble"
      )
    : [];

  // Archived scenes with panels attached
  const archivedWithPanels = sceneReadiness
    .filter((s) => s.isArchived && s.hasPanel)
    .map((s) => `Scene ${s.sceneNumber}`);

  // ── Checklist ─────────────────────────────────────────────────────────────
  const checklist: ReadinessCheckItem[] = [];

  // 1. Episode title
  const hasTitle = Boolean(str(raw.title));
  checklist.push({
    id: "episode-has-title",
    label: "Episode has a title",
    status: hasTitle ? "pass" : "fail",
    message: hasTitle ? undefined : "Episode title is missing.",
    suggestedAction: hasTitle ? undefined : "Add a title to the episode JSON.",
  });

  // 2. Active scenes exist
  checklist.push({
    id: "episode-has-active-scenes",
    label: "Episode has at least one active scene",
    status: activeScenes.length > 0 ? "pass" : "fail",
    message:
      activeScenes.length > 0
        ? `${activeScenes.length} active scene${activeScenes.length !== 1 ? "s" : ""}`
        : "No active scenes found.",
    suggestedAction:
      activeScenes.length === 0
        ? "Add scenes or restore archived ones in the episode admin."
        : undefined,
  });

  // 3. Scene IDs
  const missingIdCount = activeReadiness.filter((s) => !s.sceneId).length;
  checklist.push({
    id: "all-scenes-have-sceneids",
    label: "All active scenes have stable scene IDs",
    status: missingIdCount === 0 ? "pass" : "fail",
    message:
      missingIdCount > 0
        ? `${missingIdCount} scene${missingIdCount !== 1 ? "s" : ""} missing sceneId.`
        : undefined,
    suggestedAction:
      missingIdCount > 0
        ? "Run Scene ID Backfill in the episode admin page."
        : undefined,
  });

  // 4. Scene content (title or summary)
  const missingContentCount = activeReadiness.filter((s) =>
    s.blockers.includes("Missing title and summary")
  ).length;
  checklist.push({
    id: "all-scenes-have-content",
    label: "All active scenes have a title or summary",
    status: missingContentCount === 0 ? "pass" : "fail",
    message:
      missingContentCount > 0
        ? `${missingContentCount} scene${missingContentCount !== 1 ? "s" : ""} missing both title and summary.`
        : undefined,
    suggestedAction:
      missingContentCount > 0
        ? "Edit scenes in the episode admin to add titles or summaries."
        : undefined,
  });

  // 5. Scene characters
  const missingCharsCount = activeReadiness.filter((s) =>
    s.blockers.includes("No characters assigned")
  ).length;
  checklist.push({
    id: "all-scenes-have-characters",
    label: "All active scenes have characters assigned",
    status: missingCharsCount === 0 ? "pass" : "fail",
    message:
      missingCharsCount > 0
        ? `${missingCharsCount} scene${missingCharsCount !== 1 ? "s" : ""} have no characters.`
        : undefined,
    suggestedAction:
      missingCharsCount > 0
        ? "Assign characters to each scene using Edit Scene."
        : undefined,
  });

  // 6. Story panels
  checklist.push({
    id: "all-scenes-have-panels",
    label: "All active scenes have an approved story panel",
    status: scenesMissingPanels === 0 ? "pass" : "fail",
    message:
      scenesMissingPanels > 0
        ? `${scenesMissingPanels} scene${scenesMissingPanels !== 1 ? "s" : ""} missing story panels.`
        : `All ${scenesWithPanels} panel${scenesWithPanels !== 1 ? "s" : ""} attached.`,
    suggestedAction:
      scenesMissingPanels > 0
        ? "Use the Story Panel Prompt Builder or Batch Missing Panel Drafts section to generate and attach panels."
        : undefined,
  });

  // 7. Hidden panels
  const hiddenPanelCount = activeReadiness.filter((s) => s.panelIsHidden).length;
  if (hiddenPanelCount > 0) {
    checklist.push({
      id: "no-hidden-panels",
      label: "No active scenes have hidden story panels",
      status: "fail",
      message: `${hiddenPanelCount} scene${hiddenPanelCount !== 1 ? "s" : ""} ${hiddenPanelCount !== 1 ? "have" : "has"} a story panel hidden from public display.`,
      suggestedAction: "Restore the hidden panel(s) or attach a replacement panel in the Saved Story Panel Assets section.",
    });
  }

  // 8. Valid panel URLs (only non-hidden panels counted above)
  const invalidUrlCount = activeReadiness.filter(
    (s) => s.hasPanel && !s.panelHasValidUrl
  ).length;
  checklist.push({
    id: "all-panels-have-valid-urls",
    label: "All attached panels have valid image URLs",
    status: invalidUrlCount === 0 ? "pass" : "fail",
    message:
      invalidUrlCount > 0
        ? `${invalidUrlCount} panel${invalidUrlCount !== 1 ? "s" : ""} with invalid or missing image URL.`
        : undefined,
    suggestedAction:
      invalidUrlCount > 0 ? "Re-upload the affected story panel images." : undefined,
  });

  // 8. Character registry resolution
  if (hasCharRegistry) {
    checklist.push({
      id: "all-characters-resolve",
      label: "All scene characters are in the character registry",
      status: unresolvedChars.length === 0 ? "pass" : "fail",
      message:
        unresolvedChars.length > 0
          ? `Unknown characters: ${unresolvedChars.join(", ")}.`
          : undefined,
      suggestedAction:
        unresolvedChars.length > 0
          ? "Verify character slugs or add missing characters to the registry."
          : undefined,
    });
  }

  // 9. Alt text (warning)
  checklist.push({
    id: "all-panels-have-alt-text",
    label: "All attached panels have alt text",
    status: scenesMissingAlt === 0 ? "pass" : "warning",
    message:
      scenesMissingAlt > 0
        ? `${scenesMissingAlt} panel${scenesMissingAlt !== 1 ? "s" : ""} missing alt text.`
        : undefined,
    suggestedAction:
      scenesMissingAlt > 0
        ? "Add alt text using Edit Alt Text & Caption in the Saved Story Panel Assets section."
        : undefined,
  });

  // 10. Captions (warning)
  checklist.push({
    id: "all-panels-have-captions",
    label: "Story panels have captions",
    status: scenesMissingCaptions === 0 ? "pass" : "warning",
    message:
      scenesMissingCaptions > 0
        ? `${scenesMissingCaptions} panel${scenesMissingCaptions !== 1 ? "s" : ""} without captions.`
        : undefined,
    suggestedAction:
      scenesMissingCaptions > 0
        ? "Add captions using Edit Alt Text & Caption."
        : undefined,
  });

  // 11. Lesson (warning)
  const hasLesson = Boolean(str(raw.lesson));
  checklist.push({
    id: "episode-has-lesson",
    label: "Episode has a lesson or educational theme",
    status: hasLesson ? "pass" : "warning",
    message: hasLesson ? undefined : "No lesson or educational theme defined.",
    suggestedAction: hasLesson ? undefined : "Add a lesson field to the episode.",
  });

  // 12. Profile sheets (warning, only if charBySlug populated)
  if (hasCharRegistry && uniqueCharSlugs.size > 0) {
    const charsWithoutSheet = [...uniqueCharSlugs].filter((slug) => {
      const char =
        charBySlug[slug] ?? (slug === "tiki-trouble" ? charBySlug["tiki"] : undefined);
      if (!char) return false;
      return !char.image?.profileSheet?.trim();
    });
    checklist.push({
      id: "characters-have-profile-sheets",
      label: "Scene characters have official profile sheets",
      status: charsWithoutSheet.length === 0 ? "pass" : "warning",
      message:
        charsWithoutSheet.length > 0
          ? `${charsWithoutSheet.length} character${charsWithoutSheet.length !== 1 ? "s" : ""} without official profile sheets.`
          : undefined,
      suggestedAction:
        charsWithoutSheet.length > 0
          ? "Upload official profile sheets in Character Studio."
          : undefined,
    });
  }

  // 13. Reference packages (warning, only if sceneRefPackages provided)
  if (sceneRefPackages.length > 0) {
    const unreadyRefScenes = activeReadiness.filter(
      (s) => s.hasReferencePackage && !s.referencesReady
    ).length;
    checklist.push({
      id: "character-references-ready",
      label: "Character reference packages are approved for all scenes",
      status: unreadyRefScenes === 0 ? "pass" : "warning",
      message:
        unreadyRefScenes > 0
          ? `${unreadyRefScenes} scene${unreadyRefScenes !== 1 ? "s" : ""} have characters with no approved references.`
          : undefined,
      suggestedAction:
        unreadyRefScenes > 0
          ? "Upload and approve character references in Character Studio."
          : undefined,
    });
  }

  // 14. Read-aloud / narration text (warning only — audio not required for publish)
  const scenesWithVoiceover = activeReadiness.filter((s) => {
    const scene = allScenes.find(
      (sc) =>
        (typeof sc.sceneNumber === "number" && sc.sceneNumber === s.sceneNumber) ||
        (str(sc.sceneId) && str(sc.sceneId) === s.sceneId)
    );
    if (!scene) return false;
    const voiceoverNotes = Array.isArray(scene.voiceoverNotes)
      ? (scene.voiceoverNotes as unknown[]).filter((x): x is string => typeof x === "string").join(" ").trim()
      : typeof scene.voiceoverNotes === "string" ? (scene.voiceoverNotes as string).trim() : "";
    return voiceoverNotes.length > 0 || Boolean(str(scene.summary));
  }).length;
  const scenesMissingVoiceover = activeReadiness.length - scenesWithVoiceover;
  if (scenesMissingVoiceover > 0 && activeReadiness.length > 0) {
    checklist.push({
      id: "narration-read-aloud-text",
      label: "Scenes have read-aloud text or voiceover notes",
      status: "warning",
      message: `${scenesMissingVoiceover} scene${scenesMissingVoiceover !== 1 ? "s" : ""} missing read-aloud text. Audio narration will not be available for these scenes.`,
      suggestedAction: "Add voiceoverNotes or a summary to scenes before generating narration.",
    });
  }

  // 15. Archived scenes with panels
  if (archivedWithPanels.length > 0) {
    checklist.push({
      id: "archived-scenes-panel-review",
      label: "Archived scenes do not have conflicting panel attachments",
      status: "warning",
      message: `${archivedWithPanels.length} archived scene${archivedWithPanels.length !== 1 ? "s" : ""} still have panels attached: ${archivedWithPanels.join(", ")}.`,
      suggestedAction:
        "Review archived scene panels in Saved Story Panel Assets.",
    });
  }

  // ── Collect final blockers/warnings ───────────────────────────────────────
  const blockers = checklist
    .filter((c) => c.status === "fail")
    .map((c) => c.message || c.label);
  const warnings = checklist
    .filter((c) => c.status === "warning")
    .map((c) => c.message || c.label);

  const readinessStatus: EpisodePublishReadiness["status"] =
    blockers.length > 0 ? "blocked" : warnings.length > 0 ? "needs-work" : "ready";

  return {
    episodeSlug: slug,
    episodeTitle: title,
    status: readinessStatus,
    readyToPublish: blockers.length === 0,
    summary: {
      activeScenes: activeScenes.length,
      archivedScenes: archivedScenes.length,
      scenesWithPanels,
      scenesMissingPanels,
      scenesMissingAltText: scenesMissingAlt,
      scenesMissingCaptions,
      charactersResolved: uniqueCharSlugs.size - unresolvedChars.length,
      charactersMissingReferences: unresolvedChars.length,
      blockers: blockers.length,
      warnings: warnings.length,
    },
    checklist,
    sceneReadiness,
    blockers,
    warnings,
  };
}

// ─── Convenience exports ──────────────────────────────────────────────────────

export function isEpisodePublishReady(r: EpisodePublishReadiness): boolean {
  return r.status === "ready";
}

export function getEpisodePublishBlockers(r: EpisodePublishReadiness): ReadinessCheckItem[] {
  return r.checklist.filter((c) => c.status === "fail");
}

export function getEpisodePublishWarnings(r: EpisodePublishReadiness): ReadinessCheckItem[] {
  return r.checklist.filter((c) => c.status === "warning");
}

export function getEpisodePublishReadinessSummary(
  r: EpisodePublishReadiness
): EpisodePublishReadinessSummary {
  return r.summary;
}
