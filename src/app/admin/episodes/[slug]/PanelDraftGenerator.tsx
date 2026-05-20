"use client";

import { useState } from "react";
import type { FidelityThumbnail, FidelityChecklistItem } from "@/lib/storyPanelFidelityReview";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenStatus = "idle" | "loading" | "done" | "not_configured" | "error";
type RefineStatus = "idle" | "loading" | "done" | "error";
type UploadStatus = "idle" | "loading" | "success" | "error";
type AttachStatus = "idle" | "loading" | "success" | "error";
type ApproveSaveStatus = "idle" | "uploading" | "attaching" | "success" | "error";

type ReferenceMetaItem = {
  characterSlug: string;
  characterName: string;
  title: string;
  type: string;
  priority: string;
};

type ReferenceCounts = {
  total: number;
  profileSheets: number;
  mainReferences: number;
  supporting: number;
  environment: number;
};

type GenApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  providerStatus?: number;
  providerMessage?: string;
  troubleshooting?: string[];
  generationPrompt?: string;
  generationMode?: "draft" | "production" | "hybrid";
  usedHybridEnhancement?: boolean;
  baseDraftProvider?: string;
  baseDraftModelId?: string;
  hybridStage1Status?: string;
  hybridStage2Status?: string;
  provider?: "openai" | "fal";
  modelId?: string;
  referenceCharacters?: string[];
  referenceMode?:
    | "image-conditioned-reference-bundle"
    | "prompt-only-reference-bundle"
    | "no-references"
    | "reference-images-attached"
    | "strict-reference-bundle"
    | "prompt-only-reference-summary"
    | "no-references-available";
  referenceCounts?: ReferenceCounts;
  referencesUsed?: ReferenceMetaItem[];
  referencesOmitted?: ReferenceMetaItem[];
  fidelityRulesSummary?: string;
  usedImageConditioning?: boolean;
  providerSupportsImageReferences?: boolean;
  selectedReferenceAssetCount?: number;
  conditionedImageCount?: number;
  skippedReferenceAssetCount?: number;
  imageConditioningWarnings?: string[];
  sceneCharacterCount?: number;
  characterReferenceCount?: number;
  supportingReferenceCount?: number;
  environmentReferenceCount?: number;
  passedToProviderCount?: number;
  productionPayloadMode?: "single-reference" | "multi-reference";
  requiredFeatureLocksUsed?: boolean;
  characterFeatureLockCount?: number;
  missingPartPreventionUsed?: boolean;
  babyProportionLockUsed?: boolean;
  topFeatureSeparationUsed?: boolean;
  characterFeatureWarnings?: string[];
  storySceneCompositionLockUsed?: boolean;
  exactCastLockUsed?: boolean;
  referenceUsageRulesUsed?: boolean;
  environmentReferenceUsedAsImage?: boolean;
  environmentReferenceUsedAsText?: boolean;
  exactCastCharacters?: string[];
  duplicatePreventionUsed?: boolean;
  adminSceneDirectionUsed?: boolean;
  adminSceneDirectionLength?: number;
  adminSceneDirectionPreview?: string;
  refinedFromPreviousDraft?: boolean;
  refineInstructionPreview?: string;
  refineProvider?: string;
  refineModelId?: string;
  refinementCreatedAt?: string;
  promptWasCompacted?: boolean;
  originalPromptLength?: number;
  providerPromptLength?: number;
  providerPromptLimit?: number;
  promptCompactionWarnings?: string[];
  promptSectionsRemovedOrShortened?: string[];
  fallbackUsed?: boolean;
  fallbackReason?: string;
  assemblyPlanAvailable?: boolean;
  assemblyPlanSummary?: {
    available: boolean;
    settingLabel: string;
    mood: string;
    characterCount: number;
    characters: Array<{
      slug: string;
      name: string;
      placement: string;
      emotion: string;
      action: string;
    }>;
    backgroundSummary: string;
    warnings: string[];
    adminDirectionUsed: string | null;
  };
  assemblyPlanWarnings?: string[];
  assemblyPlanCharacterCount?: number;
  assemblyPlanSetting?: string;
  assemblyPlanMood?: string;
  assemblyPlanAdminDirectionUsed?: boolean;
  assemblyPlanBackgroundPrompt?: string;
  warnings?: string[];
  notes?: string[];
  draft?: {
    id: string;
    episodeSlug?: string;
    sceneId?: string;
    sceneNumber?: number;
    mimeType: string;
    imageBase64?: string;
    imageUrl?: string;
    promptText: string;
    createdAt: string;
  };
  image?: { mimeType: string; base64?: string; url?: string };
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

// ─── Background draft API result ─────────────────────────────────────────────

type BgDraftResult = {
  ok: boolean;
  status: string;
  message?: string;
  troubleshooting?: string[];
  draft?: {
    id: string;
    type: "background-only-draft";
    imageBase64?: string;
    imageUrl?: string;
    mimeType: string;
    promptText: string;
    providerPromptLength?: number;
    promptWasCompacted?: boolean;
    settingLabel?: string;
    provider: string;
    modelId?: string;
    createdAt: string;
    warnings: string[];
  };
  notes?: string[];
};

// ─── Refine API result ────────────────────────────────────────────────────────

type RefineApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  image?: { mimeType: string; base64?: string; url?: string };
  refineInstruction?: string;
  refineInstructionPreview?: string;
  provider?: string;
  modelId?: string;
  refinedFromPreviousDraft?: boolean;
  refinementCreatedAt?: string;
  troubleshooting?: string[];
};

// ─── Quick direction chips ────────────────────────────────────────────────────

const QUICK_DIRECTION_CHIPS = [
  "Show all characters clearly.",
  "Keep characters short and round.",
  "Make arms visible.",
  "Use one continuous scene.",
  "Warm lighting.",
  "Do not crop feet.",
  "More storybook style.",
] as const;

// ─── Quick refine chips ───────────────────────────────────────────────────────

const QUICK_REFINE_CHIPS = [
  "Make expression sadder",
  "Make arms visible",
  "Add small prop",
  "Warm lighting",
  "Do not move characters",
  "Keep composition the same",
  "Fix top leaves",
  "Do not change background",
] as const;

// ─── Constants ────────────────────────────────────────────────────────────────

