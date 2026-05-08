"use client";

import { useState } from "react";

type BackfillResult =
  | {
      ok: true;
      status: "scene_ids_backfilled";
      path: string;
      commitMessage: string;
      scenesUpdated: number;
      panelsUpdated: number;
      clipsUpdated: number;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
    };

export default function SceneIdStabilitySection({
  episodeSlug,
  totalScenes,
  scenesWithId,
  totalPanels,
  panelsWithId,
  totalClips,
  clipsWithId,
}: {
  episodeSlug: string;
  totalScenes: number;
  scenesWithId: number;
  totalPanels: number;
  panelsWithId: number;
  totalClips: number;
  clipsWithId: number;
}) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<BackfillResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const scenesNeedingId = totalScenes - scenesWithId;
  const panelsNeedingId = totalPanels - panelsWithId;
  const clipsNeedingId = totalClips - clipsWithId;
  const everythingBackfilled =
    totalScenes > 0 &&
    scenesNeedingId === 0 &&
    panelsNeedingId === 0 &&
    clipsNeedingId === 0;

  const canBackfill =
    totalScenes > 0 && !everythingBackfilled && saveStatus !== "loading";

  async function handleBackfill() {
    setSaveStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/github/backfill-episode-scene-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug }),
      });
      const data = (await res.json()) as BackfillResult;
      setResult(data);

      if (data.ok) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
        if (data.status === "unauthorized") {
          setErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        } else if (data.status === "setup_required") {
          setErrorMsg("GitHub saving is not configured yet.");
        } else if (data.status === "nothing_to_backfill") {
          setSaveStatus("idle");
          setErrorMsg("All scenes and panels already have stable scene IDs.");
        } else if (data.status === "no_scenes_found") {
          setErrorMsg(data.message || "No scenes found in this episode.");
        } else {
          setErrorMsg(data.message || "Something went wrong while backfilling scene IDs.");
        }
      }
    } catch {
      setSaveStatus("error");
      setErrorMsg("Something went wrong while backfilling scene IDs.");
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-lg">🔖</span>
        <div>
          <h2 className="text-base font-black text-tiki-brown">Scene ID Stability</h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed mt-0.5">
            Stable scene IDs protect media assets when scenes are edited or managed. Scene
            numbers remain for display, while scene IDs provide long-term references.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          label="Scenes"
          withId={scenesWithId}
          total={totalScenes}
        />
        <StatCard
          label="Story Panels"
          withId={panelsWithId}
          total={totalPanels}
        />
        {totalClips > 0 && (
          <StatCard
            label="Animation Clips"
            withId={clipsWithId}
            total={totalClips}
          />
        )}
      </div>

      {/* All good notice */}
      {everythingBackfilled && (
        <div className="flex items-center gap-2.5 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-4 py-3">
          <span className="text-sm flex-shrink-0">✓</span>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            All scenes and saved panels have stable scene IDs.
          </p>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="button"
          onClick={handleBackfill}
          disabled={!canBackfill}
          className="text-sm font-black px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          {saveStatus === "loading"
            ? "Backfilling scene IDs…"
            : "Backfill Missing Scene IDs"}
        </button>
        {saveStatus === "success" && (
          <span className="text-xs font-bold text-tropical-green">✓ Scene IDs backfilled</span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs font-bold text-warm-coral leading-snug">{errorMsg}</span>
        )}
      </div>

      {/* Success details */}
      {saveStatus === "success" && result?.ok && (
        <div className="flex flex-col gap-3 bg-tropical-green/8 border border-tropical-green/25 rounded-xl px-5 py-4">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Scene IDs backfilled
          </p>
          <div className="flex flex-wrap gap-4">
            <p className="text-xs text-tiki-brown/70">
              <strong>Scenes updated:</strong> {result.scenesUpdated}
            </p>
            <p className="text-xs text-tiki-brown/70">
              <strong>Panels updated:</strong> {result.panelsUpdated}
            </p>
            {result.clipsUpdated > 0 && (
              <p className="text-xs text-tiki-brown/70">
                <strong>Clips updated:</strong> {result.clipsUpdated}
              </p>
            )}
          </div>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong>Path:</strong> {result.path}
          </p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong>Commit:</strong> {result.commitMessage}
          </p>
          {result.htmlUrl && (
            <a
              href={result.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              View commit on GitHub ↗
            </a>
          )}
          <div className="pt-1 border-t border-tiki-brown/8">
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              After Vercel redeploys, reload this page to see scene IDs in the Scene Breakdown.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  withId,
  total,
}: {
  label: string;
  withId: number;
  total: number;
}) {
  const allDone = total > 0 && withId === total;
  const missing = total - withId;
  return (
    <div className="flex flex-col gap-1 bg-tiki-brown/4 rounded-2xl px-4 py-3">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-black text-tiki-brown/70">
        {withId} / {total}
      </p>
      {total === 0 ? (
        <p className="text-xs text-tiki-brown/35">None saved</p>
      ) : allDone ? (
        <p className="text-xs text-tropical-green font-semibold">All have scene ID</p>
      ) : (
        <p className="text-xs text-warm-coral/70 font-semibold">{missing} missing</p>
      )}
    </div>
  );
}
