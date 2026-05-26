// Deterministic helper for the Save-Ready Episode JSON Preview.
// Client-side only — no saving, no API calls. Combines storyboard draft,
// AI-generated package, and local review state into the JSON shape that
// will eventually be committed to GitHub in a future phase.

import type { StoryboardDraft } from "@/lib/storyboard";
import { createSlug } from "@/lib/storyboard";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EpisodeSavePreview = {
  id: string;
  slug: string;
  title: string;
  status: "draft";
  reviewStatus: string;
  productionStatus: "generated-draft";
  featuredCharacters: string[];
  shortDescription: string;
  episodeSummary: string;
  lesson: string;
  setting: string;
  targetAgeRange: string;
  tone: string;
  storyNotes: string;
  sourceStoryboard: {
    title: string;
    shortDescription: string;
    lesson: string;
    setting: string;
    targetAgeRange: string;
    tone: string;
    storyNotes: string;
    scenes: Array<{
      sceneNumber: number;
      title: string;
      summary: string;
      characters: string[];
      visualNotes: string;
      emotionalBeat: string;
    }>;
  };
  sceneBreakdown: unknown[];
  dialogueDraft: unknown;
  voiceoverNotes: unknown;
  imagePromptDrafts: string[];
  animationPromptDrafts: string[];
  merchTieIns: string[];
  characterFidelityChecklist: string[];
  review: {
    status: string;
    notes: string;
    requiresHumanReview: boolean;
    approvedForSave: boolean;
    checkedFidelityItems: string[];
  };
  publishing: {
    publicStatus: "not-published";
    readyForPublicSite: boolean;
  };
  createdIn: "Fruit Baby Story Studio";
  generatedAt: string;
  updatedAt: string;
};

// ─── Internal accessors ───────────────────────────────────────────────────────

function str(obj: Record<string, unknown>, key: string): string {
  const v = obj[key];
  return typeof v === "string" ? v : "";
}

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function strArr(obj: Record<string, unknown>, key: string): string[] {
  const v = obj[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function recArr(obj: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const v = obj[key];
  if (!Array.isArray(v)) return [];
  return v.filter(isRec);
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildEpisodeSavePreview(
  draft: StoryboardDraft,
  genResult: Record<string, unknown>,
  reviewStatus: string,
  reviewNotes: string,
  checkedFidelityItems: string[],
): EpisodeSavePreview {
  const slug = createSlug(draft.title) || "untitled-episode";

  const scenes = recArr(genResult, "sceneBreakdown");
  const imagePromptDrafts = scenes.map((s) => str(s, "imagePromptDraft")).filter(Boolean);
  const animationPromptDrafts = scenes.map((s) => str(s, "animationPromptDraft")).filter(Boolean);

  return {
    id: "",
    slug,
    title: draft.title,
    status: "draft",
    reviewStatus,
    productionStatus: "generated-draft",
    featuredCharacters: draft.featuredCharacters,
    shortDescription: draft.shortDescription,
    episodeSummary: str(genResult, "episodeSummary"),
    lesson: draft.lesson,
    setting: draft.setting,
    targetAgeRange: draft.targetAgeRange,
    tone: draft.tone,
    storyNotes: draft.storyNotes,
    sourceStoryboard: {
      title: draft.title,
      shortDescription: draft.shortDescription,
      lesson: draft.lesson,
      setting: draft.setting,
      targetAgeRange: draft.targetAgeRange,
      tone: draft.tone,
      storyNotes: draft.storyNotes,
      scenes: draft.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        title: s.title,
        summary: s.summary,
        characters: s.characters,
        visualNotes: s.visualNotes,
        emotionalBeat: s.emotionalBeat,
      })),
    },
    sceneBreakdown: scenes,
    dialogueDraft: isRec(genResult.dialogueDraft) ? genResult.dialogueDraft : {},
    voiceoverNotes: isRec(genResult.voiceoverNotes) ? genResult.voiceoverNotes : {},
    imagePromptDrafts,
    animationPromptDrafts,
    merchTieIns: strArr(genResult, "merchTieIns"),
    characterFidelityChecklist: strArr(genResult, "characterFidelityChecklist"),
    review: {
      status: reviewStatus,
      notes: reviewNotes,
      requiresHumanReview: true,
      approvedForSave: reviewStatus === "approved-for-save",
      checkedFidelityItems,
    },
    publishing: {
      publicStatus: "not-published",
      readyForPublicSite: false,
    },
    createdIn: "Fruit Baby Story Studio",
    generatedAt: "",
    updatedAt: "",
  };
}
