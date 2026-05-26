// Audio narration context and script helpers (Phase 13A).
// Pure data — no fs, no network, no AI calls. Safe in any server context.
// Prepares text context for future narration draft generation.

import { getActiveEpisodeScenes } from "@/lib/episodeScenes";
import { getAudioNarrationProviderStatus } from "@/lib/audioNarrationConfig";
import type { NarrationReadiness } from "@/lib/audioNarrationTypes";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v)) {
    return (v as unknown[]).filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  }
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getSceneReadAloudText(scene: Record<string, unknown>): string {
  const voiceoverNotes = strArr(scene.voiceoverNotes).join(" ").trim();
  if (voiceoverNotes) return voiceoverNotes;
  const dialogueDraft = strArr(scene.dialogueDraft).join("\n").trim();
  if (dialogueDraft) return dialogueDraft;
  const summary = str(scene.summary);
  if (summary) return summary;
  return "";
}

function sceneHasReadAloudText(scene: Record<string, unknown>): boolean {
  return getSceneReadAloudText(scene).length > 0;
}

// ─── Scene narration context ──────────────────────────────────────────────────

export type SceneNarrationContext = {
  sceneNumber: number;
  sceneId: string;
  title: string;
  summary: string;
  characters: string[];
  emotionalBeat: string;
  readAloudText: string;
  hasReadAloudText: boolean;
  dialogue: string[];
  voiceoverNotes: string[];
};

export function buildSceneNarrationContext(
  scene: Record<string, unknown>
): SceneNarrationContext {
  const sceneNumber = typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
  return {
    sceneNumber,
    sceneId: str(scene.sceneId),
    title: str(scene.title),
    summary: str(scene.summary),
    characters: strArr(scene.characters),
    emotionalBeat: str(scene.emotionalBeat),
    readAloudText: getSceneReadAloudText(scene),
    hasReadAloudText: sceneHasReadAloudText(scene),
    dialogue: strArr(scene.dialogueDraft),
    voiceoverNotes: strArr(scene.voiceoverNotes),
  };
}

// ─── Episode narration context ────────────────────────────────────────────────

export type EpisodeNarrationContext = {
  episodeSlug: string;
  episodeTitle: string;
  lesson: string;
  tone: string;
  episodeSummary: string;
  activeSceneCount: number;
  scenes: SceneNarrationContext[];
  scenesWithReadAloudText: number;
  scenesMissingReadAloudText: number;
  hasTopLevelVoiceover: boolean;
  topLevelVoiceoverNotes: string[];
};

export function buildEpisodeNarrationContext(
  episode: Record<string, unknown>
): EpisodeNarrationContext {
  const slug = str(episode.slug) || str(episode.id) || "unknown";
  const title = str(episode.title) || "Untitled Episode";
  const lesson = str(episode.lesson);
  const tone = str(episode.tone);
  const episodeSummary = str(episode.episodeSummary) || str(episode.summary);
  const topLevelVoiceoverNotes = strArr(episode.voiceoverNotes);

  const activeScenes = getActiveEpisodeScenes(episode);
  const sceneContexts = activeScenes.map(buildSceneNarrationContext);
  const withText = sceneContexts.filter((s) => s.hasReadAloudText).length;

  return {
    episodeSlug: slug,
    episodeTitle: title,
    lesson,
    tone,
    episodeSummary,
    activeSceneCount: activeScenes.length,
    scenes: sceneContexts,
    scenesWithReadAloudText: withText,
    scenesMissingReadAloudText: sceneContexts.length - withText,
    hasTopLevelVoiceover: topLevelVoiceoverNotes.length > 0,
    topLevelVoiceoverNotes,
  };
}

// ─── Script draft (text only, no AI) ─────────────────────────────────────────

export type NarrationScriptScene = {
  sceneNumber: number;
  title: string;
  scriptLine: string;
};

export type NarrationScriptDraft = {
  episodeSlug: string;
  episodeTitle: string;
  lesson: string;
  tone: string;
  scenes: NarrationScriptScene[];
  totalScenes: number;
  scenesWithScript: number;
};

