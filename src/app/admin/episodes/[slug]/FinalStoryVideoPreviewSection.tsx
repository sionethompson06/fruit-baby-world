// Admin-only visual preview of the final story video sequence.
// Display only — no rendering, no saving, no publishing.

import type { FinalVideoAssemblyPackage, FinalVideoSceneSegment } from "@/lib/finalVideoTypes";

// ─── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FinalVideoAssemblyPackage["status"] }) {
  if (status === "ready") {
    return (
      <span className="text-xs font-bold px-3 py-1 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
        Ready
      </span>
    );
  }
  if (status === "needs-work") {
    return (
      <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/30 text-tiki-brown/70 uppercase tracking-wide">
        Needs Work
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-3 py-1 rounded-full bg-warm-coral/15 text-warm-coral uppercase tracking-wide">
      Blocked
    </span>
  );
}

function VisualModeBadge({ mode }: { mode: FinalVideoSceneSegment["visualMode"] }) {
  if (mode === "animated-clip") {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-blue/15 text-sky-blue flex-shrink-0">
        Animated Clip
      </span>
    );
  }
  if (mode === "story-panel") {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple flex-shrink-0">
        Story Panel
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/10 text-tiki-brown/50 flex-shrink-0">
      Text Only
    </span>
  );
}

// ─── Scene preview card ───────────────────────────────────────────────────────

