"use client";

import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIDELITY_ITEMS = [
  "Character body shape matches official reference.",
  "Character colors match official reference.",
  "Face, eyes, mouth, cheeks, and expression style are consistent.",
  "Leaf/crown/accessories are preserved.",
  "Fruit/body texture and identity are preserved.",
  "Character still feels baby-like, soft, and kid-friendly.",
  "Scene matches the prompt and story moment.",
  "No character has been redesigned.",
  "No generic fruit mascot replacement.",
  "No scary, realistic, harsh, or off-brand styling.",
];

type ReviewStatus = "needs-review" | "looks-close" | "needs-regeneration" | "reject-draft";

const REVIEW_STATUS_OPTIONS: { value: ReviewStatus; label: string; className: string }[] = [
  { value: "needs-review",       label: "Needs Review",       className: "bg-pineapple-yellow/30 text-tiki-brown border-pineapple-yellow/50" },
  { value: "looks-close",        label: "Looks Close",        className: "bg-tropical-green/20 text-tropical-green border-tropical-green/40" },
  { value: "needs-regeneration", label: "Needs Regeneration", className: "bg-warm-coral/15 text-warm-coral border-warm-coral/35" },
  { value: "reject-draft",       label: "Reject Draft",       className: "bg-warm-coral/25 text-warm-coral border-warm-coral/50" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type GenStatus = "idle" | "loading" | "done" | "not_configured" | "error";
type UploadStatus = "idle" | "loading" | "success" | "error";
type AttachStatus = "idle" | "loading" | "success" | "error";

type GenApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  generationPrompt?: string;
  referenceCharacters?: string[];
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildAltText(sceneNumber: number, sceneTitle?: string, sceneSummary?: string): string {
  const parts: string[] = [`Story panel for Scene ${sceneNumber}`];
  if (sceneTitle) parts.push(sceneTitle);
  if (sceneSummary) parts.push(sceneSummary.slice(0, 120));
  return parts.join(": ");
}

function uploadErrorMessage(status: string, apiMessage?: string): string {
  if (status === "setup_required") {
    return "Media storage is not configured yet. Add BLOB_READ_WRITE_TOKEN in Vercel environment variables.";
  }
  if (status === "not_approved") {
    return "Character fidelity must be approved before uploading. Enable the approval checkbox first.";
  }
  if (status === "invalid_image_payload") {
    return "The draft image could not be read. Regenerate the temporary draft and try again.";
  }
  if (status === "image_too_large") {
    return "The generated image is too large to upload. Try regenerating a smaller draft.";
  }
  if (status === "blob_upload_failed") {
    return apiMessage ?? "Vercel Blob upload failed. Check Blob storage configuration and token permissions.";
  }
  if (status === "unauthorized") {
    return "Admin access is required. Please unlock the Story Studio again.";
  }
  return apiMessage ?? "Upload failed. Something went wrong — check admin settings and try again.";
}

function attachErrorMessage(status: string, apiMessage?: string): string {
  if (status === "unauthorized") {
    return "Admin access is required. Please unlock the Story Studio again.";
  }
  if (status === "setup_required") {
    return "GitHub saving is not configured yet. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, and GITHUB_BRANCH in Vercel environment variables.";
  }
  if (status === "episode_not_found") {
    return "Episode file was not found in GitHub. Make sure this episode has been saved to GitHub first.";
  }
  if (status === "not_approved_for_save") {
    return apiMessage ?? "Episode must be approved for save before media assets can be attached.";
  }
  if (status === "invalid_episode_json") {
    return "Episode file could not be parsed. Contact support if this persists.";
  }
  if (status === "validation_error") {
    return apiMessage ?? "Validation failed. Check all required fields and try again.";
  }
  if (status === "github_error") {
    return apiMessage ?? "GitHub error while attaching asset. Check GitHub configuration and try again.";
  }
  return apiMessage ?? "Something went wrong while attaching this uploaded asset to episode JSON.";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function GenerationPromptBlock({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        Final Generation Prompt
      </p>
      <pre className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3 text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap break-words font-sans select-all max-h-64 overflow-y-auto">
        {prompt}
      </pre>
      <p className="text-xs text-tiki-brown/35 italic">Select text above to copy.</p>
    </div>
  );
}

function ReferenceCharactersBlock({ chars }: { chars: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
        Reference Characters Used
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chars.map((c) => (
          <span
            key={c}
            className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function FidelityChecklist({
  checked,
  onToggle,
}: {
  checked: boolean[];
  onToggle: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        Character Fidelity Review
      </p>
      <div className="flex flex-col gap-1.5">
        {FIDELITY_ITEMS.map((item, i) => (
          <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => onToggle(i)}
              className="mt-0.5 flex-shrink-0 accent-tropical-green"
            />
            <span
              className={`text-xs leading-relaxed transition-colors ${
                checked[i] ? "text-tropical-green line-through" : "text-tiki-brown/65"
              }`}
            >
              {item}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-tiki-brown/35 italic mt-0.5">
        Checklist is local only — not saved, clears on refresh.
      </p>
    </div>
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
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ube-purple underline break-all hover:opacity-75"
          >
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
        <h4 className="text-sm font-black text-ube-purple">Attached to Episode JSON</h4>
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
          This Session
        </span>
      </div>

      {/* Manifest-style summary */}
      <div className="flex flex-col gap-1.5 bg-white/50 border border-ube-purple/15 rounded-xl px-3 py-2.5 text-xs text-tiki-brown/70">
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Status</span>
          <span className="font-semibold text-tropical-green">attached-this-session</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Scene</span>
          <span>{sceneNumber}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Approval</span>
          <span className="font-semibold text-tropical-green">approved</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Provider</span>
          <span>{asset.storageProvider}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Asset URL</span>
          <a
            href={asset.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ube-purple underline break-all hover:opacity-75"
          >
            {asset.url}
          </a>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Public use</span>
          <span className="font-semibold text-tropical-green">allowed</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="font-bold text-tiki-brown/45 w-32 flex-shrink-0">Public story page</span>
          <span className="font-semibold text-tropical-green">true</span>
        </div>
      </div>

      {/* GitHub commit info */}
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
            <a
              href={result.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ube-purple underline break-all hover:opacity-75"
            >
              View commit
            </a>
          </div>
        )}
      </div>

      {/* Redeploy note */}
      <div className="flex items-start gap-2 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-3 py-2.5">
        <span className="text-xs flex-shrink-0">🔄</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Vercel redeploy is required</strong> before this saved media
          manifest appears in the deployed app. After Vercel redeploys, reload this admin episode page
          to confirm the media asset appears in the saved episode JSON.
        </p>
      </div>

      {/* Not published note */}
      <div className="flex items-start gap-2 bg-sky-blue/10 border border-sky-blue/25 rounded-xl px-3 py-2.5">
        <span className="text-xs flex-shrink-0">ℹ️</span>
        <p className="text-xs text-tiki-brown/60 leading-relaxed">
          This does not publish the image publicly yet. Public story panel display will be added in a
          later phase.
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
}: {
  episodeSlug: string;
  sceneNumber: number;
  panelPrompt: string;
  referenceCharacters: string[];
  sceneTitle?: string;
  sceneSummary?: string;
}) {
  // Generation state
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [result, setResult] = useState<GenApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Review state — local only, not persisted
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("needs-review");
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() =>
    new Array(FIDELITY_ITEMS.length).fill(false)
  );
  const [reviewNotes, setReviewNotes] = useState<string>("");

  // Upload state — local only, not persisted
  const [fidelityApprovedForUpload, setFidelityApprovedForUpload] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadResult, setUploadResult] = useState<UploadApiResult | null>(null);
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string>("");

  // Attach state — local only, not persisted
  const [attachStatus, setAttachStatus] = useState<AttachStatus>("idle");
  const [attachResult, setAttachResult] = useState<AttachApiResult | null>(null);
  const [attachErrorMsg, setAttachErrorMsg] = useState<string>("");

  const hasTiki = referenceCharacters.some((c) => c.toLowerCase().includes("tiki"));
  const hasImage = genStatus === "done" && !!result?.image?.base64;
  const hasDraft = genStatus === "done" || genStatus === "not_configured";
  const isLoading = genStatus === "loading";
  const canUpload = hasImage && reviewStatus === "looks-close" && fidelityApprovedForUpload;

  const uploadedAsset = uploadResult?.asset;
  const canAttach =
    uploadStatus === "success" &&
    !!uploadedAsset &&
    uploadedAsset.storageProvider === "vercel-blob" &&
    reviewStatus === "looks-close" &&
    fidelityApprovedForUpload &&
    attachStatus !== "success";

  function getUploadDisabledReason(): string | null {
    if (!hasImage) return "Generate a draft image first.";
    if (reviewStatus !== "looks-close") return 'Set review status to "Looks Close" first.';
    if (!fidelityApprovedForUpload) return "Check the approval box below to enable upload.";
    return null;
  }

  function resetReviewState() {
    setReviewStatus("needs-review");
    setCheckedItems(new Array(FIDELITY_ITEMS.length).fill(false));
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
        body: JSON.stringify({
          episodeSlug,
          sceneNumber,
          panelPrompt,
          referenceCharacters,
        }),
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
        setErrorMsg(
          data.message ?? "Something went wrong while generating this temporary panel draft."
        );
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
            publicUse: {
              allowed: true,
              appearsOnPublicStoryPage: true,
            },
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
          {isLoading
            ? "Generating…"
            : hasDraft
            ? "Regenerate Temporary Draft"
            : "Generate Temporary Panel Draft"}
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
          {result.generationPrompt && (
            <GenerationPromptBlock prompt={result.generationPrompt} />
          )}
          {result.referenceCharacters && result.referenceCharacters.length > 0 && (
            <ReferenceCharactersBlock chars={result.referenceCharacters} />
          )}
        </div>
      )}

      {/* ── Draft Image Review ── */}
      {genStatus === "done" && result && (
        <div className="flex flex-col gap-5 bg-tiki-brown/3 border border-tiki-brown/10 rounded-2xl p-4 mt-1">

          {/* Section heading */}
          <div className="flex items-center gap-2">
            <span className="text-base">🔍</span>
            <h3 className="text-sm font-black text-tiki-brown">Draft Image Review</h3>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral uppercase tracking-wide">
              Temporary — Not Saved
            </span>
          </div>

          {/* Image preview */}
          {result.image?.base64 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                Temporary Draft Preview — Not Saved
              </p>
              <p className="text-xs text-tiki-brown/50 leading-relaxed">
                This image is a temporary admin review draft. It has not been saved, approved,
                attached to the episode, or published.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                alt="Temporary story panel draft — not saved, not published"
                className="w-full max-w-lg rounded-2xl border-2 border-warm-coral/30 shadow-sm"
              />
            </div>
          )}

          {/* Reference characters */}
          {(result.referenceCharacters ?? referenceCharacters).length > 0 && (
            <div>
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
                Reference Characters
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(result.referenceCharacters ?? referenceCharacters).map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tiki-specific warning */}
          {hasTiki && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚡</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
                dramatic, and kid-friendly. Reject or regenerate drafts that make Tiki scary,
                violent, horror-like, cruel, evil, or too intense.
              </p>
            </div>
          )}

          {/* Reference reminder */}
          <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">📎</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              Compare this draft against the official profile sheet and approved character references
              before using it in any future story panel.
            </p>
          </div>

          {/* Fidelity checklist */}
          <FidelityChecklist checked={checkedItems} onToggle={toggleItem} />

          {/* Local review status */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Local Review Status
            </p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_STATUS_OPTIONS.map(({ value, label, className }) => (
                <button
                  key={value}
                  onClick={() => setReviewStatus(value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-opacity ${className} ${
                    reviewStatus === value ? "opacity-100 shadow-sm" : "opacity-40 hover:opacity-70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-tiki-brown/35 italic">
              Local only — not saved, clears on refresh.
            </p>
          </div>

          {/* Review notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Panel Review Notes
            </label>
            <p className="text-xs text-tiki-brown/40">
              Add notes about character fidelity, scene accuracy, or what should change before
              regenerating.
            </p>
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

          {/* ── Upload section ── */}
          {hasImage && (
            <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">☁️</span>
                <h4 className="text-sm font-black text-tiki-brown">Upload to Media Storage</h4>
              </div>

              {/* Upload success */}
              {uploadStatus === "success" && uploadedAsset && (
                <UploadSuccessPanel asset={uploadedAsset} />
              )}

              {/* Upload error */}
              {uploadStatus === "error" && (
                <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-xs text-warm-coral leading-relaxed font-semibold">
                    {uploadErrorMsg}
                  </p>
                </div>
              )}

              {/* Fidelity approval gate */}
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
                      <strong className="font-bold">I confirm</strong> this draft meets character
                      fidelity standards and is suitable for temporary media storage. I understand
                      this does not attach the image to the episode or publish it.
                    </span>
                  </label>

                  {/* Disable reason hint */}
                  {!canUpload && (
                    <p className="text-xs text-tiki-brown/40 italic">
                      {getUploadDisabledReason()}
                    </p>
                  )}

                  <button
                    onClick={handleUpload}
                    disabled={!canUpload || uploadStatus === "loading"}
                    className="self-start px-4 py-2 rounded-xl bg-tropical-green text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    {uploadStatus === "loading"
                      ? "Uploading…"
                      : "Upload Reviewed Draft to Media Storage"}
                  </button>

                  <p className="text-xs text-tiki-brown/35 italic">
                    Uploads to Vercel Blob storage only. Not attached to the episode JSON. Not
                    published.
                  </p>
                </>
              )}
            </div>
          )}

          {/* ── Attach section — only after upload succeeds ── */}
          {uploadStatus === "success" && uploadedAsset && (
            <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">📎</span>
                <h4 className="text-sm font-black text-tiki-brown">Attach to Episode JSON</h4>
              </div>

              {/* Attach success */}
              {attachStatus === "success" && attachResult && (
                <AttachSuccessPanel
                  result={attachResult}
                  asset={uploadedAsset}
                  sceneNumber={sceneNumber}
                />
              )}

              {/* Attach error */}
              {attachStatus === "error" && (
                <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                  <span className="text-sm flex-shrink-0">⚠️</span>
                  <p className="text-xs text-warm-coral leading-relaxed font-semibold">
                    {attachErrorMsg}
                  </p>
                </div>
              )}

              {/* Attach action */}
              {attachStatus !== "success" && (
                <div className="flex flex-col gap-3">
                  {/* Helper text */}
                  <div className="flex flex-col gap-1">
                    <p className="text-xs text-tiki-brown/65 leading-relaxed">
                      This will save the uploaded media asset URL into the episode JSON media manifest
                      in GitHub. After Vercel redeploys, the episode will know about this approved
                      story panel asset.
                    </p>
                  </div>

                  {/* Warning */}
                  <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
                    <span className="text-xs flex-shrink-0">⚠️</span>
                    <p className="text-xs text-tiki-brown/65 leading-relaxed">
                      This does not publish the image publicly yet. Public story panel display will be
                      added in a later phase.
                    </p>
                  </div>

                  {/* Attach loading indicator */}
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
                    {attachStatus === "loading"
                      ? "Attaching…"
                      : "Attach Uploaded Asset to Episode JSON"}
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

          {/* Generation prompt */}
          {result.generationPrompt && (
            <GenerationPromptBlock prompt={result.generationPrompt} />
          )}

        </div>
      )}
    </div>
  );
}
