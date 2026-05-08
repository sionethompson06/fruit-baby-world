"use client";

import { useState } from "react";
import type { Character } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalMode = "draft" | "stories-only" | "stories-and-generation" | "public";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; commitMessage: string; path: string }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function modeFromCharacter(c: Character): ApprovalMode {
  if (c.publicUseAllowed === true || c.publicStatus === "public") return "public";
  if (c.approvedForGeneration === true || c.generationUseAllowed === true) return "stories-and-generation";
  if (c.approvedForStories === true) return "stories-only";
  return "draft";
}

function modeLabel(m: ApprovalMode): string {
  switch (m) {
    case "draft": return "Draft / Private";
    case "stories-only": return "Approve for Stories Only";
    case "stories-and-generation": return "Approve for Stories + Generation";
    case "public": return "Publish Character Publicly";
  }
}

function modeApprovalData(m: ApprovalMode) {
  switch (m) {
    case "draft":
      return {
        status: "draft" as const,
        canonStatus: "draft",
        publicStatus: "private",
        approvedForStories: false,
        approvedForGeneration: false,
        referenceAssetsReviewed: false,
        generationUseAllowed: false,
        publicUseAllowed: false,
      };
    case "stories-only":
      return {
        status: "approved" as const,
        canonStatus: "approved",
        publicStatus: "private",
        approvedForStories: true,
        approvedForGeneration: false,
        referenceAssetsReviewed: true,
        generationUseAllowed: false,
        publicUseAllowed: false,
      };
    case "stories-and-generation":
      return {
        status: "approved" as const,
        canonStatus: "approved",
        publicStatus: "private",
        approvedForStories: true,
        approvedForGeneration: true,
        referenceAssetsReviewed: true,
        generationUseAllowed: true,
        publicUseAllowed: false,
      };
    case "public":
      return {
        status: "approved" as const,
        canonStatus: "approved",
        publicStatus: "public",
        approvedForStories: true,
        approvedForGeneration: true,
        referenceAssetsReviewed: true,
        generationUseAllowed: true,
        publicUseAllowed: true,
      };
  }
}

function currentStatusSummary(c: Character): string {
  if (c.publicUseAllowed === true || c.publicStatus === "public") return "Public";
  if (c.approvedForGeneration === true) return "Stories + Generation";
  if (c.approvedForStories === true) return "Stories Only";
  return "Draft / Private";
}

function currentStatusBadgeClass(c: Character): string {
  if (c.publicUseAllowed === true || c.publicStatus === "public")
    return "bg-tropical-green/15 text-tropical-green";
  if (c.approvedForGeneration === true)
    return "bg-sky-blue/20 text-tiki-brown/65";
  if (c.approvedForStories === true)
    return "bg-ube-purple/12 text-ube-purple";
  return "bg-warm-coral/15 text-warm-coral/80";
}

// ─── Per-character row ────────────────────────────────────────────────────────

