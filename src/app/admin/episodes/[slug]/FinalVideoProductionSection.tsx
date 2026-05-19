// Admin-only final video production section.
// Foundation only — no rendering, no saving, no publishing in this phase.

import type { FinalVideoAssemblyPackage, FinalVideoAssemblyStatus } from "@/lib/finalVideoTypes";
import {
  buildFinalVideoProductionPlan,
  getFinalVideoFutureActionSummary,
} from "@/lib/finalVideoProductionPlan";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FinalVideoAssemblyStatus }) {
  if (status === "ready") {
    return (
      <span className="text-xs font-bold px-3 py-1 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
        Ready for Future Render
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

// ─── Main component ───────────────────────────────────────────────────────────

import FinalVideoVisibilityControls from "./FinalVideoVisibilityControls";

type Props = {
  pkg: FinalVideoAssemblyPackage;
  episodeSlug: string;
  raw?: Record<string, unknown>;
};

export default function FinalVideoProductionSection({ pkg, episodeSlug, raw }: Props) {
  const plan = buildFinalVideoProductionPlan(pkg, raw);
  const actionSummary = getFinalVideoFutureActionSummary(plan);

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎞️</span>
          <h2 className="text-base font-black text-tiki-brown">Final Video Production</h2>
          <StatusBadge status={plan.status} />
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
            Not Enabled Yet
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          One-click final video rendering will use the approved media already in this episode.
        </p>
      </div>

      {/* No extra approval note */}
      <div className="flex items-start gap-3 bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-4 py-3">
        <span className="text-base flex-shrink-0">✓</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          The final video will use media that has already been reviewed in the{" "}
          <a href="#picture-panels" className="text-ube-purple font-semibold hover:underline">Picture Panels</a>,{" "}
          <a href="#audio-story" className="text-ube-purple font-semibold hover:underline">Audio Story</a>, and{" "}
          <a href="#animated-clips" className="text-ube-purple font-semibold hover:underline">Animated Clips</a>{" "}
          sections. This avoids another approval loop.
        </p>
      </div>

      {/* Action summary */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-3">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">
          What Will Be Rendered
        </p>
        <p className="text-sm text-tiki-brown/70">{actionSummary}</p>
      </div>

      {/* Blockers (if any) */}
      {plan.blockers.length > 0 && (
        <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
            Must resolve before rendering
          </p>
          {plan.blockers.map((b, i) => (
            <p key={i} className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5">
              <span className="flex-shrink-0 text-warm-coral font-black mt-0.5">✕</span>
              {b}
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {plan.warnings.length > 0 && (
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Warnings</p>
          {plan.warnings.map((w, i) => (
            <p key={i} className="text-xs text-tiki-brown/65 leading-snug flex items-start gap-1.5">
              <span className="flex-shrink-0 text-pineapple-yellow mt-0.5">⚠</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Future steps */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          Future One-Click Render Will
        </p>
        <div className="border border-tiki-brown/8 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          {plan.futureSteps.map((step, i) => (
            <p key={i} className="text-xs text-tiki-brown/55 leading-snug flex items-start gap-2">
              <span className="text-tiki-brown/30 flex-shrink-0 tabular-nums">{i + 1}.</span>
              {step}
            </p>
          ))}
        </div>
      </div>

      {/* Existing final video (if already attached via manual/future test) */}
      {plan.existingFinalVideo && (
        <div>
          <FinalVideoVisibilityControls finalVideo={plan.existingFinalVideo} episodeSlug={episodeSlug} />
        </div>
      )}

      {/* Disabled action button */}
      <div className="border-t border-tiki-brown/8 pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled
            className="flex-1 rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide bg-tiki-brown/6 text-tiki-brown/30 cursor-not-allowed border border-tiki-brown/10 min-w-[200px]"
            title={plan.disabledReason}
          >
            Render &amp; Save Final Video
          </button>
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tiki-brown/5 border border-tiki-brown/8 text-tiki-brown/35 uppercase tracking-wide flex-shrink-0">
            Coming Later
          </span>
        </div>
        <p className="text-xs text-tiki-brown/35 leading-relaxed">
          {plan.disabledReason} No separate final approval loop will be required.
        </p>
        <p className="text-xs text-tiki-brown/30 font-mono leading-tight">
          Route: POST /api/final-video/render-and-save · episodeSlug: {episodeSlug}
        </p>
      </div>

    </div>
  );
}
