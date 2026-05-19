"use client";

import { useState } from "react";
import type { FidelityThumbnail } from "@/lib/storyPanelFidelityReview";
import type { VideoFidelityChecklistItem } from "@/lib/videoClipFidelityReview";
import type { VideoClipGenerationPackage } from "@/lib/videoClipGenerationTypes";
import type { ApprovedVideoClipAsset } from "@/lib/videoGenerationTypes";

// ─── Serializable props ───────────────────────────────────────────────────────

export type SceneReviewData = {
  thumbnails: FidelityThumbnail[];
  checklistItems: VideoFidelityChecklistItem[];
  fidelityWarnings: { characterSlug: string; characterName: string; message: string }[];
  hasTiki: boolean;
};

type DraftInfo =
  | { kind: "not_implemented_yet"; provider: string; pkg: VideoClipGenerationPackage }
  | {
      kind: "video_draft_generated";
      videoUrl: string;
      thumbnailUrl: string | null;
      provider: string;
      providerJobId: string;
      modelId: string;
      videoStyle: string;
      durationSeconds: number;
      pkg: VideoClipGenerationPackage;
    }
  | { kind: "video_draft_requested"; providerJobId: string; provider: string; pkg: VideoClipGenerationPackage };

type Props = {
  reviewData: SceneReviewData;
  draft: DraftInfo;
};

type ReviewDecision = "looks-good" | "needs-regeneration";

// ─── Upload result type (mirrors route response) ──────────────────────────────

type VideoUploadResult =
  | {
      ok: true;
      status: "approved_video_uploaded";
      video: ApprovedVideoClipAsset;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
      details?: Record<string, string>;
    };

// ─── Attach result type ───────────────────────────────────────────────────────

type VideoAttachResult =
  | {
      ok: true;
      status: "video_clip_attached";
      sceneId: string;
      sceneNumber: number;
      path: string;
      commitMessage: string;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
    };

// ─── Group labels ─────────────────────────────────────────────────────────────

const GROUP_LABELS: Record<string, string> = {
  character: "Character Fidelity",
  motion:    "Motion Quality",
  environment: "Environment",
  safety:    "Safety & Tone",
  tiki:      "Tiki Guardrail",
};

// ─── Reference thumbnail card ─────────────────────────────────────────────────

function RefCard({ thumb }: { thumb: FidelityThumbnail }) {
  return (
    <div className="flex flex-col gap-2 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl p-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-black text-tiki-brown">{thumb.characterName}</span>
        {thumb.isTiki && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral">
            Tiki
          </span>
        )}
        {!thumb.hasProfileSheet && (
          <span className="text-xs font-semibold text-pineapple-yellow">No profile sheet</span>
        )}
      </div>

      {/* Images */}
      <div className="flex flex-wrap gap-2">
        {thumb.profileSheetUrl && (
          <div className="flex flex-col items-center gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb.profileSheetUrl}
              alt={`${thumb.characterName} profile sheet`}
              className="w-16 h-16 object-cover rounded-xl border border-tiki-brown/10"
            />
            <span className="text-xs text-tiki-brown/40 text-center leading-tight">Profile</span>
          </div>
        )}
        {thumb.mainImageUrl && (
          <div className="flex flex-col items-center gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumb.mainImageUrl}
              alt={`${thumb.characterName} main image`}
              className="w-16 h-16 object-cover rounded-xl border border-tiki-brown/10"
            />
            <span className="text-xs text-tiki-brown/40 text-center leading-tight">Main</span>
          </div>
        )}
        {thumb.supportingThumbnails.map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={s.title}
              title={s.title}
              className="w-16 h-16 object-cover rounded-xl border border-tiki-brown/10"
            />
            <span className="text-xs text-tiki-brown/40 text-center leading-tight">Ref</span>
          </div>
        ))}
        {thumb.envThumbnails.map((e, i) => (
          <div key={i} className="flex flex-col items-center gap-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={e.url}
              alt={e.title}
              title={e.title}
              className="w-16 h-16 object-cover rounded-xl border border-tiki-brown/10"
            />
            <span className="text-xs text-tiki-brown/40 text-center leading-tight">Env</span>
          </div>
        ))}
      </div>

      {/* Counts */}
      <div className="flex flex-wrap gap-2 text-xs text-tiki-brown/50">
        {thumb.totalSupportingCount > 0 && (
          <span>{thumb.totalSupportingCount} supporting ref{thumb.totalSupportingCount !== 1 ? "s" : ""}</span>
        )}
        {thumb.totalEnvCount > 0 && (
          <span>{thumb.totalEnvCount} environment ref{thumb.totalEnvCount !== 1 ? "s" : ""}</span>
        )}
        {thumb.totalSupportingCount === 0 && thumb.totalEnvCount === 0 && (
          <span className="text-pineapple-yellow">No supporting or environment references</span>
        )}
      </div>
    </div>
  );
}

