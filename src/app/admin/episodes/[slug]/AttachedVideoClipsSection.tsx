"use client";

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

function VideoClipCard({ clip }: { clip: AttachedVideoClipAsset }) {
  const visibilityLabel = getMediaVisibilityLabel(clip.visibility);
  const visibilityColor = getMediaLifecycleBadgeClass(getMediaVisibilityStage(clip.visibility));

  return (
    <div className="bg-white border border-tiki-brown/10 rounded-2xl p-4 flex flex-col gap-3">
      {/* Status row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
          {clip.status}
        </span>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${visibilityColor} uppercase tracking-wide`}>
          {visibilityLabel}
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
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function AttachedVideoClipsSection({ scenes }: Props) {
  const scenesWithClips = scenes.filter((s) => s.videoClips.length > 0);
  const totalClips = scenes.reduce((sum, s) => sum + s.videoClips.length, 0);

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎞️</span>
          <h2 className="text-base font-black text-tiki-brown">Attached Video Clips</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Approved video clips attached to episode scenes. Video is not public yet — public display
          will be enabled in a future phase.
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
        <div className="flex flex-col items-center bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-2 min-w-[72px]">
          <span className="text-sm font-black text-tiki-brown">{scenes.length - scenesWithClips.length}</span>
          <span className="text-xs text-tiki-brown/45 text-center leading-tight">Scenes Without</span>
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
            <VideoClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      ))}

    </div>
  );
}
