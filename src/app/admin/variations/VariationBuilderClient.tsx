"use client";

import { useState } from "react";
import Link from "next/link";
import type { Character } from "@/lib/content";

// ─── Character-specific variation rules ──────────────────────────────────────

const CHARACTER_VARIATION_RULES: Record<string, string[]> = {
  "pineapple-baby": [
    "Preserve sunny yellow/golden body, green leafy crown, warm friendly face, rounded baby-like shape, and kind expression.",
    "Keep Pineapple Baby warm, encouraging, and heart-centered.",
  ],
  "ube-baby": [
    "Preserve purple/lavender ube identity, gentle dreamy expression, cozy magical feeling, and rounded baby-like shape.",
    "Keep Ube Baby soft, calm, dreamy, and comforting.",
  ],
  "kiwi-baby": [
    "Preserve fuzzy kiwi-brown body, green kiwi top, leaf crown, white blossom accent, warm eyes, blush, and sweet smile.",
    "Keep Kiwi Baby fresh, gentle, curious, and nature-loving.",
  ],
  "coconut-baby": [
    "Preserve warm coconut-brown and cream identity, calm comforting expression, and rounded baby-like shape.",
    "Keep Coconut Baby dependable, nurturing, cozy, and peaceful.",
  ],
  "mango-baby": [
    "Preserve mango yellow/orange identity, playful joyful expression, tropical green leaf accents, and energetic baby-like personality.",
    "Keep Mango Baby bright, cheerful, silly, and full of tropical energy.",
  ],
  tiki: [
    "Preserve carved wooden tiki body, leafy green crown, orange/red band, and mischievous kid-friendly expression.",
    "Keep Tiki funny, dramatic, sneaky, and kid-friendly.",
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
    "Tiki should feel like a mischievous rival, not a villain.",
  ],
};

const GLOBAL_FIDELITY_RULES = [
  "Preserve official body shape and silhouette.",
  "Preserve proportions — do not make the character taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve cute baby-like design language throughout.",
  "Do not redesign the character — no new features, altered silhouettes, or style changes.",
  "Do not create a generic fruit mascot.",
  "Do not create a loose \"inspired by\" version.",
];

const VARIATION_PURPOSES = [
  "Story scene",
  "Episode artwork",
  "Product concept",
  "Promotional artwork",
  "Educational activity",
  "Character expression sheet",
  "Other",
];

const EXPRESSIONS = [
  "happy",
  "curious",
  "surprised",
  "thoughtful",
  "brave",
  "cozy",
  "silly",
  "gentle",
  "mischievous",
];

const INTENDED_USES = [
  "Internal draft",
  "Story panel planning",
  "Animation planning",
  "Product concept planning",
  "Promotional planning",
];

