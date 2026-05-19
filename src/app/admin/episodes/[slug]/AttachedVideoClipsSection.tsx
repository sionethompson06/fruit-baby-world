"use client";

import { useState } from "react";
import type { AttachedVideoClipAsset } from "@/lib/videoGenerationTypes";
import { getMediaVisibilityLabel, getMediaLifecycleBadgeClass, getMediaVisibilityStage } from "@/lib/mediaLifecycle";

// ─── Props ────────────────────────────────────────────────────────────────────

export type SceneWithVideoClips = {
  sceneNumber: number;
  sceneId: string;
  sceneTitle: string;
  videoClips: AttachedVideoClipAsset[];
};

type Props = {
  episodeSlug: string;
  scenes: SceneWithVideoClips[];
};

// ─── Video style labels ───────────────────────────────────────────────────────

const STYLE_LABELS: Record<string, string> = {
  "storybook-cartoon":  "Storybook Cartoon",
  "gentle-animation":   "Gentle Animation",
  "playful-short":      "Playful Short",
  "classroom-friendly": "Classroom Friendly",
  "cinematic-soft":     "Cinematic Soft",
};

// ─── Single clip card ─────────────────────────────────────────────────────────

type VideoClipCardProps = {
  clip: AttachedVideoClipAsset;
  episodeSlug: string;
  sceneId: string;
};

