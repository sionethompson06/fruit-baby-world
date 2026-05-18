import type { VideoProviderStatus } from "@/lib/videoGenerationTypes";
import type { EpisodeVideoGenerationReadiness } from "@/lib/videoGenerationTypes";

// ─── Status indicator ─────────────────────────────────────────────────────────

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${
        ok ? "bg-tropical-green" : "bg-warm-coral"
      }`}
    />
  );
}

function StatusRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <StatusDot ok={ok} />
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={`text-xs font-semibold ${
            ok ? "text-tiki-brown/70" : "text-tiki-brown/80"
          }`}
        >
          {label}:{" "}
          <span
            className={`font-black ${ok ? "text-tropical-green" : "text-warm-coral"}`}
          >
            {ok ? "Yes" : "No"}
          </span>
        </span>
        {detail && (
          <span className="text-xs text-tiki-brown/45 leading-relaxed">{detail}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function VideoGenerationSetupSection({
  providerStatus,
  readiness,
}: {
  providerStatus: VideoProviderStatus;
  readiness: EpisodeVideoGenerationReadiness;
}) {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎬</span>
          <h2 className="text-base font-black text-tiki-brown">Video Generation Setup</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Setup Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Video generation is not active in this phase. This section confirms whether the app has
          the provider configuration and scene animation context needed for future video clip drafts.
        </p>
      </div>

      {/* Provider section */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Video Provider
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-tiki-brown">{providerStatus.providerLabel}</span>
          {providerStatus.configured ? (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green">
              Configured
            </span>
          ) : (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral">
              Not Configured
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <StatusRow
            label="Provider selected"
            ok={providerStatus.provider !== "none"}
            detail={
              providerStatus.provider === "none"
                ? "Set VIDEO_GENERATION_PROVIDER in your .env.local file. Supported: runway, luma, fal, replicate."
                : undefined
            }
          />
          <StatusRow
            label="API key configured"
            ok={providerStatus.configured}
            detail={
              !providerStatus.configured && providerStatus.provider !== "none"
                ? `Set the API key for ${providerStatus.providerLabel} in your .env.local file.`
                : undefined
            }
          />
          <StatusRow
            label="Model ID configured"
            ok={providerStatus.modelIdConfigured}
            detail={
              !providerStatus.modelIdConfigured
                ? "Set VIDEO_GENERATION_MODEL_ID (optional, will use provider default in next phase)."
                : undefined
            }
          />
        </div>

        {providerStatus.missing.length > 0 && (
          <div className="flex flex-col gap-1 bg-warm-coral/6 border border-warm-coral/20 rounded-xl px-3 py-2.5">
            <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
              Missing environment variables
            </p>
            {providerStatus.missing.map((v) => (
              <p key={v} className="text-xs font-mono text-tiki-brown/60">
                {v}=
              </p>
            ))}
            <p className="text-xs text-tiki-brown/45 mt-0.5">
              Add these to your .env.local file. Never commit real secrets.
            </p>
          </div>
        )}
      </div>

      {/* Scene readiness */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Scene Animation Readiness
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Active Scenes",
              value: String(readiness.activeScenes),
              accent: "text-tiki-brown",
            },
            {
              label: "With Prompt",
              value: String(readiness.scenesWithAnimationPrompt),
              accent:
                readiness.scenesWithAnimationPrompt === readiness.activeScenes &&
                readiness.activeScenes > 0
                  ? "text-tropical-green"
                  : readiness.scenesWithAnimationPrompt > 0
                  ? "text-pineapple-yellow"
                  : "text-warm-coral",
            },
            {
              label: "With Refs",
              value: String(readiness.scenesWithCharacterReferences),
              accent:
                readiness.scenesWithCharacterReferences === readiness.activeScenes &&
                readiness.activeScenes > 0
                  ? "text-tropical-green"
                  : readiness.scenesWithCharacterReferences > 0
                  ? "text-pineapple-yellow"
                  : "text-warm-coral",
            },
            {
              label: "Ref Assets",
              value: String(readiness.totalApprovedReferenceAssets),
              accent:
                readiness.totalApprovedReferenceAssets > 0
                  ? "text-tropical-green"
                  : "text-warm-coral",
            },
          ].map(({ label, value, accent }) => (
            <div
              key={label}
              className="flex flex-col items-center bg-white border border-tiki-brown/8 rounded-xl px-3 py-2 min-w-[72px]"
            >
              <span className={`text-lg font-black ${accent}`}>{value}</span>
              <span className="text-xs text-tiki-brown/45 text-center leading-tight">{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <StatusRow
            label="Animation prompts available"
            ok={readiness.scenesWithAnimationPrompt > 0}
            detail={
              readiness.scenesWithAnimationPrompt === 0
                ? "Add animationPromptDraft or actionNotes to scenes for use in video generation."
                : `${readiness.scenesWithAnimationPrompt} of ${readiness.activeScenes} scenes have animation prompts.`
            }
          />
          <StatusRow
            label="Character references available"
            ok={readiness.scenesWithCharacterReferences > 0}
            detail={
              readiness.scenesWithCharacterReferences === 0
                ? "No approved character reference assets found. Upload references for better brand fidelity."
                : `${readiness.scenesWithCharacterReferences} of ${readiness.activeScenes} scenes have character references.`
            }
          />
        </div>

        {/* Blockers */}
        {readiness.blockers.length > 0 && (
          <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-3 py-2.5 flex flex-col gap-1">
            <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
              Blockers
            </p>
            {readiness.blockers.map((b) => (
              <p key={b} className="text-xs text-tiki-brown/65 leading-snug">
                <span className="text-warm-coral font-bold">✗</span> {b}
              </p>
            ))}
          </div>
        )}

        {/* Warnings */}
        {readiness.warnings.length > 0 && (
          <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5 flex flex-col gap-1">
            <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
              Warnings
            </p>
            {readiness.warnings.map((w) => (
              <p key={w} className="text-xs text-tiki-brown/60 leading-snug">
                <span className="text-pineapple-yellow font-bold">▲</span> {w}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Future workflow preview */}
      <div className="bg-ube-purple/6 border border-ube-purple/15 rounded-2xl px-4 py-3 flex flex-col gap-2">
        <p className="text-xs font-bold text-ube-purple/70 uppercase tracking-wide">
          Upcoming Video Workflow
        </p>
        <ol className="flex flex-col gap-1.5">
          {[
            ["14B", "Generate video clip draft from animation prompt"],
            ["14C", "Admin video review"],
            ["14D", "Upload & save approved video to storage"],
            ["14E", "Attach video metadata to episode"],
            ["14F", "Public video story player"],
          ].map(([phase, label]) => (
            <li key={phase} className="flex items-start gap-2 text-xs text-tiki-brown/55">
              <span className="font-bold text-ube-purple/50 flex-shrink-0 w-8">{phase}</span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
        <p className="text-xs text-tiki-brown/40 mt-1 leading-relaxed">
          No video is generated, saved, or published until approved through the full admin review workflow.
        </p>
      </div>

    </div>
  );
}
