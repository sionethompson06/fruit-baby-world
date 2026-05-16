"use client";

import { useState } from "react";
import type { UploadedReferenceAsset, ReviewStatus } from "@/app/api/reference-assets/upload-character-reference/route";
import {
  getReferenceAssetStatusLabel,
  getReferenceAssetStatusBadgeClass,
} from "@/lib/characterReadiness";
import {
  PROFILE_SHEET_TYPES,
  MAIN_REFERENCE_TYPES,
  getReferenceAssetDisplayRole,
  isEnvironmentReferenceAssetType,
} from "@/lib/characterProfileAssets";

// ─── Asset type helpers ───────────────────────────────────────────────────────

function isProfileSheetType(assetType: string | undefined): boolean {
  return PROFILE_SHEET_TYPES.has(assetType ?? "");
}

function isMainRefType(assetType: string | undefined): boolean {
  return MAIN_REFERENCE_TYPES.has(assetType ?? "");
}

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

type QuickState =
  | { status: "idle" }
  | { status: "submitting"; action: string }
  | { status: "success"; action: string; message: string }
  | { status: "error"; action: string; message: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / 1024).toFixed(1)} KB`;
}

// ─── Per-asset review card ────────────────────────────────────────────────────

export function AssetReviewCard({
  asset,
  isDraftCharacter,
  onReviewed,
}: {
  asset: UploadedReferenceAsset;
  isDraftCharacter: boolean;
  onReviewed: (updated: UploadedReferenceAsset) => void;
}) {
  const [localAsset, setLocalAsset] = useState(asset);
  const [expanded, setExpanded] = useState(false);
  const [techDetailsOpen, setTechDetailsOpen] = useState(false);
  const [quickState, setQuickState] = useState<QuickState>({ status: "idle" });
  const [form, setForm] = useState<ReviewFormState>({
    reviewStatus: asset.reviewStatus,
    approvedForGeneration: asset.approvedForGeneration,
    generationUseAllowed: asset.generationUseAllowed ?? false,
    publicUseAllowed: asset.publicUseAllowed ?? false,
    isOfficialReference: asset.isOfficialReference ?? false,
    reviewNotes: asset.reviewNotes ?? "",
  });
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  const assetType = localAsset.assetType ?? "";
  const isProfileSheet = isProfileSheetType(assetType);
  const isMainRef = isMainRefType(assetType);
  const isEnvironmentRef = !isProfileSheet && !isMainRef && isEnvironmentReferenceAssetType(assetType);
  const isSupporting = !isProfileSheet && !isMainRef && !isEnvironmentRef;
  const displayRole = getReferenceAssetDisplayRole(localAsset as { assetType?: string });

  const reviewStatus = localAsset.reviewStatus as string | undefined;
  const isApproved = reviewStatus === "approved-for-generation";
  const needsReview = !reviewStatus || reviewStatus === "needs-review";
  const isRejected = reviewStatus === "rejected";
  const isArchived = reviewStatus === "archived";

  const isBusy = quickState.status === "submitting" || submitState.status === "submitting";

  // ── API helpers ──────────────────────────────────────────────────────────────

  async function callReviewAPI(params: {
    reviewStatus: ReviewStatus;
    approvedForGeneration: boolean;
    generationUseAllowed: boolean;
    isOfficialReference: boolean;
    reviewNotes?: string;
  }): Promise<{ ok: true; asset: UploadedReferenceAsset } | { ok: false; message: string }> {
    const res = await fetch("/api/reference-assets/review-character-reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assetId: localAsset.id,
        publicUseAllowed: false,
        reviewNotes: localAsset.reviewNotes ?? "",
        ...params,
      }),
    });
    return res.json() as Promise<{ ok: true; asset: UploadedReferenceAsset } | { ok: false; message: string }>;
  }

  async function callAssignAPI(
    referenceRole: "primary-profile" | "primary-main"
  ): Promise<{ ok: true; commitMessage: string; path: string } | { ok: false; message: string }> {
    const res = await fetch("/api/github/assign-primary-character-reference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        characterSlug: localAsset.characterSlug,
        assetId: localAsset.id,
        referenceRole,
      }),
    });
    return res.json() as Promise<{ ok: true; commitMessage: string; path: string } | { ok: false; message: string }>;
  }

  function applyReviewedAsset(updated: UploadedReferenceAsset) {
    setLocalAsset(updated);
    onReviewed(updated);
    // sync the advanced form status too
    setForm((f) => ({ ...f, reviewStatus: updated.reviewStatus }));
  }

  // ── Quick action handlers ────────────────────────────────────────────────────

  async function handleApproveAsSupporting() {
    setQuickState({ status: "submitting", action: "supporting" });
    try {
      const data = await callReviewAPI({
        reviewStatus: "approved-for-generation",
        approvedForGeneration: true,
        generationUseAllowed: true,
        isOfficialReference: false,
      });
      if (data.ok) {
        applyReviewedAsset(data.asset);
        setQuickState({ status: "success", action: "supporting", message: "Approved as Supporting Reference." });
      } else {
        setQuickState({ status: "error", action: "supporting", message: data.message });
      }
    } catch {
      setQuickState({ status: "error", action: "supporting", message: "Network error — please try again." });
    }
  }

  async function handleApproveAsEnvironmentRef() {
    setQuickState({ status: "submitting", action: "environment" });
    try {
      const data = await callReviewAPI({
        reviewStatus: "approved-for-generation",
        approvedForGeneration: true,
        generationUseAllowed: true,
        isOfficialReference: false,
      });
      if (data.ok) {
        applyReviewedAsset(data.asset);
        setQuickState({ status: "success", action: "environment", message: "Approved as Environment/Home Reference." });
      } else {
        setQuickState({ status: "error", action: "environment", message: data.message });
      }
    } catch {
      setQuickState({ status: "error", action: "environment", message: "Network error — please try again." });
    }
  }

  async function handleApproveAsProfileSheet() {
    setQuickState({ status: "submitting", action: "profile-sheet" });
    try {
      // Step 1: approve
      const approveData = await callReviewAPI({
        reviewStatus: "approved-for-generation",
        approvedForGeneration: true,
        generationUseAllowed: true,
        isOfficialReference: true,
      });
      if (!approveData.ok) {
        setQuickState({ status: "error", action: "profile-sheet", message: approveData.message });
        return;
      }
      applyReviewedAsset(approveData.asset);
      // Step 2: assign as primary profile
      const assignData = await callAssignAPI("primary-profile");
      if (assignData.ok) {
        setQuickState({ status: "success", action: "profile-sheet", message: "Approved and set as Official Profile Sheet. Redeploy required." });
      } else {
        setQuickState({ status: "error", action: "profile-sheet", message: `Approved, but assign failed: ${assignData.message}` });
      }
    } catch {
      setQuickState({ status: "error", action: "profile-sheet", message: "Network error — please try again." });
    }
  }

  async function handleApproveAsMainImage() {
    setQuickState({ status: "submitting", action: "main-image" });
    try {
      const approveData = await callReviewAPI({
        reviewStatus: "approved-for-generation",
        approvedForGeneration: true,
        generationUseAllowed: true,
        isOfficialReference: true,
      });
      if (!approveData.ok) {
        setQuickState({ status: "error", action: "main-image", message: approveData.message });
        return;
      }
      applyReviewedAsset(approveData.asset);
      const assignData = await callAssignAPI("primary-main");
      if (assignData.ok) {
        setQuickState({ status: "success", action: "main-image", message: "Approved and set as Main Character Image. Redeploy required." });
      } else {
        setQuickState({ status: "error", action: "main-image", message: `Approved, but assign failed: ${assignData.message}` });
      }
    } catch {
      setQuickState({ status: "error", action: "main-image", message: "Network error — please try again." });
    }
  }

  async function handleReject() {
    setQuickState({ status: "submitting", action: "reject" });
    try {
      const data = await callReviewAPI({
        reviewStatus: "rejected",
        approvedForGeneration: false,
        generationUseAllowed: false,
        isOfficialReference: false,
      });
      if (data.ok) {
        applyReviewedAsset(data.asset);
        setQuickState({ status: "success", action: "reject", message: "Asset rejected." });
      } else {
        setQuickState({ status: "error", action: "reject", message: data.message });
      }
    } catch {
      setQuickState({ status: "error", action: "reject", message: "Network error — please try again." });
    }
  }

  async function handleArchive() {
    setQuickState({ status: "submitting", action: "archive" });
    try {
      const data = await callReviewAPI({
        reviewStatus: "archived",
        approvedForGeneration: false,
        generationUseAllowed: false,
        isOfficialReference: false,
      });
      if (data.ok) {
        applyReviewedAsset(data.asset);
        setQuickState({ status: "success", action: "archive", message: "Asset archived." });
      } else {
        setQuickState({ status: "error", action: "archive", message: data.message });
      }
    } catch {
      setQuickState({ status: "error", action: "archive", message: "Network error — please try again." });
    }
  }

  async function handleAssignProfileSheet() {
    setQuickState({ status: "submitting", action: "assign-profile-sheet" });
    try {
      const data = await callAssignAPI("primary-profile");
      if (data.ok) {
        setQuickState({ status: "success", action: "assign-profile-sheet", message: "Set as Official Profile Sheet. Redeploy required." });
      } else {
        setQuickState({ status: "error", action: "assign-profile-sheet", message: data.message });
      }
    } catch {
      setQuickState({ status: "error", action: "assign-profile-sheet", message: "Network error — please try again." });
    }
  }

  async function handleAssignMainImage() {
    setQuickState({ status: "submitting", action: "assign-main-image" });
    try {
      const data = await callAssignAPI("primary-main");
      if (data.ok) {
        setQuickState({ status: "success", action: "assign-main-image", message: "Set as Main Character Image. Redeploy required." });
      } else {
        setQuickState({ status: "error", action: "assign-main-image", message: data.message });
      }
    } catch {
      setQuickState({ status: "error", action: "assign-main-image", message: "Network error — please try again." });
    }
  }

  // ── Advanced form handlers ───────────────────────────────────────────────────

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

  async function handleDetailedSubmit() {
    setSubmitState({ status: "submitting" });
    try {
      const res = await fetch("/api/reference-assets/review-character-reference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: localAsset.id,
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
          assetTitle: data.asset.title || localAsset.title,
          reviewStatus: data.asset.reviewStatus,
          generationUseAllowed: data.asset.generationUseAllowed ?? false,
        });
        applyReviewedAsset(data.asset);
        setExpanded(false);
      } else {
        setSubmitState({ status: "error", message: data.message });
      }
    } catch {
      setSubmitState({ status: "error", message: "Something went wrong while saving the reference review." });
    }
  }

  // ── Status badge class for localAsset ────────────────────────────────────────
  const statusBadgeClass = getReferenceAssetStatusBadgeClass(localAsset as UploadedReferenceAsset & { reviewStatus?: string });
  const statusLabel = getReferenceAssetStatusLabel(localAsset as UploadedReferenceAsset & { reviewStatus?: string });

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">

      {/* ── Asset header row ── */}
      <div className="p-4 flex flex-col gap-3 bg-white">
        <div className="flex items-start gap-3 flex-wrap">

          {/* Thumbnail */}
          <div className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border border-tiki-brown/10 bg-tiki-brown/4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={localAsset.blobUrl}
              alt={localAsset.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Info */}
          <div className="flex-1 flex flex-col gap-1 min-w-0">
            <p className="text-sm font-bold text-tiki-brown leading-tight">{localAsset.title}</p>
            <p className="text-xs text-tiki-brown/50">
              {localAsset.characterSlug} · <span className="font-mono">{localAsset.assetType}</span>
            </p>
            <p className="text-xs font-mono text-tiki-brown/35">
              {formatBytes(localAsset.fileSizeBytes)} · {localAsset.mimeType.replace("image/", "").toUpperCase()}
            </p>
            {localAsset.uploadedAt && (
              <p className="text-xs text-tiki-brown/30">
                {new Date(localAsset.uploadedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${statusBadgeClass}`}>
              {statusLabel}
            </span>
            <a
              href={localAsset.blobUrl}
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
              className="text-xs font-bold px-2 py-1 rounded-lg bg-tiki-brown/6 text-tiki-brown/50 hover:bg-tiki-brown/10 transition-colors"
            >
              {expanded ? "Close" : "Advanced"}
            </button>
            <button
              type="button"
              onClick={() => setTechDetailsOpen((v) => !v)}
              className="text-xs font-bold px-2 py-1 rounded-lg bg-tiki-brown/4 text-tiki-brown/35 hover:bg-tiki-brown/6 transition-colors"
            >
              {techDetailsOpen ? "Hide" : "Tech"}
            </button>
          </div>
        </div>

        {/* Description */}
        {localAsset.description && (
          <p className="text-xs text-tiki-brown/55 leading-relaxed">{localAsset.description}</p>
        )}

        {/* Review notes */}
        {localAsset.reviewNotes && (
          <p className="text-xs text-tiki-brown/45 italic leading-relaxed border-t border-tiki-brown/6 pt-2">
            Notes: {localAsset.reviewNotes}
          </p>
        )}

        {/* ── Quick actions: Needs Review ── */}
        {needsReview && quickState.status !== "success" && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2.5">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Review Actions</p>

            {/* Primary approve button — type-specific */}
            {isProfileSheet && (
              <button
                type="button"
                onClick={handleApproveAsProfileSheet}
                disabled={isBusy}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left leading-snug"
              >
                {quickState.status === "submitting" && quickState.action === "profile-sheet"
                  ? "Approving…"
                  : "✓ Approve as Official Profile Sheet"}
              </button>
            )}
            {isMainRef && (
              <button
                type="button"
                onClick={handleApproveAsMainImage}
                disabled={isBusy}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left leading-snug"
              >
                {quickState.status === "submitting" && quickState.action === "main-image"
                  ? "Approving…"
                  : "✓ Approve as Main Character Image"}
              </button>
            )}

            {/* Environment ref approve (primary button for environment types) */}
            {isEnvironmentRef && (
              <button
                type="button"
                onClick={handleApproveAsEnvironmentRef}
                disabled={isBusy}
                className="text-xs font-bold px-3 py-2 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-left leading-snug"
              >
                {quickState.status === "submitting" && quickState.action === "environment"
                  ? "Approving…"
                  : "✓ Approve as Environment/Home Reference"}
              </button>
            )}

            {/* Supporting ref approve (always available, primary for supporting types) */}
            <div className="flex flex-wrap gap-2">
              {!isEnvironmentRef && (
                <button
                  type="button"
                  onClick={handleApproveAsSupporting}
                  disabled={isBusy}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    isSupporting
                      ? "bg-tropical-green text-white hover:bg-tropical-green/85"
                      : "bg-tiki-brown/10 text-tiki-brown/65 hover:bg-tiki-brown/15"
                  }`}
                >
                  {quickState.status === "submitting" && quickState.action === "supporting"
                    ? "Approving…"
                    : isSupporting
                    ? "✓ Approve as Supporting Reference"
                    : "Approve as Supporting Reference"}
                </button>
              )}
              <button
                type="button"
                onClick={handleReject}
                disabled={isBusy}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-warm-coral/15 text-warm-coral/80 hover:bg-warm-coral/25 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {quickState.status === "submitting" && quickState.action === "reject" ? "Rejecting…" : "Reject"}
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isBusy}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/50 hover:bg-tiki-brown/12 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {quickState.status === "submitting" && quickState.action === "archive" ? "Archiving…" : "Archive"}
              </button>
            </div>

            {/* Context note */}
            {isEnvironmentRef && (
              <p className="text-xs text-tiki-brown/40 leading-relaxed">
                <strong className="font-semibold">{displayRole}</strong> — helps story builder describe where this character lives, plays, or appears. Used for setting, background, and environment references.
              </p>
            )}
            {isSupporting && (
              <p className="text-xs text-tiki-brown/40 leading-relaxed">
                <strong className="font-semibold">{displayRole}</strong> — will be available as a supporting reference for future AI generation, not as the primary profile image.
              </p>
            )}
          </div>
        )}

        {/* ── Approved status: Supporting Reference ── */}
        {isApproved && isSupporting && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                ✓ Approved Supporting Reference
              </span>
              <span className="text-xs text-tiki-brown/45 font-mono">{displayRole}</span>
            </div>
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              This asset will be available for future character-faithful AI generation — helping preserve poses, expressions, style, and fidelity.
            </p>
          </div>
        )}

        {/* ── Approved status: Environment / Home Reference ── */}
        {isApproved && isEnvironmentRef && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                ✓ Approved Environment/Home Reference
              </span>
              <span className="text-xs text-tiki-brown/45 font-mono">{displayRole}</span>
            </div>
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              This asset will help the story builder describe where this character lives, plays, and appears — used for setting, background, and environment consistency.
            </p>
          </div>
        )}

        {/* ── Approved status: Profile Sheet ── */}
        {isApproved && isProfileSheet && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                ✓ Approved — {displayRole}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAssignProfileSheet}
              disabled={isBusy}
              className="self-start text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quickState.status === "submitting" && quickState.action === "assign-profile-sheet"
                ? "Setting…"
                : "Set as Official Profile Sheet"}
            </button>
          </div>
        )}

        {/* ── Approved status: Main Reference ── */}
        {isApproved && isMainRef && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                ✓ Approved — {displayRole}
              </span>
            </div>
            <button
              type="button"
              onClick={handleAssignMainImage}
              disabled={isBusy}
              className="self-start text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {quickState.status === "submitting" && quickState.action === "assign-main-image"
                ? "Setting…"
                : "Set as Main Character Image"}
            </button>
          </div>
        )}

        {/* ── Rejected status ── */}
        {isRejected && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80 uppercase tracking-wide">
              ✕ Rejected
            </span>
            <button
              type="button"
              onClick={handleApproveAsSupporting}
              disabled={isBusy}
              className="text-xs font-bold px-3 py-1 rounded-xl bg-tiki-brown/8 text-tiki-brown/55 hover:bg-tiki-brown/12 transition-colors disabled:opacity-40"
            >
              {quickState.status === "submitting" ? "Restoring…" : "Restore as Supporting Reference"}
            </button>
          </div>
        )}

        {/* ── Archived status ── */}
        {isArchived && (
          <div className="border-t border-tiki-brown/8 pt-3 flex flex-wrap items-center gap-3">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/12 text-tiki-brown/50 uppercase tracking-wide">
              Archived
            </span>
            <button
              type="button"
              onClick={handleApproveAsSupporting}
              disabled={isBusy}
              className="text-xs font-bold px-3 py-1 rounded-xl bg-tiki-brown/8 text-tiki-brown/55 hover:bg-tiki-brown/12 transition-colors disabled:opacity-40"
            >
              {quickState.status === "submitting" ? "Restoring…" : "Restore as Supporting Reference"}
            </button>
          </div>
        )}

        {/* ── Quick action feedback ── */}
        {quickState.status === "success" && (
          <div className="flex items-start gap-2 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs font-bold text-tiki-brown/75">{quickState.message}</p>
          </div>
        )}
        {quickState.status === "error" && (
          <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs font-semibold text-tiki-brown/75">{quickState.message}</p>
          </div>
        )}

        {/* ── Advanced form success summary ── */}
        {submitState.status === "success" && !expanded && (
          <div className="flex items-start gap-2 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-3 py-2">
            <span className="text-sm flex-shrink-0">✅</span>
            <p className="text-xs font-bold text-tiki-brown/75">Review saved.</p>
          </div>
        )}

        {/* ── Tech details ── */}
        {techDetailsOpen && (
          <div className="border-t border-tiki-brown/8 pt-3 mt-1">
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-2">Technical Fields</p>
            <div className="bg-white border border-tiki-brown/8 rounded-xl px-3 py-2 flex flex-col gap-1">
              {[
                ["approvedForGeneration", String(localAsset.approvedForGeneration)],
                ["generationUseAllowed", String(localAsset.generationUseAllowed)],
                ["publicUseAllowed", String(localAsset.publicUseAllowed)],
                ["isOfficialReference", String(localAsset.isOfficialReference)],
                ["requiresReview", String(localAsset.requiresReview)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-tiki-brown/45">{k}</span>
                  <span className="text-xs font-mono font-bold text-tiki-brown/65">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Advanced review form ── */}
      {expanded && (
        <div className="border-t border-tiki-brown/8 bg-tiki-brown/3 p-4 flex flex-col gap-4">

          <div className="flex items-start gap-2.5 bg-sky-blue/10 border border-sky-blue/20 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">⚙️</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              <strong className="font-semibold">Advanced.</strong> Use the quick actions above for most approvals. This form gives full control over approval flags and review notes.
            </p>
          </div>

          {/* Tiki warning */}
          {(localAsset.characterSlug === "tiki" || localAsset.characterSlug === "tiki-trouble") && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/20 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚡</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Tiki Trouble:</strong> References must remain mischievous, funny, dramatic, and kid-friendly.
              </p>
            </div>
          )}

          {/* Draft character warning */}
          {isDraftCharacter && (
            <div className="flex items-start gap-2.5 bg-sky-blue/12 border border-sky-blue/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">📝</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Draft character.</strong> Approving this reference does not approve or publish the character.
              </p>
            </div>
          )}

          {/* Error */}
          {submitState.status === "error" && (
            <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs font-semibold text-tiki-brown/75">{submitState.message}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">Reference Status</p>
            <div className="flex flex-wrap gap-2">
              {(["needs-review", "approved-for-generation", "rejected", "archived"] as ReviewStatus[]).map((s) => {
                const label = s === "needs-review" ? "Needs Review" : s === "approved-for-generation" ? "Approve" : s === "rejected" ? "Reject" : "Archive";
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={submitState.status === "submitting"}
                    onClick={() => setReviewStatus(s)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors disabled:opacity-50 ${
                      form.reviewStatus === s
                        ? s === "approved-for-generation" ? "bg-tropical-green text-white border-tropical-green"
                        : s === "rejected" ? "bg-warm-coral/80 text-white border-warm-coral/80"
                        : s === "archived" ? "bg-tiki-brown/50 text-white border-tiki-brown/50"
                        : "bg-pineapple-yellow/60 text-tiki-brown border-pineapple-yellow"
                        : "bg-white text-tiki-brown/55 border-tiki-brown/15 hover:border-tiki-brown/30"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-col gap-2.5">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Reference Metadata</p>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isOfficialReference}
                onChange={(e) => setForm((f) => ({ ...f, isOfficialReference: e.target.checked }))}
                disabled={submitState.status === "submitting"}
                className="w-4 h-4 accent-ube-purple"
              />
              <span className="text-xs font-semibold text-tiki-brown/70">
                Mark as Official Reference
                <span className="font-normal text-tiki-brown/45 ml-1">— part of canon</span>
              </span>
            </label>
            <label className={`flex items-center gap-2.5 ${form.reviewStatus === "approved-for-generation" ? "cursor-pointer" : "opacity-40 cursor-not-allowed"}`}>
              <input
                type="checkbox"
                checked={form.generationUseAllowed}
                onChange={(e) => setForm((f) => ({ ...f, generationUseAllowed: e.target.checked }))}
                disabled={submitState.status === "submitting" || form.reviewStatus !== "approved-for-generation"}
                className="w-4 h-4 accent-tropical-green"
              />
              <span className="text-xs font-semibold text-tiki-brown/70">
                Allow Generation Use
                <span className="font-normal text-tiki-brown/45 ml-1">— usable for reference-anchored generation</span>
              </span>
            </label>
          </div>

          {/* Review notes */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Review Notes (optional)</p>
            <textarea
              value={form.reviewNotes}
              onChange={(e) => setForm((f) => ({ ...f, reviewNotes: e.target.value }))}
              placeholder="Notes about this review decision"
              maxLength={1000}
              rows={2}
              disabled={submitState.status === "submitting"}
              className="w-full text-xs text-tiki-brown bg-white border border-tiki-brown/15 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50 placeholder:text-tiki-brown/25 resize-none disabled:opacity-50"
            />
          </div>

          {/* Save / cancel */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDetailedSubmit}
              disabled={submitState.status === "submitting"}
              className="text-sm font-bold px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitState.status === "submitting" ? "Saving…" : "Save Review"}
            </button>
            <button
              type="button"
              onClick={() => { setExpanded(false); setSubmitState({ status: "idle" }); }}
              disabled={submitState.status === "submitting"}
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

// ─── Main panel (kept for backward compatibility) ──────────────────────────────

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

  const byCharacter = assets.reduce<Record<string, UploadedReferenceAsset[]>>(
    (acc, a) => { (acc[a.characterSlug] ??= []).push(a); return acc; },
    {}
  );

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <span className="text-lg">🗂️</span>
        <h2 className="text-base font-black text-tiki-brown">Review Uploaded Reference Assets</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">Admin Only</span>
      </div>
      {Object.entries(byCharacter).map(([slug, charAssets]) => (
        <div key={slug} className="flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">{slug}</p>
          {charAssets.map((a) => (
            <AssetReviewCard key={a.id} asset={a} isDraftCharacter={draftSlugs.has(slug)} onReviewed={handleReviewed} />
          ))}
        </div>
      ))}
      {assets.length === 0 && (
        <p className="text-sm text-tiki-brown/40 italic text-center py-4">No reference assets uploaded yet.</p>
      )}
    </div>
  );
}
