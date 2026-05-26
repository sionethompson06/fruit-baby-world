// Server-side helper for the /api/generate-episode-package route.
// Handles payload validation, system instruction building, and
// safe response parsing. No API calls here — called from route.ts only.

import type { StoryboardDraft } from "@/lib/storyboard";

// ─── Payload types ─────────────────────────────────────────────────────────────

export type GeneratePayload = {
  storyboardDraft: StoryboardDraft;
  aiPrompt: string;
  selectedCharacters: string[];
};

export type GenerateResult =
  | {
      ok: true;
      status: "generated";
      episodePackage: Record<string, unknown>;
      rawText: string;
      notes: string[];
    }
  | {
      ok: false;
      status: "setup_required" | "validation_error" | "generation_error" | "parse_error";
      message: string;
      rawText?: string;
    };

// ─── Validation ────────────────────────────────────────────────────────────────

export function validatePayload(
  body: unknown
): { valid: true; payload: GeneratePayload } | { valid: false; message: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (!b.storyboardDraft || typeof b.storyboardDraft !== "object") {
    return { valid: false, message: "storyboardDraft is required and must be an object." };
  }
  if (!b.aiPrompt || typeof b.aiPrompt !== "string" || b.aiPrompt.trim().length === 0) {
    return { valid: false, message: "aiPrompt is required and must be a non-empty string." };
  }
  if (b.selectedCharacters !== undefined && !Array.isArray(b.selectedCharacters)) {
    return { valid: false, message: "selectedCharacters must be an array if provided." };
  }

  return {
    valid: true,
    payload: {
      storyboardDraft: b.storyboardDraft as StoryboardDraft,
      aiPrompt: b.aiPrompt as string,
      selectedCharacters: Array.isArray(b.selectedCharacters)
        ? (b.selectedCharacters as string[])
        : [],
    },
  };
}

// ─── System instructions ───────────────────────────────────────────────────────

const BASE_FIDELITY_RULES = `Fruit Baby World uses official trademarked characters. The canonical character JSON files, official uploaded character profile sheets, and approved uploaded reference images are the source of truth.

The AI must not redesign characters.

Generated story, scene, dialogue, image prompt, and animation prompt text must preserve:
- Body shape, silhouette, and proportions exactly
- Eye style, mouth style, and blush/cheek details
- Fruit/body textures, leaf/crown shapes, and accessories
- Signature visual features and color palette
- Cute baby-like design language and scale

The AI may create:
- New story moments and scene descriptions
- Dialogue and voiceover notes
- Image prompt drafts and animation prompt drafts
- Merch tie-in ideas

The AI may NOT:
- Change or invent character identity, traits, or backstory
- Alter defining colors or fruit identity
- Remove signature features or accessories
- Make characters older, realistic, scarier, sharper, or off-brand
- Create loose "inspired by" versions that drift from official references
- Publish anything automatically — human review is always required`;

const TIKI_RULE = `Special rule for Tiki Trouble:
Tiki Trouble is a mischievous rival, not a genuine threat.
- Keep Tiki funny, dramatic, and over-the-top — never scary or violent.
- Tiki's schemes must fail in a silly, kid-friendly way.
- Do not make Tiki threatening, horror-like, cruel, or distressing to young children.
- Tiki secretly admires Pineapple Baby's kindness.
- Always preserve Tiki's carved-wood visual identity: brown tones, leaf crown, small spear, skull necklace.`;

const OUTPUT_SCHEMA = `Return ONLY valid JSON with this exact structure — no markdown, no prose, no code fences:

{
  "episodeSummary": "2–3 sentence overview of the episode.",
  "sceneBreakdown": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "summary": "What happens in this scene.",
      "characters": ["character-id"],
      "dialogueDraft": ["Character: Line of dialogue."],
      "voiceoverNotes": "Narrator direction for this scene.",
      "imagePromptDraft": "Reference-anchored visual prompt for this scene.",
      "animationPromptDraft": "Movement, camera, and action description.",
      "characterFidelityNotes": ["Fidelity note for each character in the scene."]
    }
  ],
  "dialogueDraft": { "status": "draft", "notes": "Overall dialogue notes." },
  "voiceoverNotes": { "status": "draft", "notes": "Overall voiceover direction." },
  "imagePrompts": { "status": "draft", "notes": "Overall image prompt notes." },
  "animationPrompts": { "status": "draft", "notes": "Overall animation direction." },
  "merchTieIns": ["Merchandise idea tied to this episode."],
  "characterFidelityChecklist": ["One fidelity rule per featured character."],
  "approvalNotes": "Notes for the human reviewer before this is published."
}`;

const SAFETY_RULES = `Safety and brand rules:
- Keep the entire story completely kid-friendly and emotionally safe.
- Target audience is children ages 2–8. Tone must be warm, positive, and age-appropriate.
- Do not include scary, violent, cruel, or adult content of any kind.
- All generated output is a draft. Do not instruct anyone to publish automatically.
- A human must review and approve all scripts, visuals, and prompts before use.`;

export function buildSystemInstructions(
  selectedCharacters: string[],
  includeOutputSchema: boolean = true
): string {
  const tikiSelected = selectedCharacters.includes("tiki");

  const parts = [
    "You are a children's animated story production assistant for Fruit Baby World — a kid-friendly animated universe featuring cute fruit characters and their adventures.",
    "Your task is to generate a complete, structured episode package from the storyboard input in the user message.",
    BASE_FIDELITY_RULES,
    ...(tikiSelected ? [TIKI_RULE] : []),
    SAFETY_RULES,
    ...(includeOutputSchema ? [OUTPUT_SCHEMA] : []),
  ];

  return parts.join("\n\n");
}

// ─── Response parser ───────────────────────────────────────────────────────────

export function parseModelResponse(
  rawText: string
): { success: true; episodePackage: Record<string, unknown>; notes: string[] } | { success: false; notes: string[] } {
  const notes: string[] = [];

  // Strip markdown code fences if the model wrapped in them
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    notes.push("Stripped markdown code fences from model response.");
  }

  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;
    return { success: true, episodePackage: parsed, notes };
  } catch {
    notes.push("Model response was not valid JSON. Returning raw text for manual review.");
    return { success: false, notes };
  }
}
