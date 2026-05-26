// Admin-only final video render readiness section.
// Display only — no rendering, no saving, no publishing.

import type { FinalVideoAssemblyPackage, FinalVideoAssemblyStatus } from "@/lib/finalVideoTypes";
import {
  buildFinalVideoRenderReadiness,
  getFutureRenderPlan,
  type RenderIngredient,
  type RenderIngredientStatus,
} from "@/lib/finalVideoRenderReadiness";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: FinalVideoAssemblyStatus }) {
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

// ─── Ingredient row ───────────────────────────────────────────────────────────

function ingredientDotClass(status: RenderIngredientStatus): string {
  if (status === "ready") return "bg-tropical-green";
  if (status === "needs-work") return "bg-pineapple-yellow";
  if (status === "missing") return "bg-warm-coral";
  return "bg-tiki-brown/20";
}

function ingredientLabelClass(status: RenderIngredientStatus): string {
  if (status === "ready") return "text-tropical-green";
  if (status === "needs-work") return "text-pineapple-yellow/80";
  if (status === "missing") return "text-warm-coral";
  return "text-tiki-brown/40";
}

function ingredientStatusLabel(status: RenderIngredientStatus): string {
  if (status === "ready") return "Ready";
  if (status === "needs-work") return "Needs Work";
  if (status === "missing") return "Missing";
  return "Optional";
}

function IngredientRow({ ingredient }: { ingredient: RenderIngredient }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-tiki-brown/6 last:border-0">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${ingredientDotClass(ingredient.status)}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-xs font-bold text-tiki-brown/70">{ingredient.label}</span>
          {!ingredient.required && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-tiki-brown/6 text-tiki-brown/40 uppercase tracking-wide">
              {ingredient.label === "Animated Clips" ? "Optional" : "Recommended"}
            </span>
          )}
          <span className={`text-xs font-bold ml-auto ${ingredientLabelClass(ingredient.status)}`}>
            {ingredientStatusLabel(ingredient.status)}
          </span>
        </div>
        <p className="text-xs text-tiki-brown/55 leading-snug">{ingredient.message}</p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  pkg: FinalVideoAssemblyPackage;
};

export default function FinalVideoRenderReadinessSection({ pkg }: Props) {
  const readiness = buildFinalVideoRenderReadiness(pkg);
  const renderPlan = getFutureRenderPlan(pkg);

  const durationMin = Math.floor(readiness.summary.estimatedDurationSeconds / 60);
  const durationSec = readiness.summary.estimatedDurationSeconds % 60;
  const durationLabel = durationMin > 0
    ? `~${durationMin}m ${durationSec}s`
    : `~${readiness.summary.estimatedDurationSeconds}s`;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">✅</span>
          <h2 className="text-base font-black text-tiki-brown">Final Video Render Readiness</h2>
          <StatusBadge status={readiness.status} />
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Planning Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Confirm this episode has the media needed for a future one-click final video render.
        </p>
      </div>

      {/* Simplified workflow note */}
      <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-2xl px-4 py-3">
        <span className="text-base flex-shrink-0">💡</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          The final video will not need a separate approval loop. It will use media already reviewed
          and marked ready in the story, audio, and video sections.
        </p>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-tiki-brown/55 bg-tiki-brown/3 rounded-2xl px-4 py-3 border border-tiki-brown/8">
        <span><strong className="text-tiki-brown/70">{readiness.summary.totalSegments}</strong> scenes</span>
        <span><strong className="text-tiki-brown/70">{durationLabel}</strong> estimated</span>
        <span className={readiness.summary.animatedClipSegments > 0 ? "text-sky-blue font-semibold" : ""}>
          {readiness.summary.animatedClipSegments} animated
        </span>
        <span className={readiness.summary.storyPanelSegments > 0 ? "text-ube-purple font-semibold" : ""}>
          {readiness.summary.storyPanelSegments} panels
        </span>
        {readiness.summary.textOnlySegments > 0 && (
          <span className="text-warm-coral font-semibold">
            {readiness.summary.textOnlySegments} text-only
          </span>
        )}
        <span className={readiness.summary.hasPublicReadyNarration ? "text-tropical-green font-semibold" : "text-warm-coral/70"}>
          {readiness.summary.hasPublicReadyNarration ? "Narration ready" : "No narration"}
        </span>
      </div>

      {/* Render ingredient checklist */}
      <div className="flex flex-col">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-2">
          Render Ingredients
        </p>
        <div className="border border-tiki-brown/8 rounded-2xl px-4 divide-y divide-tiki-brown/6">
          {readiness.renderIngredients.map((ingredient) => (
            <IngredientRow key={ingredient.label} ingredient={ingredient} />
          ))}
        </div>
      </div>

      {/* Blockers */}
      {readiness.blockers.length > 0 && (
        <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
            Blockers — resolve before rendering
          </p>
          {readiness.blockers.map((b, i) => (
            <p key={i} className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5">
              <span className="flex-shrink-0 text-warm-coral font-black mt-0.5">✕</span>
              {b}
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {readiness.warnings.length > 0 && (
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Warnings</p>
          {readiness.warnings.map((w, i) => (
            <p key={i} className="text-xs text-tiki-brown/65 leading-snug flex items-start gap-1.5">
              <span className="flex-shrink-0 text-pineapple-yellow mt-0.5">⚠</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Next actions */}
      {readiness.nextActions.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Next Actions</p>
          <div className="flex flex-col gap-1">
            {readiness.nextActions.map((action, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-ube-purple flex-shrink-0 font-black mt-0.5 text-xs">→</span>
                <p className="text-xs text-tiki-brown/70 leading-snug">{action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links to fix areas */}
      {readiness.status !== "ready" && (
        <div className="flex flex-wrap gap-2">
          <p className="text-xs text-tiki-brown/40 w-full">Jump to:</p>
          <a href="#legacy-tools" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/5 border border-tiki-brown/10 text-ube-purple hover:bg-tiki-brown/10 transition-colors">
            Picture Panels
          </a>
          <a href="#audio" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/5 border border-tiki-brown/10 text-ube-purple hover:bg-tiki-brown/10 transition-colors">
            Audio
          </a>
          <a href="#video" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/5 border border-tiki-brown/10 text-ube-purple hover:bg-tiki-brown/10 transition-colors">
            Video
          </a>
          <a href="#publish-readiness" className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/5 border border-tiki-brown/10 text-ube-purple hover:bg-tiki-brown/10 transition-colors">
            Publish Readiness
          </a>
        </div>
      )}

      {/* Future render plan */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-4 flex flex-col gap-2">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          Future One-Click Render Plan
        </p>
        <div className="flex flex-col gap-1">
          {renderPlan.map((step, i) => (
            <p key={i} className="text-xs text-tiki-brown/55 leading-snug flex items-start gap-2">
              <span className="text-tiki-brown/30 flex-shrink-0 tabular-nums">{i + 1}.</span>
              {step}
            </p>
          ))}
        </div>
      </div>

      {/* Disabled future button */}
      <div className="border-t border-tiki-brown/8 pt-4">
        <button
          type="button"
          disabled
          className="w-full rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide bg-tiki-brown/6 text-tiki-brown/30 cursor-not-allowed border border-tiki-brown/10"
          title="Final video rendering is not yet available"
        >
          Render &amp; Save Final Video — Coming in a Future Phase
        </button>
        <p className="text-xs text-tiki-brown/35 text-center mt-2 leading-relaxed">
          One-click rendering, saving, and publishing come in a later phase. No separate approval loop required.
        </p>
      </div>

    </div>
  );
}
