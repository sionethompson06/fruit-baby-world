// Deterministic AI prompt builder for the Episode Package Generator.
// Client-side only — no API calls. Output is for preview and review before
// a future generation phase activates.

import type { Character } from "@/lib/content";
import type { StoryboardDraft } from "@/lib/storyboard";

// ─── Fidelity rules embedded in every prompt ─────────────────────────────────

const VISUAL_FIDELITY_RULES = [
  "Preserve body shape, silhouette, and proportions exactly.",
  "Preserve eye style, mouth style, and blush/cheek details.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve signature visual features and color palette.",
  "Maintain cute baby-like design language and scale.",
  "Use official uploaded character profile images as the visual source of truth.",
  "Future AI image prompts must be reference-anchored to official character art.",
  "Do not redesign characters or alter their fruit identity.",
  "Do not change defining colors or remove signature features.",
  "Do not make characters older, more realistic, sharper, or off-brand.",
  'Do not create loose "inspired by" versions that drift from official references.',
  "All generated character variations require human approval before publishing.",
];

// ─── Per-character canon summary ──────────────────────────────────────────────

function buildCharacterCanonSummary(c: Character): string {
  const lines: string[] = [];

  lines.push(`## ${c.name} — ${c.role}`);

  const about = c.about ?? c.shortDescription;
  if (about) lines.push(`About: ${about}`);

  lines.push(`Personality: ${c.personality.join(", ")}`);

  if (c.teaches?.length) lines.push(`Teaches: ${c.teaches.join(", ")}`);

  lines.push(`Visual identity: ${c.visualIdentity.styleNotes}`);
  lines.push(`Primary colors: ${c.visualIdentity.primaryColors.join(", ")}`);

  const quote = c.signatureQuote ?? c.favoriteQuote;
  if (quote) lines.push(`Signature quote: "${quote}"`);

  lines.push(`Story role: ${c.storyRole}`);
  lines.push(`Always: ${c.characterRules.always.join("; ")}`);
  lines.push(`Never: ${c.characterRules.never.join("; ")}`);

  if (c.rivalry) lines.push(`Rivalry: ${c.rivalry}`);

  return lines.join("\n");
}

// ─── Main builder ─────────────────────────────────────────────────────────────

