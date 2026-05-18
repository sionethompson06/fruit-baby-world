// Video generation context and readiness helpers (Phase 14A).
// Pure data — no fs, no network, no AI calls. Safe in any server context.
// Prepares context for future video clip generation.

import { getActiveEpisodeScenes } from "@/lib/episodeScenes";
import { getVideoGenerationProviderStatus } from "@/lib/videoGenerationConfig";
import type { SceneReferencePackage } from "@/lib/referenceAssetLoader";
import type {
  VideoGenerationReadiness,
  EpisodeVideoGenerationReadiness,
} from "@/lib/videoGenerationTypes";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function sceneHasAnimationPrompt(scene: Record<string, unknown>): boolean {
  return str(scene.animationPromptDraft).length > 0 || str(scene.actionNotes).length > 0;
}

// ─── Scene video generation context ──────────────────────────────────────────

export type SceneVideoGenerationContext = {
  sceneNumber: number;
  sceneId: string;
  title: string;
  animationPrompt: string;
  hasAnimationPrompt: boolean;
  characterSlugs: string[];
  hasCharacterReferences: boolean;
  approvedReferenceCount: number;
};

export function buildSceneVideoGenerationContext(
  scene: Record<string, unknown>,
  refPackage?: SceneReferencePackage
): SceneVideoGenerationContext {
  const sceneNumber = typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
  const animationPrompt =
    str(scene.animationPromptDraft) || str(scene.actionNotes);

  let characterSlugs: string[] = [];
  let hasCharacterReferences = false;
  let approvedReferenceCount = 0;

  if (refPackage) {
    characterSlugs = refPackage.characterSlugs;
    approvedReferenceCount = refPackage.characterPackages.reduce(
      (sum, cp) => sum + cp.totalApprovedCount,
      0
    );
    hasCharacterReferences =
      refPackage.characterPackages.length > 0 &&
      refPackage.characterPackages.some((cp) => cp.totalApprovedCount > 0);
  } else if (Array.isArray(scene.characters)) {
    characterSlugs = (scene.characters as unknown[]).filter(
      (c): c is string => typeof c === "string"
    );
  }

  return {
    sceneNumber,
    sceneId: str(scene.sceneId),
    title: str(scene.title),
    animationPrompt,
    hasAnimationPrompt: animationPrompt.length > 0,
    characterSlugs,
    hasCharacterReferences,
    approvedReferenceCount,
  };
}

// ─── Episode-level readiness ──────────────────────────────────────────────────

export function getVideoGenerationReadinessForEpisode(
  episode: Record<string, unknown>,
  sceneRefPackages: SceneReferencePackage[],
  providerConfigured?: boolean
): EpisodeVideoGenerationReadiness {
  const activeScenes = getActiveEpisodeScenes(episode);
  const providerStatus = getVideoGenerationProviderStatus();
  const isProviderConfigured = providerConfigured ?? providerStatus.configured;

  const episodeSlug = str(episode.slug) || str(episode.id) || "unknown";
  const episodeTitle = str(episode.title) || "Untitled Episode";

  const refByScene = new Map<number, SceneReferencePackage>();
  for (const pkg of sceneRefPackages) {
    refByScene.set(pkg.sceneNumber, pkg);
  }

  const sceneContexts = activeScenes.map((scene) => {
    const num = typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
    return buildSceneVideoGenerationContext(
      isRecord(scene) ? scene : {},
      refByScene.get(num)
    );
  });

  const scenesWithAnimationPrompt = sceneContexts.filter((s) => s.hasAnimationPrompt).length;
  const scenesMissingAnimationPrompt = sceneContexts.length - scenesWithAnimationPrompt;
  const scenesWithCharacterReferences = sceneContexts.filter((s) => s.hasCharacterReferences).length;
  const totalApprovedReferenceAssets = sceneContexts.reduce(
    (sum, s) => sum + s.approvedReferenceCount,
    0
  );

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (activeScenes.length === 0) {
    blockers.push("No active scenes found in this episode.");
  }

  if (!isProviderConfigured) {
    blockers.push("No video generation provider is configured.");
  }

  if (activeScenes.length > 0 && scenesWithAnimationPrompt === 0) {
    warnings.push("No scenes have animation prompts or action notes. Add prompts before generating video.");
  } else if (scenesMissingAnimationPrompt > 0) {
    warnings.push(
      `${scenesMissingAnimationPrompt} scene${scenesMissingAnimationPrompt !== 1 ? "s are" : " is"} missing an animation prompt or action notes.`
    );
  }

  if (activeScenes.length > 0 && scenesWithCharacterReferences === 0) {
    warnings.push("No scenes have approved character reference assets. Video may lack brand fidelity.");
  } else if (
    activeScenes.length > 0 &&
    scenesWithCharacterReferences < activeScenes.length
  ) {
    const missing = activeScenes.length - scenesWithCharacterReferences;
    warnings.push(
      `${missing} scene${missing !== 1 ? "s are" : " is"} missing approved character references.`
    );
  }

  const readyForVideoGeneration =
    blockers.length === 0 &&
    isProviderConfigured &&
    scenesWithAnimationPrompt > 0;

  return {
    episodeSlug,
    episodeTitle,
    readyForVideoGeneration,
    providerConfigured: isProviderConfigured,
    activeScenes: activeScenes.length,
    scenesWithAnimationPrompt,
    scenesMissingAnimationPrompt,
    scenesWithCharacterReferences,
    totalApprovedReferenceAssets,
    warnings,
    blockers,
  };
}
