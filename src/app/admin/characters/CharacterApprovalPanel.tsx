"use client";

import { useState } from "react";
import type { Character } from "@/lib/content";
import {
  getCharacterApprovalMode,
  getCharacterStatusLabel,
  getCharacterStatusBadgeClass,
  type CharacterApprovalMode,
} from "@/lib/characterReadiness";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      commitMessage: string;
      path: string;
      characterName: string;
      approvalMode: CharacterApprovalMode;
      generationReady: boolean;
    }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MODE_DESCRIPTIONS: Record<CharacterApprovalMode, string> = {
  draft: "Private, not active. Hidden from public and admin generation.",
  "official-internal": "Protected. Usable by admin in generation workflows, but not visible publicly.",
  public: "Visible on public pages. Available for approved generation workflows.",
  archived: "Inactive. Hidden from all views.",
};

// ─── Per-character approval row ───────────────────────────────────────────────

export function CharacterApprovalRow({
  character,
  approvedRefCount,
  builtInRefValid,
  isOfficialCharacter,
}: {
  character: Character;
  approvedRefCount: number;
  builtInRefValid: boolean;
  isOfficialCharacter: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<CharacterApprovalMode>(
    getCharacterApprovalMode(character)
  );
  const [approvalNotes, setApprovalNotes] = useState(
    character.approvalNotes ?? ""
  );
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
  });

  const isSubmitting = submitState.status === "submitting";
  const hasRef = approvedRefCount > 0 || builtInRefValid;
  const currentMode = getCharacterApprovalMode(character);
  const generationReady =
    (currentMode === "official-internal" || currentMode === "public") && hasRef;

  const needsRefWarning =
    (mode === "official-internal" || mode === "public") && !hasRef;

  async function handleSave() {
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/github/update-character-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: character.slug,
          approvalMode: mode,
          approvalNotes: approvalNotes.trim() || undefined,
        }),
      });
      const data = (await res.json()) as
        | {
            ok: true;
            commitMessage: string;
            path: string;
            approvalMode: CharacterApprovalMode;
            generationReady: boolean;
          }
        | { ok: false; message: string };

      if (data.ok) {
        setSubmitState({
          status: "success",
          commitMessage: data.commitMessage,
          path: data.path,
          characterName: character.name,
          approvalMode: data.approvalMode,
          generationReady: data.generationReady,
        });
        setExpanded(false);
      } else {
        setSubmitState({ status: "error", message: data.message });
      }
    } catch {
      setSubmitState({
        status: "error",
        message: "Something went wrong while saving character approval.",
      });
    }
  }

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">

      {/* Summary row */}
      <div className="p-4 bg-white flex flex-wrap items-start gap-3">
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-tiki-brown leading-tight">
              {character.name}
            </p>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getCharacterStatusBadgeClass(character)}`}
            >
              {getCharacterStatusLabel(character)}
            </span>
            {isOfficialCharacter && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/65 uppercase tracking-wide">
                Official
              </span>
            )}
            {generationReady ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/12 text-tropical-green uppercase tracking-wide">
                Generation Ready
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
                Needs Approved Reference
              </span>
            )}
          </div>
          <p className="text-xs text-tiki-brown/45 font-mono">{character.slug}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs text-tiki-brown/50">
              Approved refs:{" "}
              <strong
                className={
                  approvedRefCount > 0
                    ? "text-tropical-green"
                    : "text-tiki-brown/40"
                }
              >
                {approvedRefCount}
              </strong>
            </p>
            {builtInRefValid && (
              <span className="text-xs text-tiki-brown/50">
                Built-in ref:{" "}
                <strong className="text-tropical-green">✓</strong>
              </span>
            )}
            <span
              className={`text-xs font-semibold ${
                currentMode === "public"
                  ? "text-tropical-green"
                  : "text-tiki-brown/40"
              }`}
            >
              {currentMode === "public" ? "Public ✓" : "Private"}
            </span>
          </div>
          {character.approvalNotes && (
            <p className="text-xs text-tiki-brown/40 italic truncate max-w-xs">
              {character.approvalNotes}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {submitState.status === "success" && !expanded && (
            <span className="text-xs font-bold text-tropical-green">
              Saved ✓
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              if (submitState.status === "error")
                setSubmitState({ status: "idle" });
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/12 transition-colors"
          >
            {expanded ? "Close" : "Edit Approval"}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div className="border-t border-tiki-brown/8 bg-tiki-brown/3 p-4 flex flex-col gap-4">

          {/* Official character warning */}
          {isOfficialCharacter && (
            <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/35 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Official character.</strong> Only
                save intentional changes. Changing an official character away from
                Public will hide it after the next redeploy.
              </p>
            </div>
          )}

          {/* Error */}
          {submitState.status === "error" && (
            <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">
                {submitState.message}
              </p>
            </div>
          )}

          {/* Generation-ready explanation */}
          <div className="flex items-start gap-2.5 bg-tiki-brown/4 border border-tiki-brown/8 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">💡</span>
            <p className="text-xs text-tiki-brown/60 leading-relaxed">
              Generation-ready means the character is Official Internal or Public
              and has at least one approved reference asset or valid official
              reference.
            </p>
          </div>

          {/* Mode selector */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
              Character Status
            </p>
            <div className="flex flex-col gap-2">
              {(
                [
                  "draft",
                  "official-internal",
                  "public",
                  "archived",
                ] as CharacterApprovalMode[]
              ).map((m) => {
                const requiresRef =
                  m === "official-internal" || m === "public";
                const blocked = requiresRef && !hasRef;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isSubmitting || blocked}
                    onClick={() => setMode(m)}
                    className={`text-left px-4 py-2.5 rounded-xl border transition-colors text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                      mode === m
                        ? m === "draft"
                          ? "bg-warm-coral/15 border-warm-coral/40 text-tiki-brown"
                          : m === "public"
                          ? "bg-tropical-green/15 border-tropical-green/35 text-tropical-green"
                          : m === "archived"
                          ? "bg-tiki-brown/15 border-tiki-brown/25 text-tiki-brown/65"
                          : "bg-sky-blue/20 border-sky-blue/40 text-tiki-brown/75"
                        : "bg-white border-tiki-brown/15 text-tiki-brown/60 hover:border-tiki-brown/25"
                    }`}
                  >
                    <span className="font-bold block">{getCharacterStatusLabel({
                      approvalMode: m,
                    } as Character)}</span>
                    <span className="font-normal text-tiki-brown/45 block leading-snug mt-0.5">
                      {MODE_DESCRIPTIONS[m]}
                    </span>
                    {blocked && (
                      <span className="block text-warm-coral/70 font-normal mt-0.5">
                        — requires approved reference or built-in reference
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ref warning */}
          {needsRefWarning && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                No approved reference assets or valid built-in references found.
                Upload and approve reference assets first.
              </p>
            </div>
          )}

          {/* Gen-ready confirmation */}
          {(mode === "official-internal" || mode === "public") && hasRef && (
            <div className="flex items-start gap-2.5 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">✅</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                {approvedRefCount > 0 && (
                  <span>
                    {approvedRefCount} approved reference asset
                    {approvedRefCount !== 1 ? "s" : ""}
                  </span>
                )}
                {approvedRefCount > 0 && builtInRefValid && <span> + </span>}
                {builtInRefValid && <span>built-in reference image</span>}
                <span className="text-tropical-green font-semibold ml-1">
                  — generation-ready ✓
                </span>
              </p>
            </div>
          )}

          {/* Public publishing warning */}
          {mode === "public" && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">🌐</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Publishing a character</strong>{" "}
                makes it visible on public character pages after the next Vercel
                redeploy.
              </p>
            </div>
          )}

          {/* Technical compatibility fields — collapsed */}
          <details className="group">
            <summary className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide cursor-pointer select-none list-none flex items-center gap-1">
              <span className="group-open:hidden">▶</span>
              <span className="hidden group-open:inline">▼</span>
              Technical compatibility fields
            </summary>
            <div className="mt-2 bg-white border border-tiki-brown/8 rounded-xl px-4 py-3 flex flex-col gap-1">
              {[
                ["status", mode === "public" ? "active" : mode === "official-internal" ? "approved" : mode],
                ["canonStatus", mode],
                ["publicStatus", mode === "public" ? "public" : "private"],
                ["approvedForStories", String(mode === "official-internal" || mode === "public")],
                ["approvedForGeneration", String(mode === "official-internal" || mode === "public")],
                ["generationUseAllowed", String(mode === "official-internal" || mode === "public")],
                ["publicUseAllowed", String(mode === "public")],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-tiki-brown/45">{k}</span>
                  <span className="text-xs font-mono font-bold text-tiki-brown/65">{v}</span>
                </div>
              ))}
            </div>
          </details>

          {/* Approval notes */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Approval Notes (optional)
            </p>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Notes about this approval decision, reference review, or brand alignment"
              maxLength={1000}
              rows={2}
              disabled={isSubmitting}
              className="w-full text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 resize-none disabled:opacity-50"
            />
          </div>

          {/* Save / cancel */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || needsRefWarning}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving character approval…"
                : "Save Character Approval"}
            </button>
            <button
              type="button"
              onClick={() => {
                setExpanded(false);
                setSubmitState({ status: "idle" });
              }}
              disabled={isSubmitting}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/12 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>

          {/* Success detail */}
          {submitState.status === "success" && (
            <div className="flex items-start gap-3 bg-tropical-green/10 border border-tropical-green/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">✅</span>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold text-tiki-brown/80">
                  Character status saved.
                </p>
                <p className="text-xs text-tiki-brown/60">
                  {submitState.characterName} —
                  {submitState.approvalMode === "draft" && " Draft"}
                  {submitState.approvalMode === "official-internal" && " Official Internal"}
                  {submitState.approvalMode === "public" && " Public"}
                  {submitState.approvalMode === "archived" && " Archived"}
                  <span className="ml-1">·</span>
                  {" "}Generation:{" "}
                  {submitState.generationReady ? (
                    <span className="text-tropical-green font-bold">
                      Ready ✓
                    </span>
                  ) : (
                    <span className="text-tiki-brown/45">Not ready</span>
                  )}
                </p>
                <p className="text-xs text-tiki-brown/55">
                  {submitState.commitMessage}
                </p>
                <p className="text-xs font-mono text-tiki-brown/35">
                  {submitState.path}
                </p>
                <p className="text-xs text-tiki-brown/45 italic">
                  After Vercel redeploys, availability updates across
                  public/admin pages.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function CharacterApprovalPanel({
  characters,
  approvedRefCounts,
  builtInRefValid,
  officialSlugs,
}: {
  characters: Character[];
  approvedRefCounts: Record<string, number>;
  builtInRefValid: Record<string, boolean>;
  officialSlugs: Set<string>;
}) {
  const stats = characters.reduce(
    (acc, c) => {
      const m = getCharacterApprovalMode(c);
      acc[m] = (acc[m] ?? 0) + 1;
      const hasRef =
        (approvedRefCounts[c.slug] ?? 0) > 0 ||
        (builtInRefValid[c.slug] ?? false);
      if ((m === "official-internal" || m === "public") && hasRef)
        acc.generationReady++;
      if ((m === "official-internal" || m === "public") && !hasRef)
        acc.needsRef++;
      return acc;
    },
    {
      draft: 0,
      "official-internal": 0,
      public: 0,
      archived: 0,
      generationReady: 0,
      needsRef: 0,
    } as Record<string, number>
  );

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">✅</span>
        <h2 className="text-base font-black text-tiki-brown">
          Character Approval
        </h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          Admin Only
        </span>
      </div>

      <p className="text-sm text-tiki-brown/60 leading-relaxed">
        Set each character's approval mode. Use{" "}
        <strong className="font-semibold">Official Internal</strong> for admin
        story/media planning, and{" "}
        <strong className="font-semibold">Public</strong> to make a character
        visible on public character pages after redeploy.
      </p>

      {/* Summary stats */}
      {characters.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(
            [
              ["Total", characters.length, undefined],
              ["Draft", stats.draft, stats.draft === 0],
              ["Offic. Int.", stats["official-internal"], stats["official-internal"] > 0],
              ["Public", stats.public, stats.public > 0],
              ["Archived", stats.archived, stats.archived === 0],
              ["Gen Ready", stats.generationReady, stats.generationReady > 0],
            ] as [string, number, boolean | undefined][]
          ).map(([label, value, positive]) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-center border ${
                positive === true
                  ? "bg-tropical-green/8 border-tropical-green/20"
                  : positive === false && value > 0
                  ? "bg-warm-coral/8 border-warm-coral/20"
                  : "bg-tiki-brown/4 border-tiki-brown/8"
              }`}
            >
              <span
                className={`text-base font-black ${
                  positive === true
                    ? "text-tropical-green"
                    : positive === false && value > 0
                    ? "text-warm-coral/80"
                    : "text-tiki-brown"
                }`}
              >
                {value}
              </span>
              <span className="text-xs font-semibold text-tiki-brown/40 uppercase tracking-wide leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Needs-ref warning */}
      {stats.needsRef > 0 && (
        <div className="flex items-start gap-2.5 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-4 py-3">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            <strong className="font-bold">
              {stats.needsRef} character
              {stats.needsRef !== 1 ? "s" : ""}
            </strong>{" "}
            approved for internal/public use but missing reference assets.
            Upload and approve reference assets for these characters.
          </p>
        </div>
      )}

      {/* Fidelity notice */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">⚠️</span>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          Only approve a character when the profile is brand-aligned, reference
          assets are reviewed, visual identity is clear, and character rules
          protect canon fidelity. Do not approve characters that lack approved
          references, introduce off-brand concepts, or conflict with existing
          official characters.
        </p>
      </div>

      {/* Character rows */}
      <div className="flex flex-col gap-3">
        {characters.map((c) => (
          <CharacterApprovalRow
            key={c.slug}
            character={c}
            approvedRefCount={approvedRefCounts[c.slug] ?? 0}
            builtInRefValid={builtInRefValid[c.slug] ?? false}
            isOfficialCharacter={officialSlugs.has(c.slug)}
          />
        ))}
      </div>

      {characters.length === 0 && (
        <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm text-tiki-brown/40 italic">
            No characters found.
          </p>
        </div>
      )}
    </div>
  );
}