const REFERENCE_MODE_LABELS: Record<string, { label: string; className: string }> = {
  "image-conditioned-reference-bundle": {
    label: "Image-Conditioned (Phase 18C)",
    className: "bg-tropical-green/20 text-tropical-green border-tropical-green/40",
  },
  "prompt-only-reference-bundle": {
    label: "Prompt-Only Bundle (Fallback)",
    className: "bg-ube-purple/12 text-ube-purple border-ube-purple/25",
  },
  "no-references": {
    label: "No References",
    className: "bg-tiki-brown/8 text-tiki-brown/55 border-tiki-brown/15",
  },
  "reference-images-attached": {
    label: "Reference Images Attached",
    className: "bg-tropical-green/15 text-tropical-green border-tropical-green/30",
  },
  "strict-reference-bundle": {
    label: "Production Reference Bundle",
    className: "bg-tropical-green/15 text-tropical-green border-tropical-green/30",
  },
  "prompt-only-reference-summary": {
    label: "Reference Summary (Text)",
    className: "bg-ube-purple/12 text-ube-purple border-ube-purple/25",
  },
  "no-references-available": {
    label: "No References Available",
    className: "bg-tiki-brown/8 text-tiki-brown/55 border-tiki-brown/15",
  },
};

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  fal: "Fal.ai",
  hybrid: "Hybrid",
};

