// Final video render readiness helper.
// Pure data — no rendering, no uploads, no network calls, no fs.
// Derives readiness from an already-built FinalVideoAssemblyPackage.

import type { FinalVideoAssemblyPackage, FinalVideoAssemblyStatus } from "@/lib/finalVideoTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RenderIngredientStatus = "ready" | "optional" | "needs-work" | "missing";

export type RenderIngredient = {
  label: string;
  required: boolean;
  status: RenderIngredientStatus;
  message: string;
};

export type FinalVideoRenderReadinessSummary = {
  totalSegments: number;
  animatedClipSegments: number;
  storyPanelSegments: number;
  textOnlySegments: number;
  estimatedDurationSeconds: number;
  hasPublicReadyNarration: boolean;
  captionedSegments: number;
  segmentsMissingCaptions: number;
};

export type FinalVideoRenderReadiness = {
  status: FinalVideoAssemblyStatus;
  readyForFutureRender: boolean;
  summary: FinalVideoRenderReadinessSummary;
  renderIngredients: RenderIngredient[];
  blockers: string[];
  warnings: string[];
  nextActions: string[];
};

// ─── Ingredient builders ──────────────────────────────────────────────────────

function buildScenesIngredient(totalSegments: number): RenderIngredient {
  if (totalSegments === 0) {
    return {
      label: "Story Scenes",
      required: true,
      status: "missing",
      message: "No active scenes. Add scenes to the story before rendering.",
    };
  }
  return {
    label: "Story Scenes",
    required: true,
    status: "ready",
    message: `${totalSegments} active scene${totalSegments !== 1 ? "s" : ""} ready.`,
  };
}

function buildVisualsIngredient(
  total: number,
  clipCount: number,
  panelCount: number,
  textOnlyCount: number
): RenderIngredient {
  if (total === 0) {
    return { label: "Scene Visuals", required: true, status: "missing", message: "No scenes to check." };
  }
  if (textOnlyCount === total) {
    return {
      label: "Scene Visuals",
      required: true,
      status: "missing",
      message: `All ${total} scenes are text-only. At least one public-ready visual is required.`,
    };
  }
  if (textOnlyCount > 0) {
    return {
      label: "Scene Visuals",
      required: true,
      status: "needs-work",
      message: `${textOnlyCount} of ${total} scenes have no public-ready visual (text-only fallback). ${clipCount} animated clip${clipCount !== 1 ? "s" : ""}, ${panelCount} panel${panelCount !== 1 ? "s" : ""}.`,
    };
  }
  const parts: string[] = [];
  if (clipCount > 0) parts.push(`${clipCount} animated clip${clipCount !== 1 ? "s" : ""}`);
  if (panelCount > 0) parts.push(`${panelCount} story panel${panelCount !== 1 ? "s" : ""}`);
  return {
    label: "Scene Visuals",
    required: true,
    status: "ready",
    message: `All ${total} scenes have public-ready visuals (${parts.join(", ")}).`,
  };
}

function buildCaptionsIngredient(captioned: number, missing: number, total: number): RenderIngredient {
  if (total === 0) {
    return { label: "Captions / Read-Aloud Text", required: true, status: "missing", message: "No scenes to check." };
  }
  if (missing === total) {
    return {
      label: "Captions / Read-Aloud Text",
      required: true,
      status: "missing",
      message: "No captions or read-aloud text found for any scene.",
    };
  }
  if (missing > 0) {
    return {
      label: "Captions / Read-Aloud Text",
      required: true,
      status: "needs-work",
      message: `${captioned} of ${total} scenes have captions. ${missing} scene${missing !== 1 ? "s are" : " is"} missing caption text.`,
    };
  }
  return {
    label: "Captions / Read-Aloud Text",
    required: true,
    status: "ready",
    message: `All ${total} scenes have caption or read-aloud text.`,
  };
}

