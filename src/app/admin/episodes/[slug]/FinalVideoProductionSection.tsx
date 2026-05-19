"use client";

// Admin-only final video production section.
// Phase 15E — One-Click Render & Save Final Video.
// Active render button with progress states and success video player.

import { useState, useCallback } from "react";
import type { FinalVideoAssemblyPackage, FinalVideoAssemblyStatus } from "@/lib/finalVideoTypes";
import type { FinalVideoAsset } from "@/lib/finalVideoAssetTypes";
import {
  buildFinalVideoProductionPlan,
  getFinalVideoFutureActionSummary,
} from "@/lib/finalVideoProductionPlan";

// ─── Types ────────────────────────────────────────────────────────────────────

type RenderPhase = "idle" | "rendering" | "done" | "error";

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

// ─── Saved video display ──────────────────────────────────────────────────────

function FinalVideoDisplay({ video, isNew = false }: { video: FinalVideoAsset; isNew?: boolean }) {
  const sizeMB = video.sizeBytes
    ? Math.round((video.sizeBytes / 1024 / 1024) * 10) / 10
    : null;
  const durationMin = video.durationSeconds ? Math.floor(video.durationSeconds / 60) : null;
  const durationSec = video.durationSeconds ? video.durationSeconds % 60 : null;
  const duration =
    durationMin !== null && durationSec !== null
      ? durationMin > 0
        ? `${durationMin}m ${durationSec}s`
        : `${durationSec}s`
      : null;

  return (
    <div
      className={[
        "flex flex-col gap-3 rounded-2xl px-4 py-4",
        isNew
          ? "bg-tropical-green/5 border border-tropical-green/20"
          : "bg-tiki-brown/3 border border-tiki-brown/10",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          {isNew ? "Final Video Saved" : "Existing Final Video"}
        </span>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50">
          Attached to Episode
        </span>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/10 text-warm-coral/80">
          Admin Only
        </span>
      </div>

      {/* Video player */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={video.url}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-xl bg-black aspect-video"
      />

      {/* Metadata */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-tiki-brown/55">
        {duration && <span>Duration: {duration}</span>}
        {sizeMB !== null && <span>Size: {sizeMB} MB</span>}
        {video.width && video.height && (
          <span>
            Resolution: {video.width}×{video.height}
          </span>
        )}
        {video.fps && <span>FPS: {video.fps}</span>}
        {video.renderEngine && <span>Engine: {video.renderEngine}</span>}
        {video.createdAt && (
          <span>Rendered: {new Date(video.createdAt).toLocaleString()}</span>
        )}
      </div>

      {isNew && (
        <p className="text-xs text-tiki-brown/45 leading-relaxed">
          Next phase will add final video public-ready controls.
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  pkg: FinalVideoAssemblyPackage;
  episodeSlug: string;
  initialFinalVideo?: FinalVideoAsset | null;
};

const BUTTON_LABEL: Record<RenderPhase, string> = {
  idle: "Render & Save Final Video",
  rendering: "Rendering…",
  done: "Render & Save Final Video",
  error: "Retry Render",
};

export default function FinalVideoProductionSection({
  pkg,
  episodeSlug,
  initialFinalVideo,
}: Props) {
  const plan = buildFinalVideoProductionPlan(pkg);
  const actionSummary = getFinalVideoFutureActionSummary(plan);

  const [phase, setPhase] = useState<RenderPhase>("idle");
  const [savedVideo, setSavedVideo] = useState<FinalVideoAsset | null>(
    initialFinalVideo ?? null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [renderWarnings, setRenderWarnings] = useState<string[]>([]);

  const isRendering = phase === "rendering";
  const canRender = plan.canRenderAndSave && !isRendering;

  const handleRender = useCallback(async () => {
    if (!canRender) return;
    setPhase("rendering");
    setErrorMessage(null);
    setRenderWarnings([]);

    try {
      const res = await fetch("/api/final-video/render-and-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug }),
      });

      const data = (await res.json()) as Record<string, unknown>;

      if (!data.ok) {
        setErrorMessage(
          typeof data.message === "string" ? data.message : "Rendering failed."
        );
        setPhase("error");
        return;
      }

      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        setRenderWarnings(
          data.warnings.filter((w): w is string => typeof w === "string")
        );
      }
      setSavedVideo(data.finalVideo as FinalVideoAsset);
      setPhase("done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Network error. Please try again."
      );
      setPhase("error");
    }
  }, [canRender, episodeSlug]);

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎞️</span>
          <h2 className="text-base font-black text-tiki-brown">Final Video Production</h2>
          <StatusBadge status={plan.status} />
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          One-click final video render using the approved media already in this episode.
        </p>
      </div>

      {/* No extra approval note */}
      <div className="flex items-start gap-3 bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-4 py-3">
        <span className="text-base flex-shrink-0">✓</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          The final video uses media that has already been reviewed in the{" "}
          <a href="#picture-panels" className="text-ube-purple font-semibold hover:underline">
            Picture Panels
          </a>
          ,{" "}
          <a href="#audio-story" className="text-ube-purple font-semibold hover:underline">
            Audio Story
          </a>
          , and{" "}
          <a href="#animated-clips" className="text-ube-purple font-semibold hover:underline">
            Animated Clips
          </a>{" "}
          sections. No separate approval loop required.
        </p>
      </div>

      {/* Action summary */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-3">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">
          What Will Be Rendered
        </p>
        <p className="text-sm text-tiki-brown/70">{actionSummary}</p>
      </div>

      {/* Blockers */}
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

      {/* Pre-render warnings */}
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

      {/* Post-render warnings */}
      {renderWarnings.length > 0 && (
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            Render Warnings
          </p>
          {renderWarnings.map((w, i) => (
            <p key={i} className="text-xs text-tiki-brown/65 leading-snug flex items-start gap-1.5">
              <span className="flex-shrink-0 text-pineapple-yellow mt-0.5">⚠</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Error */}
      {phase === "error" && errorMessage && (
        <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-1">
            Render Failed
          </p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Saved video */}
      {savedVideo && <FinalVideoDisplay video={savedVideo} isNew={phase === "done"} />}

      {/* Action button */}
      <div className="border-t border-tiki-brown/8 pt-4 flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            disabled={!canRender}
            onClick={handleRender}
            className={[
              "flex-1 rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide border min-w-[200px] transition-colors",
              canRender
                ? "bg-ube-purple text-white border-ube-purple/30 hover:bg-ube-purple/90 cursor-pointer"
                : isRendering
                ? "bg-tiki-brown/6 text-tiki-brown/40 border-tiki-brown/10 cursor-wait"
                : "bg-tiki-brown/6 text-tiki-brown/30 border-tiki-brown/10 cursor-not-allowed",
            ].join(" ")}
            title={plan.disabledReason}
          >
            {BUTTON_LABEL[phase]}
          </button>

          {isRendering && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple/8 border border-ube-purple/15 text-ube-purple/60 uppercase tracking-wide flex-shrink-0 animate-pulse">
              Working…
            </span>
          )}
          {phase === "done" && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-tropical-green/10 border border-tropical-green/20 text-tropical-green uppercase tracking-wide flex-shrink-0">
              Saved
            </span>
          )}
        </div>

        {isRendering && (
          <p className="text-xs text-tiki-brown/45 leading-relaxed">
            Rendering may take up to 3 minutes. Please keep this page open.
          </p>
        )}
        {plan.disabledReason && !isRendering && (
          <p className="text-xs text-tiki-brown/35 leading-relaxed">{plan.disabledReason}</p>
        )}
        <p className="text-xs text-tiki-brown/30 font-mono leading-tight">
          POST /api/final-video/render-and-save · episodeSlug: {episodeSlug}
        </p>
      </div>

    </div>
  );
}
