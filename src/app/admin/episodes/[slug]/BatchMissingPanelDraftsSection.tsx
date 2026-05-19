"use client";

import { useState, useCallback } from "react";
import type {
  MissingPanelSceneInfo,
  MissingPanelThumbnail,
  StoryPanelCoverage,
} from "@/lib/storyPanelCoverage";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 5;

const READINESS_BADGE: Record<
  MissingPanelSceneInfo["readinessBadge"],
  { label: string; className: string }
> = {
  "reference-ready": {
    label: "Reference Ready",
    className: "bg-tropical-green/15 text-tropical-green border-tropical-green/30",
  },
  "needs-official-ref": {
    label: "Needs Official Reference",
    className: "bg-pineapple-yellow/25 text-tiki-brown/70 border-pineapple-yellow/40",
  },
  "no-approved-refs": {
    label: "Needs Supporting References",
    className: "bg-warm-coral/12 text-warm-coral/80 border-warm-coral/25",
  },
  "prompt-only": {
    label: "Prompt-Only Fallback",
    className: "bg-tiki-brown/8 text-tiki-brown/55 border-tiki-brown/15",
  },
};

const REF_MODE_LABELS: Record<string, { label: string; className: string }> = {
  "reference-images-attached": {
    label: "Reference Images Attached",
    className: "bg-tropical-green/15 text-tropical-green",
  },
  "strict-reference-bundle": {
    label: "Production Reference Bundle",
    className: "bg-tropical-green/15 text-tropical-green",
  },
  "prompt-only-reference-summary": {
    label: "Reference Summary (Text)",
    className: "bg-ube-purple/12 text-ube-purple",
  },
  "no-references-available": {
    label: "No References Available",
    className: "bg-tiki-brown/8 text-tiki-brown/55",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type SceneDraftStatus = "idle" | "generating" | "done" | "failed";

type SceneDraftResult = {
  ok: boolean;
  image?: { mimeType: string; base64: string };
  referenceMode?: string;
  referencesUsed?: { characterName: string; title: string; priority: string }[];
  warnings?: string[];
  message?: string;
  generationPrompt?: string;
};

type SceneDraftState = {
  info: MissingPanelSceneInfo;
  status: SceneDraftStatus;
  result?: SceneDraftResult;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function RefThumb({ thumb }: { thumb: MissingPanelThumbnail }) {
  if (!thumb.profileSheetUrl && !thumb.mainImageUrl) return null;
  return (
    <div className="flex items-center gap-1.5">
      {thumb.profileSheetUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumb.profileSheetUrl}
          alt={`${thumb.characterName} profile sheet`}
          className="w-8 h-8 rounded-lg object-contain border border-tiki-brown/10 bg-tiki-brown/3 flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-8 h-8 rounded-lg border border-tiki-brown/10 bg-tiki-brown/4 flex items-center justify-center flex-shrink-0">
          <span className="text-xs text-tiki-brown/25">?</span>
        </div>
      )}
      <span className="text-xs text-tiki-brown/60 font-semibold">{thumb.characterName}</span>
      {!thumb.hasProfileSheet && (
        <span className="text-xs text-pineapple-yellow/80 font-semibold">(no profile sheet)</span>
      )}
    </div>
  );
}

function SceneMissingCard({
  info,
  checked,
  onToggle,
  draftState,
}: {
  info: MissingPanelSceneInfo;
  checked: boolean;
  onToggle: () => void;
  draftState?: SceneDraftState;
}) {
  const badge = READINESS_BADGE[info.readinessBadge];
  const status = draftState?.status ?? "idle";
  const result = draftState?.result;

  return (
    <div
      className={`border rounded-2xl p-4 flex flex-col gap-3 transition-colors ${
        checked
          ? "border-ube-purple/30 bg-ube-purple/3"
          : "border-tiki-brown/10 bg-white"
      } ${status === "generating" ? "border-pineapple-yellow/40 bg-pineapple-yellow/4" : ""}
        ${status === "done" ? "border-tropical-green/25 bg-tropical-green/3" : ""}
        ${status === "failed" ? "border-warm-coral/25 bg-warm-coral/3" : ""}
      `}
    >
      {/* Header row */}
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        {status === "idle" && (
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="mt-0.5 flex-shrink-0 accent-ube-purple"
          />
        )}

        {/* Status icon */}
        {status === "generating" && (
          <span className="text-sm flex-shrink-0 animate-pulse">⏳</span>
        )}
        {status === "done" && <span className="text-sm flex-shrink-0">✅</span>}
        {status === "failed" && <span className="text-sm flex-shrink-0">⚠️</span>}

        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black text-tiki-brown/70 px-2 py-0.5 rounded-full bg-sky-blue/20">
              Scene {info.sceneNumber}
            </span>
            {info.title && (
              <span className="text-xs font-bold text-tiki-brown truncate">{info.title}</span>
            )}
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badge.className}`}
            >
              {badge.label}
            </span>
            {status === "generating" && (
              <span className="text-xs font-semibold text-pineapple-yellow/80 animate-pulse">
                Generating…
              </span>
            )}
          </div>

          {/* Characters */}
          {info.characters.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {info.characters.map((c) => (
                <span
                  key={c}
                  className="text-xs px-2 py-0.5 rounded-full bg-ube-purple/8 text-ube-purple/80 font-semibold"
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Summary */}
          {info.summary && (
            <p className="text-xs text-tiki-brown/55 leading-relaxed line-clamp-2">
              {info.summary}
            </p>
          )}

          {/* Reference warnings */}
          {info.referenceWarnings.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {info.referenceWarnings.map((w, i) => (
                <p key={i} className="text-xs text-tiki-brown/45 leading-relaxed">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}

          {/* Character reference thumbnails */}
          {info.fidelityThumbnails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-0.5">
              {info.fidelityThumbnails.map((t) => (
                <RefThumb key={t.characterSlug} thumb={t} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generation result */}
      {status === "done" && result && (
        <div className="flex flex-col gap-2 border-t border-tropical-green/20 pt-3">
          {result.image?.base64 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                Temporary Draft — Not Saved
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                alt={`Temporary draft for Scene ${info.sceneNumber}`}
                className="w-full max-w-sm rounded-2xl border-2 border-warm-coral/25 shadow-sm"
              />
            </div>
          ) : (
            <p className="text-xs text-tiki-brown/45 italic">Draft generated (no image preview available).</p>
          )}

          {/* Reference mode badge */}
          {result.referenceMode && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (REF_MODE_LABELS[result.referenceMode] ?? REF_MODE_LABELS["no-references-available"]).className
                }`}
              >
                {(REF_MODE_LABELS[result.referenceMode] ?? REF_MODE_LABELS["no-references-available"]).label}
              </span>
            </div>
          )}

          {/* Warnings */}
          {result.warnings && result.warnings.length > 0 && (
            <div className="flex flex-col gap-0.5">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-tiki-brown/50">⚠ {w}</p>
              ))}
            </div>
          )}

          {/* Review instruction */}
          <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2">
            <span className="text-xs flex-shrink-0">📋</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              Scroll down to the{" "}
              <strong className="font-bold">Story Panel Prompt Builder</strong> to do a
              full side-by-side fidelity review against official character references before uploading.
            </p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "failed" && (
        <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2 border-t border-t-warm-coral/15 pt-3">
          <span className="text-xs flex-shrink-0">⚠️</span>
          <p className="text-xs text-warm-coral font-semibold leading-relaxed">
            {result?.message ?? "Generation failed for this scene. Other scenes will continue."}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function BatchMissingPanelDraftsSection({
  episodeSlug,
  coverage,
  missingScenes,
}: {
  episodeSlug: string;
  coverage: StoryPanelCoverage;
  missingScenes: MissingPanelSceneInfo[];
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [draftStates, setDraftStates] = useState<Map<number, SceneDraftState>>(new Map());
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const selectedList = missingScenes.filter((s) => selected.has(s.sceneNumber));
  const overLimit = selectedList.length > MAX_BATCH_SIZE;
  const canGenerate = selectedList.length > 0 && !overLimit && !isRunning;

  const allGenerated = missingScenes.every(
    (s) => draftStates.get(s.sceneNumber)?.status === "done" || draftStates.get(s.sceneNumber)?.status === "failed"
  );

  function toggleScene(sceneNumber: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sceneNumber)) next.delete(sceneNumber);
      else next.add(sceneNumber);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(missingScenes.map((s) => s.sceneNumber)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  const updateDraftState = useCallback(
    (sceneNumber: number, patch: Partial<SceneDraftState>) => {
      setDraftStates((prev) => {
        const next = new Map(prev);
        const current = next.get(sceneNumber);
        next.set(sceneNumber, { ...current!, ...patch } as SceneDraftState);
        return next;
      });
    },
    []
  );

  async function handleGenerate() {
    if (!canGenerate) return;
    setIsRunning(true);

    const queue = [...selectedList];
    setProgress({ current: 0, total: queue.length });

    // Initialize all selected as "generating" pending
    setDraftStates((prev) => {
      const next = new Map(prev);
      for (const scene of queue) {
        next.set(scene.sceneNumber, { info: scene, status: "idle" });
      }
      return next;
    });

    for (let i = 0; i < queue.length; i++) {
      const scene = queue[i];
      setProgress({ current: i + 1, total: queue.length });

      updateDraftState(scene.sceneNumber, { info: scene, status: "generating" });

      try {
        const res = await fetch("/api/generate-story-panel-image", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episodeSlug,
            sceneNumber: scene.sceneNumber,
            panelPrompt: scene.panelPrompt,
            referenceCharacters: scene.referenceCharacters,
          }),
        });

        if (res.status === 401) {
          updateDraftState(scene.sceneNumber, {
            status: "failed",
            result: { ok: false, message: "Admin access required. Please unlock the Story Studio again." },
          });
          continue;
        }

        let data: SceneDraftResult;
        try {
          data = (await res.json()) as SceneDraftResult;
        } catch {
          updateDraftState(scene.sceneNumber, {
            status: "failed",
            result: { ok: false, message: "Could not parse generation response." },
          });
          continue;
        }

        if (data.ok || data.image) {
          updateDraftState(scene.sceneNumber, { status: "done", result: data });
        } else if ((data as { status?: string }).status === "not_implemented_yet") {
          updateDraftState(scene.sceneNumber, {
            status: "failed",
            result: {
              ok: false,
              message:
                "OpenAI is not configured. Add OPENAI_API_KEY to enable image generation.",
            },
          });
        } else {
          updateDraftState(scene.sceneNumber, {
            status: "failed",
            result: {
              ok: false,
              message: data.message ?? "Generation failed for this scene.",
            },
          });
        }
      } catch {
        updateDraftState(scene.sceneNumber, {
          status: "failed",
          result: { ok: false, message: "Network error during generation." },
        });
      }
    }

    setProgress(null);
    setIsRunning(false);
    setSelected(new Set());
  }

  if (missingScenes.length === 0 && coverage.totalActiveScenes === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">⚡</span>
          <h2 className="text-base font-black text-tiki-brown">Batch Missing Panel Drafts</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Generate temporary draft images for scenes missing story panels. Drafts require
          fidelity review before upload and are never saved automatically.
        </p>
      </div>

      {/* Coverage stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Scenes", value: String(coverage.totalActiveScenes), color: "sky-blue" },
          { label: "With Panel", value: String(coverage.scenesWithPanel), color: "tropical-green" },
          { label: "Missing Panel", value: String(coverage.scenesMissingPanel), color: coverage.scenesMissingPanel > 0 ? "warm-coral" : "tropical-green" },
          { label: "Coverage", value: `${coverage.coveragePercent}%`, color: coverage.coveragePercent === 100 ? "tropical-green" : "pineapple-yellow" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-3 py-2.5 text-center"
          >
            <span className="text-base font-black text-tiki-brown">{value}</span>
            <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* All panels covered */}
      {missingScenes.length === 0 && (
        <div className="flex items-center gap-3 bg-tropical-green/8 border border-tropical-green/25 rounded-2xl px-5 py-4">
          <span className="text-base">✅</span>
          <p className="text-sm font-semibold text-tropical-green">
            All active scenes have attached story panel assets.
          </p>
        </div>
      )}

      {/* Missing scenes list */}
      {missingScenes.length > 0 && (
        <div className="flex flex-col gap-4">

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              {missingScenes.length} scene{missingScenes.length !== 1 ? "s" : ""} missing a story panel
            </p>
            <div className="flex gap-2 ml-auto">
              <button
                onClick={selectAll}
                disabled={isRunning}
                className="text-xs font-semibold text-ube-purple hover:opacity-70 transition-opacity disabled:opacity-40"
              >
                Select All
              </button>
              <span className="text-tiki-brown/25">|</span>
              <button
                onClick={deselectAll}
                disabled={isRunning}
                className="text-xs font-semibold text-tiki-brown/50 hover:opacity-70 transition-opacity disabled:opacity-40"
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Scene cards */}
          <div className="flex flex-col gap-3">
            {missingScenes.map((scene) => (
              <SceneMissingCard
                key={scene.sceneNumber}
                info={scene}
                checked={selected.has(scene.sceneNumber)}
                onToggle={() => toggleScene(scene.sceneNumber)}
                draftState={draftStates.get(scene.sceneNumber)}
              />
            ))}
          </div>

          {/* Over-limit warning */}
          {overLimit && (
            <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚠️</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                Generate up to {MAX_BATCH_SIZE} missing panel drafts at a time to keep review manageable.{" "}
                <strong className="font-bold">{selectedList.length} selected</strong> — deselect some before generating.
              </p>
            </div>
          )}

          {/* Progress indicator */}
          {isRunning && progress && (
            <div className="flex items-center gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
              <span className="text-sm animate-spin flex-shrink-0">⏳</span>
              <div className="flex flex-col gap-0.5">
                <p className="text-sm font-bold text-tiki-brown">
                  Generating {progress.current} of {progress.total}…
                </p>
                <p className="text-xs text-tiki-brown/55">
                  Running sequentially. Do not close this page.
                </p>
              </div>
            </div>
          )}

          {/* Generate button */}
          {!allGenerated && (
            <div className="flex flex-col gap-2">
              <button
                onClick={handleGenerate}
                disabled={!canGenerate}
                className="self-start px-5 py-2.5 rounded-xl bg-ube-purple text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {isRunning
                  ? `Generating… (${progress?.current ?? 0}/${progress?.total ?? 0})`
                  : `Generate Drafts for ${selectedList.length > 0 ? `${selectedList.length} ` : ""}Selected Missing Panel${selectedList.length !== 1 ? "s" : ""}`}
              </button>
              {selectedList.length === 0 && !isRunning && (
                <p className="text-xs text-tiki-brown/40 italic">
                  Select at least one missing scene above.
                </p>
              )}
            </div>
          )}

          {/* Safety reminder */}
          <div className="flex items-start gap-2 bg-sky-blue/10 border border-sky-blue/25 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">⚠️</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              <strong className="font-semibold">Temporary drafts only.</strong>{" "}
              Generated images are not saved, uploaded, or attached automatically. Use the{" "}
              <strong className="font-semibold">Story Panel Prompt Builder</strong> below to review
              each draft against official character references before uploading.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