export function buildNarrationScriptDraftFromEpisode(
  episode: Record<string, unknown>
): NarrationScriptDraft {
  const ctx = buildEpisodeNarrationContext(episode);
  const scenes: NarrationScriptScene[] = ctx.scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    title: s.title,
    scriptLine: s.readAloudText || `[Scene ${s.sceneNumber}: no script text available]`,
  }));

  return {
    episodeSlug: ctx.episodeSlug,
    episodeTitle: ctx.episodeTitle,
    lesson: ctx.lesson,
    tone: ctx.tone,
    scenes,
    totalScenes: ctx.activeSceneCount,
    scenesWithScript: ctx.scenesWithReadAloudText,
  };
}

// ─── Voice guidance summary ───────────────────────────────────────────────────

const HARDCODED_VOICE_GUIDANCE: Record<string, string> = {
  "pineapple-baby": "Warm, kind, and encouraging — a gentle reassuring voice.",
  "ube-baby": "Gentle, dreamy, and soft — a soothing calm presence.",
  "kiwi-baby": "Cheerful, curious, and sweet — bright and expressive.",
  "coconut-baby": "Calm, comforting, and dependable — steady and warm.",
  "mango-baby": "Playful, energetic, and joyful — enthusiastic and upbeat.",
  "tiki-trouble": "Dramatic, mischievous, and funny — but never scary or cruel.",
};

function getVoiceGuidanceForSlug(slug: string): string | undefined {
  const normalized = slug.toLowerCase().replace(/ /g, "-").trim();
  return HARDCODED_VOICE_GUIDANCE[normalized];
}

export function summarizeVoiceGuidanceForEpisode(
  episode: Record<string, unknown>
): { slug: string; guidance: string }[] {
  const activeScenes = getActiveEpisodeScenes(episode);
  const slugsSeen = new Set<string>();
  const result: { slug: string; guidance: string }[] = [];

  for (const scene of activeScenes) {
    const chars = strArr(scene.characters);
    for (const c of chars) {
      if (slugsSeen.has(c)) continue;
      slugsSeen.add(c);
      const guidance = getVoiceGuidanceForSlug(c);
      if (guidance) result.push({ slug: c, guidance });
    }
  }

  return result;
}

// ─── Narration readiness ──────────────────────────────────────────────────────

export function getNarrationReadinessForEpisode(
  episode: Record<string, unknown>
): NarrationReadiness {
  const ctx = buildEpisodeNarrationContext(episode);
  const providerStatus = getAudioNarrationProviderStatus();
  const voiceGuidance = summarizeVoiceGuidanceForEpisode(episode);

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (ctx.activeSceneCount === 0) {
    blockers.push("No active scenes found in this episode.");
  }

  const scriptAvailable =
    ctx.activeSceneCount > 0 && ctx.scenesWithReadAloudText > 0;

  if (!scriptAvailable && ctx.activeSceneCount > 0) {
    blockers.push("No read-aloud text or voiceover notes found in any active scene.");
  }

  if (ctx.scenesMissingReadAloudText > 0 && ctx.activeSceneCount > 0) {
    warnings.push(
      `${ctx.scenesMissingReadAloudText} scene${ctx.scenesMissingReadAloudText !== 1 ? "s are" : " is"} missing read-aloud text or voiceover notes.`
    );
  }

  if (voiceGuidance.length === 0 && ctx.activeSceneCount > 0) {
    const uniqueChars = new Set<string>();
    for (const s of ctx.scenes) for (const c of s.characters) uniqueChars.add(c);
    if (uniqueChars.size > 0) {
      warnings.push("No character voice guidance found. Voice tone will be generic.");
    }
  }

  if (!ctx.lesson) {
    warnings.push("No lesson or educational theme defined. Narration tone may be unfocused.");
  }

  const scenesWithMoodData = ctx.scenes.filter((s) => s.emotionalBeat).length;
  if (ctx.activeSceneCount > 0 && scenesWithMoodData === 0) {
    warnings.push("No scene emotional beats defined. Scene mood will not be available for narration context.");
  }

  const readyForNarrationDraft =
    blockers.length === 0 && providerStatus.configured;

  return {
    readyForNarrationDraft,
    scriptAvailable,
    activeScenes: ctx.activeSceneCount,
    scenesWithReadAloudText: ctx.scenesWithReadAloudText,
    scenesMissingReadAloudText: ctx.scenesMissingReadAloudText,
    voiceGuidanceAvailable: voiceGuidance.length > 0,
    providerConfigured: providerStatus.configured,
    warnings,
    blockers,
  };
}
