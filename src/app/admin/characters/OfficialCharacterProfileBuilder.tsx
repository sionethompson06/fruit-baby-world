"use client";

import { useState } from "react";
import type { Character } from "@/lib/content";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileDraft = {
  name: string;
  slug: string;
  shortName: string;
  role: string;
  type: string;
  fruitType: string;
  home: string;
  shortDescription: string;
  personalityTraits: string[];
  visualIdentity: string;
  colorPalette: Array<{
    name: string;
    hex: string;
    usage: string;
  }>;
  bodyShapeRules: string[];
  faceAndExpressionRules: string[];
  textureAndSurfaceRules: string[];
  leafCrownAccessoryRules: string[];
  poseAndGestureRules: string[];
  storyRole: string;
  voiceGuide: string;
  favoriteQuote: string;
  characterRules: string[];
  generationRestrictions: string[];
  doNotChangeRules: string[];
  trademarkNotes: string;
  imageAlt: string;
  profileCompletenessNotes: string;
  adminReviewNotes: string[];
};

type GenerateState =
  | { status: "idle" }
  | { status: "generating" }
  | {
      status: "generated";
      profileDraft: ProfileDraft;
      primaryReferenceAssetUrl: string;
    }
  | { status: "error"; message: string };

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | {
      status: "saved";
      commitMessage: string;
      path: string;
      htmlUrl: string;
    }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isBlobUrl(url?: string): boolean {
  return typeof url === "string" && url.startsWith("https://");
}

// ─── Profile Editor Component ─────────────────────────────────────────────────

