// Staged pipeline QA and readiness helpers (Phase 18D.14).
// Pure computation — no React, no async, no server-only imports. Client-safe.

export type PipelineStepStatus = "ready" | "missing" | "partial" | "optional" | "warning";

export type CurrentCandidateSource = "none" | "whole-scene" | "assembled" | "harmonized" | "refined";

export type PipelineStepInfo = {
  status: PipelineStepStatus;
  detail: string;
};

export type PipelineCharLayerInfo = PipelineStepInfo & {
  savedCount: number;
  totalCount: number;
};

export type PanelCandidateStatus = {
  source: CurrentCandidateSource;
  label: string;
  isEligibleForSave: boolean;
  isSaved: false;
  isPublic: false;
};

export type StoryPanelPipelineReadiness = {
  plan: PipelineStepInfo;
  background: PipelineStepInfo;
  characterLayers: PipelineCharLayerInfo;
  assemble: PipelineStepInfo;
  harmonize: PipelineStepInfo;
  candidate: PanelCandidateStatus;
  warnings: string[];
  nextStep: string | null;
};

export type PipelineReadinessInput = {
  planStatus: "idle" | "loading" | "ready" | "error";
  planCharacterCount?: number;
  bgSaveStatus: "idle" | "saving" | "saved" | "error";
  totalCharacterLayerPlans: number;
  savedCharacterLayerCount: number;
  assembleStatus: "idle" | "loading" | "done" | "error";
  assembledCharLayerCount: number;
  harmonizeStatus: "idle" | "loading" | "done" | "error";
  currentCandidateSource: CurrentCandidateSource;
};

const CANDIDATE_SOURCE_LABELS: Record<CurrentCandidateSource, string> = {
  none: "None",
  "whole-scene": "Quick Whole-Scene Draft",
  assembled: "Assembled Draft",
  harmonized: "Harmonized Draft",
  refined: "Refined Draft",
};

export function getCurrentPanelCandidateStatus(source: CurrentCandidateSource): PanelCandidateStatus {
  return {
    source,
    label: CANDIDATE_SOURCE_LABELS[source],
    isEligibleForSave: source !== "none",
    isSaved: false,
    isPublic: false,
  };
}

export function buildStoryPanelPipelineReadiness(input: PipelineReadinessInput): StoryPanelPipelineReadiness {
  const {
    planStatus,
    planCharacterCount,
    bgSaveStatus,
    totalCharacterLayerPlans,
    savedCharacterLayerCount,
    assembleStatus,
    assembledCharLayerCount,
    harmonizeStatus,
    currentCandidateSource,
  } = input;

  const warnings: string[] = [];

  // ─── Step 1: Scene Assembly Plan
  const plan: PipelineStepInfo =
    planStatus === "ready"
      ? { status: "ready", detail: `${planCharacterCount ?? 0} character${planCharacterCount !== 1 ? "s" : ""} planned` }
      : planStatus === "loading"
      ? { status: "partial", detail: "Building…" }
      : planStatus === "error"
      ? { status: "warning", detail: "Build failed" }
      : { status: "missing", detail: "Not built yet" };

  // ─── Step 2: Background Layer
  const background: PipelineStepInfo =
    bgSaveStatus === "saved"
      ? { status: "ready", detail: "Saved" }
      : bgSaveStatus === "saving"
      ? { status: "partial", detail: "Saving…" }
      : bgSaveStatus === "error"
      ? { status: "warning", detail: "Save failed" }
      : { status: "missing", detail: "Not saved" };

  // ─── Step 3: Character Layers
  let characterLayers: PipelineCharLayerInfo;
  if (totalCharacterLayerPlans === 0) {
    characterLayers = {
      status: "missing",
      detail: "Build the plan first",
      savedCount: 0,
      totalCount: 0,
    };
  } else if (savedCharacterLayerCount === totalCharacterLayerPlans) {
    characterLayers = {
      status: "ready",
      detail: `${savedCharacterLayerCount} of ${totalCharacterLayerPlans} saved`,
      savedCount: savedCharacterLayerCount,
      totalCount: totalCharacterLayerPlans,
    };
  } else if (savedCharacterLayerCount > 0) {
    const missing = totalCharacterLayerPlans - savedCharacterLayerCount;
    characterLayers = {
      status: "partial",
      detail: `${savedCharacterLayerCount} of ${totalCharacterLayerPlans} saved`,
      savedCount: savedCharacterLayerCount,
      totalCount: totalCharacterLayerPlans,
    };
    warnings.push(
      `${missing} character layer${missing !== 1 ? "s" : ""} not saved — assembled panel will include only saved layers`
    );
  } else {
    characterLayers = {
      status: "missing",
      detail: `0 of ${totalCharacterLayerPlans} saved`,
      savedCount: 0,
      totalCount: totalCharacterLayerPlans,
    };
  }

  // ─── Step 4: Assembled Draft
  let assemble: PipelineStepInfo;
  if (assembleStatus === "done") {
    if (assembledCharLayerCount === 0) {
      assemble = { status: "warning", detail: "Background only — no character layers" };
      warnings.push("Assembled draft contains no character layers — the panel will show background only");
    } else {
      assemble = {
        status: "ready",
        detail: `${assembledCharLayerCount} character layer${assembledCharLayerCount !== 1 ? "s" : ""}`,
      };
    }
  } else if (assembleStatus === "loading") {
    assemble = { status: "partial", detail: "Assembling…" };
  } else if (assembleStatus === "error") {
    assemble = { status: "warning", detail: "Assembly failed" };
  } else {
    assemble = { status: "missing", detail: "Not assembled" };
  }

  // ─── Step 4b: Harmonized Draft
  let harmonize: PipelineStepInfo;
  if (harmonizeStatus === "done") {
    harmonize = { status: "ready", detail: "Harmonization applied" };
  } else if (harmonizeStatus === "loading") {
    harmonize = { status: "partial", detail: "Harmonizing…" };
  } else if (harmonizeStatus === "error") {
    harmonize = { status: "warning", detail: "Failed" };
  } else {
    harmonize = {
      status: "optional",
      detail: assembleStatus === "done" ? "Not run" : "Assemble first",
    };
  }

  // ─── Current candidate
  const candidate = getCurrentPanelCandidateStatus(currentCandidateSource);

  // ─── Recommended next step
  let nextStep: string | null = null;
  if (planStatus !== "ready") {
    nextStep = "Build the Scene Assembly Plan (Step 1)";
  } else if (bgSaveStatus !== "saved") {
    nextStep = "Generate and save a Background Layer (Step 2)";
  } else if (totalCharacterLayerPlans > 0 && savedCharacterLayerCount === 0) {
    nextStep = "Generate and save character layers (Step 3)";
  } else if (assembleStatus !== "done") {
    nextStep = "Assemble the draft panel (Step 4)";
  } else if (currentCandidateSource === "none" || currentCandidateSource === "whole-scene") {
    nextStep =
      harmonizeStatus !== "done"
        ? "Optionally harmonize (Step 4b), then use as panel candidate (Step 5)"
        : "Use the harmonized draft as the panel candidate (Step 5)";
  } else {
    nextStep = null;
  }

  return {
    plan,
    background,
    characterLayers,
    assemble,
    harmonize,
    candidate,
    warnings,
    nextStep,
  };
}

export function getRecommendedNextPipelineStep(input: PipelineReadinessInput): string | null {
  return buildStoryPanelPipelineReadiness(input).nextStep;
}

export function summarizePipelineWarnings(input: PipelineReadinessInput): string[] {
  return buildStoryPanelPipelineReadiness(input).warnings;
}
