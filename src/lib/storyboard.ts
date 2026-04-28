// Types and helpers for the Storyboard Builder and Episode Package Preview.
// Used by /admin/storyboards (client-side only — no saving, no AI).

// ─── Types ────────────────────────────────────────────────────────────────────

export type SceneDraft = {
  id: string;
  sceneNumber: number;
  title: string;
  summary: string;
  characters: string[];
  visualNotes: string;
  emotionalBeat: string;
};

export type StoryboardDraft = {
  title: string;
  shortDescription: string;
  featuredCharacters: string[];
  setting: string;
  lesson: string;
  targetAgeRange: string;
  tone: string;
  storyNotes: string;
  scenes: SceneDraft[];
};

export type EpisodePackageScene = {
  sceneNumber: number;
  title: string;
  summary: string;
  characters: string[];
  visualNotes: string;
  emotionalBeat: string;
  dialogueDraft: string;
  voiceoverNotes: string;
  imagePromptDraft: string;
  animationPromptDraft: string;
  characterFidelityNotes: string[];
};

export type EpisodePackagePreview = {
  id: string;
  slug: string;
  title: string;
  status: "draft";
  productionStatus: "storyboard-draft";
  featuredCharacters: string[];
  shortDescription: string;
  episodeSummary: string;
  lesson: string;
  setting: string;
  targetAgeRange: string;
  tone: string;
  storyNotes: string;
  sceneBreakdown: EpisodePackageScene[];
  dialogueDraft: { status: string; notes: string };
  voiceoverNotes: { status: string; notes: string };
  imagePrompts: { status: string; notes: string };
  animationPrompts: { status: string; notes: string };
  merchTieIns: string[];
  characterFidelityChecklist: string[];
  approval: { status: string; requiresHumanReview: boolean; notes: string };
  createdIn: string;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const BASE_FIDELITY_RULES = [
  "Use canonical character JSON as the source of truth — do not invent traits.",
  "Use official uploaded character profile images for all visual references.",
  "Preserve body shape, silhouette, proportions, and defining features exactly.",
  "Do not redesign characters or alter their fruit identity.",
  "Future AI image prompts must be reference-anchored to official character art.",
  "All generated character variations require human approval before publishing.",
];

const CHARACTER_FIDELITY_NOTES: Record<string, string> = {
  "pineapple-baby":
    "Pineapple Baby should remain kind, warm, encouraging, and visually consistent with the official profile.",
  "ube-baby":
    "Ube Baby should remain dreamy, gentle, cozy, purple/lavender, and emotionally soft.",
  "mango-baby":
    "Mango Baby should remain bright, playful, energetic, mango yellow/orange, and joyful.",
  "coconut-baby":
    "Coconut Baby should remain calm, comforting, dependable, warm brown/cream, and nurturing.",
  "kiwi-baby":
    "Kiwi Baby should remain fresh, gentle, green/brown, nature-loving, and sweet.",
  "tiki":
    "Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly. Do not make him scary, violent, horror-like, or cruel.",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function charFidelityNotes(ids: string[]): string[] {
  return ids.map((id) => CHARACTER_FIDELITY_NOTES[id]).filter(Boolean);
}

export function buildEpisodePackagePreview(draft: StoryboardDraft): EpisodePackagePreview {
  const slug = createSlug(draft.title);

  const sceneBreakdown: EpisodePackageScene[] = draft.scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    title: s.title,
    summary: s.summary,
    characters: s.characters,
    visualNotes: s.visualNotes,
    emotionalBeat: s.emotionalBeat,
    dialogueDraft:
      "Dialogue draft will be generated in a future AI phase after the storyboard is approved.",
    voiceoverNotes:
      "Voiceover notes will be drafted in a future AI generation phase.",
    imagePromptDraft:
      "Future image prompts must use official uploaded character references and preserve character identity exactly to very close to the profile sheets.",
    animationPromptDraft:
      "Future animation prompts will describe movement, camera direction, scene setting, and character actions while preserving official character design.",
    characterFidelityNotes: charFidelityNotes(s.characters),
  }));

  return {
    id: "",
    slug,
    title: draft.title,
    status: "draft",
    productionStatus: "storyboard-draft",
    featuredCharacters: draft.featuredCharacters,
    shortDescription: draft.shortDescription,
    episodeSummary:
      draft.shortDescription ||
      "Episode summary will be expanded in a future generation phase.",
    lesson: draft.lesson,
    setting: draft.setting,
    targetAgeRange: draft.targetAgeRange,
    tone: draft.tone,
    storyNotes: draft.storyNotes,
    sceneBreakdown,
    dialogueDraft: {
      status: "future-generation",
      notes:
        "Dialogue will be drafted in a future AI generation phase after the storyboard is approved.",
    },
    voiceoverNotes: {
      status: "future-generation",
      notes: "Voiceover notes will be drafted in a future AI generation phase.",
    },
    imagePrompts: {
      status: "future-generation",
      notes:
        "Image prompts will be generated later using official character references.",
    },
    animationPrompts: {
      status: "future-generation",
      notes:
        "Animation prompts will be generated later after scene structure is approved.",
    },
    merchTieIns: [],
    characterFidelityChecklist: [
      ...BASE_FIDELITY_RULES,
      ...charFidelityNotes(draft.featuredCharacters),
    ],
    approval: {
      status: "draft",
      requiresHumanReview: true,
      notes:
        "Generated episode packages and character visuals will require human review before publishing.",
    },
    createdIn: "Episode Package Preview",
  };
}
