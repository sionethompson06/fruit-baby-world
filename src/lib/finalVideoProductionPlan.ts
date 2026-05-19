// Final video production plan helper.
// Pure data — no rendering, no uploads, no network calls, no fs.
// Derives the production plan from an already-built FinalVideoAssemblyPackage.

import type { FinalVideoAssemblyPackage, FinalVideoAssemblyStatus } from "@/lib/finalVideoTypes";
import {
  buildFinalVideoRenderReadiness,
  type FinalVideoRenderReadiness,
} from "@/lib/finalVideoRenderReadiness";
import { isFinalVideoAsset, type FinalVideoAsset } from "@/lib/finalVideoAssetTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductionSummary = {
  totalSegments: number;
  animatedClipSegments: number;
  storyPanelSegments: number;
  textOnlySegments: number;
  hasNarrationAudio: boolean;
  estimatedDurationSeconds: number;
};

export type FinalVideoProductionPlan = {
  canRenderAndSave: boolean;
  status: FinalVideoAssemblyStatus;
  actionLabel: "Render & Save Final Video";
  disabledReason?: string;
  summary: ProductionSummary;
  warnings: string[];
  blockers: string[];
  futureSteps: string[];
  existingFinalVideo?: FinalVideoAsset;
};

// ─── Future steps ─────────────────────────────────────────────────────────────

function buildFutureSteps(pkg: FinalVideoAssemblyPackage): string[] {
  const clipCount = pkg.segments.filter((s) => s.visualMode === "animated-clip").length;
  const panelCount = pkg.segments.filter((s) => s.visualMode === "story-panel").length;
  const steps = [
    "Render one final story video from all active scenes in order.",
  ];
  if (clipCount > 0) {
    steps.push(`Use public-ready animated clips for ${clipCount} scene${clipCount !== 1 ? "s" : ""}.`);
  }
  if (panelCount > 0) {
    steps.push(`Use story panel images for ${panelCount} scene${panelCount !== 1 ? "s" : ""}.`);
  }
  if (pkg.hasNarrationAudio) {
    steps.push("Include public-ready narration audio as the audio track.");
  }
  steps.push("Include captions or read-aloud text overlaid on each scene.");
  steps.push("Save the rendered MP4 to media storage.");
  steps.push("Attach the final video metadata to the episode JSON (visibility: admin-only).");
  steps.push("Admin marks final video Public Ready when satisfied — no separate approval loop.");
  return steps;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function buildFinalVideoProductionPlan(
  assemblyPackage: FinalVideoAssemblyPackage,
  episode?: Record<string, unknown>
): FinalVideoProductionPlan {
  const readiness: FinalVideoRenderReadiness = buildFinalVideoRenderReadiness(assemblyPackage);
  const { segments } = assemblyPackage;

  const summary: ProductionSummary = {
    totalSegments: segments.length,
    animatedClipSegments: segments.filter((s) => s.visualMode === "animated-clip").length,
    storyPanelSegments: segments.filter((s) => s.visualMode === "story-panel").length,
    textOnlySegments: segments.filter((s) => s.visualMode === "text-only").length,
    hasNarrationAudio: assemblyPackage.hasNarrationAudio,
    estimatedDurationSeconds: assemblyPackage.estimatedDurationSeconds,
  };

  const existingFinalVideo: FinalVideoAsset | undefined =
    episode && isFinalVideoAsset(episode.finalVideo)
      ? (episode.finalVideo as FinalVideoAsset)
      : undefined;

  const futureSteps = buildFutureSteps(assemblyPackage);

  const canRenderAndSave = readiness.status !== "blocked";
  const disabledReason = canRenderAndSave
    ? undefined
    : `Cannot render: ${readiness.blockers.join("; ")}`;

  return {
    canRenderAndSave,
    status: readiness.status,
    actionLabel: "Render & Save Final Video",
    ...(disabledReason ? { disabledReason } : {}),
    summary,
    warnings: readiness.warnings,
    blockers: readiness.blockers,
    futureSteps,
    existingFinalVideo,
  };
}

// ─── Accessors ────────────────────────────────────────────────────────────────

export function getFinalVideoProductionStatus(plan: FinalVideoProductionPlan): FinalVideoAssemblyStatus {
  return plan.status;
}

export function getFinalVideoProductionNextAction(plan: FinalVideoProductionPlan): string {
  if (plan.blockers.length > 0) return "Resolve blockers before rendering.";
  if (!plan.canRenderAndSave) return "Resolve blockers before rendering.";
  return "Render & Save Final Video.";
}

export function getFinalVideoFutureActionSummary(plan: FinalVideoProductionPlan): string {
  const { summary } = plan;
  const durationMin = Math.floor(summary.estimatedDurationSeconds / 60);
  const durationSec = summary.estimatedDurationSeconds % 60;
  const duration = durationMin > 0
    ? `~${durationMin}m ${durationSec}s`
    : `~${summary.estimatedDurationSeconds}s`;
  const audio = summary.hasNarrationAudio ? "narration included" : "no narration";
  return `${summary.totalSegments} scenes — ${audio} — ${duration}`;
}