function ScenePreviewCard({ seg, index }: { seg: FinalVideoSceneSegment; index: number }) {
  const sceneNum = seg.sceneNumber ?? index + 1;
  const sceneLabel = seg.title || `Scene ${sceneNum}`;

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">
      {/* Card header */}
      <div className="bg-gradient-to-r from-tiki-brown/4 to-transparent px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 flex-shrink-0">
          Scene {sceneNum}
        </span>
        <span className="text-sm font-bold text-tiki-brown flex-1 min-w-0 truncate">{sceneLabel}</span>
        <VisualModeBadge mode={seg.visualMode} />
        <span className="text-xs text-tiki-brown/40 flex-shrink-0 tabular-nums">{seg.durationSeconds}s</span>
      </div>

      {/* Visual area */}
      <div className="px-4 pt-3">
        {seg.visualMode === "animated-clip" && seg.animatedClip && (
          <div className="rounded-xl overflow-hidden border border-tiki-brown/10 bg-black">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              src={seg.animatedClip.url}
              controls
              playsInline
              preload="metadata"
              poster={seg.animatedClip.thumbnailUrl || undefined}
              className="w-full aspect-video"
            >
              Your browser does not support video playback.
            </video>
          </div>
        )}

        {seg.visualMode === "story-panel" && seg.storyPanel && (
          <div className="rounded-xl overflow-hidden border border-tiki-brown/10 bg-tiki-brown/3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={seg.storyPanel.url}
              alt={seg.storyPanel.altText || sceneLabel}
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        {seg.visualMode === "text-only" && (
          <div className="rounded-xl bg-tiki-brown/4 border border-tiki-brown/8 px-4 py-6 flex flex-col items-center gap-2 text-center">
            <span className="text-2xl opacity-40">📄</span>
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide">No Public-Ready Visual</p>
            {seg.summary && (
              <p className="text-sm text-tiki-brown/55 leading-relaxed max-w-md">{seg.summary}</p>
            )}
          </div>
        )}
      </div>

      {/* Caption and warnings */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {seg.captionText ? (
          <div className="border-l-2 border-tiki-brown/15 pl-3">
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-1">Caption</p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed italic">
              {seg.captionText.length > 200 ? `${seg.captionText.slice(0, 200)}…` : seg.captionText}
            </p>
          </div>
        ) : (
          <p className="text-xs text-tiki-brown/35 italic">No caption text available.</p>
        )}

        {seg.warnings.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {seg.warnings.map((w, i) => (
              <span
                key={i}
                className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warm-coral/10 text-warm-coral/80 flex items-center gap-1"
              >
                <span>⚠</span>
                {w.length > 60 ? `${w.slice(0, 60)}…` : w}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  pkg: FinalVideoAssemblyPackage;
};

export default function FinalStoryVideoPreviewSection({ pkg }: Props) {
  const durationMin = Math.floor(pkg.estimatedDurationSeconds / 60);
  const durationSec = pkg.estimatedDurationSeconds % 60;
  const durationLabel = durationMin > 0
    ? `~${durationMin}m ${durationSec}s`
    : `~${pkg.estimatedDurationSeconds}s`;

  const episodeWarnings = pkg.warnings.filter((w) => !w.includes(": "));
  const textOnlyScenes = pkg.segments.filter((s) => s.visualMode === "text-only");
  const hasMissingVisuals = textOnlyScenes.length > 0;
  const hasMissingNarration = !pkg.hasNarrationAudio;

  // Warnings that aren't already covered by dedicated fix items below
  const otherWarnings = episodeWarnings.filter(
    (w) => !w.toLowerCase().includes("text-only") && !w.toLowerCase().includes("narration")
  );

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">▶️</span>
          <h2 className="text-base font-black text-tiki-brown">Final Story Video Preview</h2>
          <StatusBadge status={pkg.status} />
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Preview Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Preview the full story sequence before final rendering is added.
        </p>
      </div>

      {/* Info strip */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-tiki-brown/55 bg-tiki-brown/3 rounded-2xl px-4 py-3 border border-tiki-brown/8">
        <span className="font-bold text-tiki-brown/70">{pkg.episodeTitle}</span>
        <span>{durationLabel} estimated</span>
        <span>{pkg.segments.length} scene{pkg.segments.length !== 1 ? "s" : ""}</span>
        {pkg.hasNarrationAudio ? (
          <span className="text-tropical-green font-semibold">Narration included</span>
        ) : (
          <span className="text-warm-coral/70 font-semibold">No narration</span>
        )}
      </div>

      {/* Story sequence */}
      {pkg.segments.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Story Sequence — Assembly Order
          </p>
          <div className="flex flex-col gap-3">
            {pkg.segments.map((seg, i) => (
              <ScenePreviewCard key={seg.sceneId || i} seg={seg} index={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-warm-coral/8 border border-warm-coral/20 px-4 py-5 flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-bold text-warm-coral/70">No active scenes — add scenes to build the story sequence.</p>
          <a href="#story" className="text-xs text-ube-purple hover:underline">Go to Story Scenes →</a>
        </div>
      )}

      {/* Narration panel */}
      <div className={`rounded-2xl px-4 py-4 border flex flex-col gap-3 ${pkg.hasNarrationAudio ? "bg-tropical-green/8 border-tropical-green/20" : "bg-pineapple-yellow/10 border-pineapple-yellow/30"}`}>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base flex-shrink-0">{pkg.hasNarrationAudio ? "🎧" : "🔇"}</span>
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Narration Audio</p>
          {pkg.hasNarrationAudio && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green">
              Public Ready
            </span>
          )}
        </div>
        {pkg.hasNarrationAudio && pkg.narrationAudio ? (
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <audio
            controls
            preload="metadata"
            className="w-full h-10"
          >
            <source src={pkg.narrationAudio.url} type={pkg.narrationAudio.mimeType} />
            Your browser does not support audio playback.
          </audio>
        ) : (
          <p className="text-xs text-tiki-brown/55 leading-relaxed">
            No public-ready narration audio. The final video will have no audio track.{" "}
            <a href="#audio-story" className="text-ube-purple font-semibold hover:underline">
              Add audio narration →
            </a>
          </p>
        )}
      </div>

      {/* Fix-before-render checklist */}
      {(pkg.blockers.length > 0 || hasMissingVisuals || hasMissingNarration || otherWarnings.length > 0) && (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Fix Before Rendering
          </p>

          {pkg.blockers.map((b, i) => (
            <div key={i} className="flex items-start gap-2 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-3 py-2.5">
              <span className="text-warm-coral flex-shrink-0 text-xs font-black mt-0.5">✕</span>
              <p className="text-xs text-tiki-brown/70 leading-snug flex-1">{b}</p>
              <a href="#publish-readiness" className="text-xs text-ube-purple font-semibold hover:underline flex-shrink-0">
                Fix →
              </a>
            </div>
          ))}

          {hasMissingVisuals && (
            <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
              <span className="text-pineapple-yellow flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-tiki-brown/65 leading-snug flex-1">
                {textOnlyScenes.length} scene{textOnlyScenes.length !== 1 ? "s" : ""} have no public-ready visual (text-only fallback).
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <a href="#picture-panels" className="text-xs text-ube-purple font-semibold hover:underline">Panels →</a>
                <a href="#animated-clips" className="text-xs text-ube-purple font-semibold hover:underline">Clips →</a>
              </div>
            </div>
          )}

          {hasMissingNarration && (
            <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
              <span className="text-pineapple-yellow flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-tiki-brown/65 leading-snug flex-1">
                No public-ready narration — video will have no audio track.
              </p>
              <a href="#audio-story" className="text-xs text-ube-purple font-semibold hover:underline flex-shrink-0">
                Add Audio →
              </a>
            </div>
          )}

          {otherWarnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
              <span className="text-pineapple-yellow flex-shrink-0 mt-0.5">⚠</span>
              <p className="text-xs text-tiki-brown/65 leading-snug flex-1">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Future render notice */}
      <div className="border-t border-tiki-brown/8 pt-4">
        <p className="text-xs text-tiki-brown/40 leading-relaxed text-center">
          Rendering a final downloadable/shareable video will be added in a future phase.
          This preview only shows the planned sequence.
        </p>
      </div>

    </div>
  );
}
