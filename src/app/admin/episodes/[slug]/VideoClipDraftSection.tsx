"use client";

import { useState } from "react";
import { ALLOWED_VIDEO_STYLES, type VideoClipRequestStyle, type VideoClipGenerationPackage } from "@/lib/videoClipGenerationTypes";
import type { EpisodeVideoGenerationReadiness } from "@/lib/videoGenerationTypes";
import VideoClipFidelityReviewSection, { type SceneReviewData } from "./VideoClipFidelityReviewSection";

// ─── Props ────────────────────────────────────────────────────────────────────

export type SceneVideoOption = {
  sceneNumber: number;
  sceneId: string;
  title: string;
  animationPrompt: string;
  hasAnimationPrompt: boolean;
  hasCharacterReferences: boolean;
  approvedReferenceCount: number;
};

type Props = {
  episodeSlug: string;
  providerConfigured: boolean;
  providerLabel: string;
  sceneOptions: SceneVideoOption[];
  videoReadiness: EpisodeVideoGenerationReadiness;
  sceneReviewData: Record<number, SceneReviewData>;
};

// ─── Result types ─────────────────────────────────────────────────────────────

type DraftResult =
  | {
      ok: false;
      status: "not_implemented_yet";
      message: string;
      provider: string;
      videoGenerationPackage: VideoClipGenerationPackage;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: true;
      status: "video_draft_generated";
      provider: string;
      modelId: string;
      videoStyle: string;
      durationSeconds: number;
      draft: { id: string; videoUrl: string; thumbnailUrl: string | null; providerJobId: string; mimeType: string };
      referenceMode: string;
      videoGenerationPackage: VideoClipGenerationPackage;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: true;
      status: "video_draft_requested";
      provider: string;
      providerJobId: string;
      message: string;
      notes: string[];
    }
  | {
      ok: false;
      status: "validation_error" | "setup_required" | "episode_not_found" | "scene_not_found" | "provider_error" | "provider_timeout";
      message: string;
      provider?: string;
      missing?: string[];
      providerMessage?: string;
      troubleshooting?: string[];
    };

// ─── Video style labels ───────────────────────────────────────────────────────

