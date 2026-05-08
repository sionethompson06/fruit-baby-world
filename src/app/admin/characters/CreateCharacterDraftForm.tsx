"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DraftState =
  | { status: "idle" }
  | { status: "saving" }
  | {
      status: "success";
      name: string;
      slug: string;
      path: string;
      commitMessage: string;
    }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isValidSlug(slug: string): boolean {
  return SAFE_SLUG.test(slug) && slug.length > 0 && slug.length <= 80;
}

function linesToArray(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function commaToArray(text: string): string[] {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// ─── Field components ─────────────────────────────────────────────────────────

function FieldLabel({
  children,
  required,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        {children}
        {required && <span className="text-warm-coral/70 ml-0.5">*</span>}
      </p>
      {hint && <p className="text-xs text-tiki-brown/35 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CreateCharacterDraftForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [shortName, setShortName] = useState("");
  const [role, setRole] = useState("");
  const [type, setType] = useState("");
  const [fruitType, setFruitType] = useState("");
  const [home, setHome] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [personalityTraits, setPersonalityTraits] = useState("");
  const [visualIdentity, setVisualIdentity] = useState("");
  const [characterRules, setCharacterRules] = useState("");
  const [voiceGuide, setVoiceGuide] = useState("");
  const [favoriteQuote, setFavoriteQuote] = useState("");
  const [generationRestrictions, setGenerationRestrictions] = useState(
    "Not approved for generation until official reference assets are uploaded and reviewed."
  );
  const [trademarkNotes, setTrademarkNotes] = useState("");
  const [notes, setNotes] = useState("");

  const [draftState, setDraftState] = useState<DraftState>({ status: "idle" });

  const slugValid = isValidSlug(slug);
  const isSaving = draftState.status === "saving";

  const canSubmit =
    !isSaving &&
    name.trim().length > 0 &&
    slugValid &&
    role.trim().length > 0 &&
    type.length > 0 &&
    shortDescription.trim().length > 0 &&
    personalityTraits.trim().length > 0 &&
    visualIdentity.trim().length > 0 &&
    characterRules.trim().length > 0;

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(nameToSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
    setSlugManuallyEdited(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const traits = commaToArray(personalityTraits);
    if (traits.length === 0) return;

    const rules = linesToArray(characterRules);
    if (rules.length === 0) return;

    const restrictions = linesToArray(generationRestrictions);

    setDraftState({ status: "saving" });

    try {
      const res = await fetch("/api/github/create-character-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug,
          shortName: shortName.trim(),
          role: role.trim(),
          type,
          fruitType: fruitType.trim(),
          home: home.trim(),
          shortDescription: shortDescription.trim(),
          personalityTraits: traits,
          visualIdentity: visualIdentity.trim(),
          characterRules: rules,
          voiceGuide: voiceGuide.trim(),
          favoriteQuote: favoriteQuote.trim(),
          generationRestrictions: restrictions,
          trademarkNotes: trademarkNotes.trim(),
          notes: notes.trim(),
        }),
      });

      const data = (await res.json()) as
        | {
            ok: true;
            status: "character_draft_created";
            path: string;
            commitMessage: string;
            character: { name: string; slug: string };
          }
        | { ok: false; message: string };

      if (data.ok) {
        setDraftState({
          status: "success",
          name: data.character.name as string,
          slug: data.character.slug as string,
          path: data.path,
          commitMessage: data.commitMessage,
        });
        // Reset form
        setName("");
        setSlug("");
        setSlugManuallyEdited(false);
        setShortName("");
        setRole("");
        setType("");
        setFruitType("");
        setHome("");
        setShortDescription("");
        setPersonalityTraits("");
        setVisualIdentity("");
        setCharacterRules("");
        setVoiceGuide("");
        setFavoriteQuote("");
        setGenerationRestrictions(
          "Not approved for generation until official reference assets are uploaded and reviewed."
        );
        setTrademarkNotes("");
        setNotes("");
      } else {
        setDraftState({ status: "error", message: data.message });
      }
    } catch {
      setDraftState({
        status: "error",
        message: "Something went wrong while creating the character draft.",
      });
    }
  }

  const inputClass =
    "w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30 disabled:opacity-50";

  const textareaClass =
    "w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/30 resize-none disabled:opacity-50";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

      {/* Success banner */}
      {draftState.status === "success" && (
        <div className="flex items-start gap-3 bg-tropical-green/10 border border-tropical-green/30 rounded-xl px-4 py-4">
          <span className="text-base flex-shrink-0">✅</span>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-bold text-tiki-brown/80">
              Character draft created: {draftState.name}
            </p>
            <p className="text-xs text-tiki-brown/60 font-mono">{draftState.path}</p>
            <p className="text-xs text-tiki-brown/55">{draftState.commitMessage}</p>
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-xs text-tiki-brown/65 font-semibold">Next steps:</p>
              <p className="text-xs text-tiki-brown/55">
                • Redeploy on Vercel for the character to appear in admin lists.
              </p>
              <p className="text-xs text-tiki-brown/55">
                • Upload official reference assets using the upload form below.
              </p>
              <p className="text-xs text-warm-coral/70 font-semibold">
                • This character is private and not approved for generation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraftState({ status: "idle" })}
              className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors self-start mt-1"
            >
              Create another draft →
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {draftState.status === "error" && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚠️</span>
          <div className="flex flex-col gap-1">
            <p className="text-sm font-bold text-tiki-brown/80">
              Could not create character draft.
            </p>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">{draftState.message}</p>
            <button
              type="button"
              onClick={() => setDraftState({ status: "idle" })}
              className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors self-start mt-0.5"
            >
              Try again →
            </button>
          </div>
        </div>
      )}

      {/* ── Section A: Identity ── */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-widest">
          A — Identity
        </p>

        {/* Name */}
        <div>
          <FieldLabel required>Character Name</FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Dragonfruit Baby"
            required
            maxLength={80}
            disabled={isSaving}
            className={inputClass}
          />
        </div>

        {/* Slug */}
        <div>
          <FieldLabel
            required
            hint="Auto-generated from name. Lowercase letters, numbers, and hyphens only."
          >
            Slug (ID)
          </FieldLabel>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            placeholder="e.g. dragonfruit-baby"
            required
            maxLength={80}
            disabled={isSaving}
            className={`${inputClass} ${
              slug && !slugValid
                ? "border-warm-coral/50 bg-warm-coral/5"
                : slug && slugValid
                ? "border-tropical-green/40"
                : ""
            }`}
          />
          {slug && !slugValid && (
            <p className="text-xs font-semibold text-warm-coral/75 mt-1">
              Invalid slug — use lowercase letters, numbers, and hyphens only.
            </p>
          )}
          {slug && slugValid && (
            <p className="text-xs text-tropical-green/80 font-semibold mt-1">
              Slug looks good. File will be saved as:{" "}
              <span className="font-mono">src/content/characters/{slug}.json</span>
            </p>
          )}
        </div>

        {/* Short name + Type row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel hint="Short display name">Short Name</FieldLabel>
            <input
              type="text"
              value={shortName}
              onChange={(e) => setShortName(e.target.value)}
              placeholder="e.g. Dragonfruit"
              maxLength={40}
              disabled={isSaving}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel required>Character Type</FieldLabel>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              required
              disabled={isSaving}
              className={`${inputClass} cursor-pointer`}
            >
              <option value="">— Select type —</option>
              <option value="fruit-baby">Fruit Baby (Friend)</option>
              <option value="villain">Rival / Troublemaker</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Role + Fruit type row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Role</FieldLabel>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Supporting Friend"
              required
              maxLength={80}
              disabled={isSaving}
              className={inputClass}
            />
          </div>
          <div>
            <FieldLabel>Fruit / Identity Type</FieldLabel>
            <input
              type="text"
              value={fruitType}
              onChange={(e) => setFruitType(e.target.value)}
              placeholder="e.g. Dragonfruit"
              maxLength={80}
              disabled={isSaving}
              className={inputClass}
            />
          </div>
        </div>

        {/* Home */}
        <div>
          <FieldLabel>Home / Location</FieldLabel>
          <input
            type="text"
            value={home}
            onChange={(e) => setHome(e.target.value)}
            placeholder="e.g. Fruit Baby World"
            maxLength={120}
            disabled={isSaving}
            className={inputClass}
          />
        </div>
      </div>

      <div className="border-t border-tiki-brown/8" />

      {/* ── Section B: Description & Personality ── */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-widest">
          B — Description & Personality
        </p>

        <div>
          <FieldLabel required>Short Description</FieldLabel>
          <textarea
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="A brief description of this character's personality and role."
            required
            maxLength={500}
            rows={3}
            disabled={isSaving}
            className={textareaClass}
          />
        </div>

        <div>
          <FieldLabel required hint="Separate traits with commas. e.g. gentle, curious, creative">
            Personality Traits
          </FieldLabel>
          <input
            type="text"
            value={personalityTraits}
            onChange={(e) => setPersonalityTraits(e.target.value)}
            placeholder="gentle, curious, creative, playful"
            required
            disabled={isSaving}
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel hint="Optional — warm, curious, and gentle.">Voice Guide</FieldLabel>
          <input
            type="text"
            value={voiceGuide}
            onChange={(e) => setVoiceGuide(e.target.value)}
            placeholder="How this character speaks and sounds"
            maxLength={800}
            disabled={isSaving}
            className={inputClass}
          />
        </div>

        <div>
          <FieldLabel>Favorite Quote (optional)</FieldLabel>
          <input
            type="text"
            value={favoriteQuote}
            onChange={(e) => setFavoriteQuote(e.target.value)}
            placeholder="A signature quote for this character"
            maxLength={200}
            disabled={isSaving}
            className={inputClass}
          />
        </div>
      </div>

      <div className="border-t border-tiki-brown/8" />

      {/* ── Section C: Visual Identity ── */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-widest">
          C — Visual Identity
        </p>

        <div>
          <FieldLabel
            required
            hint="Describe the character's visual style, colors, and appearance."
          >
            Visual Identity Notes
          </FieldLabel>
          <textarea
            value={visualIdentity}
            onChange={(e) => setVisualIdentity(e.target.value)}
            placeholder="e.g. Pink dragonfruit-inspired baby character with soft rounded shape, vibrant pink body with white speckles, leaf-like crown, warm eyes, and blush cheeks."
            required
            maxLength={1200}
            rows={4}
            disabled={isSaving}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="border-t border-tiki-brown/8" />

      {/* ── Section D: Character Rules ── */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-widest">
          D — Character Rules
        </p>

        <div>
          <FieldLabel
            required
            hint='One rule per line. Rules starting with "Do not" or "Never" go into the never list.'
          >
            Character Rules
          </FieldLabel>
          <textarea
            value={characterRules}
            onChange={(e) => setCharacterRules(e.target.value)}
            placeholder={
              "Must remain baby-like, soft, warm, and kid-friendly.\nDo not redesign into a realistic creature.\nPreserve soft rounded shape and gentle expression."
            }
            required
            rows={5}
            disabled={isSaving}
            className={textareaClass}
          />
        </div>

        <div>
          <FieldLabel hint="One restriction per line. Defaults are pre-filled.">
            Generation Restrictions
          </FieldLabel>
          <textarea
            value={generationRestrictions}
            onChange={(e) => setGenerationRestrictions(e.target.value)}
            placeholder="Not approved for generation until official reference assets are uploaded and reviewed."
            rows={2}
            disabled={isSaving}
            className={textareaClass}
          />
        </div>
      </div>

      <div className="border-t border-tiki-brown/8" />

      {/* ── Section E: Admin / Canon Notes ── */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-widest">
          E — Admin & Canon Notes
        </p>

        <div>
          <FieldLabel>Trademark / Canon Notes</FieldLabel>
          <textarea
            value={trademarkNotes}
            onChange={(e) => setTrademarkNotes(e.target.value)}
            placeholder="e.g. Draft character. Not public or generation-approved yet."
            maxLength={800}
            rows={2}
            disabled={isSaving}
            className={textareaClass}
          />
        </div>

        <div>
          <FieldLabel>Admin Notes</FieldLabel>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes — source, intent, next steps, review requirements."
            maxLength={1000}
            rows={2}
            disabled={isSaving}
            className={textareaClass}
          />
        </div>
      </div>

      {/* Safety notice */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          New characters default to{" "}
          <strong className="font-bold">status: draft</strong>,{" "}
          <strong className="font-bold">publicUseAllowed: false</strong>, and{" "}
          <strong className="font-bold">approvedForGeneration: false</strong>. They are not public
          and will not appear in generation tools until reference assets are uploaded and reviewed in
          a future phase.
        </p>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="self-start text-sm font-bold px-5 py-2.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isSaving ? "Creating character draft…" : "Create Character Draft"}
      </button>
    </form>
  );
}
