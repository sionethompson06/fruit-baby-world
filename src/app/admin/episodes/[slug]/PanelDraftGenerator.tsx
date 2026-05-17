"use client";

import { useState } from "react";
import type { FidelityThumbnail, FidelityChecklistItem } from "@/lib/storyPanelFidelityReview";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenStatus = "idle" | "loading" | "done" | "not_configured" | "error";
type UploadStatus = "idle" | "loading" | "success" | "error";
type AttachStatus = "idle" | "loading" | "success" | "error";

type ReferenceMetaItem = {
  characterSlug: string;
  characterName: string;
  title: string;
  type: string;
  priority: string;
};

type GenApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  generationPrompt?: string;
  referenceCharacters?: string[];
  referenceMode?: "reference-images-attached" | "prompt-only-reference-summary" | "no-references-available";
  referencesUsed?: ReferenceMetaItem[];
  referencesOmitted?: ReferenceMetaItem[];
  warnings?: string[];
  notes?: string[];
  image?: { mimeType: string; base64: string };
};

type UploadAsset = {
  url: string;
  pathname: string;
  storageProvider: string;
  mimeType: string;
  sceneNumber: number;
  alt: string;
  referenceCharacters: string[];
  uploadedAt: string;
};

type UploadApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  asset?: UploadAsset;
  notes?: string[];
};

type AttachApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  path?: string;
  commitMessage?: string;
  htmlUrl?: string;
  panelAsset?: unknown;
  notes?: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const REFERENCE_MODE_LABELS: Record<string, { label: string; className: string }> = {
  "reference-images-attached": {
    label: "Reference Images Attached",
    className: "bg-tropical-green/15 text-tropical-green border-tropical-green/30",
  },
  "prompt-only-reference-summary": {
    label: "Prompt-Only Reference Summary",
    className: "bg-ube-purple/12 text-ube-purple border-ube-purple/25",
  },
  "no-references-available": {
    label: "No References Available",
    className: "bg-tiki-brown/8 text-tiki-brown/55 border-tiki-brown/15",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAltText(sceneNumber: number, sceneTitle?: string, sceneSummary?: string): string {
  const parts: string[] = [`Story panel for Scene ${sceneNumber}`];
  if (sceneTitle) parts.push(sceneTitle);
  if (sceneSummary) parts.push(sceneSummary.slice(0, 120));
  return parts.join(": ");
}

function uploadErrorMessage(status: string, apiMessage?: string): string {
  if (status === "setup_required") return "Media storage is not configured yet. Add BLOB_READ_WRITE_TOKEN in Vercel environment variables.";
  if (status === "not_approved") return "Character fidelity must be approved before uploading. Enable the approval checkbox first.";
  if (status === "invalid_image_payload") return "The draft image could not be read. Regenerate the temporary draft and try again.";
  if (status === "image_too_large") return "The generated image is too large to upload. Try regenerating a smaller draft.";
  if (status === "blob_upload_failed") return apiMessage ?? "Vercel Blob upload failed. Check Blob storage configuration and token permissions.";
  if (status === "unauthorized") return "Admin access is required. Please unlock the Story Studio again.";
  return apiMessage ?? "Upload failed. Something went wrong — check admin settings and try again.";
}

function attachErrorMessage(status: string, apiMessage?: string): string {
  if (status === "unauthorized") return "Admin access is required. Please unlock the Story Studio again.";
  if (status === "setup_required") return "GitHub saving is not configured yet. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_BRANCH in Vercel environment variables.";
  if (status === "episode_not_found") return "Episode file was not found in GitHub. Make sure this episode has been saved to GitHub first.";
  if (status === "not_approved_for_save") return apiMessage ?? "Episode must be approved for save before media assets can be attached.";
  if (status === "invalid_episode_json") return "Episode file could not be parsed. Contact support if this persists.";
  if (status === "validation_error") return apiMessage ?? "Validation failed. Check all required fields and try again.";
  if (status === "github_error") return apiMessage ?? "GitHub error while attaching asset. Check GitHub configuration and try again.";
  return apiMessage ?? "Something went wrong while attaching this uploaded asset to episode JSON.";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RefImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-tiki-brown/5 border border-tiki-brown/10 rounded-xl text-xs text-tiki-brown/35 font-semibold ${className ?? "w-full aspect-square"}`}>
        Missing ref
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={`object-contain rounded-xl border border-tiki-brown/10 bg-tiki-brown/3 ${className ?? "w-full aspect-square"}`}
      loading="lazy"
    />
  );
}

function CharacterReferenceCard({ thumb }: { thumb: FidelityThumbnail }) {
  return (
    <div className="flex flex-col gap-2 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl p-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-black text-tiki-brown/70">{thumb.characterName}</span>
        {thumb.isTiki && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-warm-coral/12 text-warm-coral/80 font-bold">
            Tiki
          </span>
        )}
        {!thumb.hasProfileSheet && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-pineapple-yellow/20 text-tiki-brown/55 font-semibold">
            No profile sheet
          </span>
        )}
      </div>

      {/* Profile sheet + main image side by side */}
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex flex-col gap-1">
          <p className="text-xs text-tiki-brown/35 font-semibold text-center">Profile Sheet</p>
          <RefImage
            url={thumb.profileSheetUrl}
            alt={`Official profile sheet for ${thumb.characterName}`}
            className="w-full aspect-square object-contain rounded-xl border border-tiki-brown/10 bg-tiki-brown/3"
          />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs text-tiki-brown/35 font-semibold text-center">Main Image</p>
          <RefImage
            url={thumb.mainImageUrl}
            alt={`Main character image for ${thumb.characterName}`}
            className="w-full aspect-square object-contain rounded-xl border border-tiki-brown/10 bg-tiki-brown/3"
          />
        </div>
      </div>

      {/* Supporting thumbnails */}
      {(thumb.supportingThumbnails.length > 0 || thumb.totalSupportingCount > 0) && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-tiki-brown/35 font-semibold">
            Supporting ({thumb.totalSupportingCount} total)
          </p>
          {thumb.supportingThumbnails.length > 0 ? (
            <div className="flex gap-1.5">
              {thumb.supportingThumbnails.map((t, i) => (
                <RefImage
                  key={i}
                  url={t.url}
                  alt={t.title}
                  className="w-12 h-12 flex-shrink-0 object-contain rounded-lg border border-tiki-brown/10 bg-tiki-brown/3"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-tiki-brown/30 italic">None approved yet</p>
          )}
        </div>
      )}

      {/* Environment thumbnails */}
      {(thumb.envThumbnails.length > 0 || thumb.totalEnvCount > 0) && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-tiki-brown/35 font-semibold">
            Environment / Home ({thumb.totalEnvCount} total)
          </p>
          {thumb.envThumbnails.length > 0 ? (
            <div className="flex gap-1.5">
              {thumb.envThumbnails.map((t, i) => (
                <RefImage
                  key={i}
                  url={t.url}
                  alt={t.title}
                  className="w-12 h-12 flex-shrink-0 object-contain rounded-lg border border-tiki-brown/10 bg-tiki-brown/3"
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-tiki-brown/30 italic">None approved yet</p>
          )}
        </div>
      )}

      {/* Tiki reminder */}
      {thumb.isTiki && (
        <p className="text-xs text-warm-coral/65 leading-relaxed">
          Verify Tiki looks mischievous and funny — not scary, cruel, or evil.
        </p>
      )}
    </div>
  );
}

function FidelityChecklist({
  items,
  checked,
  onToggle,
}: {
  items: FidelityChecklistItem[];
  checked: boolean[];
  onToggle: (i: number) => void;
}) {
  const allChecked = checked.length === items.length && checked.every(Boolean);
  const noneChecked = checked.every((c) => !c);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        Fidelity Checklist
      </p>
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <label
            key={item.id}
            className={`flex items-start gap-2.5 cursor-pointer group rounded-lg px-2 py-1 transition-colors ${
              item.isTikiSpecific ? "bg-warm-coral/5" : ""
            }`}
          >
            <input
              type="checkbox"
              checked={checked[i] ?? false}
              onChange={() => onToggle(i)}
              className="mt-0.5 flex-shrink-0 accent-tropical-green"
            />
            <span
              className={`text-xs leading-relaxed transition-colors ${
                checked[i]
                  ? "text-tropical-green line-through"
                  : item.isTikiSpecific
                  ? "text-warm-coral/70"
                  : "text-tiki-brown/65"
              }`}
            >
              {item.label}
            </span>
          </label>
        ))}
      </div>

      {/* Review recommendation */}
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 mt-1 ${
          allChecked
            ? "bg-tropical-green/10 border border-tropical-green/25"
            : "bg-pineapple-yellow/10 border border-pineapple-yellow/25"
        }`}
      >
        <span className="text-sm flex-shrink-0">{allChecked ? "✅" : "📋"}</span>
        <p className={`text-xs font-semibold ${allChecked ? "text-tropical-green" : "text-tiki-brown/65"}`}>
          {allChecked
            ? "Looks ready for upload"
            : noneChecked
            ? "Review each item before uploading"
            : "Review needed before upload — unchecked items remain"}
        </p>
      </div>

      <p className="text-xs text-tiki-brown/35 italic">
        Checklist is local guidance only — not saved, clears on refresh.
      </p>
    </div>
  );
}