function buildNarrationIngredient(hasNarration: boolean, warnings: string[]): RenderIngredient {
  const adminOnly = warnings.some((w) => w.toLowerCase().includes("not public-ready"));
  if (hasNarration) {
    return {
      label: "Narration Audio",
      required: false,
      status: "ready",
      message: "Public-ready narration audio will be included.",
    };
  }
  if (adminOnly) {
    return {
      label: "Narration Audio",
      required: false,
      status: "needs-work",
      message: "Narration audio is attached but not public-ready. Mark it Public Ready to include it.",
    };
  }
  return {
    label: "Narration Audio",
    required: false,
    status: "missing",
    message: "No public-ready narration audio. The video will be silent.",
  };
}

function buildAnimatedClipsIngredient(clipCount: number, total: number): RenderIngredient {
  if (total === 0) {
    return { label: "Animated Clips", required: false, status: "optional", message: "No scenes to check." };
  }
  if (clipCount === 0) {
    return {
      label: "Animated Clips",
      required: false,
      status: "optional",
      message: "No animated clips. Story panels or text will be used instead.",
    };
  }
  if (clipCount < total) {
    return {
      label: "Animated Clips",
      required: false,
      status: "needs-work",
      message: `${clipCount} of ${total} scenes have animated clips. Remaining scenes will use panels or text fallback.`,
    };
  }
  return {
    label: "Animated Clips",
    required: false,
    status: "ready",
    message: `All ${total} scenes have public-ready animated clips.`,
  };
}

// ─── Next actions ─────────────────────────────────────────────────────────────