const MODE_LABELS: Record<string, { label: string; description: string; className: string }> = {
  draft: {
    label: "Draft Mode",
    description: "OpenAI — fast concept generation",
    className: "border-ube-purple/30 text-ube-purple",
  },
  production: {
    label: "Production Mode",
    description: "Fal.ai — strict reference fidelity target",
    className: "border-tropical-green/40 text-tropical-green",
  },
  hybrid: {
    label: "Hybrid Mode",
    description: "OpenAI story draft → Fal.ai fidelity enhance",
    className: "border-pineapple-yellow/50 text-pineapple-yellow-dark",
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
  const [generationMode, setGenerationMode] = useState<"draft" | "production" | "hybrid">("draft");
  const [adminSceneDirection, setAdminSceneDirection] = useState<string>("");

  // Refine state
  const [refineInstruction, setRefineInstruction] = useState<string>("");
  const [refineStatus, setRefineStatus] = useState<RefineStatus>("idle");
  const [refineErrorMsg, setRefineErrorMsg] = useState<string>("");

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

  // Approve & Save (one-click) state
  const [approveAndSaveStatus, setApproveAndSaveStatus] = useState<ApproveSaveStatus>("idle");
  const [approveAndSaveUploadedAsset, setApproveAndSaveUploadedAsset] = useState<UploadAsset | null>(null);
  const [approveAndSaveError, setApproveAndSaveError] = useState<string>("");
  const [approveAndSaveErrorStep, setApproveAndSaveErrorStep] = useState<"upload" | "attach" | null>(null);

  // Background draft state (separate from story panel draft)
  const [bgDraftStatus, setBgDraftStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [bgDraft, setBgDraft] = useState<BgDraftResult | null>(null);
  const [bgDraftError, setBgDraftError] = useState<string>("");
  const [bgDirection, setBgDirection] = useState<string>("");

  const hasImage =
    genStatus === "done" &&
    (!!result?.image?.base64 || !!result?.image?.url || !!result?.draft?.imageBase64 || !!result?.draft?.imageUrl);
  const hasDraft = genStatus === "done" || genStatus === "not_configured";
  const isLoading = genStatus === "loading";
  const hasBase64Image = !!result?.image?.base64 || !!result?.draft?.imageBase64;
  const canUpload = hasBase64Image && fidelityApprovedForUpload;
  const uploadedAsset = uploadResult?.asset;
  const canAttach =
    uploadStatus === "success" &&
    !!uploadedAsset &&
    uploadedAsset.storageProvider === "vercel-blob" &&
    fidelityApprovedForUpload &&
    attachStatus !== "success";

  const allChecklistChecked =
    checklistItems.length === 0 ||
    (checkedItems.length === checklistItems.length && checkedItems.every(Boolean));
  const canApproveAndSave =
    hasImage &&
    fidelityApprovedForUpload &&
    approveAndSaveStatus !== "uploading" &&
    approveAndSaveStatus !== "attaching" &&
    approveAndSaveStatus !== "success";

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
    setApproveAndSaveStatus("idle");
    setApproveAndSaveUploadedAsset(null);
    setApproveAndSaveError("");
    setApproveAndSaveErrorStep(null);
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
    setAdminSceneDirection("");
    setRefineInstruction("");
    setRefineStatus("idle");
    setRefineErrorMsg("");
    resetReviewState();
  }

  async function handleGenerate() {
    setGenStatus("loading");
    setResult(null);
    setErrorMsg("");
    setRefineInstruction("");
    setRefineStatus("idle");
    setRefineErrorMsg("");
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
          generationMode,
          adminSceneDirection: adminSceneDirection.trim() || undefined,
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

      if (data.status === "not_implemented_yet" || data.status === "setup_required") {
        setGenStatus("not_configured");
        setResult(data);
        return;
      }

      if (data.ok) {
        setGenStatus("done");
        setResult(data);
      } else {
        setGenStatus("error");
        setResult(data);
        setErrorMsg(
          data.message ?? data.providerMessage ?? "Something went wrong while generating this temporary panel draft."
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

  async function handleApproveAndSave() {
    if (!result?.image || !canApproveAndSave) return;

    setApproveAndSaveError("");
    setApproveAndSaveErrorStep(null);

    // If a previous run already uploaded successfully (attach failed), skip upload and retry attach only
    const reuseUpload = approveAndSaveUploadedAsset !== null;
    let savedAsset: UploadAsset;

    if (reuseUpload) {
      savedAsset = approveAndSaveUploadedAsset!;
    } else {
      // Step 1: Upload to Blob
      setApproveAndSaveStatus("uploading");
      setApproveAndSaveUploadedAsset(null);

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
          setApproveAndSaveStatus("error");
          setApproveAndSaveError("Admin access is required. Please unlock the Story Studio again.");
          setApproveAndSaveErrorStep("upload");
          return;
        }

        let data: UploadApiResult;
        try {
          data = (await res.json()) as UploadApiResult;
        } catch {
          setApproveAndSaveStatus("error");
          setApproveAndSaveError("Media upload failed — could not parse server response.");
          setApproveAndSaveErrorStep("upload");
          return;
        }

        if (!data.ok || !data.asset) {
          setApproveAndSaveStatus("error");
          setApproveAndSaveError(`Media upload failed: ${uploadErrorMessage(data.status, data.message)}`);
          setApproveAndSaveErrorStep("upload");
          return;
        }

        savedAsset = data.asset;
        setApproveAndSaveUploadedAsset(savedAsset);
      } catch {
        setApproveAndSaveStatus("error");
        setApproveAndSaveError("Media upload failed — network error. Check your connection and try again.");
        setApproveAndSaveErrorStep("upload");
        return;
      }
    }

    // Step 2: Attach to episode JSON
    setApproveAndSaveStatus("attaching");
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
              savedAsset.referenceCharacters.length > 0
                ? savedAsset.referenceCharacters
                : referenceCharacters,
            prompt: panelPrompt,
            asset: {
              url: savedAsset.url,
              pathname: savedAsset.pathname,
              storageProvider: "vercel-blob",
              mimeType: savedAsset.mimeType || "image/png",
              width: null,
              height: null,
              alt: savedAsset.alt,
              createdAt: savedAsset.uploadedAt,
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
        setApproveAndSaveStatus("error");
        setApproveAndSaveError(
          "Admin access is required. Please unlock the Story Studio again."
        );
        setApproveAndSaveErrorStep("attach");
        return;
      }

      let data: AttachApiResult;
      try {
        data = (await res.json()) as AttachApiResult;
      } catch {
        setApproveAndSaveStatus("error");
        setApproveAndSaveError(
          "Attach to episode failed — could not parse server response."
        );
        setApproveAndSaveErrorStep("attach");
        return;
      }

      if (!data.ok) {
        setApproveAndSaveStatus("error");
        setApproveAndSaveError(
          attachErrorMessage(data.status, data.message)
        );
        setApproveAndSaveErrorStep("attach");
        return;
      }

      // Sync manual controls state so they reflect the completed work
      setUploadStatus("success");
      setUploadResult({ ok: true, status: "uploaded", asset: savedAsset });
      setAttachStatus("success");
      setAttachResult(data);
      setApproveAndSaveStatus("success");
    } catch {
      setApproveAndSaveStatus("error");
      setApproveAndSaveError(
        "Attach to episode failed — network error. Check your connection and try again."
      );
      setApproveAndSaveErrorStep("attach");
    }
  }

  async function handleRefine() {
    if (!result || !hasImage || !refineInstruction.trim()) return;

    setRefineStatus("loading");
    setRefineErrorMsg("");

    const imageBase64 = result.image?.base64 ?? result.draft?.imageBase64;
    const imageUrl = result.image?.url ?? result.draft?.imageUrl;
    const mimeType = result.image?.mimeType ?? "image/png";

    try {
      const res = await fetch("/api/generate-story-panel-image/refine", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentDraftImageBase64: imageBase64,
          currentDraftImageUrl: imageUrl,
          currentDraftMimeType: mimeType,
          refineInstruction: refineInstruction.trim(),
          characterSlugs: result.referenceCharacters ?? referenceCharacters,
          episodeSlug,
          sceneNumber,
        }),
      });

      if (res.status === 401) {
        setRefineStatus("error");
        setRefineErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        return;
      }

      let data: RefineApiResult;
      try {
        data = (await res.json()) as RefineApiResult;
      } catch {
        setRefineStatus("error");
        setRefineErrorMsg("Refinement failed — could not parse server response. The current draft was not changed.");
        return;
      }

      if (data.ok && data.image) {
        // Replace draft image with refined image, preserve all other metadata
        setResult((prev) =>
          prev
            ? {
                ...prev,
                image: data.image!,
                draft: prev.draft
                  ? {
                      ...prev.draft,
                      imageBase64: data.image!.base64,
                      imageUrl: data.image!.url,
                    }
                  : prev.draft,
                refinedFromPreviousDraft: true,
                refineInstructionPreview: data.refineInstructionPreview,
                refineProvider: data.provider,
                refineModelId: data.modelId,
                refinementCreatedAt: data.refinementCreatedAt,
              }
            : null
        );
        setRefineStatus("done");
        resetReviewState();
      } else {
        setRefineStatus("error");
        setRefineErrorMsg(
          data.message ?? "Refinement failed. The current draft was not changed."
        );
      }
    } catch {
      setRefineStatus("error");
      setRefineErrorMsg("Refinement failed — network error. The current draft was not changed.");
    }
  }

  async function handleGenerateBackground() {
    if (!result?.assemblyPlanBackgroundPrompt) return;
    setBgDraftStatus("loading");
    setBgDraft(null);
    setBgDraftError("");
    try {
      const resp = await fetch("/api/generate-story-panel-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundPrompt: result.assemblyPlanBackgroundPrompt,
          episodeSlug,
          sceneNumber,
          settingLabel: result.assemblyPlanSetting,
          mood: result.assemblyPlanMood,
          adminSceneDirection: adminSceneDirection || undefined,
          backgroundDirection: bgDirection || undefined,
        }),
      });
      const data: BgDraftResult = await resp.json();
      setBgDraft(data);
      if (data.ok) {
        setBgDraftStatus("done");
      } else {
        setBgDraftStatus("error");
        setBgDraftError(data.message ?? "Background generation failed.");
      }
    } catch {
      setBgDraftStatus("error");
      setBgDraftError("Network error — could not reach background generation API.");
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

      {/* Generation mode selector */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Generation Mode</p>
        <div className="flex flex-wrap gap-2">
          {(["draft", "production", "hybrid"] as const).map((mode) => {
            const m = MODE_LABELS[mode];
            const active = generationMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setGenerationMode(mode)}
                disabled={isLoading}
                className={`flex flex-col items-start px-3 py-2 rounded-xl border text-left transition-colors disabled:opacity-50 ${
                  active
                    ? `${m.className} bg-white font-bold`
                    : "border-tiki-brown/15 text-tiki-brown/50 hover:border-tiki-brown/30"
                }`}
              >
                <span className="text-xs font-bold">{active ? "● " : "○ "}{m.label}</span>
                <span className="text-xs font-normal opacity-70">{m.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Manual Scene Direction */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
          Manual Scene Direction
          <span className="ml-1.5 font-normal normal-case text-tiki-brown/35">(optional)</span>
        </label>
        <p className="text-xs text-tiki-brown/50 leading-relaxed">
          Add specific visual instructions for this panel. These notes guide the scene, composition, emotion, props, and environment — but cannot override official character fidelity rules.
        </p>
        <textarea
          value={adminSceneDirection}
          onChange={(e) => setAdminSceneDirection(e.target.value)}
          placeholder="Example: Place Mango Baby on the right holding the flower. Keep Ube Baby seated and shy. Make Pineapple Baby comforting and smiling. Use a warm classroom rug and soft afternoon light. Make sure Mango Baby's short rounded arms are visible."
          rows={3}
          maxLength={1200}
          disabled={isLoading}
          className="w-full text-xs text-tiki-brown/80 bg-white border border-tiki-brown/15 rounded-xl px-3 py-2.5 leading-relaxed resize-y placeholder:text-tiki-brown/25 focus:outline-none focus:border-ube-purple/40 disabled:opacity-50"
        />
        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_DIRECTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={isLoading}
              onClick={() =>
                setAdminSceneDirection((prev) => {
                  const trimmed = prev.trimEnd();
                  return trimmed ? `${trimmed} ${chip}` : chip;
                })
              }
              className="text-xs px-2.5 py-1 rounded-full border border-tiki-brown/18 text-tiki-brown/55 bg-white hover:bg-tiki-brown/5 hover:border-tiki-brown/30 disabled:opacity-40 transition-colors"
            >
              + {chip}
            </button>
          ))}
        </div>
        {adminSceneDirection.trim().length > 0 && (
          <p className="text-xs text-tiki-brown/35 text-right">
            {adminSceneDirection.trim().length}/1200
          </p>
        )}
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
        <div className="flex flex-col gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
          <div className="flex items-start gap-2.5">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs text-warm-coral leading-relaxed font-semibold">{errorMsg}</p>
          </div>
          {result?.providerMessage && (
            <div className="text-xs text-tiki-brown/70 bg-white/80 border border-warm-coral/20 rounded-xl px-3 py-2">
              <p className="font-semibold text-warm-coral/90">Provider message</p>
              <p>{result.providerMessage}</p>
            </div>
          )}
          {result?.providerStatus && (
            <p className="text-xs text-tiki-brown/60">Provider status: {result.providerStatus}</p>
          )}
          {result?.troubleshooting && result.troubleshooting.length > 0 && (
            <div className="text-xs text-tiki-brown/70 bg-white/80 border border-warm-coral/20 rounded-xl px-3 py-2">
              <p className="font-semibold text-warm-coral/90">Troubleshooting</p>
              <ul className="list-disc list-inside space-y-1">
                {result.troubleshooting.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {result?.warnings && result.warnings.length > 0 && (
            <div className="text-xs text-tiki-brown/70 bg-white/80 border border-warm-coral/20 rounded-xl px-3 py-2">
              <p className="font-semibold text-warm-coral/90">Warnings</p>
              <ul className="list-disc list-inside space-y-1">
                {result.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
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
          {(result.generationMode || result.provider || result.referenceMode) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tiki-brown/60">
              {result.generationMode && (
                <span><span className="font-bold text-tiki-brown/45 uppercase">Mode </span>
                <span className="font-semibold">{result.generationMode === "production" ? "Production" : result.generationMode === "hybrid" ? "Hybrid" : "Draft"}</span></span>
              )}
              {result.provider && (
                <span><span className="font-bold text-tiki-brown/45 uppercase">Provider </span>
                <span className="font-semibold">{PROVIDER_LABELS[result.provider] ?? result.provider}</span></span>
              )}
              {result.referenceMode && (
                <span className={`font-bold px-2 py-0.5 rounded-full border ${(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).className}`}>
                  {(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).label}
                </span>
              )}
            </div>
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

              {result.image?.base64 || result.image?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={
                    result.image?.base64
                      ? `data:${result.image.mimeType};base64,${result.image.base64}`
                      : result.image.url
                  }
                  alt="Temporary story panel draft — not saved, not published"
                  className="w-full rounded-2xl border-2 border-warm-coral/30 shadow-sm"
                />
              ) : (
                <div className="w-full aspect-square rounded-2xl border border-warm-coral/30 bg-warm-coral/5 flex items-center justify-center">
                  <p className="text-xs text-tiki-brown/35">No image data</p>
                </div>
              )}

              {/* Draft metadata */}
              <div className="flex flex-col gap-2 text-xs">

                {/* Generation metadata */}
                <div className="bg-tiki-brown/4 rounded-xl px-3 py-2.5 flex flex-col gap-2">

                  {/* Mode + Provider + Model */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-tiki-brown/60">
                    {result.generationMode && (
                      <span>
                        <span className="font-bold text-tiki-brown/45 uppercase tracking-wide text-xs">Mode </span>
                        <span className={`font-bold text-xs ${result.generationMode === "production" ? "text-tropical-green" : result.generationMode === "hybrid" ? "text-pineapple-yellow-dark" : "text-ube-purple"}`}>
                          {result.generationMode === "production" ? "Production" : result.generationMode === "hybrid" ? "Hybrid" : "Draft"}
                        </span>
                      </span>
                    )}
                    {result.provider && (
                      <span>
                        <span className="font-bold text-tiki-brown/45 uppercase tracking-wide text-xs">Provider </span>
                        <span className="font-semibold text-xs">{PROVIDER_LABELS[result.provider] ?? result.provider}</span>
                      </span>
                    )}
                    {result.modelId && (
                      <span>
                        <span className="font-bold text-tiki-brown/45 uppercase tracking-wide text-xs">Model </span>
                        <span className="font-mono text-xs text-tiki-brown/55">{result.modelId}</span>
                      </span>
                    )}
                  </div>

                  {/* Fallback notice */}
                  {result.fallbackUsed && result.fallbackReason && (
                    <div className="flex items-start gap-1.5 bg-pineapple-yellow/15 border border-pineapple-yellow/30 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs flex-shrink-0">↩</span>
                      <span className="text-xs text-tiki-brown/65">{result.fallbackReason}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-tiki-brown/50 uppercase tracking-wide">Reference Mode</span>
                    {result.referenceMode && (
                      <span className={`font-bold px-2 py-0.5 rounded-full border ${(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).className}`}>
                        {(REFERENCE_MODE_LABELS[result.referenceMode] ?? REFERENCE_MODE_LABELS["no-references-available"]).label}
                      </span>
                    )}
                  </div>

                  {/* Hybrid pipeline status */}
                  {result.generationMode === "hybrid" && (
                    <div className="flex flex-col gap-1 rounded-xl px-3 py-2 bg-pineapple-yellow/8 border border-pineapple-yellow/25">
                      <span className="font-bold text-tiki-brown/50 uppercase tracking-wide text-xs">Hybrid Pipeline</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-tiki-brown/60">
                        <span>
                          Stage 1:{" "}
                          <span className={`font-semibold ${result.hybridStage1Status === "success" ? "text-tropical-green" : "text-warm-coral"}`}>
                            OpenAI story draft {result.hybridStage1Status === "success" ? "✓" : "✗"}
                          </span>
                        </span>
                        <span>
                          Stage 2:{" "}
                          <span className={`font-semibold ${result.hybridStage2Status === "success" ? "text-tropical-green" : "text-pineapple-yellow-dark"}`}>
                            Fal.ai fidelity enhance {result.hybridStage2Status === "success" ? "✓" : "—"}
                          </span>
                        </span>
                      </div>
                      {result.baseDraftModelId && (
                        <span className="text-xs text-tiki-brown/45">Stage 1 model: <span className="font-mono">{result.baseDraftModelId}</span></span>
                      )}
                      {result.usedHybridEnhancement ? (
                        <span className="text-xs text-tropical-green font-semibold">✅ Final image: Fal.ai enhanced</span>
                      ) : (
                        <span className="text-xs text-pineapple-yellow-dark font-semibold">↩ Final image: OpenAI draft (Fal.ai stage skipped or failed)</span>
                      )}
                    </div>
                  )}

                  {/* Image conditioning status */}
                  {result.usedImageConditioning === true && (
                    <div className="flex items-center gap-1.5 text-tropical-green font-semibold">
                      <span>✅</span>
                      <span>
                        Image-conditioned generation — {result.conditionedImageCount ?? 0} reference image{(result.conditionedImageCount ?? 0) !== 1 ? "s" : ""} used as visual inputs
                      </span>
                    </div>
                  )}
                  {result.usedImageConditioning === false && result.fallbackReason && (
                    <div className="flex items-start gap-1.5 text-ube-purple/80">
                      <span className="flex-shrink-0">↩</span>
                      <span>Prompt-only fallback — {result.fallbackReason}</span>
                    </div>
                  )}

                  {/* Production identity inputs (production mode only) */}
                  {result.generationMode === "production" && (result.sceneCharacterCount ?? 0) > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <span className="font-bold text-tiki-brown/45 uppercase tracking-wide text-xs">
                        Production Identity Inputs
                      </span>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-tiki-brown/50 text-xs">
                        <span>
                          <span className="font-semibold">{result.sceneCharacterCount}</span> character{result.sceneCharacterCount !== 1 ? "s" : ""} in scene
                        </span>
                        <span>
                          <span className={`font-semibold ${(result.characterReferenceCount ?? 0) === (result.sceneCharacterCount ?? 0) ? "text-tropical-green" : "text-pineapple-yellow-dark"}`}>
                            {result.characterReferenceCount ?? 0}
                          </span> character ref{(result.characterReferenceCount ?? 0) !== 1 ? "s" : ""} selected
                        </span>
                        {(result.environmentReferenceCount ?? 0) > 0 && (
                          <span>
                            <span className="font-semibold">{result.environmentReferenceCount}</span> env ref
                          </span>
                        )}
                        <span>
                          <span className={`font-bold ${(result.passedToProviderCount ?? 0) > 0 ? "text-tropical-green" : "text-warm-coral"}`}>
                            {result.passedToProviderCount ?? 0}
                          </span> passed to provider
                        </span>
                      </div>
                      {result.productionPayloadMode === "single-reference" && (result.sceneCharacterCount ?? 0) > 1 && (
                        <p className="text-xs text-tiki-brown/40 italic leading-relaxed">
                          Single-reference endpoint — model accepts one image_url. Strongest character reference used.
                          To pass one ref per character, set STORY_PANEL_PRODUCTION_MODEL_ID=fal-ai/flux-pro/kontext/multi.
                        </p>
                      )}
                      {result.productionPayloadMode === "multi-reference" && (
                        <p className="text-xs text-tropical-green/70 font-semibold">
                          Multi-reference endpoint — one reference per character passed.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Feature fidelity locks (production mode only) */}
                  {result.generationMode === "production" && result.requiredFeatureLocksUsed && (
                    <div className="flex flex-col gap-1 bg-tropical-green/6 border border-tropical-green/20 rounded-xl px-3 py-2">
                      <span className="font-bold text-tiki-brown/50 uppercase tracking-wide text-xs">Feature Fidelity Locks</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-tiki-brown/55">
                        <span>
                          <span className="font-semibold text-tropical-green">{result.characterFeatureLockCount}</span> character{(result.characterFeatureLockCount ?? 0) !== 1 ? "s" : ""} locked
                        </span>
                        {result.topFeatureSeparationUsed && (
                          <span className="text-tropical-green font-semibold">Top-feature separation: On</span>
                        )}
                        {result.missingPartPreventionUsed && (
                          <span className="text-tropical-green font-semibold">Missing-part prevention: On</span>
                        )}
                        {result.babyProportionLockUsed && (
                          <span className="text-tropical-green font-semibold">Baby proportions: On</span>
                        )}
                      </div>
                      {result.characterFeatureWarnings && result.characterFeatureWarnings.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {result.characterFeatureWarnings.map((w, i) => (
                            <span key={i} className="text-xs text-pineapple-yellow-dark">⚠ {w}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Scene composition lock (production mode only) */}
                  {result.generationMode === "production" && result.storySceneCompositionLockUsed && (
                    <div className="flex flex-col gap-1 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-3 py-2">
                      <span className="font-bold text-tiki-brown/50 uppercase tracking-wide text-xs">Scene Composition Lock</span>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-tiki-brown/55">
                        {result.exactCastLockUsed && (result.exactCastCharacters?.length ?? 0) > 0 && (
                          <span>
                            <span className="font-semibold text-tiki-brown/70">{result.exactCastCharacters?.length}</span> character cast locked
                          </span>
                        )}
                        {result.referenceUsageRulesUsed && (
                          <span className="text-tiki-brown/70 font-semibold">Reference usage rules: On</span>
                        )}
                        {result.duplicatePreventionUsed && (
                          <span className="text-tiki-brown/70 font-semibold">Duplicate prevention: On</span>
                        )}
                        {result.environmentReferenceUsedAsText && (
                          <span className="text-tiki-brown/45">Env ref: text-only</span>
                        )}
                        {result.environmentReferenceUsedAsImage && (
                          <span className="text-tiki-brown/45">Env ref: image</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Admin scene direction (shown for both modes when used) */}
                  <div className={`flex flex-col gap-1 rounded-xl px-3 py-2 ${result.adminSceneDirectionUsed ? "bg-ube-purple/6 border border-ube-purple/18" : "bg-tiki-brown/4 border border-tiki-brown/10"}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-tiki-brown/50 uppercase tracking-wide text-xs">Admin Scene Direction</span>
                      <span className={`text-xs font-semibold ${result.adminSceneDirectionUsed ? "text-ube-purple" : "text-tiki-brown/35"}`}>
                        {result.adminSceneDirectionUsed ? "Used" : "Not used"}
                      </span>
                    </div>
                    {result.adminSceneDirectionUsed && result.adminSceneDirectionPreview && (
                      <p className="text-xs text-tiki-brown/60 italic leading-relaxed">
                        &ldquo;{result.adminSceneDirectionPreview}{(result.adminSceneDirectionLength ?? 0) > 120 ? "…" : ""}&rdquo;
                      </p>
                    )}
                  </div>

                  {/* Refinement metadata (when draft was refined) */}
                  {result.refinedFromPreviousDraft && (
                    <div className="flex flex-col gap-1 rounded-xl px-3 py-2 bg-ube-purple/6 border border-ube-purple/18">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-tiki-brown/50 uppercase tracking-wide text-xs">Refinement</span>
                        <span className="text-xs font-semibold text-ube-purple">Applied</span>
                      </div>
                      {result.refineInstructionPreview && (
                        <p className="text-xs text-tiki-brown/60 italic leading-relaxed">
                          &ldquo;{result.refineInstructionPreview}{(result.refineInstructionPreview?.length ?? 0) >= 120 ? "…" : ""}&rdquo;
                        </p>
                      )}
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-tiki-brown/55 mt-0.5">
                        {result.refineProvider && (
                          <span>Provider: <span className="font-semibold">{PROVIDER_LABELS[result.refineProvider] ?? result.refineProvider}</span></span>
                        )}
                        <span>Saved: <span className="font-semibold">No, temporary only</span></span>
                      </div>
                    </div>
                  )}

                  {/* Prompt safety / compaction status */}
                  {result.originalPromptLength !== undefined && (
                    <div className={`flex flex-col gap-1 rounded-xl px-3 py-2 ${result.promptWasCompacted ? "bg-pineapple-yellow/10 border border-pineapple-yellow/25" : "bg-tiki-brown/4 border border-tiki-brown/10"}`}>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-tiki-brown/50 uppercase tracking-wide text-xs">Prompt Safety</span>
                        <span className={`text-xs font-semibold ${result.promptWasCompacted ? "text-pineapple-yellow-dark" : "text-tropical-green"}`}>
                          {result.promptWasCompacted ? "Compacted" : "Under limit"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-tiki-brown/55">
                        <span>Original: <span className="font-semibold">{result.originalPromptLength}</span> chars</span>
                        <span>Sent to provider: <span className="font-semibold">{result.providerPromptLength}</span> chars</span>
                        {result.providerPromptLimit && (
                          <span>Limit: <span className="font-semibold">{result.providerPromptLimit}</span></span>
                        )}
                      </div>
                      {result.promptWasCompacted && (
                        <p className="text-xs text-tiki-brown/60 leading-relaxed">
                          Prompt was automatically shortened for provider limits while preserving character fidelity rules and admin scene direction.
                        </p>
                      )}
                      {result.promptCompactionWarnings && result.promptCompactionWarnings.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {result.promptCompactionWarnings.map((w, i) => (
                            <span key={i} className="text-xs text-pineapple-yellow-dark">⚠ {w}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reference asset prep counts (draft mode) */}
                  {result.generationMode !== "production" && (result.selectedReferenceAssetCount ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-tiki-brown/50">
                      <span>Selected: {result.selectedReferenceAssetCount}</span>
                      <span>Passed to provider: {result.conditionedImageCount ?? 0}</span>
                      {(result.skippedReferenceAssetCount ?? 0) > 0 && (
                        <span className="text-pineapple-yellow-dark font-semibold">
                          Skipped: {result.skippedReferenceAssetCount}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Skipped asset warnings */}
                  {result.imageConditioningWarnings && result.imageConditioningWarnings.length > 0 && (
                    <div className="flex flex-col gap-0.5 bg-pineapple-yellow/10 border border-pineapple-yellow/25 rounded-xl px-3 py-2 text-xs">
                      <span className="font-bold text-tiki-brown/50 uppercase tracking-wide">Reference Image Warnings</span>
                      {result.imageConditioningWarnings.map((w, i) => (
                        <span key={i} className="text-tiki-brown/60">⚠ {w}</span>
                      ))}
                    </div>
                  )}

                {/* Reference counts summary */}
                  {result.referenceCounts && result.referenceCounts.total > 0 && (
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-tiki-brown/45 uppercase tracking-wide text-xs">
                        Production Reference Bundle — {result.referenceCounts.total} asset{result.referenceCounts.total !== 1 ? "s" : ""}
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {result.referenceCounts.profileSheets > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green font-semibold">
                            {result.referenceCounts.profileSheets} profile sheet{result.referenceCounts.profileSheets !== 1 ? "s" : ""}
                          </span>
                        )}
                        {result.referenceCounts.mainReferences > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-ube-purple/12 text-ube-purple font-semibold">
                            {result.referenceCounts.mainReferences} main ref{result.referenceCounts.mainReferences !== 1 ? "s" : ""}
                          </span>
                        )}
                        {result.referenceCounts.supporting > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-blue/20 text-tiki-brown/70 font-semibold">
                            {result.referenceCounts.supporting} supporting
                          </span>
                        )}
                        {result.referenceCounts.environment > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-tropical-green/10 text-tiki-brown/65 font-semibold">
                            {result.referenceCounts.environment} environment
                          </span>
                        )}
                        {result.referenceCounts.profileSheets === 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 font-semibold">
                            ⚠ No profile sheet
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {result.referenceCounts && result.referenceCounts.total === 0 && (
                    <p className="text-tiki-brown/40 italic">
                      No approved reference assets found. Upload and approve official character profile sheets in Character Studio.
                    </p>
                  )}
                </div>

                {/* Asset listing */}
                {result.referencesUsed && result.referencesUsed.length > 0 && (
                  <details>
                    <summary className="cursor-pointer list-none text-tiki-brown/40 italic select-none py-0.5">
                      View {result.referencesUsed.length} reference asset{result.referencesUsed.length !== 1 ? "s" : ""} in bundle ▸
                    </summary>
                    <div className="flex flex-col gap-0.5 mt-1.5 pl-2">
                      {result.referencesUsed.map((r, i) => (
                        <span key={i} className="text-tiki-brown/50 leading-relaxed">
                          <span className="font-semibold">{r.characterName}</span> — {r.title}
                          <span className="text-tiki-brown/30"> [{r.priority}]</span>
                        </span>
                      ))}
                    </div>
                  </details>
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

                {/* Scene Assembly Plan */}
                {result.assemblyPlanAvailable && result.assemblyPlanSummary && (
                  <details className="mt-1">
                    <summary className="cursor-pointer list-none select-none py-0.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-tiki-brown/45 uppercase tracking-wide">Scene Assembly Plan</span>
                        <span className="px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold text-xs">
                          {result.assemblyPlanCharacterCount ?? 0} character{(result.assemblyPlanCharacterCount ?? 0) !== 1 ? "s" : ""}
                        </span>
                        <span className="text-tiki-brown/35 text-xs">▸ expand</span>
                      </div>
                    </summary>
                    <div className="mt-2 flex flex-col gap-2 rounded-xl bg-ube-purple/4 border border-ube-purple/12 px-3 py-2.5">
                      <p className="text-xs text-tiki-brown/40 leading-relaxed">
                        Assembly planning prepares future background + per-character rendering. No images are generated here.
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-tiki-brown/55">
                        <span>Setting: <span className="font-semibold text-tiki-brown/70">{result.assemblyPlanSummary.settingLabel}</span></span>
                        <span>Mood: <span className="font-semibold text-tiki-brown/70">{result.assemblyPlanSummary.mood}</span></span>
                      </div>
                      {result.assemblyPlanSummary.characters.length > 0 && (
                        <div className="flex flex-col gap-1.5 mt-0.5">
                          <span className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide">Character Layers</span>
                          {result.assemblyPlanSummary.characters.map((c) => (
                            <div key={c.slug} className="flex flex-col gap-0.5 rounded-lg bg-white/60 px-2.5 py-1.5 border border-tiki-brown/8">
                              <span className="text-xs font-semibold text-tiki-brown/75">{c.name}</span>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-tiki-brown/50">
                                <span>Placement: <span className="font-medium">{c.placement}</span></span>
                                <span>Emotion: <span className="font-medium">{c.emotion}</span></span>
                                <span>Action: <span className="font-medium">{c.action}</span></span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {result.assemblyPlanSummary.warnings.length > 0 && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          {result.assemblyPlanSummary.warnings.map((w, i) => (
                            <span key={i} className="text-xs text-pineapple-yellow-dark">⚠ {w}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </details>
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

          {/* ── Refine Current Draft ── */}
          {hasImage && (
            <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">✏️</span>
                <h4 className="text-sm font-black text-tiki-brown">Refine Current Draft</h4>
              </div>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                Apply a small controlled edit to the current draft without regenerating the whole scene. Composition, characters, colors, poses, and environment are preserved by default.
              </p>
              {result.refinedFromPreviousDraft && (
                <div className="flex items-center gap-1.5 text-xs text-ube-purple font-semibold">
                  <span>✓</span>
                  <span>This draft was refined — you can refine it again.</span>
                </div>
              )}

              {/* Quick chips */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_REFINE_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setRefineInstruction((prev) => prev ? `${prev}, ${chip}` : chip)}
                    className="text-xs px-2.5 py-1 rounded-full bg-ube-purple/10 text-ube-purple font-semibold hover:bg-ube-purple/20 transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>

              {/* Edit instruction textarea */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                  Edit Instruction
                </label>
                <textarea
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  placeholder="e.g. Make Pineapple Baby's expression sadder, keep all other characters the same"
                  rows={3}
                  maxLength={800}
                  className="w-full text-xs text-tiki-brown/75 bg-white border border-tiki-brown/15 rounded-xl px-3 py-2.5 leading-relaxed resize-y placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40"
                />
                <p className="text-xs text-tiki-brown/35 text-right">
                  {refineInstruction.length} / 800
                </p>
              </div>

              {/* Refine button */}
              <button
                onClick={handleRefine}
                disabled={refineStatus === "loading" || !refineInstruction.trim()}
                className="self-start px-5 py-2.5 rounded-xl bg-ube-purple/80 text-white text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {refineStatus === "loading" ? "Applying Edit…" : "Apply Edit to Current Draft"}
              </button>

              {/* Status messages */}
              {refineStatus === "loading" && (
                <p className="text-xs text-tiki-brown/45 animate-pulse">Sending to image provider — this may take up to 60 seconds…</p>
              )}
              {refineStatus === "done" && (
                <p className="text-xs text-tropical-green font-semibold">✓ Draft refined. Review the updated image above.</p>
              )}
              {refineStatus === "error" && refineErrorMsg && (
                <div className="flex flex-col gap-1.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-bold text-warm-coral">Refinement failed</p>
                  <p className="text-xs text-tiki-brown/70 leading-relaxed">{refineErrorMsg}</p>
                </div>
              )}
            </div>
          )}

          {/* ── Approve & Save Panel (primary one-click workflow) ── */}
          {hasImage && (
            <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-4">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <h4 className="text-sm font-black text-tiki-brown">Approve & Save Panel to Episode</h4>
              </div>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                This will save the approved draft to media storage and attach it to this episode. It will not make it public yet.
              </p>

              {approveAndSaveStatus !== "success" && attachStatus !== "success" && (
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fidelityApprovedForUpload}
                    onChange={(e) => setFidelityApprovedForUpload(e.target.checked)}
                    className="mt-0.5 flex-shrink-0 accent-tropical-green"
                  />
                  <span className="text-xs text-tiki-brown/70 leading-relaxed">
                    <strong className="font-bold">I confirm</strong> this draft meets character fidelity standards and is ready to save to the episode.
                  </span>
                </label>
              )}

              {!fidelityApprovedForUpload && approveAndSaveStatus === "idle" && (
                <p className="text-xs text-tiki-brown/40 italic">Check the approval box above to enable saving.</p>
              )}

              {(approveAndSaveStatus === "idle" || approveAndSaveStatus === "error") && attachStatus !== "success" && (
                <button
                  onClick={handleApproveAndSave}
                  disabled={!canApproveAndSave}
                  className="self-start px-5 py-2.5 rounded-xl bg-ube-purple text-white text-sm font-black disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                >
                  {approveAndSaveStatus === "error" && approveAndSaveErrorStep === "attach"
                    ? "Retry Attach to Episode JSON"
                    : approveAndSaveStatus === "error"
                    ? "Retry Approve & Save Panel to Episode"
                    : "Approve & Save Panel to Episode"}
                </button>
              )}

              {approveAndSaveStatus === "uploading" && (
                <p className="text-xs text-tiki-brown/45 animate-pulse">Saving to Media Storage…</p>
              )}
              {approveAndSaveStatus === "attaching" && (
                <p className="text-xs text-tiki-brown/45 animate-pulse">Attaching to Episode…</p>
              )}

              {approveAndSaveStatus === "error" && (
                <div className="flex flex-col gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
                  <p className="text-xs font-bold text-warm-coral">
                    {approveAndSaveErrorStep === "upload" ? "Media upload failed" : "Attach to episode failed"}
                  </p>
                  <p className="text-xs text-tiki-brown/70 leading-relaxed">{approveAndSaveError}</p>
                  {approveAndSaveErrorStep === "attach" && approveAndSaveUploadedAsset && (
                    <div className="flex flex-col gap-1 bg-white/60 rounded-lg px-2 py-1.5">
                      <p className="text-xs font-semibold text-tiki-brown/55">Saved to Media Storage:</p>
                      <a href={approveAndSaveUploadedAsset.url} target="_blank" rel="noopener noreferrer" className="text-xs text-ube-purple underline break-all">
                        {approveAndSaveUploadedAsset.url}
                      </a>
                      <p className="text-xs text-tiki-brown/40">Click Retry above — the uploaded image will be reused without a new upload.</p>
                    </div>
                  )}
                </div>
              )}

              {(approveAndSaveStatus === "success" || attachStatus === "success") && attachResult && uploadedAsset && (
                <div className="flex flex-col gap-2 bg-ube-purple/8 border border-ube-purple/20 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple">Attached to Episode</span>
                  </div>
                  <a href={uploadedAsset.url} target="_blank" rel="noopener noreferrer" className="text-xs text-ube-purple underline break-all hover:opacity-75">
                    {uploadedAsset.url}
                  </a>
                  {attachResult.path && (
                    <p className="text-xs font-mono text-tiki-brown/50 break-all">{attachResult.path}</p>
                  )}
                  <p className="text-xs text-tiki-brown/45 mt-0.5">
                    Next step: Make Public Ready from the Saved Story Panel Assets section.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Manual Controls (upload + attach separately) ── */}
          {hasImage && (
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm">☁️</span>
                    <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Upload to Media Storage</p>
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
                      {!canUpload && (
                        <p className="text-xs text-tiki-brown/40 italic">
                          Check the approval checkbox above to enable upload.
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

                {/* Manual attach */}
                {uploadStatus === "success" && uploadedAsset && (
                  <div className="flex flex-col gap-3 border-t border-tiki-brown/8 pt-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📎</span>
                      <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Attach to Episode JSON</p>
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
                          Saves the uploaded media asset URL into the episode JSON media manifest in GitHub. Does not publish the image publicly.
                        </p>
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
              </div>
            </details>
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

      {/* ─── Background Layer Draft ─────────────────────────────────────────── */}
      {result?.ok && result.assemblyPlanAvailable && result.assemblyPlanBackgroundPrompt && (
        <details className="border border-tiki-brown/10 rounded-2xl overflow-hidden">
          <summary className="cursor-pointer list-none select-none px-4 py-3 bg-tiki-brown/3 hover:bg-tiki-brown/5 transition-colors">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm">🌄</span>
              <span className="text-sm font-black text-tiki-brown">Background Layer Draft</span>
              <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 uppercase tracking-wide">
                Optional
              </span>
            </div>
            <p className="text-xs text-tiki-brown/50 mt-1 leading-relaxed">
              Generate the environment without characters. Prepares a clean background layer for future staged character compositing.
            </p>
          </summary>

          <div className="p-4 flex flex-col gap-4">
            {/* Assembly plan context */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-tiki-brown/55">
              <span>Setting: <span className="font-semibold text-tiki-brown/70">{result.assemblyPlanSetting ?? "—"}</span></span>
              <span>Mood: <span className="font-semibold text-tiki-brown/70">{result.assemblyPlanMood ?? "—"}</span></span>
            </div>

            {/* Background direction */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
                Background Direction
                <span className="ml-1.5 font-normal normal-case text-tiki-brown/35">(optional)</span>
              </label>
              <textarea
                value={bgDirection}
                onChange={(e) => setBgDirection(e.target.value)}
                placeholder="Example: Make the classroom warmer with a rug and window light, but leave open space in the center."
                rows={2}
                maxLength={600}
                disabled={bgDraftStatus === "loading"}
                className="w-full text-xs text-tiki-brown/80 bg-white border border-tiki-brown/15 rounded-xl px-3 py-2.5 leading-relaxed resize-y placeholder:text-tiki-brown/25 focus:outline-none focus:border-tiki-brown/30 disabled:opacity-50"
              />
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-3 py-2">
              <span className="text-xs flex-shrink-0 mt-0.5">ℹ</span>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                No characters will be generated. The background prompt explicitly forbids Fruit Baby characters, faces, arms, crowns, stems, and silhouettes.
              </p>
            </div>

            {/* Generate button */}
            <button
              onClick={handleGenerateBackground}
              disabled={bgDraftStatus === "loading"}
              className="self-start px-4 py-2 rounded-xl bg-tiki-brown/80 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-tiki-brown transition-colors"
            >
              {bgDraftStatus === "loading" ? "Generating background…" : "Generate Background Draft"}
            </button>

            {/* Loading */}
            {bgDraftStatus === "loading" && (
              <p className="text-sm text-tiki-brown/45 italic animate-pulse">
                Generating background-only scene layer…
              </p>
            )}

            {/* Error */}
            {bgDraftStatus === "error" && (
              <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
                <span className="text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-warm-coral leading-relaxed font-semibold">{bgDraftError}</p>
              </div>
            )}

            {/* Background draft result */}
            {bgDraftStatus === "done" && bgDraft?.ok && bgDraft.draft && (
              <div className="flex flex-col gap-3">
                {/* Label */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 uppercase tracking-wide border border-tiki-brown/12">
                    Background-only temporary draft — not a story panel
                  </span>
                  {bgDraft.draft.promptWasCompacted && (
                    <span className="text-xs font-semibold text-pineapple-yellow-dark">Prompt compacted</span>
                  )}
                </div>

                {/* Preview image */}
                {(bgDraft.draft.imageBase64 || bgDraft.draft.imageUrl) && (
                  <div className="flex flex-col gap-1.5">
                    {bgDraft.draft.imageBase64 ? (
                      <img
                        src={`data:${bgDraft.draft.mimeType};base64,${bgDraft.draft.imageBase64}`}
                        alt="Background-only temporary draft"
                        className="w-full max-w-sm rounded-xl border border-tiki-brown/10 shadow-sm"
                      />
                    ) : bgDraft.draft.imageUrl ? (
                      <img
                        src={bgDraft.draft.imageUrl}
                        alt="Background-only temporary draft"
                        className="w-full max-w-sm rounded-xl border border-tiki-brown/10 shadow-sm"
                      />
                    ) : null}
                    <p className="text-xs text-tiki-brown/35 italic">
                      Review the background. If characters appear, regenerate with stronger no-character direction.
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-tiki-brown/50">
                  <span>Provider: <span className="font-semibold">{bgDraft.draft.provider === "openai" ? "OpenAI" : bgDraft.draft.provider}</span></span>
                  {bgDraft.draft.modelId && (
                    <span>Model: <span className="font-mono">{bgDraft.draft.modelId}</span></span>
                  )}
                  {bgDraft.draft.providerPromptLength !== undefined && (
                    <span>Prompt: <span className="font-semibold">{bgDraft.draft.providerPromptLength}</span> chars</span>
                  )}
                  {bgDraft.draft.settingLabel && (
                    <span>Setting: <span className="font-semibold">{bgDraft.draft.settingLabel}</span></span>
                  )}
                </div>

                {bgDraft.draft.warnings.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    {bgDraft.draft.warnings.map((w, i) => (
                      <span key={i} className="text-xs text-pineapple-yellow-dark">⚠ {w}</span>
                    ))}
                  </div>
                )}

                {bgDraft.notes && bgDraft.notes.length > 0 && (
                  <ul className="flex flex-col gap-0.5">
                    {bgDraft.notes.map((n, i) => (
                      <li key={i} className="text-xs text-tiki-brown/40 italic">{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