const FUTURE_WORKFLOW_STEPS = [
  "Build variation prompt (this tool).",
  "Generate image in future admin-only phase.",
  "Review character fidelity against official references.",
  "Mark draft approved or needs revision.",
  "Save approved asset.",
  "Use only approved asset publicly.",
];

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildVariationPrompt(
  character: Character,
  purpose: string,
  pose: string,
  expression: string,
  scene: string,
  storyContext: string,
  intendedUse: string,
  notes: string
): string {
  const charRules = CHARACTER_VARIATION_RULES[character.id] ?? [];
  const isTiki = character.type === "villain";

  const lines: string[] = [];

  lines.push("A. TASK");
  lines.push(
    `Create a reference-anchored visual variation of ${character.name}${purpose ? ` for ${purpose.toLowerCase()}` : ""}.`
  );
  lines.push("");

  lines.push("B. POSE / SCENE / EXPRESSION");
  if (pose) lines.push(`Pose / Action: ${pose}`);
  if (expression) lines.push(`Expression / Mood: ${expression}`);
  if (scene) lines.push(`Scene / Background: ${scene}`);
  if (storyContext) lines.push(`Story Context: ${storyContext}`);
  if (intendedUse) lines.push(`Intended Use: ${intendedUse.toLowerCase()}`);
  if (notes) lines.push(`Additional Notes: ${notes}`);
  if (!pose && !expression && !scene && !storyContext && !intendedUse && !notes) {
    lines.push("(Fill in the form fields to add pose, expression, scene, and context.)");
  }
  lines.push("");

  lines.push("C. REQUIRED REFERENCE");
  lines.push(
    "Use the official uploaded character profile image and approved reference images as the visual source of truth."
  );
  lines.push("Do not proceed without official references loaded.");
  lines.push("");

  lines.push("D. CHARACTER-SPECIFIC FIDELITY RULES");
  charRules.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  lines.push("E. GLOBAL FIDELITY RULES");
  GLOBAL_FIDELITY_RULES.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  lines.push("F. SAFETY AND BRAND RULES");
  const safetyRules = [
    "Keep kid-friendly throughout.",
    "Keep warm and playful.",
    "No scary, violent, cruel, realistic, harsh, or off-brand styling.",
    "No adult themes.",
    "Do not publish without admin approval.",
  ];
  if (isTiki) {
    safetyRules.push(
      "Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly — never scary, violent, horror-like, or too intense."
    );
  }
  safetyRules.forEach((rule) => lines.push(`• ${rule}`));
  lines.push("");

  lines.push("G. OUTPUT REMINDER");
  lines.push(
    `Create a new pose or scene, not a new character design. The character must be immediately recognizable as the official ${character.name}.`
  );

  return lines.join("\n");
}

// ─── Form field components ────────────────────────────────────────────────────

function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
      {children}
    </p>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50"
      >
        <option value="">{placeholder ?? `— choose —`}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <FormLabel>{label}</FormLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30 resize-none"
      />
    </div>
  );
}

// ─── Character reference mini-card ───────────────────────────────────────────