function GenerationPromptBlock({ prompt }: { prompt: string }) {
  return (
    <details>
      <summary className="cursor-pointer list-none text-xs text-tiki-brown/40 italic select-none py-1">
        View generation prompt ▸
      </summary>
      <div className="flex flex-col gap-1.5 mt-2">
        <pre className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3 text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap break-words font-sans select-all max-h-64 overflow-y-auto">
          {prompt}
        </pre>
        <p className="text-xs text-tiki-brown/35 italic">Select text above to copy.</p>
      </div>
    </details>
  );
}

function UploadSuccessPanel({ asset }: { asset: UploadAsset }) {
  return (
    <div className="flex flex-col gap-3 bg-tropical-green/8 border border-tropical-green/25 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="text-base">✅</span>
        <h4 className="text-sm font-black text-tropical-green">Uploaded to Media Storage</h4>
      </div>
      <div className="flex flex-col gap-1.5 text-xs text-tiki-brown/70">
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">URL</span>
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-ube-purple underline break-all hover:opacity-75">
            {asset.url}
          </a>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">Path</span>
          <span className="break-all font-mono">{asset.pathname}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">Provider</span>
          <span>{asset.storageProvider}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">Uploaded</span>
          <span>{new Date(asset.uploadedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function AttachSuccessPanel({
  result,
  asset,
  sceneNumber,
}: {
  result: AttachApiResult;
  asset: UploadAsset;
  sceneNumber: number;
}) {
  return (
    <div className="flex flex-col gap-3 bg-ube-purple/8 border border-ube-purple/25 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <span className="text-base">📎</span>
        <h4 className="text-sm font-black text-ube-purple">Panel Asset Saved to Episode JSON</h4>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          This Session
        </span>
      </div>
      <div className="flex items-start gap-2 bg-tropical-green/8 border border-tropical-green/25 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">✅</span>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          <strong className="font-bold">Panel asset reference updated for Scene {sceneNumber}.</strong>{" "}
          After Vercel redeploys, the public story page will use the replacement image. The previous Blob asset is not deleted.
        </p>
      </div>
      <div className="flex flex-col gap-1.5 bg-white/50 border border-ube-purple/15 rounded-xl px-3 py-2.5 text-xs text-tiki-brown/70">
        {[
          ["Status", "attached-this-session"],
          ["Scene", String(sceneNumber)],
          ["Approval", "approved"],
          ["Provider", asset.storageProvider],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start gap-2">
            <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">{label}</span>
            <span className={label === "Status" || label === "Approval" ? "font-semibold text-tropical-green" : ""}>{value}</span>
          </div>
        ))}
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Asset URL</span>
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="text-ube-purple underline break-all hover:opacity-75">
            {asset.url}
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs text-tiki-brown/65">
        {result.path && (
          <div className="flex items-start gap-2">
            <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">File</span>
            <span className="font-mono break-all">{result.path}</span>
          </div>
        )}
        {result.commitMessage && (
          <div className="flex items-start gap-2">
            <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">Commit</span>
            <span>{result.commitMessage}</span>
          </div>
        )}
        {result.htmlUrl && (
          <div className="flex items-start gap-2">
            <span className="font-bold text-tiki-brown/45 w-24 flex-shrink-0">GitHub</span>
            <a href={result.htmlUrl} target="_blank" rel="noopener noreferrer" className="text-ube-purple underline break-all hover:opacity-75">
              View commit
            </a>
          </div>
        )}
      </div>
      <div className="flex items-start gap-2 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-3 py-2.5">
        <span className="text-xs flex-shrink-0">🔄</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Vercel redeploy required.</strong>{" "}
          After Vercel redeploys, reload this admin page to confirm the updated asset appears in the Saved Story Panel Assets section.
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PanelDraftGenerator({
  episodeSlug,
  sceneNumber,
  panelPrompt,
  referenceCharacters,
  sceneTitle,
  sceneSummary,
  fidelityThumbnails,
  fidelityChecklist,
  hasTiki,
}: {
  episodeSlug: string;
  sceneNumber: number;
  panelPrompt: string;
  referenceCharacters: string[];
  sceneTitle?: string;
  sceneSummary?: string;
  fidelityThumbnails?: FidelityThumbnail[];
  fidelityChecklist?: FidelityChecklistItem[];
  hasTiki?: boolean;
}) {
  // Generation state
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [result, setResult] = useState<GenApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Fidelity review state — local only
  const checklistItems: FidelityChecklistItem[] = fidelityChecklist ?? [];
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() =>
    new Array(checklistItems.length).fill(false)
  );
  const [reviewNotes, setReviewNotes] = useState<string>("");

  // Upload state
  const [fidelityApprovedForUpload, setFidelityApprovedForUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadResult, setUploadResult] = useState<UploadApiResult | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string>("");

  // Attach state
  const [attachStatus, setAttachStatus] = useState<AttachStatus>("idle");
  const [attachResult, setAttachResult] = useState<AttachApiResult | null>(null);
  const [attachErrorMsg, setAttachErrorMsg] = useState<string>("");

  const hasImage = genStatus === "done" && !!result?.image?.base64;
  const hasDraft = genStatus === "done" || genStatus === "not_configured";
  const isLoading = genStatus === "loading";
  const canUpload = hasImage && fidelityApprovedForUpload;
  const uploadedAsset = uploadResult?.asset;
  const canAttach =
    uploadStatus === "success" &&
    !!uploadedAsset &&
    uploadedAsset.storageProvider === "vercel-blob" &&
    fidelityApprovedForUpload &&
    attachStatus !== "success";

  function resetReviewState() {
    setCheckedItems(new Array(checklistItems.length).fill(false));
    setReviewNotes("");
    setFidelityApprovedForUpload(false);
    setUploadStatus("idle");
    setUploadResult(null);
    setUploadErrorMsg("");
    setAttachStatus("idle");
    setAttachResult(null);
    setAttachErrorMsg("");
  }

  function toggleItem(i: number) {
    setCheckedItems((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function handleClear() {
    setGenStatus("idle");
    setResult(null);
    setErrorMsg("");
    resetReviewState();
  }

  async function handleGenerate() {
    setGenStatus("loading");
    setResult(null);
    setErrorMsg("");
    resetReviewState();

    try {
      const res = await fetch("/api/generate-story-panel-image", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, sceneNumber, panelPrompt, referenceCharacters }),
      });

      if (res.status === 401) {
        setGenStatus("error");
        setErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        return;
      }

      let data: GenApiResult;
      try {
        data = (await res.json()) as GenApiResult;
      } catch {
        setGenStatus("error");
        setErrorMsg("Something went wrong while generating this temporary panel draft.");
        return;
      }

      if (data.status === "not_implemented_yet") {
        setGenStatus("not_configured");
        setResult(data);
        return;
      }

      if (data.ok) {
        setGenStatus("done");
        setResult(data);
      } else {
        setGenStatus("error");
        setErrorMsg(data.message ?? "Something went wrong while generating this temporary panel draft.");
      }
    } catch {
      setGenStatus("error");
      setErrorMsg("Something went wrong while generating this temporary panel draft.");
    }
  }

  async function handleUpload() {
    if (!result?.image || !canUpload) return;

    setUploadStatus("loading");
    setUploadResult(null);
    setUploadErrorMsg("");
    setAttachStatus("idle");
    setAttachResult(null);
    setAttachErrorMsg("");

    const alt = buildAltText(sceneNumber, sceneTitle, sceneSummary);

    try {
      const res = await fetch("/api/media/upload-story-panel-image", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          sceneNumber,
          imageBase64: result.image.base64,
          mimeType: result.image.mimeType,
          alt,
          referenceCharacters: result.referenceCharacters ?? referenceCharacters,
          review: { characterFidelityApproved: true },
        }),
      });

      if (res.status === 401) {
        setUploadStatus("error");
        setUploadErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        return;
      }

      let data: UploadApiResult;
      try {
        data = (await res.json()) as UploadApiResult;
      } catch {
        setUploadStatus("error");
        setUploadErrorMsg("Upload failed — could not parse server response.");
        return;
      }

      if (data.ok && data.status === "uploaded") {
        setUploadStatus("success");
        setUploadResult(data);
      } else {
        setUploadStatus("error");
        setUploadErrorMsg(uploadErrorMessage(data.status, data.message));
      }
    } catch {
      setUploadStatus("error");
      setUploadErrorMsg("Upload failed — network error. Check your connection and try again.");
    }
  }

  async function handleAttach() {
    if (!uploadedAsset || !canAttach) return;

    setAttachStatus("loading");
    setAttachResult(null);
    setAttachErrorMsg("");

    const now = new Date().toISOString();

    try {
      const res = await fetch("/api/github/attach-story-panel-asset", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          panelAsset: {
            sceneNumber,
            panelTitle: sceneTitle ?? `Scene ${sceneNumber}`,
            status: "approved",
            approvalStatus: "approved",
            referenceCharacters:
              uploadedAsset.referenceCharacters.length > 0
                ? uploadedAsset.referenceCharacters
                : referenceCharacters,
            prompt: panelPrompt,
            asset: {
              url: uploadedAsset.url,
              pathname: uploadedAsset.pathname,
              storageProvider: "vercel-blob",
              mimeType: uploadedAsset.mimeType || "image/png",
              width: null,
              height: null,
              alt: uploadedAsset.alt,
              createdAt: uploadedAsset.uploadedAt,
              approvedAt: now,
            },
            review: {
              requiresHumanReview: true,
              characterFidelityApproved: true,
              notes: reviewNotes,
            },
            publicUse: { allowed: true, appearsOnPublicStoryPage: true },
          },
        }),
      });

      if (res.status === 401) {
        setAttachStatus("error");
        setAttachErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        return;
      }

      let data: AttachApiResult;
      try {
        data = (await res.json()) as AttachApiResult;
      } catch {
        setAttachStatus("error");
        setAttachErrorMsg("Something went wrong while attaching this uploaded asset to episode JSON.");
        return;
      }

      if (data.ok && data.status === "attached") {
        setAttachStatus("success");
        setAttachResult(data);
      } else {
        setAttachStatus("error");
        setAttachErrorMsg(attachErrorMessage(data.status, data.message));
      }
    } catch {
      setAttachStatus("error");
      setAttachErrorMsg("Something went wrong while attaching this uploaded asset to episode JSON.");
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-sky-blue/25 mt-1">

      {/* Temporary draft disclaimer */}
      <div className="flex items-start gap-2 bg-sky-blue/10 border border-sky-blue/25 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">⚠️</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Temporary review draft only.</strong>{" "}
          Generated images are not saved, uploaded, attached to this episode, committed to GitHub, or
          published until explicitly approved and uploaded below.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-ube-purple text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isLoading ? "Generating…" : hasDraft ? "Regenerate Temporary Draft" : "Generate Temporary Panel Draft"}
        </button>

        {hasDraft && !isLoading && (
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-xl border border-tiki-brown/20 text-tiki-brown/60 text-sm font-semibold hover:bg-tiki-brown/5 transition-colors"
          >
            Clear Temporary Draft
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-sm text-tiki-brown/45 italic animate-pulse">
          Generating temporary panel draft…
        </p>
      )}

      {/* Error */}
      {genStatus === "error" && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-warm-coral leading-relaxed font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Not configured */}
      {genStatus === "not_configured" && result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">🔑</span>
            <p className="text-xs text-tiki-brown/70 leading-relaxed">
              {result.message?.includes("OPENAI_API_KEY")
                ? "OpenAI is not configured yet. Add OPENAI_API_KEY in your Vercel environment variables to enable generation."
                : result.message}
            </p>
          </div>
          {result.referenceMode && (
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Reference Mode</p>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).className}`}>
                {(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).label}
              </span>
            </div>
          )}
          {result.referencesUsed && result.referencesUsed.length > 0 && (
            <p className="text-xs text-tiki-brown/45">
              {result.referencesUsed.length} reference asset{result.referencesUsed.length !== 1 ? "s" : ""} would be included in prompt context.
            </p>
          )}
          {result.generationPrompt && <GenerationPromptBlock prompt={result.generationPrompt} />}
        </div>
      )}

      {/* ── Side-by-side Fidelity Review (when draft is done) ── */}
      {genStatus === "done" && result && (
        <div className="flex flex-col gap-5 bg-tiki-brown/3 border border-tiki-brown/10 rounded-2xl p-4 mt-1">

          {/* Section heading */}
          <div className="flex items-center gap-2">
            <span className="text-base">🔍</span>
            <h3 className="text-sm font-black text-tiki-brown">Side-by-Side Fidelity Review</h3>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral uppercase tracking-wide">
              Temporary — Not Saved
            </span>
          </div>

          {/* Two-column layout: left = draft, right = references + checklist */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* LEFT: Generated Draft Image */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                Generated Temporary Draft — Not Saved
              </p>

              {result.image?.base64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                  alt="Temporary story panel draft — not saved, not published"
                  className="w-full rounded-2xl border-2 border-warm-coral/30 shadow-sm"
                />
              ) : (
                <div className="w-full aspect-square rounded-2xl border border-warm-coral/30 bg-warm-coral/5 flex items-center justify-center">
                  <p className="text-xs text-tiki-brown/35">No image data</p>
                </div>
              )}

              {/* Draft metadata */}
              <div className="flex flex-col gap-1.5 text-xs">
                {/* Reference mode badge */}
                {result.referenceMode && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-tiki-brown/45 uppercase tracking-wide">Reference Mode</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full border ${(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).className}`}>
                      {(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).label}
                    </span>
                  </div>
                )}

                {/* References used */}
                {result.referencesUsed && result.referencesUsed.length > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-tiki-brown/45 uppercase tracking-wide">
                      Prompt Context ({result.referencesUsed.length} asset{result.referencesUsed.length !== 1 ? "s" : ""})
                    </span>
                    {result.referencesUsed.map((r, i) => (
                      <span key={i} className="text-tiki-brown/50 leading-relaxed pl-2">
                        <span className="font-semibold">{r.characterName}</span> — {r.title}
                        <span className="text-tiki-brown/30"> [{r.priority}]</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Reference mode note */}
                {result.referenceMode === "prompt-only-reference-summary" && (
                  <p className="text-tiki-brown/35 italic">
                    Reference context injected as text. DALL-E 3 is text-only; image inputs are a future upgrade.
                  </p>
                )}

                {/* Generation warnings */}
                {result.warnings && result.warnings.length > 0 && (
                  <div className="flex flex-col gap-1 bg-pineapple-yellow/10 border border-pineapple-yellow/25 rounded-xl px-3 py-2 mt-1">
                    <span className="font-bold text-tiki-brown/50 uppercase tracking-wide">Warnings</span>
                    {result.warnings.map((w, i) => (
                      <span key={i} className="text-tiki-brown/60">⚠ {w}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Reference characters */}
              {(result.referenceCharacters ?? referenceCharacters).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
                    Characters in Scene
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(result.referenceCharacters ?? referenceCharacters).map((c) => (
                      <span key={c} className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Official References & Checklist */}
            <div className="flex flex-col gap-4">

              {/* Reference cards */}
              {fidelityThumbnails && fidelityThumbnails.length > 0 ? (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                    Official Character References
                  </p>
                  {fidelityThumbnails.map((thumb) => (
                    <CharacterReferenceCard key={thumb.characterSlug} thumb={thumb} />
                  ))}
                </div>
              ) : (
                <div className="bg-pineapple-yellow/8 border border-pineapple-yellow/25 rounded-2xl p-4">
                  <p className="text-xs font-bold text-tiki-brown/50 mb-1">No Reference Thumbnails Available</p>
                  <p className="text-xs text-tiki-brown/45 leading-relaxed">
                    Upload and approve official character profile sheets in Character Studio to enable visual comparison.
                  </p>
                </div>
              )}

              {/* Tiki-specific reminder */}
              {hasTiki && (
                <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm flex-shrink-0">⚡</span>
                  <p className="text-xs text-tiki-brown/70 leading-relaxed">
                    <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny, dramatic, and kid-friendly. Reject or regenerate drafts that make Tiki scary, violent, cruel, or too intense.
                  </p>
                </div>
              )}

              {/* Fidelity checklist */}
              {checklistItems.length > 0 && (
                <FidelityChecklist
                  items={checklistItems}
                  checked={checkedItems}
                  onToggle={toggleItem}
                />
              )}

              {/* Review notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                  Fidelity Review Notes
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="e.g. Colors look off, crown shape incorrect, regenerate with more specific prompt…"
                  rows={3}
                  className="w-full text-xs text-tiki-brown/75 bg-white border border-tiki-brown/15 rounded-xl px-3 py-2.5 leading-relaxed resize-y placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40"
                />
                <p className="text-xs text-tiki-brown/35 italic">
                  Local only — not saved, clears on refresh.
                </p>
              </div>
            </div>
          </div>

          {/* Reference reminder */}
          <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">📎</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              Upload only after the draft matches the official character references and scene environment. Compare against the official profile sheet and approved character references before uploading.
            </p>
          </div>

          {/* ── Upload section ── */}
          {hasImage && (
            <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">☁️</span>
                <h4 className="text-sm font-black text-tiki-brown">Upload to Media Storage</h4>
              </div>

              {uploadStatus === "success" && uploadedAsset && (
                <UploadSuccessPanel asset={uploadedAsset} />
              )}

              {uploadStatus === "error" && (
                <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-xs text-warm-coral leading-relaxed font-semibold">{uploadErrorMsg}</p>
                </div>
              )}

              {uploadStatus !== "success" && (
                <>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fidelityApprovedForUpload}
                      onChange={(e) => setFidelityApprovedForUpload(e.target.checked)}
                      className="mt-0.5 flex-shrink-0 accent-tropical-green"
                    />
                    <span className="text-xs text-tiki-brown/70 leading-relaxed">
                      <strong className="font-bold">I confirm</strong> this draft meets character fidelity standards and is suitable for temporary media storage. I understand this does not attach the image to the episode or publish it.
                    </span>
                  </label>

                  {!canUpload && (
                    <p className="text-xs text-tiki-brown/40 italic">
                      {!hasImage ? "Generate a draft image first." : "Check the approval box above to enable upload."}
                    </p>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!canUpload || uploadStatus === "loading"}
                    className="self-start px-4 py-2 rounded-xl bg-tropical-green text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    {uploadStatus === "loading" ? "Uploading…" : "Upload Reviewed Draft to Media Storage"}
                  </button>

                  <p className="text-xs text-tiki-brown/35 italic">
                    Uploads to Vercel Blob storage only. Not attached to the episode JSON. Not published.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Attach section ── */}
          {uploadStatus === "success" && uploadedAsset && (
            <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">📎</span>
                <h4 className="text-sm font-black text-tiki-brown">Attach to Episode JSON</h4>
              </div>

              {attachStatus === "success" && attachResult && (
                <AttachSuccessPanel result={attachResult} asset={uploadedAsset} sceneNumber={sceneNumber} />
              )}

              {attachStatus === "error" && (
                <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-xs text-warm-coral leading-relaxed font-semibold">{attachErrorMsg}</p>
                </div>
              )}

              {attachStatus !== "success" && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs text-tiki-brown/65 leading-relaxed">
                    This will save the uploaded media asset URL into the episode JSON media manifest in GitHub. After Vercel redeploys, the episode will know about this approved story panel asset.
                  </p>
                  <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
                    <span className="text-xs flex-shrink-0">⚠️</span>
                    <p className="text-xs text-tiki-brown/65 leading-relaxed">
                      This does not publish the image publicly yet. Public story panel display will be added in a later phase.
                    </p>
                  </div>
                  {attachStatus === "loading" && (
                    <p className="text-sm text-tiki-brown/45 italic animate-pulse">
                      Attaching uploaded asset to episode JSON…
                    </p>
                  )}
                  <button
                    onClick={handleAttach}
                    disabled={!canAttach || attachStatus === "loading"}
                    className="self-start px-4 py-2 rounded-xl bg-tiki-brown text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    {attachStatus === "loading" ? "Attaching…" : "Attach Uploaded Asset to Episode JSON"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* API notes */}
          {result.notes && result.notes.length > 0 && (
            <ul className="space-y-1 border-t border-tiki-brown/8 pt-3">
              {result.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-tiki-brown/45">
                  <span className="mt-0.5 text-ube-purple/40 flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
          )}

          {/* Generation prompt (collapsible) */}
          {result.generationPrompt && (
            <GenerationPromptBlock prompt={result.generationPrompt} />
          )}

        </div>
      )}
    </div>
  );
}