export function buildEpisodePrompt(
  draft: StoryboardDraft,
  allCharacters: Character[]
): string {
  const selectedChars = allCharacters.filter((c) =>
    draft.featuredCharacters.includes(c.id)
  );
  const tikiSelected = draft.featuredCharacters.includes("tiki");
  const featuredNames =
    selectedChars.map((c) => c.name).join(", ") || "(none selected)";

  const parts: string[] = [];

  // ── A. Role / task instruction ────────────────────────────────────────────
  parts.push(
    `=== ROLE / TASK ===
You are a children's animated story production assistant for Fruit Baby World — a kid-friendly animated universe featuring cute fruit characters and their adventures.

Your task is to generate a complete, structured episode package from the storyboard input below. The output will be used by the production team to develop scripts, voiceover guides, character visuals, and animation prompts.

All output is a draft. A human must review and approve everything before it is used.`
  );

  // ── B. Source-of-truth rules ──────────────────────────────────────────────
  parts.push(
    `=== SOURCE OF TRUTH ===
- Use the canonical character JSON provided below as the sole source of character facts.
- Do not invent unsupported character traits, backstory, or relationships.
- Use official uploaded character profile images as the visual source of truth for all characters.
- Preserve character identity to very close to the official reference images.
- Do not redesign characters or change their fruit identity.
- All generated character visuals require human approval before use or publishing.`
  );

  // ── C. Storyboard input ───────────────────────────────────────────────────
  const sceneLines = draft.scenes.map((s) => {
    const charNames = s.characters
      .map((id) => allCharacters.find((c) => c.id === id)?.shortName ?? id)
      .join(", ");
    return [
      `  Scene ${s.sceneNumber}: ${s.title || "(untitled)"}`,
      s.summary ? `    Summary: ${s.summary}` : null,
      charNames ? `    Characters: ${charNames}` : null,
      s.visualNotes ? `    Visual notes: ${s.visualNotes}` : null,
      s.emotionalBeat ? `    Emotional beat: ${s.emotionalBeat}` : null,
    ]
      .filter(Boolean)
      .join("\n");
  });

  parts.push(
    `=== STORYBOARD INPUT ===
Title: ${draft.title || "(untitled)"}
Short description: ${draft.shortDescription || "(none)"}
Featured characters: ${featuredNames}
Setting: ${draft.setting || "(none)"}
Lesson / Moral: ${draft.lesson || "(none)"}
Target age range: ${draft.targetAgeRange || "(none)"}
Tone: ${draft.tone || "(none)"}
Story notes: ${draft.storyNotes || "(none)"}

Scenes:
${sceneLines.join("\n\n") || "  (no scenes added yet)"}`
  );

  // ── D. Character canon summaries ──────────────────────────────────────────
  if (selectedChars.length > 0) {
    parts.push(
      `=== CHARACTER CANON SUMMARIES ===\n` +
        selectedChars.map(buildCharacterCanonSummary).join("\n\n")
    );
  } else {
    parts.push(
      `=== CHARACTER CANON SUMMARIES ===
(No characters selected. Select featured characters in the storyboard form to include their canonical summaries here.)`
    );
  }

  // ── E. Character fidelity rules ───────────────────────────────────────────
  parts.push(
    `=== CHARACTER FIDELITY RULES ===\n` +
      VISUAL_FIDELITY_RULES.map((r) => `- ${r}`).join("\n")
  );

  // ── F. Tiki-specific rule ─────────────────────────────────────────────────
  if (tikiSelected) {
    parts.push(
      `=== TIKI TROUBLE — SPECIAL RULES ===
Tiki Trouble is a mischievous rival character, not a genuine threat.
- Keep Tiki funny, dramatic, and over-the-top — never scary or violent.
- Tiki's schemes must always fail in a silly, kid-friendly way.
- Do not make Tiki threatening, horror-like, cruel, or distressing to young audiences.
- Tiki secretly admires Pineapple Baby's kindness — use this for gentle story beats.
- Always preserve Tiki's carved-wood visual identity: brown tones, leaf crown, small spear, skull necklace.`
    );
  }

  // ── G. Desired output format ──────────────────────────────────────────────
  parts.push(
    `=== DESIRED OUTPUT FORMAT ===
Return a complete episode package as structured JSON with these fields:

{
  "episodeSummary": "A 2–3 sentence overview of the episode.",
  "sceneBreakdown": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "summary": "What happens in this scene.",
      "characters": ["character-id"],
      "dialogueDraft": ["Line 1", "Line 2"],
      "voiceoverNotes": "Narrator voice direction for this scene.",
      "imagePromptDraft": "Visual prompt for character reference-anchored image generation.",
      "animationPromptDraft": "Movement, camera, and action description for animation.",
      "characterFidelityNotes": ["Fidelity note per character in scene."]
    }
  ],
  "dialogueDraft": { "status": "draft", "notes": "Overall dialogue notes." },
  "voiceoverNotes": { "status": "draft", "notes": "Overall voiceover direction." },
  "imagePrompts": { "status": "draft", "notes": "Overall image prompt notes." },
  "animationPrompts": { "status": "draft", "notes": "Overall animation direction." },
  "merchTieIns": ["Merchandise idea tied to this episode."],
  "characterFidelityChecklist": ["Fidelity rule per featured character."],
  "approvalNotes": "Notes for the human reviewer."
}`
  );

  // ── H. Safety / brand rules ───────────────────────────────────────────────
  parts.push(
    `=== SAFETY AND BRAND RULES ===
- Keep the entire story completely kid-friendly and emotionally safe.
- Target audience is children ages 2–8. Tone must be warm, positive, and age-appropriate.
- Do not include scary, violent, cruel, or adult content of any kind.
- Do not include content that could distress young children.
- All generated output is a draft. Do not publish automatically.
- A human must review and approve all scripts, visuals, and prompts before use.
- Preserve official character design in all visual descriptions.
- Do not allow generated content to drift from the canonical Fruit Baby World brand.`
  );

  return parts.join("\n\n");
}