function VideoClipCard({ clip, episodeSlug, sceneId }: VideoClipCardProps) {
  const [currentVisibility, setCurrentVisibility] = useState(clip.visibility);
  const [visibilityLoading, setVisibilityLoading] = useState(false);
  const [visibilityError, setVisibilityError] = useState<string | null>(null);
  const [visibilityNote, setVisibilityNote] = useState<string | null>(null);

  const visibilityColor = getMediaLifecycleBadgeClass(getMediaVisibilityStage(currentVisibility));

  async function updateVisibility(newVisibility: "admin-only" | "public-ready" | "hidden") {
    setVisibilityLoading(true);
    setVisibilityError(null);
    setVisibilityNote(null);
    try {
      const res = await fetch("/api/github/update-video-clip-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          sceneId,
          videoClipId: clip.id,
          visibility: newVisibility,
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (data.ok) {
        setCurrentVisibility(newVisibility);
        const notes = Array.isArray(data.notes) ? (data.notes as string[]) : [];
        setVisibilityNote(notes[1] ?? null);
      } else {
        setVisibilityError(typeof data.message === "string" ? data.message : "Visibility update failed.");
      }
    } catch {
      setVisibilityError("Network error — could not update visibility.");
    } finally {
      setVisibilityLoading(false);
    }
  }

  return (
    <div className="bg-white border border-tiki-brown/10 rounded-2xl p-4 flex flex-col gap-3">
      {/* Status row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
          {clip.status}
        </span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${visibilityColor} uppercase tracking-wide`}>
          {getMediaVisibilityLabel(currentVisibility)}
        </span>
        <span className="text-xs text-tiki-brown/40 ml-auto">ID: {clip.id}</span>
      </div>

      {/* Video player */}
      {clip.url && clip.url.startsWith("https://") && (
        <video
          src={clip.url}
          controls
          className="w-full rounded-xl border border-tiki-brown/10 bg-black max-h-48"
          aria-label={`Attached video clip — ${clip.videoStyle}`}
        >
          Your browser does not support video playback.
        </video>
      )}

      {/* Metadata chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Provider", value: clip.provider || "—" },
          { label: "Style", value: (STYLE_LABELS[clip.videoStyle] ?? clip.videoStyle) || "—" },
          { label: "Duration", value: clip.durationSeconds ? `${clip.durationSeconds}s` : "—" },
          { label: "Size", value: clip.sizeBytes > 0 ? `${Math.round(clip.sizeBytes / 1024 / 1024 * 10) / 10} MB` : "—" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-3 py-1.5 min-w-[64px]"
          >
            <span className="text-xs font-black text-tiki-brown">{value}</span>
            <span className="text-xs text-tiki-brown/40 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* URLs */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Blob URL</p>
        <p className="text-xs font-mono text-ube-purple break-all">{clip.url}</p>
        {clip.pathname && (
          <p className="text-xs font-mono text-tiki-brown/50 break-all">{clip.pathname}</p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-tiki-brown/50">
        {clip.modelId && <span>Model: <span className="font-mono">{clip.modelId}</span></span>}
        {clip.referenceMode && <span>Refs: {clip.referenceMode}</span>}
        {clip.approvedBy && <span>Approved by: {clip.approvedBy}</span>}
        {clip.approvedAt && <span>Approved: {new Date(clip.approvedAt).toLocaleDateString()}</span>}
        {clip.attachedAt && <span>Attached: {new Date(clip.attachedAt).toLocaleDateString()}</span>}
      </div>

      {clip.reviewNotes && (
        <p className="text-xs text-tiki-brown/55 italic bg-tiki-brown/3 rounded-lg px-3 py-2 leading-relaxed">
          {clip.reviewNotes}
        </p>
      )}

      {/* ── Visibility controls ── */}
      <div className="border-t border-tiki-brown/8 pt-3 flex flex-col gap-2">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Visibility</p>
        <div className="flex flex-wrap gap-2">
          {currentVisibility !== "public-ready" && (
            <button
              type="button"
              disabled={visibilityLoading}
              onClick={() => updateVisibility("public-ready")}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {visibilityLoading ? "Saving…" : "Make Public Ready"}
            </button>
          )}
          {currentVisibility !== "hidden" && (
            <button
              type="button"
              disabled={visibilityLoading}
              onClick={() => updateVisibility("hidden")}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-warm-coral/15 text-warm-coral hover:bg-warm-coral/25 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {visibilityLoading ? "Saving…" : "Hide"}
            </button>
          )}
          {currentVisibility !== "admin-only" && (
            <button
              type="button"
              disabled={visibilityLoading}
              onClick={() => updateVisibility("admin-only")}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {visibilityLoading ? "Saving…" : "Set Admin Only"}
            </button>
          )}
        </div>
        {visibilityNote && (
          <p className="text-xs text-tropical-green/80 leading-snug">{visibilityNote}</p>
        )}
        {visibilityError && (
          <p className="text-xs text-warm-coral leading-snug">{visibilityError}</p>
        )}
        <p className="text-xs text-tiki-brown/40 leading-relaxed">
          Public Ready clips will appear on the public story page after redeploy. Admin Only and Hidden clips remain private.
        </p>
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function AttachedVideoClipsSection({ episodeSlug, scenes }: Props) {
  const scenesWithClips = scenes.filter((s) => s.videoClips.length > 0);
  const totalClips = scenes.reduce((sum, s) => sum + s.videoClips.length, 0);
  const publicReadyCount = scenes.reduce(
    (sum, s) => sum + s.videoClips.filter((c) => c.visibility === "public-ready").length,
    0
  );

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎞️</span>
          <h2 className="text-base font-black text-tiki-brown">Attached Video Clips</h2>
          {publicReadyCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
              {publicReadyCount} Public Ready
            </span>
          )}
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Admin View
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Approved video clips attached to episode scenes. Use visibility controls to mark clips Public Ready for the public story page.
        </p>
      </div>

      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col items-center bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-2 min-w-[72px]">
          <span className="text-sm font-black text-tiki-brown">{totalClips}</span>
          <span className="text-xs text-tiki-brown/45 text-center leading-tight">Total Clips</span>
        </div>
        <div className="flex flex-col items-center bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-2 min-w-[72px]">
          <span className="text-sm font-black text-tiki-brown">{scenesWithClips.length}</span>
          <span className="text-xs text-tiki-brown/45 text-center leading-tight">Scenes Covered</span>
        </div>
        <div className="flex flex-col items-center bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-4 py-2 min-w-[72px]">
          <span className="text-sm font-black text-tropical-green">{publicReadyCount}</span>
          <span className="text-xs text-tiki-brown/45 text-center leading-tight">Public Ready</span>
        </div>
      </div>

      {/* No clips yet */}
      {totalClips === 0 && (
        <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-4 text-center">
          <p className="text-sm text-tiki-brown/50">
            No approved video clips attached yet.
          </p>
          <p className="text-xs text-tiki-brown/40 mt-1">
            Generate a temporary clip, review it, upload to Blob, and attach it using the
            workflow above.
          </p>
        </div>
      )}

      {/* Per-scene clip lists */}
      {scenesWithClips.map((scene) => (
        <div key={scene.sceneId || scene.sceneNumber} className="flex flex-col gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
              Scene {scene.sceneNumber}{scene.sceneTitle ? ` — ${scene.sceneTitle}` : ""}
            </p>
            <span className="text-xs text-tiki-brown/40">
              {scene.videoClips.length} clip{scene.videoClips.length !== 1 ? "s" : ""}
            </span>
          </div>
          {scene.videoClips.map((clip) => (
            <VideoClipCard
              key={clip.id}
              clip={clip}
              episodeSlug={episodeSlug}
              sceneId={scene.sceneId}
            />
          ))}
        </div>
      ))}

    </div>
  );
}