function deriveNextActions(
  totalSegments: number,
  textOnlyCount: number,
  hasNarration: boolean,
  missingCaptions: number,
  blockers: string[]
): string[] {
  const actions: string[] = [];
  if (totalSegments === 0) {
    actions.push("Add active scenes to the story.");
    return actions;
  }
  if (blockers.length > 0) {
    actions.push("Resolve all blockers before rendering.");
  }
  if (textOnlyCount > 0) {
    actions.push(`Create or publish story panels or animated clips for ${textOnlyCount} text-only scene${textOnlyCount !== 1 ? "s" : ""}.`);
  }
  if (missingCaptions > 0) {
    actions.push(`Add voiceover notes or captions for ${missingCaptions} scene${missingCaptions !== 1 ? "s" : ""}.`);
  }
  if (!hasNarration) {
    actions.push("Add and approve narration audio (optional but recommended for final video).");
  }
  if (actions.length === 0) {
    actions.push("Episode is render-ready. Rendering will be available in a future phase.");
  }
  return actions;
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildFinalVideoRenderReadiness(
  pkg: FinalVideoAssemblyPackage
): FinalVideoRenderReadiness {
  const { segments, hasNarrationAudio, warnings: pkgWarnings, blockers: pkgBlockers } = pkg;

  const total = segments.length;
  const clipCount = segments.filter((s) => s.visualMode === "animated-clip").length;
  const panelCount = segments.filter((s) => s.visualMode === "story-panel").length;
  const textOnlyCount = segments.filter((s) => s.visualMode === "text-only").length;
  const captionedCount = segments.filter((s) => Boolean(s.captionText)).length;
  const missingCaptionCount = total - captionedCount;

  const summary: FinalVideoRenderReadinessSummary = {
    totalSegments: total,
    animatedClipSegments: clipCount,
    storyPanelSegments: panelCount,
    textOnlySegments: textOnlyCount,
    estimatedDurationSeconds: pkg.estimatedDurationSeconds,
    hasPublicReadyNarration: hasNarrationAudio,
    captionedSegments: captionedCount,
    segmentsMissingCaptions: missingCaptionCount,
  };

  const renderIngredients: RenderIngredient[] = [
    buildScenesIngredient(total),
    buildVisualsIngredient(total, clipCount, panelCount, textOnlyCount),
    buildCaptionsIngredient(captionedCount, missingCaptionCount, total),
    buildNarrationIngredient(hasNarrationAudio, pkgWarnings),
    buildAnimatedClipsIngredient(clipCount, total),
  ];

  // Status: blocked → needs-work → ready
  let status: FinalVideoAssemblyStatus;
  if (
    pkgBlockers.length > 0 ||
    total === 0 ||
    (textOnlyCount === total && total > 0)
  ) {
    status = "blocked";
  } else if (
    textOnlyCount > 0 ||
    !hasNarrationAudio ||
    missingCaptionCount > 0 ||
    pkgWarnings.length > 0
  ) {
    status = "needs-work";
  } else {
    status = "ready";
  }

  const blockers = pkgBlockers.length > 0
    ? [...pkgBlockers]
    : total === 0
    ? ["No active scenes — add scenes to the story before rendering."]
    : textOnlyCount === total
    ? ["No public-ready visuals found for any scene — all scenes are text-only."]
    : [];

  // Episode-level warnings only (per-segment ones are shown in the preview)
  const warnings = pkgWarnings.filter((w) => !w.includes(": "));

  const nextActions = deriveNextActions(total, textOnlyCount, hasNarrationAudio, missingCaptionCount, blockers);

  return {
    status,
    readyForFutureRender: status === "ready",
    summary,
    renderIngredients,
    blockers,
    warnings,
    nextActions,
  };
}

// ─── Label / summary helpers ──────────────────────────────────────────────────

export function getFinalVideoRenderReadinessStatus(
  readiness: FinalVideoRenderReadiness
): FinalVideoAssemblyStatus {
  return readiness.status;
}

export function getFinalVideoRenderReadinessLabel(status: FinalVideoAssemblyStatus): string {
  if (status === "ready") return "Ready";
  if (status === "needs-work") return "Needs Work";
  return "Blocked";
}

export function getFinalVideoRenderReadinessSummary(readiness: FinalVideoRenderReadiness): string {
  const { summary } = readiness;
  const durationMin = Math.floor(summary.estimatedDurationSeconds / 60);
  const durationSec = summary.estimatedDurationSeconds % 60;
  const duration = durationMin > 0 ? `~${durationMin}m ${durationSec}s` : `~${summary.estimatedDurationSeconds}s`;
  const parts: string[] = [];
  if (summary.animatedClipSegments > 0) parts.push(`${summary.animatedClipSegments} animated`);
  if (summary.storyPanelSegments > 0) parts.push(`${summary.storyPanelSegments} panel`);
  if (summary.textOnlySegments > 0) parts.push(`${summary.textOnlySegments} text-only`);
  const visual = parts.join(", ") || "no visuals";
  const audio = summary.hasPublicReadyNarration ? "narration ready" : "no narration";
  return `${summary.totalSegments} scenes (${visual}); ${audio}; ${duration}`;
}

// ─── Future render plan ───────────────────────────────────────────────────────

export function getFutureRenderPlan(pkg: FinalVideoAssemblyPackage): string[] {
  const clipCount = pkg.segments.filter((s) => s.visualMode === "animated-clip").length;
  const panelCount = pkg.segments.filter((s) => s.visualMode === "story-panel").length;

  const plan: string[] = [
    "Render one final story video from all active scenes in order.",
  ];
  if (clipCount > 0) {
    plan.push(`Use public-ready animated clips for ${clipCount} scene${clipCount !== 1 ? "s" : ""}.`);
  }
  if (panelCount > 0) {
    plan.push(`Use story panel images for ${panelCount} scene${panelCount !== 1 ? "s" : ""}.`);
  }
  if (pkg.hasNarrationAudio) {
    plan.push("Include public-ready narration audio as the audio track.");
  } else {
    plan.push("No narration audio — video will be rendered without audio.");
  }
  plan.push("Include captions or read-aloud text from each scene.");
  plan.push("Save the rendered video to media storage.");
  plan.push("Attach the video to the episode (visibility: admin-only by default).");
  plan.push("Admin can then mark the final video Public Ready when satisfied.");
  return plan;
}
