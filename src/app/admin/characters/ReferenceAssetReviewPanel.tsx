"use client";

import { useState } from "react";
import type { UploadedReferenceAsset, ReviewStatus } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewFormState = {
  reviewStatus: ReviewStatus;
  approvedForGeneration: boolean;
  generationUseAllowed: boolean;
  publicUseAllowed: boolean;
  isOfficialReference: boolean;
  reviewNotes: string;
};

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; commitMessage: string; path: string; assetTitle: string; reviewStatus: ReviewStatus; generationUseAllowed: boolean }
  | { status: "error"; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadgeClass(s: ReviewStatus): string {
  switch (s) {
    case "approved-for-generation": return "bg-tropical-green/15 text-tropical-green";
    case "rejected": return "bg-warm-coral/20 text-warm-coral/80";
    case "archived": return "bg-tiki-brown/12 text-tiki-brown/50";
    default: return "bg-pineapple-yellow/25 text-tiki-brown/65";
  }
}

function statusLabel(s: ReviewStatus): string {
  switch (s) {
    case "approved-for-generation": return "Approved for Generation";
    case "rejected": return "Rejected";
    case "archived": return "Archived";
    default: return "Needs Review";
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(1)} KB`;
}

// ─── Per-asset review card ────────────────────────────────────────────────────

function AssetReviewCard({
  asset,
  isDraftCharacter,
  onReviewed,
}: {
  asset: UploadedReferenceAsset;
  isDraftCharacter: boolean;
  onReviewed: (updated: UploadedReferenceAsset) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState<ReviewFormState>({
    reviewStatus: asset.reviewStatus,
    approvedForGeneration: asset.approvedForGeneration,
    generationUseAllowed: asset.generationUseAllowed ?? false,
    publicUseAllowed: asset.publicUseAllowed ?? false,
    isOfficialReference: asset.isOfficialReference ?? false,
    reviewNotes: asset.reviewNotes ?? "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const isApprovingForGeneration = form.reviewStatus === "approved-for-generation";
  const isSubmitting = submitState.status === "submitting";

  function setReviewStatus(s: ReviewStatus) {
    const genAllowed = s === "approved-for-generation";
    setForm((f) => ({
      ...f,
      reviewStatus: s,
      approvedForGeneration: genAllowed,
      generationUseAllowed: genAllowed ? f.generationUseAllowed : false,
      publicUseAllowed: genAllowed ? f.publicUseAllowed : false,
    }));
  }

  async function handleSubmit() {
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/reference-assets/review-character-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          reviewStatus: form.reviewStatus,
          approvedForGeneration: form.approvedForGeneration,
          generationUseAllowed: form.generationUseAllowed,
          publicUseAllowed: form.publicUseAllowed,
          isOfficialReference: form.isOfficialReference,
          reviewNotes: form.reviewNotes,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; status: string; asset: UploadedReferenceAsset; commitMessage: string; path: string }
        | { ok: false; message: string };

      if (data.ok) {
        setSubmitState({
          status: "success",
          commitMessage: data.commitMessage,
          path: data.path,
          assetTitle: data.asset.title || asset.title,
          reviewStatus: data.asset.reviewStatus,
          generationUseAllowed: data.asset.generationUseAllowed ?? false,
        });
        onReviewed(data.asset);
        setExpanded(false);
      } else {
        setSubmitState({ status: "error", message: data.message });
      }
    } catch {
      setSubmitState({
        status: "error",
        message: "Something went wrong while saving the reference review.",
      });
    }
  }

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">

      {/* Asset header row */}
      <div className="p-4 flex flex-col gap-3 bg-white">
        <div className="flex items-start gap-3 flex-wrap">

          {/* Preview thumbnail */}
          <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-tiki-brown/10 bg-tiki-brown/4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={asset.blobUrl}
              alt={asset.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <p className="text-sm font-bold text-tiki-brown leading-tight">{asset.title}</p>
            <p className="text-xs text-tiki-brown/50">
              {asset.characterSlug} · {asset.assetType}
            </p>
            <p className="text-xs font-mono text-tiki-brown/35">
              {formatBytes(asset.fileSizeBytes)} · {asset.mimeType.replace("image/", "").toUpperCase()}
            </p>
            {asset.uploadedAt && (
              <p className="text-xs text-tiki-brown/30">
                Uploaded {new Date(asset.uploadedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Status badges + actions */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${statusBadgeClass(asset.reviewStatus)}`}>
              {statusLabel(asset.reviewStatus)}
            </span>
            {asset.approvedForGeneration && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/12 text-tropical-green uppercase tracking-wide">
                Gen OK
              </span>
            )}
            {asset.generationUseAllowed && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-blue/20 text-tiki-brown/60 uppercase tracking-wide">
                Gen Use ✓
              </span>
            )}
            {asset.isOfficialReference && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/12 text-ube-purple uppercase tracking-wide">
                Official Ref
              </span>
            )}
            {!asset.publicUseAllowed && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/6 text-tiki-brown/40 uppercase tracking-wide">
                Public: No
              </span>
            )}
            <a
              href={asset.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              Open →
            </a>
            <button
              type="button"
              onClick={() => {
                setExpanded((v) => !v);
                if (submitState.status === "error") setSubmitState({ status: "idle" });
              }}
              className="text-xs font-bold px-2 py-1 rounded-lg bg-tiki-brown/6 text-tiki-brown/60 hover:bg-tiki-brown/10 transition-colors"
            >
              {expanded ? "Close" : "Review"}
            </button>
          </div>
        </div>

        {/* Description / review notes / review date */}
        {asset.description && (
          <p className="text-xs text-tiki-brown/55 leading-relaxed">{asset.description}</p>
        )}
        {asset.reviewNotes && (
          <p className="text-xs text-tiki-brown/45 italic leading-relaxed border-t border-tiki-brown/6 pt-2">
            Review notes: {asset.reviewNotes}
          </p>
        )}
        {asset.reviewedAt && (
          <p className="text-xs text-tiki-brown/30">
            Reviewed {new Date(asset.reviewedAt).toLocaleString()}
          </p>
        )}

        {/* Success summary */}
        {submitState.status === "success" && !expanded && (
          <div className="flex items-start gap-2 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <div className="flex flex-col gap-0.5">
              <p className="text-xs font-bold text-tiki-brown/75">Reference review saved.</p>
              <p className="text-xs text-tiki-brown/55">
                Status: <strong>{statusLabel(submitState.reviewStatus)}</strong> ·{" "}
                Generation use: <strong>{submitState.generationUseAllowed ? "Allowed" : "Not allowed"}</strong>
              </p>
              <p className="text-xs font-mono text-tiki-brown/35">{submitState.path}</p>
              <p className="text-xs text-tiki-brown/45 italic">
                A future phase will connect approved reference assets to generation.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Inline review form */}
      {expanded && (
        <div className="border-t border-tiki-brown/8 bg-tiki-brown/3 p-4 flex flex-col gap-4">

          {/* Fidelity guidance */}
          <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs text-tiki-brown/70 leading-relaxed">
              Only approve assets that are creator-provided, brand-approved, and visually faithful to
              the official Fruit Baby character. Do not approve random AI interpretations as official
              generation references.
            </p>
          </div>

          {/* Tiki-specific warning */}
          {(asset.characterSlug === "tiki" || asset.characterSlug === "tiki-trouble") && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/20 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚡</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Tiki Trouble:</strong> References must remain mischievous,
                funny, dramatic, and kid-friendly. Do not approve references that make Tiki scary,
                violent, horror-like, cruel, evil, or too intense.
              </p>
            </div>
          )}

          {/* Draft character warning */}
          {isDraftCharacter && (
            <div className="flex items-start gap-2.5 bg-sky-blue/12 border border-sky-blue/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">📝</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Draft character.</strong> Approving this reference asset
                does not approve or publish the character. Character approval is handled separately.
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

          {/* Review decision */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
              Review Decision
            </p>
            <div className="flex flex-wrap gap-2">
              {(["needs-review", "approved-for-generation", "rejected", "archived"] as ReviewStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setReviewStatus(s)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                    form.reviewStatus === s
                      ? s === "approved-for-generation"
                        ? "bg-tropical-green text-white border-tropical-green"
                        : s === "rejected"
                        ? "bg-warm-coral/80 text-white border-warm-coral/80"
                        : s === "archived"
                        ? "bg-tiki-brown/50 text-white border-tiki-brown/50"
                        : "bg-pineapple-yellow/60 text-tiki-brown border-pineapple-yellow"
                      : "bg-white text-tiki-brown/55 border-tiki-brown/15 hover:border-tiki-brown/30"
                  }`}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>

          {/* Checkboxes — always visible, some gated on approval */}
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Reference Permissions
            </p>

            {/* Official reference — always editable */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOfficialReference}
                onChange={(e) => setForm((f) => ({ ...f, isOfficialReference: e.target.checked }))}
                disabled={isSubmitting}
                className="w-4 h-4 accent-ube-purple"
              />
              <span className="text-xs font-semibold text-tiki-brown/70">
                Official Reference
                <span className="font-normal text-tiki-brown/45 ml-1">
                  — part of official Fruit Baby Universe canon
                </span>
              </span>
            </label>

            {/* Generation use — only when approved-for-generation */}
            <label className={`flex items-center gap-2.5 ${isApprovingForGeneration ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
              <input
                type="checkbox"
                checked={form.generationUseAllowed}
                onChange={(e) => setForm((f) => ({ ...f, generationUseAllowed: e.target.checked }))}
                disabled={isSubmitting || !isApprovingForGeneration}
                className="w-4 h-4 accent-tropical-green"
              />
              <span className="text-xs font-semibold text-tiki-brown/70">
                Allow Generation Use
                <span className="font-normal text-tiki-brown/45 ml-1">
                  — confirmed for reference-anchored generation
                </span>
                {!isApprovingForGeneration && (
                  <span className="font-normal text-warm-coral/60 ml-1">
                    — requires Approve for Generation
                  </span>
                )}
              </span>
            </label>

            {/* Public use — only when approved-for-generation */}
            <label className={`flex items-center gap-2.5 ${isApprovingForGeneration ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
              <input
                type="checkbox"
                checked={form.publicUseAllowed}
                onChange={(e) => setForm((f) => ({ ...f, publicUseAllowed: e.target.checked }))}
                disabled={isSubmitting || !isApprovingForGeneration}
                className="w-4 h-4 accent-tropical-green"
              />
              <span className="text-xs font-semibold text-tiki-brown/70">
                Allow Public Use
                <span className="font-normal text-tiki-brown/45 ml-1">
                  — may appear in public-facing contexts (default: off)
                </span>
              </span>
            </label>
          </div>

          {/* Review notes */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
              Review Notes (optional)
            </p>
            <textarea
              value={form.reviewNotes}
              onChange={(e) => setForm((f) => ({ ...f, reviewNotes: e.target.value }))}
              placeholder="Notes about this review decision, fidelity issues, or intended use"
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
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving reference review…" : "Save Reference Review"}
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
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ReferenceAssetReviewPanel({
  initialAssets,
  draftSlugs,
}: {
  initialAssets: UploadedReferenceAsset[];
  draftSlugs: Set<string>;
}) {
  const [assets, setAssets] = useState<UploadedReferenceAsset[]>(initialAssets);

  function handleReviewed(updated: UploadedReferenceAsset) {
    setAssets((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }

  const total = assets.length;
  const approvedCount = assets.filter((a) => a.reviewStatus === "approved-for-generation").length;
  const needsReviewCount = assets.filter((a) => a.reviewStatus === "needs-review").length;
  const rejectedCount = assets.filter((a) => a.reviewStatus === "rejected").length;
  const archivedCount = assets.filter((a) => a.reviewStatus === "archived").length;
  const officialCount = assets.filter((a) => a.isOfficialReference).length;
  const genUseCount = assets.filter((a) => a.generationUseAllowed).length;

  const byCharacter = assets.reduce<Record<string, UploadedReferenceAsset[]>>(
    (acc, a) => { (acc[a.characterSlug] ??= []).push(a); return acc; },
    {}
  );

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-lg">🗂️</span>
        <h2 className="text-base font-black text-tiki-brown">
          Review Uploaded Reference Assets
        </h2>
        <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 uppercase tracking-wide">
          {total} file{total !== 1 ? "s" : ""}
        </span>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          Admin Only
        </span>
      </div>

      {/* Summary stats */}
      {total > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {(
            [
              ["Total", total, undefined],
              ["Approved", approvedCount, approvedCount > 0],
              ["Needs Review", needsReviewCount, needsReviewCount === 0 ? true : false],
              ["Rejected", rejectedCount, rejectedCount === 0 ? true : false],
              ["Official Ref", officialCount, officialCount > 0],
              ["Gen Use OK", genUseCount, genUseCount > 0],
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
              <span className={`text-base font-black ${
                positive === true ? "text-tropical-green" : positive === false && value > 0 ? "text-warm-coral/80" : "text-tiki-brown"
              }`}>
                {value}
              </span>
              <span className="text-xs font-semibold text-tiki-brown/40 uppercase tracking-wide leading-tight">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Archived count note */}
      {archivedCount > 0 && (
        <p className="text-xs text-tiki-brown/40">
          {archivedCount} archived asset{archivedCount !== 1 ? "s" : ""} (not shown in summary counts above).
        </p>
      )}

      {/* Empty state */}
      {total === 0 && (
        <div className="bg-tiki-brown/4 rounded-2xl px-5 py-6 text-center">
          <p className="text-sm text-tiki-brown/40 italic">
            No reference assets uploaded yet. Use the upload form above to add the first one.
          </p>
        </div>
      )}

      {/* Assets grouped by character */}
      {Object.entries(byCharacter).map(([slug, charAssets]) => {
        const approvedInGroup = charAssets.filter((a) => a.reviewStatus === "approved-for-generation").length;
        const pendingInGroup = charAssets.filter((a) => a.reviewStatus === "needs-review").length;
        return (
          <div key={slug} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">{slug}</p>
              <span className="text-xs text-tiki-brown/35">{charAssets.length} asset{charAssets.length !== 1 ? "s" : ""}</span>
              {draftSlugs.has(slug) && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/70 uppercase tracking-wide">Draft</span>
              )}
              {approvedInGroup > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/12 text-tropical-green uppercase tracking-wide">
                  {approvedInGroup} approved
                </span>
              )}
              {pendingInGroup > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
                  {pendingInGroup} pending
                </span>
              )}
            </div>
            {charAssets.map((asset) => (
              <AssetReviewCard
                key={asset.id}
                asset={asset}
                isDraftCharacter={draftSlugs.has(slug)}
                onReviewed={handleReviewed}
              />
            ))}
          </div>
        );
      })}

      {/* Safety note */}
      <div className="flex items-start gap-2.5 bg-tiki-brown/4 rounded-xl px-4 py-3">
        <span className="text-sm flex-shrink-0">🔒</span>
        <p className="text-xs text-tiki-brown/55 leading-relaxed">
          Uploaded reference assets are stored in Vercel Blob and recorded in GitHub. They are not
          used for generation until approved here. Approving saves review metadata to GitHub — no
          files are moved or deleted. Approving a reference asset does not approve or publish the
          character.
        </p>
      </div>
    </div>
  );
}
