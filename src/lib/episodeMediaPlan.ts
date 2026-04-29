// Pure helper that derives a read-only media production plan from a raw
// saved episode object. Nothing is written — this is planning data only.
// No image or video generation happens here.

// ─── Types ────────────────────────────────────────────────────────────────────

export type PanelPlan = {
  sceneNumber: number;
  panelTitle: string;
  summary: string;
  referenceCharacters: string[];
  imagePromptDraft: string;
  status: "not-started";
  approved: boolean;
  imageAsset: string;
};

export type ClipPlan = {
  sceneNumber: number;
  clipTitle: string;
  summary: string;
  referenceCharacters: string[];
  animationPromptDraft: string;
  durationSeconds: number;
  status: "not-started";
  approved: boolean;
  videoAsset: string;
};

export type MediaPlan = {
  storyPanelMode: {
    status: "not-started";
    description: string;
    panels: PanelPlan[];
  };
  animationMode: {
    status: "not-started";
    description: string;
    clips: ClipPlan[];
  };
  readAloudMode: {
    status: "not-started";
    description: string;
    voiceoverNotes: string;
    captionNotes: string;
  };
  approval: {
    requiresHumanReview: boolean;
    approvedAssetsOnly: boolean;
    status: "planning";
  };
};

// ─── Safe field helpers ───────────────────────────────────────────────────────

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function s(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function sArr(v: unknown): string[] {
  if (Array.isArray(v))
    return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  if (isRec(v)) {
    const inner = v.notes ?? v.text ?? v.content ?? v.value;
    if (typeof inner === "string" && inner.trim()) return [inner.trim()];
  }
  return [];
}

function rArr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isRec);
}

// ─── Scene → panel ───────────────────────────────────────────────────────────

function sceneToPanel(scene: Record<string, unknown>, index: number): PanelPlan {
  const num = typeof scene.sceneNumber === "number" ? scene.sceneNumber : index + 1;
  return {
    sceneNumber: num,
    panelTitle: s(scene.title) || `Scene ${num}`,
    summary: s(scene.summary),
    referenceCharacters: sArr(scene.characters),
    imagePromptDraft: s(scene.imagePromptDraft) || s(scene.visualNotes),
    status: "not-started",
    approved: false,
    imageAsset: "",
  };
}

// ─── Scene → clip ─────────────────────────────────────────────────────────────

function sceneToClip(scene: Record<string, unknown>, index: number): ClipPlan {
  const num = typeof scene.sceneNumber === "number" ? scene.sceneNumber : index + 1;
  return {
    sceneNumber: num,
    clipTitle: s(scene.title) || `Scene ${num}`,
    summary: s(scene.summary),
    referenceCharacters: sArr(scene.characters),
    animationPromptDraft: s(scene.animationPromptDraft),
    durationSeconds: 6,
    status: "not-started",
    approved: false,
    videoAsset: "",
  };
}

// ─── Main derive function ─────────────────────────────────────────────────────

export function deriveMediaPlan(raw: Record<string, unknown>): MediaPlan {
  const scenes = rArr(raw.sceneBreakdown).length > 0
    ? rArr(raw.sceneBreakdown)
    : rArr(raw.scenes);

  const panels = scenes.map(sceneToPanel);
  const clips = scenes.map(sceneToClip);

  // Voiceover notes — may be an object { status, notes } or a string/array
  const voiceoverNotes = sArr(raw.voiceoverNotes).join(" ").trim();

  return {
    storyPanelMode: {
      status: "not-started",
      description: "Still-image story panels for a read-aloud/storybook experience.",
      panels,
    },
    animationMode: {
      status: "not-started",
      description: "Short animated video clips for each approved scene.",
      clips,
    },
    readAloudMode: {
      status: "not-started",
      description: "Narration, captions, and voiceover planning for story playback.",
      voiceoverNotes,
      captionNotes: "",
    },
    approval: {
      requiresHumanReview: true,
      approvedAssetsOnly: true,
      status: "planning",
    },
  };
}