function ProfileEditor({
  draft,
  onChange,
}: {
  draft: ProfileDraft;
  onChange: (updated: ProfileDraft) => void;
}) {
  const updateField = (field: keyof ProfileDraft, value: any) => {
    onChange({ ...draft, [field]: value });
  };

  const updateArrayField = (field: keyof ProfileDraft, index: number, value: string) => {
    const arr = [...(draft[field] as string[])];
    arr[index] = value;
    onChange({ ...draft, [field]: arr });
  };

  const addToArrayField = (field: keyof ProfileDraft) => {
    const arr = [...(draft[field] as string[]), ""];
    onChange({ ...draft, [field]: arr });
  };

  const removeFromArrayField = (field: keyof ProfileDraft, index: number) => {
    const arr = [...(draft[field] as string[])];
    arr.splice(index, 1);
    onChange({ ...draft, [field]: arr });
  };

  const updateColorPalette = (index: number, key: "name" | "hex" | "usage", value: string) => {
    const palette = [...draft.colorPalette];
    palette[index] = { ...palette[index], [key]: value };
    onChange({ ...draft, colorPalette: palette });
  };

  const addColor = () => {
    const palette = [...draft.colorPalette, { name: "", hex: "#000000", usage: "" }];
    onChange({ ...draft, colorPalette: palette });
  };

  const removeColor = (index: number) => {
    const palette = [...draft.colorPalette];
    palette.splice(index, 1);
    onChange({ ...draft, colorPalette: palette });
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-tiki-brown uppercase tracking-wide">Identity</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Short Name</label>
            <input
              type="text"
              value={draft.shortName}
              onChange={(e) => updateField("shortName", e.target.value)}
              className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Role</label>
            <input
              type="text"
              value={draft.role}
              onChange={(e) => updateField("role", e.target.value)}
              className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Type</label>
            <input
              type="text"
              value={draft.type}
              onChange={(e) => updateField("type", e.target.value)}
              className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Fruit Type</label>
            <input
              type="text"
              value={draft.fruitType}
              onChange={(e) => updateField("fruitType", e.target.value)}
              className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Home</label>
            <input
              type="text"
              value={draft.home}
              onChange={(e) => updateField("home", e.target.value)}
              className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Short Description</label>
          <textarea
            value={draft.shortDescription}
            onChange={(e) => updateField("shortDescription", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Story Role</label>
          <textarea
            value={draft.storyRole}
            onChange={(e) => updateField("storyRole", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Visual Fidelity */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-tiki-brown uppercase tracking-wide">Visual Fidelity</h4>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Visual Identity</label>
          <textarea
            value={draft.visualIdentity}
            onChange={(e) => updateField("visualIdentity", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-tiki-brown/70">Color Palette</label>
            <button
              onClick={addColor}
              className="text-xs font-bold text-tropical-green hover:text-tropical-green/80"
            >
              + Add Color
            </button>
          </div>
          <div className="space-y-2">
            {draft.colorPalette.map((color, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Name"
                  value={color.name}
                  onChange={(e) => updateColorPalette(index, "name", e.target.value)}
                  className="flex-1 px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
                />
                <input
                  type="text"
                  placeholder="#000000"
                  value={color.hex}
                  onChange={(e) => updateColorPalette(index, "hex", e.target.value)}
                  className="w-24 px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm font-mono"
                />
                <input
                  type="text"
                  placeholder="Usage"
                  value={color.usage}
                  onChange={(e) => updateColorPalette(index, "usage", e.target.value)}
                  className="flex-1 px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
                />
                <button
                  onClick={() => removeColor(index)}
                  className="text-xs font-bold text-warm-coral hover:text-warm-coral/80 px-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-tiki-brown/50 mt-1">Verify color hex values against the official reference.</p>
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Body Shape Rules</label>
          <textarea
            value={draft.bodyShapeRules.join("\n")}
            onChange={(e) => updateField("bodyShapeRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Face & Expression Rules</label>
          <textarea
            value={draft.faceAndExpressionRules.join("\n")}
            onChange={(e) => updateField("faceAndExpressionRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Texture & Surface Rules</label>
          <textarea
            value={draft.textureAndSurfaceRules.join("\n")}
            onChange={(e) => updateField("textureAndSurfaceRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Leaf/Crown/Accessory Rules</label>
          <textarea
            value={draft.leafCrownAccessoryRules.join("\n")}
            onChange={(e) => updateField("leafCrownAccessoryRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Pose & Gesture Rules</label>
          <textarea
            value={draft.poseAndGestureRules.join("\n")}
            onChange={(e) => updateField("poseAndGestureRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Image Alt Text</label>
          <input
            type="text"
            value={draft.imageAlt}
            onChange={(e) => updateField("imageAlt", e.target.value)}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Personality / Voice */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-tiki-brown uppercase tracking-wide">Personality / Voice</h4>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Personality Traits</label>
          <textarea
            value={draft.personalityTraits.join("\n")}
            onChange={(e) => updateField("personalityTraits", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One trait per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Voice Guide</label>
          <textarea
            value={draft.voiceGuide}
            onChange={(e) => updateField("voiceGuide", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Favorite Quote</label>
          <input
            type="text"
            value={draft.favoriteQuote}
            onChange={(e) => updateField("favoriteQuote", e.target.value)}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Generation Guardrails */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-tiki-brown uppercase tracking-wide">Generation Guardrails</h4>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Character Rules</label>
          <textarea
            value={draft.characterRules.join("\n")}
            onChange={(e) => updateField("characterRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Generation Restrictions</label>
          <textarea
            value={draft.generationRestrictions.join("\n")}
            onChange={(e) => updateField("generationRestrictions", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One restriction per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Do Not Change Rules</label>
          <textarea
            value={draft.doNotChangeRules.join("\n")}
            onChange={(e) => updateField("doNotChangeRules", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One rule per line"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Trademark Notes</label>
          <textarea
            value={draft.trademarkNotes}
            onChange={(e) => updateField("trademarkNotes", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
      </div>

      {/* Admin Review */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-tiki-brown uppercase tracking-wide">Admin Review</h4>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Profile Completeness Notes</label>
          <textarea
            value={draft.profileCompletenessNotes}
            onChange={(e) => updateField("profileCompletenessNotes", e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-tiki-brown/70 mb-1">Admin Review Notes</label>
          <textarea
            value={draft.adminReviewNotes.join("\n")}
            onChange={(e) => updateField("adminReviewNotes", e.target.value.split("\n").filter(Boolean))}
            rows={3}
            className="w-full px-3 py-2 border border-tiki-brown/20 rounded-lg text-sm"
            placeholder="One note per line"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Per-character row ──────────────────────────────────────────────────────────────

function OfficialProfileRow({
  character,
  approvedAssets,
}: {
  character: Character;
  approvedAssets: UploadedReferenceAsset[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [generateState, setGenerateState] = useState<GenerateState>({ status: "idle" });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [editedDraft, setEditedDraft] = useState<ProfileDraft | null>(null);

  const currentProfileSheet = character.image?.profileSheet;
  const currentPrimaryId = character.primaryReferenceAssetId;
  const hasBlob = isBlobUrl(currentProfileSheet);
  const hasLocal = !!currentProfileSheet && !hasBlob;
  const hasPrimaryRef = hasBlob || hasLocal;
  const approvedCount = approvedAssets.length;

  async function handleGenerate() {
    setGenerateState({ status: "generating" });
    try {
      const res = await fetch("/api/characters/generate-official-profile-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: character.slug,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setGenerateState({
          status: "generated",
          profileDraft: data.profileDraft,
          primaryReferenceAssetUrl: data.primaryReferenceAssetUrl,
        });
        setEditedDraft(data.profileDraft);
        setExpanded(true);
      } else {
        setGenerateState({ status: "error", message: data.message });
      }
    } catch {
      setGenerateState({
        status: "error",
        message: "Something went wrong while generating the profile draft.",
      });
    }
  }

  async function handleSave() {
    if (!editedDraft) return;

    setSaveState({ status: "saving" });
    try {
      const res = await fetch("/api/github/save-character-profile-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: character.slug,
          profileDraft: editedDraft,
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setSaveState({
          status: "saved",
          commitMessage: data.commitMessage,
          path: data.path,
          htmlUrl: data.htmlUrl,
        });
        setGenerateState({ status: "idle" });
        setEditedDraft(null);
        setExpanded(false);
      } else {
        setSaveState({ status: "error", message: data.message });
      }
    } catch {
      setSaveState({
        status: "error",
        message: "Something went wrong while saving the profile draft.",
      });
    }
  }

  const canGenerate = hasPrimaryRef && generateState.status !== "generating";
  const canSave = editedDraft && saveState.status !== "saving";

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">
      {/* Summary row */}
      <div className="p-4 bg-white flex flex-wrap items-start gap-3">
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-tiki-brown leading-tight">
              {character.name}
            </p>
            {hasPrimaryRef ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                Has Primary Ref ✓
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
                Needs Primary Ref
              </span>
            )}
            <span className="text-xs font-mono text-tiki-brown/35">
              {character.slug}
            </span>
          </div>
          {currentProfileSheet && (
            <p className="text-xs font-mono text-tiki-brown/40 truncate max-w-sm">
              {currentProfileSheet}
            </p>
          )}
          <p className="text-xs text-tiki-brown/50">
            Approved assets:{" "}
            <strong
              className={
                approvedCount > 0 ? "text-tropical-green" : "text-tiki-brown/40"
              }
            >
              {approvedCount}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {saveState.status === "saved" && (
            <span className="text-xs font-bold text-tropical-green">
              Saved ✓
            </span>
          )}
          {generateState.status === "generated" && !expanded && (
            <span className="text-xs font-bold text-tropical-green">
              Generated ✓
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/10 text-tiki-brown hover:bg-tiki-brown/20 transition-colors"
          >
            {expanded ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-tiki-brown/10 bg-tiki-brown/2 p-4">
          {/* Generate section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-sm font-bold text-tiki-brown">Generate Official Profile Draft</h5>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                  canGenerate
                    ? "bg-ube-purple/15 text-ube-purple hover:bg-ube-purple/25"
                    : "bg-tiki-brown/8 text-tiki-brown/40 cursor-not-allowed"
                }`}
              >
                {generateState.status === "generating" ? "Generating..." : "Generate Draft"}
              </button>
            </div>

            {generateState.status === "error" && (
              <div className="bg-warm-coral/10 border border-warm-coral/30 rounded-lg p-3 mb-3">
                <p className="text-sm text-warm-coral/80">{generateState.message}</p>
              </div>
            )}

            {generateState.status === "generated" && (
              <div className="bg-tropical-green/8 border border-tropical-green/20 rounded-lg p-3 mb-3">
                <p className="text-sm text-tropical-green/80">
                  Profile draft generated from primary reference. Review and edit below before saving.
                </p>
              </div>
            )}

            {!hasPrimaryRef && (
              <div className="bg-tiki-brown/8 border border-tiki-brown/20 rounded-lg p-3">
                <p className="text-sm text-tiki-brown/60">
                  Assign a Primary Official Reference first using the section above.
                </p>
              </div>
            )}
          </div>

          {/* Editor section */}
          {editedDraft && (
            <div className="mb-6">
              <ProfileEditor draft={editedDraft} onChange={setEditedDraft} />
            </div>
          )}

          {/* Save section */}
          {editedDraft && (
            <div className="border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-sm font-bold text-tiki-brown mb-1">Save Official Profile Draft</h5>
                  <p className="text-xs text-tiki-brown/60">
                    This saves profile fields to the character JSON. Does not approve or publish the character.
                  </p>
                </div>
                <button
                  onClick={handleSave}
                  disabled={!canSave}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-colors ${
                    canSave
                      ? "bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25"
                      : "bg-tiki-brown/8 text-tiki-brown/40 cursor-not-allowed"
                  }`}
                >
                  {saveState.status === "saving" ? "Saving..." : "Save Profile Draft"}
                </button>
              </div>

              {saveState.status === "error" && (
                <div className="bg-warm-coral/10 border border-warm-coral/30 rounded-lg p-3 mt-3">
                  <p className="text-sm text-warm-coral/80">{saveState.message}</p>
                </div>
              )}

              {saveState.status === "saved" && (
                <div className="bg-tropical-green/8 border border-tropical-green/20 rounded-lg p-3 mt-3">
                  <p className="text-sm text-tropical-green/80">
                    Profile saved! Commit: {saveState.commitMessage}
                  </p>
                  {saveState.htmlUrl && (
                    <a
                      href={saveState.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-tropical-green underline hover:text-tropical-green/80"
                    >
                      View on GitHub
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function OfficialCharacterProfileBuilder({
  characters,
  approvedRefsBySlug,
}: {
  characters: Character[];
  approvedRefsBySlug: Record<string, UploadedReferenceAsset[]>;
}) {
  const charactersWithRefs = characters.filter((c) => {
    const hasProfileSheet = c.image?.profileSheet;
    const hasPrimaryId = c.primaryReferenceAssetId;
    return hasProfileSheet || hasPrimaryId;
  });

  if (charactersWithRefs.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6">
        <div className="text-center py-8">
          <p className="text-sm text-tiki-brown/50">
            No characters with primary references yet. Assign primary references first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">📝</span>
        <h2 className="text-base font-black text-tiki-brown">Official Character Profile Builder</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">Admin Only</span>
      </div>
      <p className="text-sm text-tiki-brown/60 leading-relaxed">
        Generate complete official character profile drafts from assigned Primary Official References.
        AI-generated profiles must be reviewed by admin before character approval. Review visual details
        and color values against the official reference.
      </p>
      <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-4">
        <span className="text-base flex-shrink-0">💡</span>
        <p className="text-sm text-tiki-brown/70 leading-relaxed">
          <strong className="font-bold">Important:</strong> This generates metadata only. No images are created.
          Character approval and publishing happen separately.
        </p>
      </div>
      <div className="space-y-3">
        {charactersWithRefs.map((character) => (
          <OfficialProfileRow
            key={character.slug}
            character={character}
            approvedAssets={approvedRefsBySlug[character.slug] || []}
          />
        ))}
      </div>
    </div>
  );
}