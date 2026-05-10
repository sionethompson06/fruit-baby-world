"use client";

import { useState } from "react";
import type { Character } from "@/lib/content";
import type { ProfileDraft } from "@/app/api/characters/generate-official-profile-draft/route";

// ─── Editable form state ──────────────────────────────────────────────────────
// Arrays are stored as newline-separated strings for textarea editing.

type EditableForm = {
  name: string;
  shortName: string;
  role: string;
  type: string;
  fruitType: string;
  home: string;
  shortDescription: string;
  personalityTraits: string;
  visualIdentity: string;
  colorPalette: { name: string; hex: string; usage: string }[];
  bodyShapeRules: string;
  faceAndExpressionRules: string;
  textureAndSurfaceRules: string;
  leafCrownAccessoryRules: string;
  poseAndGestureRules: string;
  storyRole: string;
  voiceGuide: string;
  favoriteQuote: string;
  characterRulesAlways: string;
  characterRulesNever: string;
  generationRestrictions: string;
  doNotChangeRules: string;
  trademarkNotes: string;
  imageAlt: string;
  profileCompletenessNotes: string;
  adminReviewNotes: string;
};

function splitLines(s: string): string[] {
  return s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function joinLines(arr: string[] | undefined | null): string {
  return (arr ?? []).join("\n");
}

function draftToForm(draft: ProfileDraft): EditableForm {
  const tn = draft.trademarkNotes;
  const trademarkStr = typeof tn === "string" ? tn : Array.isArray(tn) ? (tn as string[]).join("\n") : "";
  return {
    name: draft.name ?? "",
    shortName: draft.shortName ?? "",
    role: draft.role ?? "",
    type: draft.type ?? "",
    fruitType: draft.fruitType ?? "",
    home: draft.home ?? "",
    shortDescription: draft.shortDescription ?? "",
    personalityTraits: joinLines(draft.personalityTraits),
    visualIdentity: draft.visualIdentity ?? "",
    colorPalette: Array.isArray(draft.colorPalette) ? draft.colorPalette : [],
    bodyShapeRules: joinLines(draft.bodyShapeRules),
    faceAndExpressionRules: joinLines(draft.faceAndExpressionRules),
    textureAndSurfaceRules: joinLines(draft.textureAndSurfaceRules),
    leafCrownAccessoryRules: joinLines(draft.leafCrownAccessoryRules),
    poseAndGestureRules: joinLines(draft.poseAndGestureRules),
    storyRole: draft.storyRole ?? "",
    voiceGuide: draft.voiceGuide ?? "",
    favoriteQuote: draft.favoriteQuote ?? "",
    characterRulesAlways: joinLines(draft.characterRules?.always),
    characterRulesNever: joinLines(draft.characterRules?.never),
    generationRestrictions: joinLines(draft.generationRestrictions),
    doNotChangeRules: joinLines(draft.doNotChangeRules),
    trademarkNotes: trademarkStr,
    imageAlt: draft.imageAlt ?? "",
    profileCompletenessNotes: draft.profileCompletenessNotes ?? "",
    adminReviewNotes: joinLines(draft.adminReviewNotes),
  };
}

function formToDraft(form: EditableForm): ProfileDraft {
  return {
    name: form.name,
    shortName: form.shortName,
    role: form.role,
    type: form.type,
    fruitType: form.fruitType,
    home: form.home,
    shortDescription: form.shortDescription,
    personalityTraits: splitLines(form.personalityTraits),
    visualIdentity: form.visualIdentity,
    colorPalette: form.colorPalette,
    bodyShapeRules: splitLines(form.bodyShapeRules),
    faceAndExpressionRules: splitLines(form.faceAndExpressionRules),
    textureAndSurfaceRules: splitLines(form.textureAndSurfaceRules),
    leafCrownAccessoryRules: splitLines(form.leafCrownAccessoryRules),
    poseAndGestureRules: splitLines(form.poseAndGestureRules),
    storyRole: form.storyRole,
    voiceGuide: form.voiceGuide,
    favoriteQuote: form.favoriteQuote,
    characterRules: {
      always: splitLines(form.characterRulesAlways),
      never: splitLines(form.characterRulesNever),
    },
    generationRestrictions: splitLines(form.generationRestrictions),
    doNotChangeRules: splitLines(form.doNotChangeRules),
    trademarkNotes: form.trademarkNotes,
    imageAlt: form.imageAlt,
    profileCompletenessNotes: form.profileCompletenessNotes,
    adminReviewNotes: splitLines(form.adminReviewNotes),
  };
}

// ─── UI primitives ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
      {children}
    </p>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold text-tiki-brown/55 mb-1">{children}</p>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 disabled:opacity-50"
    />
  );
}