// ─── Left panel: video or package preview ─────────────────────────────────────

function DraftPreviewPanel({ draft }: { draft: DraftInfo }) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Status badge + caption */}
      {draft.kind === "video_draft_generated" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green uppercase tracking-wide">
              Video Draft
            </span>
            <span className="text-xs text-tiki-brown/50">Temporary — not saved or public</span>
          </div>
          <video
            src={draft.videoUrl}
            controls
            className="w-full rounded-2xl border border-tiki-brown/10 bg-black"
            aria-label="Temporary video draft for fidelity review"
          >
            Your browser does not support video playback.
          </video>
          <div className="flex flex-wrap gap-2 text-xs text-tiki-brown/55">
            <span>Provider: <strong className="text-tiki-brown">{draft.provider}</strong></span>
            <span>·</span>
            <span>Style: <strong className="text-tiki-brown">{draft.videoStyle}</strong></span>
            <span>·</span>
            <span>Duration: <strong className="text-tiki-brown">{draft.durationSeconds}s</strong></span>
            {draft.modelId && (
              <>
                <span>·</span>
                <span>Model: <strong className="text-tiki-brown">{draft.modelId}</strong></span>
              </>
            )}
          </div>
        </>
      )}

      {draft.kind === "video_draft_requested" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
              Job Submitted
            </span>
            <span className="text-xs text-tiki-brown/50">No playable video yet</span>
          </div>
          <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">Provider Job ID</p>
            <p className="text-xs font-mono text-tiki-brown/70 break-all">{draft.providerJobId}</p>
            <p className="text-xs text-tiki-brown/45 mt-2">
              Video request was created. Retrieval/polling will be handled in a later provider-specific phase.
            </p>
          </div>
        </>
      )}

      {draft.kind === "not_implemented_yet" && (
        <>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
              Package Ready
            </span>
            <span className="text-xs text-tiki-brown/50">No video generated yet</span>
          </div>
          <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3">
            <p className="text-xs text-tiki-brown/70 leading-relaxed">
              No video was generated.{" "}
              Review the prepared package below before provider-specific execution is added.
              Provider: <strong>{draft.provider}</strong>.
            </p>
          </div>
        </>
      )}

      {/* Package metadata */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Scene", value: draft.pkg.sceneNumber ? `#${draft.pkg.sceneNumber}` : "—" },
          { label: "Duration", value: `${draft.pkg.durationSeconds}s` },
          { label: "Characters", value: String(draft.pkg.characters.length) },
          { label: "Ref Images", value: String(draft.pkg.referenceImages.length) },
          { label: "Mode", value: draft.pkg.referenceMode === "reference-ready" ? "With refs" : "Prompt only" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-white border border-tiki-brown/8 rounded-xl px-3 py-2 min-w-[64px]"
          >
            <span className="text-sm font-black text-tiki-brown">{value}</span>
            <span className="text-xs text-tiki-brown/45 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Prompt preview */}
      <button
        type="button"
        onClick={() => setShowPrompt((p) => !p)}
        className="text-xs font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors text-left"
      >
        {showPrompt ? "▲ Hide generation prompt" : "▼ Show generation prompt"}
      </button>
      {showPrompt && (
        <pre className="text-xs text-tiki-brown/60 bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto max-h-72 leading-relaxed">
          {draft.pkg.finalPromptText}
        </pre>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VideoClipFidelityReviewSection({ reviewData, draft }: Props) {
  const { thumbnails, checklistItems, fidelityWarnings } = reviewData;
  const packageWarnings = draft.pkg.warnings;

  // ── Local review state ──────────────────────────────────────────────────────
  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(checklistItems.map((item) => [item.id, false]))
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [decision, setDecision] = useState<ReviewDecision | null>(null);

  // ── Upload state ────────────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<VideoUploadResult | null>(null);
  const [uploadFetchError, setUploadFetchError] = useState<string | null>(null);

  // ── Attach state ─────────────────────────────────────────────────────────────
  const [attaching, setAttaching] = useState(false);
  const [attachResult, setAttachResult] = useState<VideoAttachResult | null>(null);
  const [attachFetchError, setAttachFetchError] = useState<string | null>(null);

  // ── Approve & Save (one-click) state ────────────────────────────────────────
  type VideoApproveSaveStatus = "idle" | "uploading" | "attaching" | "done" | "error";
  const [approveAndSaveStatus, setApproveAndSaveStatus] = useState<VideoApproveSaveStatus>("idle");
  const [approveAndSaveError, setApproveAndSaveError] = useState<string | null>(null);
  const [approveAndSaveErrorStep, setApproveAndSaveErrorStep] = useState<"upload" | "attach" | null>(null);
  const [approveAndSaveUploadedVideo, setApproveAndSaveUploadedVideo] = useState<VideoUploadResult | null>(null);

  const allChecked = checklistItems.length > 0 && checklistItems.every((item) => checked[item.id]);

  const hasPlayableVideo = draft.kind === "video_draft_generated";
  const canUpload = hasPlayableVideo && decision === "looks-good" && !uploading && !uploadResult?.ok;
  const canAttach = uploadResult?.ok === true && !attaching && !attachResult?.ok;
  const canApproveAndSave =
    hasPlayableVideo &&
    decision === "looks-good" &&
    approveAndSaveStatus !== "uploading" &&
    approveAndSaveStatus !== "attaching" &&
    approveAndSaveStatus !== "done";

  async function handleUpload() {
    if (!canUpload || draft.kind !== "video_draft_generated") return;
    setUploading(true);
    setUploadResult(null);
    setUploadFetchError(null);

    try {
      const res = await fetch("/api/video-generation/upload-approved-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug: draft.pkg.episodeSlug,
          sceneId: draft.pkg.sceneId,
          sceneNumber: draft.pkg.sceneNumber,
          videoUrl: draft.videoUrl,
          thumbnailUrl: draft.thumbnailUrl ?? "",
          provider: draft.provider,
          providerJobId: draft.providerJobId,
          modelId: draft.modelId,
          videoStyle: draft.videoStyle,
          durationSeconds: draft.durationSeconds,
          promptText: draft.pkg.finalPromptText,
          referenceMode: draft.pkg.referenceMode,
          reviewNotes,
          approvedBy: "admin",
        }),
      });

      const data = (await res.json()) as VideoUploadResult;
      setUploadResult(data);
    } catch (err) {
      setUploadFetchError(err instanceof Error ? err.message : "Failed to reach the server.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAttach() {
    if (!canAttach || !uploadResult?.ok || draft.kind !== "video_draft_generated") return;
    setAttaching(true);
    setAttachResult(null);
    setAttachFetchError(null);

    const v = uploadResult.video;
    try {
      const res = await fetch("/api/github/attach-video-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug: draft.pkg.episodeSlug,
          sceneId: draft.pkg.sceneId,
          sceneNumber: draft.pkg.sceneNumber,
          video: {
            id: v.id,
            type: "animated-clip",
            provider: v.provider,
            providerJobId: v.providerJobId,
            modelId: v.modelId,
            videoStyle: v.videoStyle,
            durationSeconds: v.durationSeconds,
            url: v.url,
            pathname: v.pathname,
            thumbnailUrl: v.thumbnailUrl,
            mimeType: v.mimeType,
            sizeBytes: v.sizeBytes,
            promptText: v.promptText,
            referenceMode: v.referenceMode,
            reviewNotes: v.reviewNotes,
            approvedBy: v.approvedBy,
            approvedAt: v.approvedAt,
            createdAt: v.createdAt,
          },
        }),
      });

      const data = (await res.json()) as VideoAttachResult;
      setAttachResult(data);
    } catch (err) {
      setAttachFetchError(err instanceof Error ? err.message : "Failed to reach the server.");
    } finally {
      setAttaching(false);
    }
  }

  async function handleApproveAndSave() {
    if (!canApproveAndSave || draft.kind !== "video_draft_generated") return;

    setApproveAndSaveStatus("uploading");
    setApproveAndSaveError(null);
    setApproveAndSaveErrorStep(null);
    setApproveAndSaveUploadedVideo(null);

    // Step 1: Upload to Blob
    let savedUpload: VideoUploadResult;
    try {
      const res = await fetch("/api/video-generation/upload-approved-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug: draft.pkg.episodeSlug,
          sceneId: draft.pkg.sceneId,
          sceneNumber: draft.pkg.sceneNumber,
          videoUrl: draft.videoUrl,
          thumbnailUrl: draft.thumbnailUrl ?? "",
          provider: draft.provider,
          providerJobId: draft.providerJobId,
          modelId: draft.modelId,
          videoStyle: draft.videoStyle,
          durationSeconds: draft.durationSeconds,
          promptText: draft.pkg.finalPromptText,
          referenceMode: draft.pkg.referenceMode,
          reviewNotes,
          approvedBy: "admin",
        }),
      });

      const data = (await res.json()) as VideoUploadResult;
      if (!data.ok) {
        setApproveAndSaveStatus("error");
        setApproveAndSaveError(`Media upload failed: ${data.message}`);
        setApproveAndSaveErrorStep("upload");
        return;
      }

      savedUpload = data;
      setApproveAndSaveUploadedVideo(data);
    } catch (err) {
      setApproveAndSaveStatus("error");
      setApproveAndSaveError(err instanceof Error ? `Media upload failed: ${err.message}` : "Media upload failed — network error.");
      setApproveAndSaveErrorStep("upload");
      return;
    }

    // Step 2: Attach to episode JSON
    setApproveAndSaveStatus("attaching");
    if (!savedUpload.ok) return;
    const v = savedUpload.video;

    try {
      const res = await fetch("/api/github/attach-video-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug: draft.pkg.episodeSlug,
          sceneId: draft.pkg.sceneId,
          sceneNumber: draft.pkg.sceneNumber,
          video: {
            id: v.id,
            type: "animated-clip",
            provider: v.provider,
            providerJobId: v.providerJobId,
            modelId: v.modelId,
            videoStyle: v.videoStyle,
            durationSeconds: v.durationSeconds,
            url: v.url,
            pathname: v.pathname,
            thumbnailUrl: v.thumbnailUrl,
            mimeType: v.mimeType,
            sizeBytes: v.sizeBytes,
            promptText: v.promptText,
            referenceMode: v.referenceMode,
            reviewNotes: v.reviewNotes,
            approvedBy: v.approvedBy,
            approvedAt: v.approvedAt,
            createdAt: v.createdAt,
          },
        }),
      });

      const data = (await res.json()) as VideoAttachResult;
      if (!data.ok) {
        setApproveAndSaveStatus("error");
        setApproveAndSaveError(
          `Attach to episode failed: ${data.message} The video was saved to media storage. Use Manual Controls to attach it.`
        );
        setApproveAndSaveErrorStep("attach");
        return;
      }

      // Sync manual controls state
      setUploadResult(savedUpload);
      setAttachResult(data);
      setApproveAndSaveStatus("done");
    } catch (err) {
      setApproveAndSaveStatus("error");
      setApproveAndSaveError(
        `Attach to episode failed — ${err instanceof Error ? err.message : "network error"}. The video was saved to media storage. Use Manual Controls to attach it.`
      );
      setApproveAndSaveErrorStep("attach");
    }
  }

  function toggleItem(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Group checklist items by group
  const groups = ["character", "motion", "environment", "safety", "tiki"] as const;
  const itemsByGroup = groups
    .map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      items: checklistItems.filter((i) => i.group === g),
    }))
    .filter((g) => g.items.length > 0);

  const allWarnings = [
    ...packageWarnings,
    ...fidelityWarnings.map((w) => `${w.characterName}: ${w.message}`),
  ];

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🔍</span>
          <h2 className="text-base font-black text-tiki-brown">Video Clip Fidelity Review</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Review character fidelity, motion quality, and story safety against official references.
          Nothing is saved, uploaded, or published from this step.
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Left: Draft preview */}
        <div className="flex flex-col gap-4">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Draft / Package Preview
          </p>
          <DraftPreviewPanel draft={draft} />
        </div>

        {/* Right: References + checklist */}
        <div className="flex flex-col gap-4">

          {/* Official references */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Official Character References
            </p>
            {thumbnails.length === 0 ? (
              <p className="text-xs text-pineapple-yellow">
                No approved character references found for this scene.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {thumbnails.map((thumb) => (
                  <RefCard key={thumb.characterSlug} thumb={thumb} />
                ))}
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Fidelity Checklist
            </p>
            {checklistItems.length === 0 ? (
              <p className="text-xs text-tiki-brown/45">No checklist items available.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {itemsByGroup.map(({ group, label, items }) => (
                  <div key={group} className="flex flex-col gap-2">
                    <p className="text-xs font-semibold text-tiki-brown/50 uppercase tracking-wide">
                      {label}
                    </p>
                    {items.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-2.5 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={checked[item.id] ?? false}
                          onChange={() => toggleItem(item.id)}
                          className="mt-0.5 flex-shrink-0 accent-tropical-green w-4 h-4"
                        />
                        <span
                          className={`text-xs leading-relaxed transition-colors ${
                            checked[item.id]
                              ? "text-tiki-brown/50 line-through"
                              : "text-tiki-brown/75"
                          }`}
                        >
                          {item.label}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Checklist status */}
            {checklistItems.length > 0 && (
              <div
                className={`mt-1 rounded-xl px-3 py-2 text-xs font-semibold ${
                  allChecked
                    ? "bg-tropical-green/12 border border-tropical-green/25 text-tropical-green"
                    : "bg-tiki-brown/5 border border-tiki-brown/10 text-tiki-brown/55"
                }`}
              >
                {allChecked
                  ? "Looks ready for approved video save in a future phase."
                  : `${checklistItems.filter((i) => !checked[i.id]).length} item${
                      checklistItems.filter((i) => !checked[i.id]).length !== 1 ? "s" : ""
                    } remaining — review needed before saving.`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {allWarnings.length > 0 && (
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Warnings</p>
          {allWarnings.map((w, i) => (
            <p key={i} className="text-xs text-tiki-brown/65 leading-snug">
              <span className="text-pineapple-yellow font-bold">▲</span> {w}
            </p>
          ))}
        </div>
      )}

      {/* Review notes */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          Video Review Notes
        </label>
        <textarea
          rows={3}
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          placeholder="Add fidelity review notes here…"
          className="w-full bg-tiki-brown/3 border border-tiki-brown/12 rounded-xl px-3 py-2 text-sm text-tiki-brown/80 placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 resize-y"
        />
        <p className="text-xs text-tiki-brown/35">
          Notes will be saved with the video when you upload the approved clip to Blob storage.
        </p>
      </div>

      {/* Decision buttons */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Review Decision</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setDecision("looks-good")}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
              decision === "looks-good"
                ? "bg-tropical-green text-white"
                : "bg-tropical-green/12 text-tropical-green hover:bg-tropical-green/20 border border-tropical-green/25"
            }`}
          >
            Mark Clip Looks Good
          </button>
          <button
            type="button"
            onClick={() => setDecision("needs-regeneration")}
            className={`rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors ${
              decision === "needs-regeneration"
                ? "bg-warm-coral text-white"
                : "bg-warm-coral/10 text-warm-coral hover:bg-warm-coral/18 border border-warm-coral/25"
            }`}
          >
            Mark Needs Regeneration
          </button>
        </div>

        {decision === "looks-good" && (
          <div className="bg-tropical-green/8 border border-tropical-green/25 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-tropical-green uppercase tracking-wide mb-0.5">
              Clip Looks Good
            </p>
            <p className="text-xs text-tiki-brown/65">
              This temporary clip is ready for the future save-approved-video step.
            </p>
          </div>
        )}

        {decision === "needs-regeneration" && (
          <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-0.5">
              Needs Regeneration
            </p>
            <p className="text-xs text-tiki-brown/65">
              Adjust prompt, duration, style, or references, then generate a new temporary draft.
            </p>
          </div>
        )}
      </div>

      {/* ── Approve & Save Video Clip (primary one-click workflow) ── */}
      <div className="flex flex-col gap-3 pt-2 border-t border-tiki-brown/8">
        <div className="flex items-center gap-2">
          <span className="text-base">✨</span>
          <p className="text-sm font-black text-tiki-brown">Approve & Save Video Clip to Episode</p>
        </div>
        <p className="text-xs text-tiki-brown/60 leading-relaxed">
          This will save the approved clip to media storage and attach it to this episode scene. It will not make it public yet.
        </p>

        {!hasPlayableVideo && (
          <p className="text-xs text-tiki-brown/45">
            A playable video URL is required before saving to media storage.
          </p>
        )}

        {hasPlayableVideo && decision !== "looks-good" && approveAndSaveStatus === "idle" && !attachResult?.ok && (
          <p className="text-xs text-tiki-brown/45">
            Mark the clip as Looks Good to enable saving.
          </p>
        )}

        {hasPlayableVideo && (approveAndSaveStatus === "idle" || approveAndSaveStatus === "error") && !attachResult?.ok && (
          <button
            type="button"
            onClick={handleApproveAndSave}
            disabled={!canApproveAndSave}
            className={`w-full rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide transition-colors ${
              canApproveAndSave
                ? "bg-ube-purple text-white hover:bg-ube-purple/85 active:bg-ube-purple/70"
                : "bg-tiki-brown/8 text-tiki-brown/30 cursor-not-allowed"
            }`}
          >
            {approveAndSaveStatus === "error" ? "Retry Approve & Save Video Clip to Episode" : "Approve & Save Video Clip to Episode"}
          </button>
        )}

        {approveAndSaveStatus === "uploading" && (
          <p className="text-xs text-tiki-brown/45 animate-pulse text-center">Saving to Media Storage…</p>
        )}
        {approveAndSaveStatus === "attaching" && (
          <p className="text-xs text-tiki-brown/45 animate-pulse text-center">Attaching to Episode…</p>
        )}

        {approveAndSaveStatus === "error" && (
          <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-2">
            <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
              {approveAndSaveErrorStep === "upload" ? "Media upload failed" : "Attach to episode failed"}
            </p>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">{approveAndSaveError}</p>
            {approveAndSaveErrorStep === "attach" && approveAndSaveUploadedVideo?.ok && (
              <div className="bg-white/60 rounded-lg px-2 py-1.5 flex flex-col gap-0.5">
                <p className="text-xs font-semibold text-tiki-brown/55">Saved to Media Storage:</p>
                <p className="text-xs font-mono text-ube-purple break-all">{approveAndSaveUploadedVideo.video.url}</p>
                <p className="text-xs text-tiki-brown/40">Use Manual Controls below to attach it to the episode.</p>
              </div>
            )}
          </div>
        )}

        {(approveAndSaveStatus === "done" || attachResult?.ok) && attachResult?.ok && (
          <div className="bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
                Attached to Episode
              </span>
              <span className="text-xs text-tiki-brown/50">Saved to scene — not yet public</span>
            </div>
            <p className="text-xs font-mono text-tiki-brown/60 break-all">{attachResult.path}</p>
            <p className="text-xs text-tiki-brown/55">
              Commit: <span className="font-semibold">{attachResult.commitMessage}</span>
            </p>
            {attachResult.notes.map((n, i) => (
              <p key={i} className="text-xs text-tiki-brown/55 leading-snug">• {n}</p>
            ))}
            <p className="text-xs text-tiki-brown/45 mt-1">Set visibility to Public Ready when public video display is ready.</p>
          </div>
        )}
      </div>

      {/* ── Manual Controls (upload + attach separately) ── */}
      {hasPlayableVideo && (
        <details className="group border border-tiki-brown/10 rounded-2xl overflow-hidden">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none bg-tiki-brown/3 hover:bg-tiki-brown/5 transition-colors list-none">
            <span className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Manual Controls</span>
            <span className="ml-auto text-xs text-tiki-brown/35">Upload and attach separately</span>
          </summary>
          <div className="flex flex-col gap-4 px-4 pt-3 pb-4">
            <p className="text-xs text-tiki-brown/45 leading-relaxed">
              Use manual controls if you need to upload and attach separately for debugging or recovery.
            </p>

            {/* Manual upload */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
                Save Approved Video Clip to Media Storage
              </p>

              <button
                type="button"
                onClick={handleUpload}
                disabled={!canUpload || uploading}
                className={`w-full rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide transition-colors ${
                  canUpload && !uploading
                    ? "bg-tropical-green text-white hover:bg-tropical-green/85 active:bg-tropical-green/70"
                    : "bg-tiki-brown/8 text-tiki-brown/30 cursor-not-allowed"
                }`}
              >
                {uploading ? "Uploading Approved Video Clip…" : "Save Approved Video Clip to Media Storage"}
              </button>

              {decision !== "looks-good" && !uploadResult?.ok && (
                <p className="text-xs text-tiki-brown/45 text-center">
                  Mark the clip as Looks Good to enable saving.
                </p>
              )}

              {uploadFetchError && (
                <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
                  <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-1">Request Error</p>
                  <p className="text-xs text-tiki-brown/65">{uploadFetchError}</p>
                </div>
              )}

              {uploadResult && !uploadResult.ok && (
                <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-2">
                  <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                    {uploadResult.status.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-tiki-brown/70 leading-relaxed">{uploadResult.message}</p>
                </div>
              )}

              {uploadResult && uploadResult.ok && (
                <div className="bg-tropical-green/8 border border-tropical-green/25 rounded-2xl px-4 py-4 flex flex-col gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-blue/20 text-sky-blue/80 uppercase tracking-wide">
                      Saved to Media Storage
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "Provider", value: uploadResult.video.provider },
                      { label: "Style", value: uploadResult.video.videoStyle },
                      { label: "Duration", value: `${uploadResult.video.durationSeconds}s` },
                      { label: "Size", value: `${Math.round(uploadResult.video.sizeBytes / 1024 / 1024 * 10) / 10} MB` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col items-center bg-white border border-tiki-brown/8 rounded-xl px-3 py-2 min-w-[72px]">
                        <span className="text-sm font-black text-tiki-brown">{value}</span>
                        <span className="text-xs text-tiki-brown/45 text-center leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs font-mono text-ube-purple break-all">{uploadResult.video.url}</p>
                  {uploadResult.notes.map((n, i) => (
                    <p key={i} className="text-xs text-tiki-brown/55 leading-snug">• {n}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Manual attach */}
            {uploadResult?.ok && (
              <div className="flex flex-col gap-3 border-t border-tiki-brown/8 pt-3">
                <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
                  Attach Video Clip to Episode Scene
                </p>

                <button
                  type="button"
                  onClick={handleAttach}
                  disabled={!canAttach || attaching}
                  className={`w-full rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide transition-colors ${
                    canAttach && !attaching
                      ? "bg-ube-purple text-white hover:bg-ube-purple/85 active:bg-ube-purple/70"
                      : "bg-tiki-brown/8 text-tiki-brown/30 cursor-not-allowed"
                  }`}
                >
                  {attaching ? "Attaching Video Clip to Episode Scene…" : attachResult?.ok ? "Video Clip Attached" : "Attach Video Clip to Episode Scene"}
                </button>

                {attachFetchError && (
                  <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-1">Request Error</p>
                    <p className="text-xs text-tiki-brown/65">{attachFetchError}</p>
                  </div>
                )}

                {attachResult && !attachResult.ok && (
                  <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-1">
                      {attachResult.status.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-tiki-brown/65">{attachResult.message}</p>
                  </div>
                )}

                {attachResult?.ok && (
                  <div className="bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-4 flex flex-col gap-2">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple self-start uppercase tracking-wide">
                      Attached to Episode
                    </span>
                    <p className="text-xs font-mono text-tiki-brown/60 break-all">{attachResult.path}</p>
                    <p className="text-xs text-tiki-brown/55">Commit: <span className="font-semibold">{attachResult.commitMessage}</span></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </details>
      )}

    </div>
  );
}