function CharacterReferenceCard({ character }: { character: Character }) {
  const hasMain = Boolean(character.image.main);
  const hasProfileSheet = Boolean(character.image.profileSheet);
  const isTiki = character.type === "villain";

  return (
    <div
      className={`border rounded-2xl overflow-hidden ${
        isTiki ? "border-warm-coral/25 bg-warm-coral/4" : "border-pineapple-yellow/30 bg-pineapple-yellow/5"
      }`}
    >
      <div className="px-5 py-4 border-b border-tiki-brown/8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-base font-black text-tiki-brown">{character.name}</p>
            {character.role && (
              <p className="text-xs text-tiki-brown/55">{character.role}</p>
            )}
          </div>
          <Link
            href={`/characters/${character.slug}`}
            className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors whitespace-nowrap"
          >
            Public Profile →
          </Link>
        </div>
        {character.tagline && (
          <p className="text-xs italic text-tiki-brown/45 mt-1.5">"{character.tagline}"</p>
        )}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Profile sheet — full, not cropped */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-2">
            Official Profile Sheet
          </p>
          {hasProfileSheet ? (
            <div className="bg-bg-cream border border-tiki-brown/10 rounded-xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.image.profileSheet!}
                alt={character.image.alt}
                className="w-full max-h-80 object-contain"
              />
            </div>
          ) : (
            <div className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl h-28 flex flex-col items-center justify-center gap-1.5">
              <span className="text-xl opacity-30 select-none">🖼️</span>
              <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide">
                Profile sheet not added yet
              </p>
            </div>
          )}
        </div>

        {/* Main image — if available */}
        {hasMain && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-2">
              Isolated Main Image
            </p>
            <div className="bg-bg-cream border border-tiki-brown/10 rounded-xl p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={character.image.main}
                alt={character.image.alt}
                className="w-full max-h-48 object-contain"
              />
            </div>
          </div>
        )}

        {/* Key data */}
        {character.shortDescription && (
          <p className="text-sm text-tiki-brown/65 leading-relaxed">{character.shortDescription}</p>
        )}

        {character.personality?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {character.personality.map((trait) => (
              <span
                key={trait}
                className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
              >
                {trait}
              </span>
            ))}
          </div>
        )}

        {/* Visual identity */}
        {character.visualIdentity?.styleNotes && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-1">
              Visual Identity
            </p>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              {character.visualIdentity.styleNotes}
            </p>
          </div>
        )}

        {/* Asset status */}
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              ["Profile Sheet", hasProfileSheet ? "Available ✓" : "Missing"],
              ["Main Image", hasMain ? "Available ✓" : "Missing"],
              ["Character JSON", "Available ✓"],
              ["Reference Ready", hasProfileSheet ? "Yes ✓" : "No — sheet needed"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="bg-tiki-brown/4 rounded-lg px-3 py-1.5">
              <p className="text-xs font-bold text-tiki-brown/40 uppercase leading-none mb-0.5">
                {label}
              </p>
              <p
                className={`text-xs font-bold ${
                  value.includes("✓") ? "text-tropical-green" : "text-warm-coral/60"
                }`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Tiki warning */}
        {isTiki && (
          <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">⚡</span>
            <p className="text-xs text-tiki-brown/70 leading-relaxed">
              <strong className="font-bold">Tiki Trouble guardrail:</strong> Must remain
              mischievous, funny, dramatic, and kid-friendly. Do not make Tiki scary, violent,
              horror-like, cruel, evil, or too intense.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function VariationBuilderClient({ characters }: { characters: Character[] }) {
  const [characterId, setCharacterId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [pose, setPose] = useState("");
  const [expression, setExpression] = useState("");
  const [scene, setScene] = useState("");
  const [storyContext, setStoryContext] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [notes, setNotes] = useState("");

  const character = characters.find((c) => c.id === characterId) ?? null;
  const isTiki = character?.type === "villain";

  const prompt = character
    ? buildVariationPrompt(character, purpose, pose, expression, scene, storyContext, intendedUse, notes)
    : "";

  return (
    <div className="flex flex-col gap-6">

      {/* Link to character library */}
      <div className="flex items-start gap-3 bg-white border border-tiki-brown/10 rounded-2xl px-5 py-4 shadow-sm">
        <span className="text-xl flex-shrink-0">📚</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Before building a variation prompt, review the official character data and profile sheets.{" "}
          <Link
            href="/admin/characters"
            className="font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            Review Character Reference Library →
          </Link>
        </p>
      </div>

      {/* Character selector */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-black text-tiki-brown mb-1">
            1. Select Character
          </h2>
          <p className="text-sm text-tiki-brown/55 leading-relaxed">
            Choose the official character to build a variation prompt for.
          </p>
        </div>
        <select
          value={characterId}
          onChange={(e) => setCharacterId(e.target.value)}
          className="w-full text-sm font-semibold text-tiki-brown bg-bg-cream border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/50"
        >
          <option value="">— Select a character —</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.type === "villain" ? " (Rival)" : " (Fruit Baby)"}
            </option>
          ))}
        </select>

        {character && (
          <CharacterReferenceCard character={character} />
        )}

        {!character && (
          <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
            <p className="text-sm text-tiki-brown/40 italic">
              Select a character to see their official reference data.
            </p>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
        <div>
          <h2 className="text-base font-black text-tiki-brown mb-1">
            2. Describe the Variation
          </h2>
          <p className="text-sm text-tiki-brown/55 leading-relaxed">
            Fill in as many fields as needed. All fields are optional — the prompt updates
            automatically.
          </p>
        </div>

        <SelectField
          label="Variation Purpose"
          value={purpose}
          onChange={setPurpose}
          options={VARIATION_PURPOSES}
          placeholder="— choose purpose —"
        />

        <TextField
          label="Pose / Action"
          value={pose}
          onChange={setPose}
          placeholder="e.g. sitting and reading a book"
        />

        <SelectField
          label="Expression / Mood"
          value={expression}
          onChange={setExpression}
          options={
            isTiki
              ? EXPRESSIONS
              : EXPRESSIONS.filter((e) => e !== "mischievous")
          }
          placeholder="— choose expression —"
        />

        <TextField
          label="Scene / Background"
          value={scene}
          onChange={setScene}
          placeholder="e.g. sunny tropical beach, cozy library"
        />

        <TextArea
          label="Story Context"
          value={storyContext}
          onChange={setStoryContext}
          placeholder="e.g. from Episode 3, Pineapple Baby is helping a friend"
        />

        <SelectField
          label="Intended Use"
          value={intendedUse}
          onChange={setIntendedUse}
          options={INTENDED_USES}
          placeholder="— choose intended use —"
        />

        <TextArea
          label="Extra Notes"
          value={notes}
          onChange={setNotes}
          placeholder="Any additional guidance for the variation prompt"
        />

        {isTiki && (
          <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-4 py-3">
            <span className="text-base flex-shrink-0">⚡</span>
            <p className="text-sm text-tiki-brown/70 leading-relaxed">
              <strong className="font-bold">Tiki Trouble is selected.</strong> The Tiki guardrail
              will be included in the prompt automatically. Keep Tiki funny, dramatic, and
              kid-friendly — not scary, violent, or too intense.
            </p>
          </div>
        )}
      </div>

      {/* Prompt preview */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black text-tiki-brown">3. Variation Prompt</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50 uppercase tracking-wide">
            Text-Only · Not Generating
          </span>
        </div>
        <p className="text-sm text-tiki-brown/55 leading-relaxed">
          This prompt is for planning only. No image generation is active. Select text below to
          copy.
        </p>
        {character ? (
          <>
            <pre className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-2xl px-5 py-4 text-xs text-tiki-brown/70 leading-relaxed whitespace-pre-wrap break-words font-sans select-all">
              {prompt}
            </pre>
            <p className="text-xs text-tiki-brown/35 italic">
              Select all text above to copy for future use.
            </p>
          </>
        ) : (
          <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
            <p className="text-sm text-tiki-brown/40 italic">
              Select a character to generate the variation prompt.
            </p>
          </div>
        )}
      </div>

      {/* Reference Assets Required */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-base">📎</span>
          <h2 className="text-base font-black text-tiki-brown">Reference Assets Required</h2>
        </div>
        <dl className="flex flex-col gap-1">
          {(
            [
              ["Official Profile Sheet Required", "Yes", true],
              ["Approved Reference Image Required", "Yes", true],
              ["Reference-Anchored Generation Required", "Yes", true],
              ["Human Approval Required Before Publishing", "Yes", true],
              ["Public Generation Allowed", "No", false],
            ] as [string, string, boolean][]
          ).map(([label, value, positive]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-2 py-1.5 border-b border-tiki-brown/6 last:border-0"
            >
              <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
              <dd
                className={`text-xs font-bold ${
                  positive ? "text-tropical-green" : "text-warm-coral/70"
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Future workflow */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <h2 className="text-base font-black text-tiki-brown">Draft / Approval Workflow</h2>
        <ol className="flex flex-col gap-2">
          {FUTURE_WORKFLOW_STEPS.map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-tiki-brown/70 leading-relaxed"
            >
              <span className="flex-shrink-0 font-black text-ube-purple/60 w-4">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
        <p className="text-xs text-tiki-brown/40 italic">
          Steps 2–6 are not active yet. This tool covers step 1 only.
        </p>
      </div>

      {/* What this tool does not do yet */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🚫</span>
          <h2 className="text-base font-black text-tiki-brown">What This Tool Does Not Do Yet</h2>
        </div>
        <ul className="space-y-2">
          {[
            "Does not generate images.",
            "Does not save prompts.",
            "Does not upload assets.",
            "Does not publish variations.",
            "Does not let public users generate characters.",
            "Does not modify official character files.",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm text-tiki-brown/65 leading-relaxed"
            >
              <span className="flex-shrink-0 text-warm-coral/60 mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

    </div>
  );
}
