// Admin-only preview of the final story video assembly plan.
// Display only — no rendering, no saving, no publishing.

import type { FinalVideoAssemblyPackage, FinalVideoSceneSegment } from "@/lib/finalVideoTypes";

// ─── Status helpers ───────────────────────────────────────────────────────────

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

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ value, label, highlight }: { value: string | number; label: string; highlight?: boolean }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-4 py-2 min-w-[64px] border ${highlight ? "bg-tropical-green/8 border-tropical-green/20" : "bg-tiki-brown/3 border-tiki-brown/8"}`}>
      <span className={`text-sm font-black ${highlight ? "text-tropical-green" : "text-tiki-brown"}`}>{value}</span>
      <span className="text-xs text-tiki-brown/45 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Scene segment row ────────────────────────────────────────────────────────

function SegmentRow({ seg, index }: { seg: FinalVideoSceneSegment; index: number }) {
  const sceneLabel = seg.title || `Scene ${seg.sceneNumber ?? index + 1}`;

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-tiki-brown/4 to-transparent px-4 py-2.5 flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 flex-shrink-0">
          Scene {seg.sceneNumber ?? index + 1}
        </span>
        <span className="text-sm font-bold text-tiki-brown flex-1 min-w-0 truncate">{sceneLabel}</span>
        <VisualModeBadge mode={seg.visualMode} />
        <span className="text-xs text-tiki-brown/40 flex-shrink-0">{seg.durationSeconds}s</span>
      </div>

      {/* Body */}
      <div className="px-4 py-3 flex flex-col gap-2">
        {/* Visual preview */}
        {seg.animatedClip && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-tiki-brown/40 flex-shrink-0">Clip:</span>
            <p className="text-xs font-mono text-ube-purple truncate flex-1">{seg.animatedClip.url.slice(0, 60)}…</p>
          </div>
        )}
        {seg.storyPanel && !seg.animatedClip && (
          <div className="flex items-center gap-3">
            {seg.storyPanel.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seg.storyPanel.url}
                alt={seg.storyPanel.altText || sceneLabel}
                className="w-14 h-10 object-cover rounded-lg border border-tiki-brown/10 flex-shrink-0"
              />
            )}
            <p className="text-xs text-tiki-brown/55 leading-snug flex-1">
              {seg.storyPanel.caption || seg.storyPanel.altText || "Panel image"}
            </p>
          </div>
        )}

        {/* Caption text */}
        {seg.captionText && (
          <p className="text-xs text-tiki-brown/60 leading-relaxed italic border-l-2 border-tiki-brown/15 pl-3">
            {seg.captionText.length > 120 ? `${seg.captionText.slice(0, 120)}…` : seg.captionText}
          </p>
        )}

        {/* Segment warnings */}
        {seg.warnings.length > 0 && (
          <div className="flex flex-col gap-1 pt-1">
            {seg.warnings.map((w, i) => (
              <p key={i} className="text-xs text-warm-coral/70 leading-snug flex items-start gap-1.5">
                <span className="flex-shrink-0 mt-0.5">⚠</span>
                {w}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

type Props = {
  pkg: FinalVideoAssemblyPackage;
};

export default function FinalVideoAssemblyPreviewSection({ pkg }: Props) {
  const clipCount = pkg.segments.filter((s) => s.visualMode === "animated-clip").length;
  const panelCount = pkg.segments.filter((s) => s.visualMode === "story-panel").length;
  const textCount = pkg.segments.filter((s) => s.visualMode === "text-only").length;

  const durationMin = Math.floor(pkg.estimatedDurationSeconds / 60);
  const durationSec = pkg.estimatedDurationSeconds % 60;
  const durationLabel = durationMin > 0
    ? `~${durationMin}m ${durationSec}s`
    : `~${pkg.estimatedDurationSeconds}s`;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎬</span>
          <h2 className="text-base font-black text-tiki-brown">Final Story Video Plan</h2>
          <StatusBadge status={pkg.status} />
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Preview Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Preview how this episode could be assembled into a complete story video. Rendering comes in a future phase.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-3">
        <StatChip value={pkg.segments.length} label="Total Scenes" />
        <StatChip value={durationLabel} label="Est. Duration" />
        <StatChip value={clipCount} label="Animated" highlight={clipCount > 0} />
        <StatChip value={panelCount} label="Panel" />
        <StatChip value={textCount} label="Text Only" />
        <StatChip
          value={pkg.hasNarrationAudio ? "Yes" : "No"}
          label="Narration"
          highlight={pkg.hasNarrationAudio}
        />
      </div>

      {/* Narration audio status */}
      <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${pkg.hasNarrationAudio ? "bg-tropical-green/8 border-tropical-green/20" : "bg-pineapple-yellow/10 border-pineapple-yellow/30"}`}>
        <span className="text-base flex-shrink-0">{pkg.hasNarrationAudio ? "🎧" : "🔇"}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            Narration Audio
          </p>
          <p className="text-xs text-tiki-brown/55 leading-snug mt-0.5">
            {pkg.hasNarrationAudio
              ? "Public-ready narration audio will accompany the video."
              : "No public-ready narration audio attached. Audio will not be included in the final video."}
          </p>
        </div>
      </div>

      {/* Blockers */}
      {pkg.blockers.length > 0 && (
        <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
            Blockers — must be resolved before video assembly
          </p>
          {pkg.blockers.map((b, i) => (
            <p key={i} className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5">
              <span className="flex-shrink-0 text-warm-coral mt-0.5">✕</span>
              {b}
            </p>
          ))}
        </div>
      )}

      {/* Warnings (excluding per-segment ones already shown inline) */}
      {pkg.warnings.filter((w) => !w.includes(": ")).length > 0 && (
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Warnings</p>
          {pkg.warnings
            .filter((w) => !w.includes(": "))
            .map((w, i) => (
              <p key={i} className="text-xs text-tiki-brown/65 leading-snug flex items-start gap-1.5">
                <span className="flex-shrink-0 text-pineapple-yellow mt-0.5">⚠</span>
                {w}
              </p>
            ))}
        </div>
      )}

      {/* Scene segments */}
      {pkg.segments.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Scene Segments — Assembly Order
          </p>
          <div className="flex flex-col gap-2">
            {pkg.segments.map((seg, i) => (
              <SegmentRow key={seg.sceneId || i} seg={seg} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {pkg.notes.length > 0 && (
        <div className="flex flex-col gap-1">
          {pkg.notes.map((n, i) => (
            <p key={i} className="text-xs text-tiki-brown/45 leading-snug">• {n}</p>
          ))}
        </div>
      )}

      {/* Future render button placeholder */}
      <div className="border-t border-tiki-brown/8 pt-4">
        <button
          type="button"
          disabled
          className="w-full rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide bg-tiki-brown/6 text-tiki-brown/30 cursor-not-allowed border border-tiki-brown/10"
          title="Final video rendering is not yet available"
        >
          Render Final Story Video — Coming in a Future Phase
        </button>
        <p className="text-xs text-tiki-brown/35 text-center mt-2 leading-relaxed">
          This plan is preview-only. Video rendering, saving, and publishing come in a later phase.
        </p>
      </div>

    </div>
  );
}