function TextArea({
  value,
  onChange,
  placeholder,
  rows,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows ?? 3}
      disabled={disabled}
      className="w-full text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 resize-none disabled:opacity-50"
    />
  );
}

// ─── Color palette editor ─────────────────────────────────────────────────────

function ColorPaletteEditor({
  palette,
  onChange,
  disabled,
}: {
  palette: { name: string; hex: string; usage: string }[];
  onChange: (p: { name: string; hex: string; usage: string }[]) => void;
  disabled?: boolean;
}) {
  function updateRow(
    i: number,
    field: "name" | "hex" | "usage",
    value: string
  ) {
    const next = palette.map((row, idx) =>
      idx === i ? { ...row, [field]: value } : row
    );
    onChange(next);
  }

  function addRow() {
    onChange([...palette, { name: "", hex: "#", usage: "" }]);
  }

  function removeRow(i: number) {
    onChange(palette.filter((_, idx) => idx !== i));
  }

  return (
    <div className="flex flex-col gap-2">
      {palette.map((row, i) => (
        <div key={i} className="flex items-center gap-2 flex-wrap">
          <div
            className="w-6 h-6 rounded-full border border-tiki-brown/20 flex-shrink-0"
            style={{ backgroundColor: row.hex.startsWith("#") ? row.hex : "#ccc" }}
          />
          <input
            type="text"
            value={row.name}
            onChange={(e) => updateRow(i, "name", e.target.value)}
            placeholder="Color name"
            disabled={disabled}
            className="text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-lg px-2 py-1 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 w-28 disabled:opacity-50"
          />
          <input
            type="text"
            value={row.hex}
            onChange={(e) => updateRow(i, "hex", e.target.value)}
            placeholder="#HEXCODE"
            disabled={disabled}
            className="text-xs text-tiki-brown font-mono bg-white border border-tiki-brown/15 rounded-lg px-2 py-1 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 w-24 disabled:opacity-50"
          />
          <input
            type="text"
            value={row.usage}
            onChange={(e) => updateRow(i, "usage", e.target.value)}
            placeholder="Where used on character"
            disabled={disabled}
            className="text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-lg px-2 py-1 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 flex-1 min-w-[8rem] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => removeRow(i)}
            disabled={disabled}
            className="text-xs text-warm-coral/60 hover:text-warm-coral/80 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        disabled={disabled}
        className="text-xs font-bold text-ube-purple/70 hover:text-ube-purple transition-colors disabled:opacity-40 text-left"
      >
        + Add color
      </button>
    </div>
  );
}

// ─── Per-character builder row ────────────────────────────────────────────────

type RowState =
  | { phase: "idle" }
  | { phase: "generating" }
  | { phase: "editing"; form: EditableForm; referenceUrl: string }
  | { phase: "saving"; form: EditableForm; referenceUrl: string }
  | { phase: "saved"; commitUrl: string; charName: string }
  | { phase: "generateError"; message: string }
  | { phase: "saveError"; form: EditableForm; referenceUrl: string; message: string };

function hasPrimaryRef(character: Character): boolean {
  const refUrl = (character as Record<string, unknown>).primaryReferenceAssetUrl;
  if (typeof refUrl === "string" && refUrl.startsWith("http")) return true;
  const profileSheet = character.image?.profileSheet;
  if (typeof profileSheet === "string" && profileSheet.startsWith("http"))
    return true;
  return false;
}

function CharacterBuilderRow({ character }: { character: Character }) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<RowState>({ phase: "idle" });

  const hasRef = hasPrimaryRef(character);

  async function handleGenerate() {
    setState({ phase: "generating" });
    try {
      const res = await fetch(
        "/api/characters/generate-official-profile-draft",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ characterSlug: character.slug }),
        }
      );
      const data = (await res.json()) as
        | { ok: true; profileDraft: ProfileDraft; referenceUrl: string }
        | { ok: false; message: string };

      if (data.ok) {
        setState({
          phase: "editing",
          form: draftToForm(data.profileDraft),
          referenceUrl: data.referenceUrl,
        });
        setExpanded(true);
      } else {
        setState({ phase: "generateError", message: data.message });
      }
    } catch {
      setState({
        phase: "generateError",
        message: "Network error — could not reach the generation endpoint.",
      });
    }
  }

  async function handleSave() {
    if (state.phase !== "editing" && state.phase !== "saveError") return;
    const savedForm = state.form;
    const savedReferenceUrl = state.referenceUrl;

    setState({ phase: "saving", form: savedForm, referenceUrl: savedReferenceUrl });
    try {
      const res = await fetch("/api/github/save-character-profile-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: character.slug,
          profileDraft: formToDraft(savedForm),
        }),
      });
      const data = (await res.json()) as
        | { ok: true; htmlUrl: string; character: { name?: string } }
        | { ok: false; message: string };

      if (data.ok) {
        const charName =
          typeof data.character?.name === "string"
            ? data.character.name
            : character.name;
        setState({ phase: "saved", commitUrl: data.htmlUrl, charName });
        setExpanded(false);
      } else {
        setState({
          phase: "saveError",
          form: savedForm,
          referenceUrl: savedReferenceUrl,
          message: data.message,
        });
      }
    } catch {
      setState({
        phase: "saveError",
        form: savedForm,
        referenceUrl: savedReferenceUrl,
        message: "Network error — could not reach the save endpoint.",
      });
    }
  }

  function updateForm(patch: Partial<EditableForm>) {
    if (state.phase !== "editing" && state.phase !== "saveError") return;
    const current = state.form;
    const newForm = { ...current, ...patch };
    if (state.phase === "editing") {
      setState({ phase: "editing", form: newForm, referenceUrl: state.referenceUrl });
    } else {
      setState({ phase: "saveError", form: newForm, referenceUrl: state.referenceUrl, message: state.message });
    }
  }

  const isGenerating = state.phase === "generating";
  const isSaving = state.phase === "saving";
  const isEditing = state.phase === "editing" || state.phase === "saveError";
  const form = isEditing
    ? (state as { form: EditableForm }).form
    : null;
  const isBusy = isGenerating || isSaving;

  const charType = character.type === "villain" ? "Rival Character" : "Fruit Baby";
  const refUrl = (character as Record<string, unknown>).primaryReferenceAssetUrl;
  const profileSheet = character.image?.profileSheet;
  const activeRef =
    (typeof refUrl === "string" && refUrl.startsWith("http") ? refUrl : null) ??
    (typeof profileSheet === "string" && profileSheet.startsWith("http")
      ? profileSheet
      : null);

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">

      {/* Row header */}
      <div className="p-4 bg-white flex flex-col gap-3">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 uppercase tracking-wide">
                {charType}
              </span>
              {!hasRef && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80 uppercase tracking-wide">
                  No Reference URL
                </span>
              )}
              {state.phase === "saved" && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  Saved
                </span>
              )}
            </div>
            <p className="text-sm font-bold text-tiki-brown leading-tight">
              {character.name}
            </p>
            <p className="text-xs text-tiki-brown/40 font-mono">{character.slug}</p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            {hasRef && state.phase !== "saved" && (
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isBusy}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating…" : isEditing ? "Re-generate" : "Generate Profile Draft"}
              </button>
            )}
            {isEditing && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-tiki-brown/6 text-tiki-brown/55 hover:bg-tiki-brown/10 transition-colors"
              >
                {expanded ? "Collapse" : "Edit"}
              </button>
            )}
          </div>
        </div>

        {/* Error states */}
        {state.phase === "generateError" && (
          <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">
              {state.message}
            </p>
          </div>
        )}

        {/* Save success */}
        {state.phase === "saved" && (
          <div className="flex items-start gap-2 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-bold text-tiki-brown/75">
                Profile draft saved for {state.charName}.
              </p>
              <p className="text-xs text-tiki-brown/50">
                Vercel redeploy required before changes appear.
              </p>
              {state.commitUrl && (
                <a
                  href={state.commitUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
                >
                  View commit →
                </a>
              )}
            </div>
          </div>
        )}

        {/* No reference warning */}
        {!hasRef && (
          <p className="text-xs text-tiki-brown/40 italic">
            Assign a Primary Official Reference with an https:// URL first.
          </p>
        )}

        {/* Reference preview */}
        {activeRef && (state.phase === "idle" || isGenerating) && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeRef}
              alt={character.name}
              className="w-12 h-12 rounded-xl object-cover border border-tiki-brown/10"
              loading="lazy"
            />
            <p className="text-xs text-tiki-brown/35 font-mono truncate flex-1">
              {activeRef}
            </p>
          </div>
        )}
      </div>

      {/* Editable form */}
      {isEditing && expanded && form && (
        <div className="border-t border-tiki-brown/8 bg-tiki-brown/2 p-5 flex flex-col gap-6">

          {/* Save error */}
          {state.phase === "saveError" && (
            <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">
                {state.message}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/25 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">📋</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              Review and edit the AI-generated profile below before saving. Saving
              will NOT change approval mode, status, or generation flags — those
              are managed separately in Character Approval.
            </p>
          </div>

          {/* ── Section: Identity ── */}
          <div className="flex flex-col gap-4">
            <SectionLabel>Identity</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Name</FieldLabel>
                <TextInput value={form.name} onChange={(v) => updateForm({ name: v })} disabled={isBusy} />
              </div>
              <div>
                <FieldLabel>Short Name</FieldLabel>
                <TextInput value={form.shortName} onChange={(v) => updateForm({ shortName: v })} disabled={isBusy} />
              </div>
              <div>
                <FieldLabel>Role</FieldLabel>
                <TextInput value={form.role} onChange={(v) => updateForm({ role: v })} disabled={isBusy} />
              </div>
              <div>
                <FieldLabel>Type</FieldLabel>
                <TextInput value={form.type} onChange={(v) => updateForm({ type: v })} placeholder="fruit-baby / villain / other" disabled={isBusy} />
              </div>
              <div>
                <FieldLabel>Fruit Type</FieldLabel>
                <TextInput value={form.fruitType} onChange={(v) => updateForm({ fruitType: v })} disabled={isBusy} />
              </div>
              <div>
                <FieldLabel>Home</FieldLabel>
                <TextInput value={form.home} onChange={(v) => updateForm({ home: v })} disabled={isBusy} />
              </div>
            </div>
            <div>
              <FieldLabel>Short Description</FieldLabel>
              <TextArea value={form.shortDescription} onChange={(v) => updateForm({ shortDescription: v })} rows={2} disabled={isBusy} />
            </div>
            <div>
              <FieldLabel>Image Alt Text</FieldLabel>
              <TextInput value={form.imageAlt} onChange={(v) => updateForm({ imageAlt: v })} placeholder="Descriptive alt text for screen readers" disabled={isBusy} />
            </div>
          </div>

          {/* ── Section: Visual Fidelity ── */}
          <div className="flex flex-col gap-4">
            <SectionLabel>Visual Fidelity</SectionLabel>
            <div>
              <FieldLabel>Visual Identity (style notes)</FieldLabel>
              <TextArea value={form.visualIdentity} onChange={(v) => updateForm({ visualIdentity: v })} rows={3} disabled={isBusy} placeholder="Overall visual style description" />
            </div>
            <div>
              <FieldLabel>Color Palette</FieldLabel>
              <ColorPaletteEditor palette={form.colorPalette} onChange={(p) => updateForm({ colorPalette: p })} disabled={isBusy} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Body Shape Rules (one per line)</FieldLabel>
                <TextArea value={form.bodyShapeRules} onChange={(v) => updateForm({ bodyShapeRules: v })} rows={4} disabled={isBusy} placeholder="Rule about body shape..." />
              </div>
              <div>
                <FieldLabel>Face &amp; Expression Rules (one per line)</FieldLabel>
                <TextArea value={form.faceAndExpressionRules} onChange={(v) => updateForm({ faceAndExpressionRules: v })} rows={4} disabled={isBusy} placeholder="Rule about face and expressions..." />
              </div>
              <div>
                <FieldLabel>Texture &amp; Surface Rules (one per line)</FieldLabel>
                <TextArea value={form.textureAndSurfaceRules} onChange={(v) => updateForm({ textureAndSurfaceRules: v })} rows={4} disabled={isBusy} placeholder="Rule about surface texture..." />
              </div>
              <div>
                <FieldLabel>Crown &amp; Accessory Rules (one per line)</FieldLabel>
                <TextArea value={form.leafCrownAccessoryRules} onChange={(v) => updateForm({ leafCrownAccessoryRules: v })} rows={4} disabled={isBusy} placeholder="Rule about leaf crown / accessories..." />
              </div>
            </div>
            <div>
              <FieldLabel>Pose &amp; Gesture Rules (one per line)</FieldLabel>
              <TextArea value={form.poseAndGestureRules} onChange={(v) => updateForm({ poseAndGestureRules: v })} rows={3} disabled={isBusy} placeholder="Rule about poses and gestures..." />
            </div>
          </div>

          {/* ── Section: Personality & Voice ── */}
          <div className="flex flex-col gap-4">
            <SectionLabel>Personality &amp; Voice</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Personality Traits (one per line)</FieldLabel>
                <TextArea value={form.personalityTraits} onChange={(v) => updateForm({ personalityTraits: v })} rows={4} disabled={isBusy} placeholder="Kind&#10;Curious&#10;Brave" />
              </div>
              <div>
                <FieldLabel>Story Role</FieldLabel>
                <TextArea value={form.storyRole} onChange={(v) => updateForm({ storyRole: v })} rows={4} disabled={isBusy} placeholder="How this character functions in stories" />
              </div>
            </div>
            <div>
              <FieldLabel>Voice Guide</FieldLabel>
              <TextArea value={form.voiceGuide} onChange={(v) => updateForm({ voiceGuide: v })} rows={2} disabled={isBusy} placeholder="Tone, vocabulary level, sentence structure..." />
            </div>
            <div>
              <FieldLabel>Favorite Quote</FieldLabel>
              <TextInput value={form.favoriteQuote} onChange={(v) => updateForm({ favoriteQuote: v })} placeholder="A sample quote in the character's voice" disabled={isBusy} />
            </div>
          </div>

          {/* ── Section: Character Rules ── */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Character Rules</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-tropical-green/5 border border-tropical-green/15 rounded-xl p-3">
                <FieldLabel>Always (one per line)</FieldLabel>
                <TextArea value={form.characterRulesAlways} onChange={(v) => updateForm({ characterRulesAlways: v })} rows={5} disabled={isBusy} placeholder="Lead with kindness&#10;Support and encourage friends" />
              </div>
              <div className="bg-warm-coral/5 border border-warm-coral/15 rounded-xl p-3">
                <FieldLabel>Never (one per line)</FieldLabel>
                <TextArea value={form.characterRulesNever} onChange={(v) => updateForm({ characterRulesNever: v })} rows={5} disabled={isBusy} placeholder="Be mean or dismissive&#10;Act selfishly" />
              </div>
            </div>
          </div>

          {/* ── Section: Generation Guardrails ── */}
          <div className="flex flex-col gap-4">
            <SectionLabel>Generation Guardrails</SectionLabel>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <FieldLabel>Generation Restrictions (one per line)</FieldLabel>
                <TextArea value={form.generationRestrictions} onChange={(v) => updateForm({ generationRestrictions: v })} rows={4} disabled={isBusy} placeholder="Things AI generation must never change..." />
              </div>
              <div>
                <FieldLabel>Do Not Change Rules (one per line)</FieldLabel>
                <TextArea value={form.doNotChangeRules} onChange={(v) => updateForm({ doNotChangeRules: v })} rows={4} disabled={isBusy} placeholder="Specific visual elements that must never be altered..." />
              </div>
            </div>
            <div>
              <FieldLabel>Trademark Notes</FieldLabel>
              <TextInput value={form.trademarkNotes} onChange={(v) => updateForm({ trademarkNotes: v })} placeholder="Brand-critical or trademark-sensitive visual elements" disabled={isBusy} />
            </div>
          </div>

          {/* ── Section: Admin Notes ── */}
          <div className="flex flex-col gap-3">
            <SectionLabel>Admin Notes</SectionLabel>
            <div>
              <FieldLabel>Profile Completeness Notes</FieldLabel>
              <TextArea value={form.profileCompletenessNotes} onChange={(v) => updateForm({ profileCompletenessNotes: v })} rows={2} disabled={isBusy} placeholder="What was inferred vs. what needs review..." />
            </div>
            <div>
              <FieldLabel>Admin Review Notes (one per line)</FieldLabel>
              <TextArea value={form.adminReviewNotes} onChange={(v) => updateForm({ adminReviewNotes: v })} rows={3} disabled={isBusy} placeholder="Items the admin should verify before finalizing..." />
            </div>
          </div>

          {/* Save / collapse */}
          <div className="flex items-center gap-3 pt-1 border-t border-tiki-brown/8">
            <button
              type="button"
              onClick={handleSave}
              disabled={isBusy}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving to GitHub…" : "Save Profile Draft to GitHub"}
            </button>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              disabled={isBusy}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/12 transition-colors disabled:opacity-40"
            >
              Collapse
            </button>
            <p className="text-xs text-tiki-brown/35 leading-snug">
              Does not change approval mode or generation flags.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────────

export default function OfficialProfileBuilderPanel({
  characters,
}: {
  characters: Character[];
}) {
  const eligible = characters.filter(hasPrimaryRef);

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">🧬</span>
        <h2 className="text-base font-black text-tiki-brown">
          Generate Official Character Profile Draft
        </h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          Admin Only
        </span>
      </div>

      <p className="text-sm text-tiki-brown/60 leading-relaxed">
        Use GPT-4o vision to analyze a character&apos;s Primary Official Reference image and generate a
        structured character profile draft — including visual fidelity rules, color palette,
        personality, voice guide, and generation guardrails. Review and edit the draft before
        saving to GitHub. Saving does{" "}
        <strong className="font-semibold">not</strong> change approval mode, status, or generation
        flags.
      </p>

      <div className="flex items-start gap-2.5 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-3">
        <span className="text-sm flex-shrink-0">💡</span>
        <p className="text-xs text-tiki-brown/60 leading-relaxed">
          Only characters with a Primary Official Reference assigned as an{" "}
          <code className="font-mono bg-tiki-brown/8 px-1 rounded">https://</code> URL appear here.
          Assign a reference using the panel above if a character is missing.
        </p>
      </div>

      {eligible.length === 0 && (
        <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm text-tiki-brown/40 italic">
            No characters have an https:// primary reference URL yet. Assign one using the panel above.
          </p>
        </div>
      )}

      {eligible.length > 0 && (
        <div className="flex flex-col gap-3">
          {eligible.map((c) => (
            <CharacterBuilderRow key={c.slug} character={c} />
          ))}
        </div>
      )}

      {(() => {
        const ineligible = characters.filter((c) => !hasPrimaryRef(c));
        if (ineligible.length === 0) return null;
        return (
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide">
              Waiting for primary reference
            </p>
            <div className="flex flex-wrap gap-2">
              {ineligible.map((c) => (
                <span
                  key={c.slug}
                  className="text-xs font-mono text-tiki-brown/35 bg-tiki-brown/5 px-2 py-0.5 rounded-lg"
                >
                  {c.slug}
                </span>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="flex items-start gap-2.5 bg-tiki-brown/4 rounded-xl px-4 py-3">
        <span className="text-sm flex-shrink-0">🔒</span>
        <p className="text-xs text-tiki-brown/55 leading-relaxed">
          Saving a profile draft commits profile fields to GitHub but does not approve or publish
          the character. No image generation is triggered. Character approval is handled in the
          panel below.
        </p>
      </div>
    </div>
  );
}