const VIDEO_STYLE_LABELS: Record<VideoClipRequestStyle, string> = {
  "storybook-cartoon":  "Storybook Cartoon",
  "gentle-animation":   "Gentle Animation",
  "playful-short":      "Playful Short",
  "classroom-friendly": "Classroom Friendly",
  "cinematic-soft":     "Cinematic Soft",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PackageSummary({
  pkg,
  notes,
  warnings,
  provider,
}: {
  pkg: VideoClipGenerationPackage;
  notes: string[];
  warnings: string[];
  provider: string;
}) {
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      {/* Provider + not_implemented_yet note */}
      <div className="bg-pineapple-yellow/12 border border-pineapple-yellow/40 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          Package Prepared — No Video Generated
        </p>
        <p className="text-xs text-tiki-brown/70 leading-relaxed">
          Provider <strong className="text-tiki-brown">{provider}</strong> is configured, but actual video generation
          integration is not active yet. The generation package is ready for when provider execution is implemented.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Scene", value: pkg.sceneNumber ? `#${pkg.sceneNumber}` : "—" },
          { label: "Duration", value: `${pkg.durationSeconds}s` },
          { label: "Style", value: VIDEO_STYLE_LABELS[pkg.videoStyle] ?? pkg.videoStyle },
          { label: "Ref Mode", value: pkg.referenceMode === "reference-ready" ? "With refs" : "Prompt only" },
          { label: "Ref Images", value: String(pkg.referenceImages.length) },
          { label: "Characters", value: String(pkg.characters.length) },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center bg-white border border-tiki-brown/8 rounded-xl px-3 py-2 min-w-[72px]"
          >
            <span className="text-sm font-black text-tiki-brown">{value}</span>
            <span className="text-xs text-tiki-brown/45 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Reference images */}
      {pkg.referenceImages.length > 0 && (
        <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-3 py-2.5 flex flex-col gap-1">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Reference Images Selected ({pkg.referenceImages.length})
          </p>
          {pkg.referenceImages.map((img, i) => (
            <p key={i} className="text-xs text-tiki-brown/60">
              <span className="font-semibold">{img.characterName}</span>:{" "}
              {img.role} ({img.assetType})
            </p>
          ))}
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5 flex flex-col gap-1">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">Warnings</p>
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-tiki-brown/60 leading-snug">
              <span className="text-pineapple-yellow font-bold">▲</span> {w}
            </p>
          ))}
        </div>
      )}

      {/* Notes */}
      {notes.length > 0 && (
        <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-3 py-2.5 flex flex-col gap-1">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">Notes</p>
          {notes.map((n, i) => (
            <p key={i} className="text-xs text-tiki-brown/60 leading-snug">• {n}</p>
          ))}
        </div>
      )}

      {/* Prompt preview toggle */}
      <button
        type="button"
        onClick={() => setShowPrompt((p) => !p)}
        className="text-xs font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors text-left"
      >
        {showPrompt ? "▲ Hide prompt preview" : "▼ Show final prompt preview"}
      </button>
      {showPrompt && (
        <pre className="text-xs text-tiki-brown/65 bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl p-3 whitespace-pre-wrap overflow-x-auto max-h-96 leading-relaxed">
          {pkg.finalPromptText}
        </pre>
      )}
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function VideoClipDraftSection({
  episodeSlug,
  providerConfigured,
  providerLabel,
  sceneOptions,
  videoReadiness,
  sceneReviewData,
}: Props) {
  const [selectedSceneNumber, setSelectedSceneNumber] = useState<number | "">(
    sceneOptions.length > 0 ? sceneOptions[0].sceneNumber : ""
  );
  const [durationSeconds, setDurationSeconds] = useState(6);
  const [videoStyle, setVideoStyle] = useState<VideoClipRequestStyle>("storybook-cartoon");
  const [promptText, setPromptText] = useState(() => {
    if (sceneOptions.length > 0) return sceneOptions[0].animationPrompt;
    return "";
  });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<DraftResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const selectedScene = sceneOptions.find((s) => s.sceneNumber === selectedSceneNumber);

  function handleSceneChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const num = Number(e.target.value);
    setSelectedSceneNumber(num || "");
    const scene = sceneOptions.find((s) => s.sceneNumber === num);
    if (scene) setPromptText(scene.animationPrompt);
    setResult(null);
    setFetchError(null);
  }

  const canGenerate =
    providerConfigured &&
    selectedSceneNumber !== "" &&
    !running;

  async function handleGenerate() {
    if (!canGenerate) return;
    setRunning(true);
    setResult(null);
    setFetchError(null);

    try {
      const body: Record<string, unknown> = {
        episodeSlug,
        sceneNumber: selectedSceneNumber,
        durationSeconds,
        videoStyle,
      };
      if (promptText.trim()) body.promptText = promptText.trim();

      const res = await fetch("/api/video-generation/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as DraftResult;
      setResult(data);
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "Failed to reach the server."
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎬</span>
          <h2 className="text-base font-black text-tiki-brown">Temporary Video Clip Draft</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Prepare a temporary video draft for an episode scene. No video is saved, uploaded, or published
          from this step — this is for admin review and generation package preparation only.
        </p>
      </div>

      {/* Provider status */}
      <div className={`rounded-2xl border px-4 py-3 flex items-center gap-3 ${
        providerConfigured
          ? "bg-tropical-green/8 border-tropical-green/25"
          : "bg-warm-coral/8 border-warm-coral/25"
      }`}>
        <span
          className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
            providerConfigured ? "bg-tropical-green" : "bg-warm-coral"
          }`}
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold text-tiki-brown/70">
            Video Provider:{" "}
            <span className={`font-black ${providerConfigured ? "text-tropical-green" : "text-warm-coral"}`}>
              {providerLabel}
            </span>
          </span>
          {!providerConfigured && (
            <span className="text-xs text-tiki-brown/50">
              Set VIDEO_GENERATION_PROVIDER and the matching API key to enable generation.
            </span>
          )}
          {providerConfigured && (
            <span className="text-xs text-tiki-brown/50">
              Configured — temporary draft generation is active.
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4">

        {/* Scene selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Scene
          </label>
          {sceneOptions.length === 0 ? (
            <p className="text-xs text-warm-coral">No active scenes found for this episode.</p>
          ) : (
            <select
              value={selectedSceneNumber}
              onChange={handleSceneChange}
              className="w-full bg-tiki-brown/3 border border-tiki-brown/12 rounded-xl px-3 py-2 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30"
            >
              {sceneOptions.map((s) => (
                <option key={s.sceneNumber} value={s.sceneNumber}>
                  Scene {s.sceneNumber}{s.title ? ` — ${s.title}` : ""}{" "}
                  {s.hasCharacterReferences ? `(${s.approvedReferenceCount} refs)` : "(no refs)"}
                </option>
              ))}
            </select>
          )}
          {selectedScene && (
            <p className="text-xs text-tiki-brown/45">
              {selectedScene.hasAnimationPrompt
                ? "Has animation prompt"
                : "No animation prompt — using scene summary"}
              {selectedScene.hasCharacterReferences
                ? ` · ${selectedScene.approvedReferenceCount} approved reference asset${selectedScene.approvedReferenceCount !== 1 ? "s" : ""}`
                : " · No approved character references"}
            </p>
          )}
        </div>

        {/* Duration + style row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
              Duration (seconds)
            </label>
            <input
              type="number"
              min={3}
              max={15}
              step={1}
              value={durationSeconds}
              onChange={(e) => setDurationSeconds(Math.min(15, Math.max(3, Number(e.target.value) || 6)))}
              className="bg-tiki-brown/3 border border-tiki-brown/12 rounded-xl px-3 py-2 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
              Video Style
            </label>
            <select
              value={videoStyle}
              onChange={(e) => setVideoStyle(e.target.value as VideoClipRequestStyle)}
              className="bg-tiki-brown/3 border border-tiki-brown/12 rounded-xl px-3 py-2 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30"
            >
              {ALLOWED_VIDEO_STYLES.map((s) => (
                <option key={s} value={s}>
                  {VIDEO_STYLE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt override textarea */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Prompt Override{" "}
            <span className="text-tiki-brown/35 font-normal normal-case tracking-normal">
              (optional — leave blank to use auto-generated prompt)
            </span>
          </label>
          <textarea
            rows={4}
            maxLength={4000}
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="Leave blank to use the auto-generated scene animation prompt."
            className="w-full bg-tiki-brown/3 border border-tiki-brown/12 rounded-xl px-3 py-2 text-sm text-tiki-brown/80 placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 resize-y"
          />
          <p className="text-xs text-tiki-brown/35">{promptText.length}/4000 characters</p>
        </div>

        {/* Episode readiness hints */}
        {(videoReadiness.blockers.length > 0 || videoReadiness.warnings.length > 0) && (
          <div className="flex flex-col gap-1.5">
            {videoReadiness.blockers.map((b, i) => (
              <p key={i} className="text-xs text-warm-coral leading-snug">
                <span className="font-bold">✗</span> {b}
              </p>
            ))}
            {videoReadiness.warnings.map((w, i) => (
              <p key={i} className="text-xs text-tiki-brown/55 leading-snug">
                <span className="text-pineapple-yellow font-bold">▲</span> {w}
              </p>
            ))}
          </div>
        )}

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`w-full rounded-2xl py-3 px-4 text-sm font-black uppercase tracking-wide transition-colors ${
            canGenerate
              ? "bg-ube-purple text-white hover:bg-ube-purple/85 active:bg-ube-purple/70"
              : "bg-tiki-brown/8 text-tiki-brown/30 cursor-not-allowed"
          }`}
        >
          {running ? "Generating — this may take 1-2 min…" : "Generate Temporary Video Draft"}
        </button>

        {!providerConfigured && (
          <p className="text-xs text-warm-coral text-center">
            Video provider is not configured. Set up VIDEO_GENERATION_PROVIDER and the matching API key.
          </p>
        )}
      </div>

      {/* Fetch error */}
      {fetchError && (
        <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-1">Request Error</p>
          <p className="text-xs text-tiki-brown/65">{fetchError}</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="flex flex-col gap-3">

          {/* Generic error results (validation, setup, not found) */}
          {!result.ok && result.status !== "not_implemented_yet" &&
            result.status !== "provider_error" && result.status !== "provider_timeout" && (
            <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide mb-1">
                {result.status.replace(/_/g, " ")}
              </p>
              <p className="text-xs text-tiki-brown/65">{result.message}</p>
              {"missing" in result && Array.isArray(result.missing) && result.missing.length > 0 && (
                <div className="mt-2 flex flex-col gap-0.5">
                  {result.missing.map((v, i) => (
                    <p key={i} className="text-xs font-mono text-tiki-brown/55">{v}=</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Provider error */}
          {!result.ok && (result.status === "provider_error" || result.status === "provider_timeout") && (
            <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-2">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                {result.status === "provider_timeout" ? "Generation Timed Out" : "Provider Error"}
              </p>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">{result.message}</p>
              {"providerMessage" in result && result.providerMessage && (
                <p className="text-xs font-mono text-tiki-brown/55 bg-tiki-brown/3 rounded-lg px-2 py-1">
                  {result.providerMessage}
                </p>
              )}
              {"troubleshooting" in result && Array.isArray(result.troubleshooting) && result.troubleshooting.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-1">
                  <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">Troubleshooting</p>
                  {result.troubleshooting.map((t, i) => (
                    <p key={i} className="text-xs text-tiki-brown/60 leading-snug">• {t}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* not_implemented_yet — show package summary */}
          {!result.ok && result.status === "not_implemented_yet" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
                  Package Ready
                </span>
                <span className="text-xs text-tiki-brown/50">Provider execution not yet active</span>
              </div>
              <PackageSummary
                pkg={result.videoGenerationPackage}
                notes={result.notes}
                warnings={result.warnings}
                provider={result.provider}
              />
            </div>
          )}

          {/* Job accepted — polling not yet implemented */}
          {result.ok && result.status === "video_draft_requested" && (
            <div className="bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-3 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
                  Generation Requested
                </span>
                <span className="text-xs text-tiki-brown/50">Job accepted — no URL yet</span>
              </div>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">{result.message}</p>
              <p className="text-xs font-mono text-tiki-brown/55 bg-tiki-brown/3 rounded-lg px-2 py-1 break-all">
                Job ID: {result.providerJobId}
              </p>
              {result.notes.map((n, i) => (
                <p key={i} className="text-xs text-tiki-brown/55 leading-snug">• {n}</p>
              ))}
            </div>
          )}

          {/* Successful video draft */}
          {result.ok && result.status === "video_draft_generated" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green uppercase tracking-wide">
                  Video Draft Generated
                </span>
                <span className="text-xs text-tiki-brown/50">Temporary — not saved or public</span>
                <span className="text-xs text-tiki-brown/40">Provider: {result.provider} · Model: {result.modelId}</span>
              </div>
              <video
                src={result.draft.videoUrl}
                controls
                className="w-full rounded-2xl border border-tiki-brown/10 max-h-64 bg-black"
                aria-label="Temporary video draft preview"
              >
                Your browser does not support video playback.
              </video>
              <PackageSummary
                pkg={result.videoGenerationPackage}
                notes={result.notes}
                warnings={result.warnings}
                provider={result.provider}
              />
            </div>
          )}

        </div>
      )}

      {/* Fidelity review — shown whenever a package or video result is available */}
      {result && selectedSceneNumber !== "" && (() => {
        const reviewData = sceneReviewData[selectedSceneNumber as number];
        if (!reviewData) return null;

        let draftInfo:
          | { kind: "not_implemented_yet"; provider: string; pkg: VideoClipGenerationPackage }
          | { kind: "video_draft_generated"; videoUrl: string; thumbnailUrl: string | null; providerJobId: string; modelId: string; provider: string; videoStyle: string; durationSeconds: number; pkg: VideoClipGenerationPackage }
          | { kind: "video_draft_requested"; providerJobId: string; provider: string; pkg: VideoClipGenerationPackage }
          | null = null;

        if (!result.ok && result.status === "not_implemented_yet") {
          draftInfo = { kind: "not_implemented_yet", provider: result.provider, pkg: result.videoGenerationPackage };
        } else if (result.ok && result.status === "video_draft_generated") {
          draftInfo = {
            kind: "video_draft_generated",
            videoUrl: result.draft.videoUrl,
            thumbnailUrl: result.draft.thumbnailUrl,
            providerJobId: result.draft.providerJobId,
            modelId: result.modelId,
            provider: result.provider,
            videoStyle: result.videoStyle,
            durationSeconds: result.durationSeconds,
            pkg: result.videoGenerationPackage,
          };
        } else if (result.ok && result.status === "video_draft_requested") {
          // No pkg available for job-only result — fidelity review not shown
          return null;
        }

        if (!draftInfo) return null;
        return (
          <VideoClipFidelityReviewSection
            reviewData={reviewData}
            draft={draftInfo}
          />
        );
      })()}

    </div>
  );
}