function CharacterApprovalRow({
  character,
  approvedRefCount,
  isOfficialCharacter,
}: {
  character: Character;
  approvedRefCount: number;
  isOfficialCharacter: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<ApprovalMode>(modeFromCharacter(character));
  const [approvalNotes, setApprovalNotes] = useState(character.approvalNotes ?? "");
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const isSubmitting = submitState.status === "submitting";

  const needsApprovedRefs =
    (mode === "stories-and-generation" || mode === "public") &&
    approvedRefCount === 0;

  async function handleSave() {
    if (needsApprovedRefs) return;
    setSubmitState({ status: "submitting" });

    const approvalData = {
      ...modeApprovalData(mode),
      approvalNotes: approvalNotes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/github/update-character-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: character.slug,
          approval: approvalData,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; commitMessage: string; path: string; notes: string[] }
        | { ok: false; message: string };

      if (data.ok) {
        setSubmitState({
          status: "success",
          commitMessage: data.commitMessage,
          path: data.path,
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
            <p className="text-sm font-bold text-tiki-brown leading-tight">{character.name}</p>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${currentStatusBadgeClass(character)}`}
            >
              {currentStatusSummary(character)}
            </span>
            {isOfficialCharacter && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/65 uppercase tracking-wide">
                Official
              </span>
            )}
          </div>
          <p className="text-xs text-tiki-brown/45 font-mono">{character.slug}</p>
          <p className="text-xs text-tiki-brown/50">
            Approved refs: <strong className={approvedRefCount > 0 ? "text-tropical-green" : "text-warm-coral/70"}>{approvedRefCount}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {submitState.status === "success" && !expanded && (
            <span className="text-xs font-bold text-tropical-green">Saved ✓</span>
          )}
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              if (submitState.status === "error") setSubmitState({ status: "idle" });
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
                <strong className="font-bold">Official character.</strong> Changes to official
                characters affect their canonical status. Only save intentional changes.
              </p>
            </div>
          )}

          {/* Error state */}
          {submitState.status === "error" && (
            <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">
                {submitState.message}
              </p>
            </div>
          )}

          {/* Mode selector */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
              Approval Mode
            </p>
            <div className="flex flex-col gap-2">
              {(
                [
                  "draft",
                  "stories-only",
                  "stories-and-generation",
                  "public",
                ] as ApprovalMode[]
              ).map((m) => {
                const needsRefs = (m === "stories-and-generation" || m === "public") && approvedRefCount === 0;
                return (
                  <button
                    key={m}
                    type="button"
                    disabled={isSubmitting || needsRefs}
                    onClick={() => setMode(m)}
                    className={`text-left px-4 py-2.5 rounded-xl border transition-colors text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${
                      mode === m
                        ? m === "draft"
                          ? "bg-warm-coral/15 border-warm-coral/40 text-tiki-brown"
                          : m === "public"
                          ? "bg-tropical-green/15 border-tropical-green/35 text-tropical-green"
                          : "bg-ube-purple/12 border-ube-purple/30 text-ube-purple"
                        : "bg-white border-tiki-brown/15 text-tiki-brown/60 hover:border-tiki-brown/25"
                    }`}
                  >
                    <span className="font-bold">{modeLabel(m)}</span>
                    {needsRefs && (
                      <span className="ml-2 text-warm-coral/70 font-normal">
                        — requires approved reference assets
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Generation approval warning */}
          {(mode === "stories-and-generation" || mode === "public") && (
            <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/35 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">🖼️</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Generation approval.</strong> Only approve a character
                for generation after official or brand-approved reference assets have been reviewed.
                {approvedRefCount > 0 ? (
                  <span className="text-tropical-green font-semibold ml-1">
                    {approvedRefCount} approved reference{approvedRefCount !== 1 ? "s" : ""} found ✓
                  </span>
                ) : (
                  <span className="text-warm-coral/80 font-semibold ml-1">
                    No approved references — review assets first.
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Public warning */}
          {mode === "public" && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">🌐</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Publishing a character</strong> makes it visible on
                the public character pages after the next Vercel redeploy.
              </p>
            </div>
          )}

          {/* Approval notes */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Approval Notes (optional)
            </p>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="Notes about this approval decision, reference review status, or brand alignment"
              maxLength={500}
              rows={2}
              disabled={isSubmitting}
              className="w-full text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 resize-none disabled:opacity-50"
            />
          </div>

          {/* Save */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || needsApprovedRefs}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving character approval…" : "Save Character Approval"}
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
                <p className="text-xs font-bold text-tiki-brown/80">Character approval saved.</p>
                <p className="text-xs text-tiki-brown/55">{submitState.commitMessage}</p>
                <p className="text-xs font-mono text-tiki-brown/40">{submitState.path}</p>
                <p className="text-xs text-tiki-brown/50 italic">
                  After Vercel redeploys, availability updates across public/admin pages.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel component ─────────────────────────────────────────────────────

export default function CharacterApprovalPanel({
  characters,
  approvedRefCounts,
  officialSlugs,
}: {
  characters: Character[];
  approvedRefCounts: Record<string, number>;
  officialSlugs: Set<string>;
}) {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">✅</span>
        <h2 className="text-base font-black text-tiki-brown">Character Approval</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          Admin Only
        </span>
      </div>

      <p className="text-sm text-tiki-brown/60 leading-relaxed">
        Approve or unapprove characters for story use, generation, and public display. Generation
        approval requires at least one reviewed and approved reference asset.
      </p>

      {/* Fidelity notice */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">⚠️</span>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          Only approve a character when the profile is brand-aligned, reference assets are reviewed,
          visual identity is clear, and character rules protect canon fidelity. Do not approve
          characters that lack approved references for generation or introduce off-brand concepts.
        </p>
      </div>

      {/* Character rows */}
      <div className="flex flex-col gap-3">
        {characters.map((c) => (
          <CharacterApprovalRow
            key={c.slug}
            character={c}
            approvedRefCount={approvedRefCounts[c.slug] ?? 0}
            isOfficialCharacter={officialSlugs.has(c.slug)}
          />
        ))}
      </div>

      {characters.length === 0 && (
        <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm text-tiki-brown/40 italic">No characters found.</p>
        </div>
      )}
    </div>
  );
}
