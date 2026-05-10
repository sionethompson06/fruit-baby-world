"use client";

import { useState } from "react";
import type { Character } from "@/lib/content";
import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";
import {
  characterHasPrimaryReference,
  getCharacterApprovalMode,
} from "@/lib/characterReadiness";

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | {
      status: "success";
      commitMessage: string;
      path: string;
      assetTitle: string;
      characterName: string;
    }
  | { status: "error"; message: string };

// ─── Per-character row ──────────────────────────────────────────────────────────────

function PrimaryReferenceRow({
  character,
  approvedAssets,
}: {
  character: Character;
  approvedAssets: UploadedReferenceAsset[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const hasPrimaryRef = characterHasPrimaryReference(character);
  const hasAny = approvedAssets.length > 0;
  const currentPrimaryId = character.primaryReferenceAssetId;
  const isDraft = getCharacterApprovalMode(character) === "draft";

  async function handleAssign(
    asset: UploadedReferenceAsset,
    role: "primary-profile" | "primary-main"
  ) {
    setSubmittingId(asset.id);
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/github/assign-primary-character-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: character.slug,
          assetId: asset.id,
          referenceRole: role,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; commitMessage: string; path: string }
        | { ok: false; message: string };

      if (data.ok) {
        setSubmitState({
          status: "success",
          commitMessage: data.commitMessage,
          path: data.path,
          assetTitle: asset.title,
          characterName: character.name,
        });
        setExpanded(false);
      } else {
        setSubmitState({ status: "error", message: data.message });
      }
    } catch {
      setSubmitState({
        status: "error",
        message: "Something went wrong while assigning the primary reference.",
      });
    } finally {
      setSubmittingId(null);
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
            {hasPrimaryRef ? (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                Primary Assigned ✓
              </span>
            ) : (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
                No Primary Reference
              </span>
            )}
            <span className="text-xs font-mono text-tiki-brown/35">
              {character.slug}
            </span>
          </div>
          <p className="text-xs text-tiki-brown/50">
            Approved assets:{" "}
            <strong
              className={
                hasAny ? "text-tropical-green" : "text-tiki-brown/40"
              }
            >
              {approvedAssets.length}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {submitState.status === "success" && !expanded && (
            <span className="text-xs font-bold text-tropical-green">
              Assigned ✓
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setExpanded((v) => !v);
              if (submitState.status === "error")
                setSubmitState({ status: "idle" });
            }}
            disabled={!hasAny}
            className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/12 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {expanded ? "Close" : "Assign Reference"}
          </button>
        </div>
      </div>

      {/* Edit panel */}
      {expanded && (
        <div className="border-t border-tiki-brown/8 bg-tiki-brown/3 p-4 flex flex-col gap-4">

          {/* Guidance */}
          <div className="flex items-start gap-2.5 bg-sky-blue/8 border border-sky-blue/15 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">💡</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              The{" "}
              <strong className="font-semibold">
                Primary Official Reference
              </strong>{" "}
              is the image shown as this character&apos;s official profile
              reference. Supplemental approved references remain available for
              future generation fidelity but are not shown as the main profile
              automatically.
            </p>
          </div>

          {/* Draft warning */}
          {isDraft && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                Assigning a primary reference does not approve or publish this
                character. Use{" "}
                <strong className="font-semibold">Character Approval</strong>{" "}
                separately.
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

          {/* Asset list */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
              Approved Reference Assets
            </p>
            <div className="flex flex-col gap-2">
              {approvedAssets.map((asset) => {
                const isSubmitting = submittingId === asset.id;
                const assetUrl =
                  asset.blobUrl ||
                  (asset as unknown as Record<string, string>).url ||
                  "";
                const isCurrentPrimary = currentPrimaryId === asset.id;

                return (
                  <div
                    key={asset.id}
                    className={`border rounded-xl p-3 flex flex-col gap-2 bg-white ${
                      isCurrentPrimary
                        ? "border-tropical-green/30 bg-tropical-green/3"
                        : "border-tiki-brown/10"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {assetUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={assetUrl}
                          alt={asset.title}
                          className="w-14 h-14 object-cover rounded-lg flex-shrink-0 border border-tiki-brown/10"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-tiki-brown">
                            {asset.title}
                          </p>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-tiki-brown/8 text-tiki-brown/50 font-mono">
                            {asset.assetType}
                          </span>
                          {isCurrentPrimary && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                              Current Primary
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-tiki-brown/30 truncate mt-0.5">
                          {asset.id}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleAssign(asset, "primary-profile")}
                        disabled={isSubmitting}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSubmitting
                          ? "Assigning…"
                          : "Set as Primary Profile Reference"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Success */}
          {submitState.status === "success" && (
            <div className="flex items-start gap-3 bg-tropical-green/10 border border-tropical-green/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">✅</span>
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-bold text-tiki-brown/80">
                  Primary reference assigned.
                </p>
                <p className="text-xs text-tiki-brown/60">
                  <strong>{submitState.assetTitle}</strong> →{" "}
                  {submitState.characterName}
                </p>
                <p className="text-xs text-tiki-brown/55">
                  {submitState.commitMessage}
                </p>
                <p className="text-xs font-mono text-tiki-brown/35">
                  {submitState.path}
                </p>
                <p className="text-xs text-tiki-brown/45 italic">
                  The character was not automatically approved or published.
                  Vercel redeploy is required before profile display updates.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────────────

export default function PrimaryReferenceAssignPanel({
  characters,
  approvedRefsBySlug,
}: {
  characters: Character[];
  approvedRefsBySlug: Record<string, UploadedReferenceAsset[]>;
}) {
  const totalApproved = Object.values(approvedRefsBySlug).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">🖼️</span>
        <h2 className="text-base font-black text-tiki-brown">
          Primary Official Reference
        </h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          Admin Only
        </span>
      </div>

      <p className="text-sm text-tiki-brown/60 leading-relaxed">
        Assign one approved uploaded reference asset as the{" "}
        <strong className="font-semibold">
          Primary Official Profile Reference
        </strong>{" "}
        for each character. This updates the character&apos;s JSON{" "}
        <code className="text-xs font-mono bg-tiki-brown/8 px-1 py-0.5 rounded">
          image.profileSheet
        </code>{" "}
        field so it renders on the character profile page. Supplemental
        approved references are not shown publicly.
      </p>

      {totalApproved === 0 ? (
        <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm text-tiki-brown/40 italic">
            No approved reference assets found. Upload and approve reference
            assets first.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {characters.map((c) => (
            <PrimaryReferenceRow
              key={c.slug}
              character={c}
              approvedAssets={approvedRefsBySlug[c.slug] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
