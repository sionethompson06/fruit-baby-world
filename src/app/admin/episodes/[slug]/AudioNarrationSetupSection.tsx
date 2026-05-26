import type { NarrationProviderStatus, NarrationReadiness } from "@/lib/audioNarrationTypes";

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

export default function AudioNarrationSetupSection({
  providerStatus,
  readiness,
}: {
  providerStatus: NarrationProviderStatus;
  readiness: NarrationReadiness;
}) {
  const providerLabel =
    providerStatus.provider === "elevenlabs"
      ? "ElevenLabs"
      : providerStatus.provider === "openai-tts"
      ? "OpenAI TTS"
      : "None";

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎙️</span>
          <h2 className="text-base font-black text-tiki-brown">Audio Narration Production</h2>
          {providerStatus.configured ? (
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green uppercase tracking-wide">
              Provider Ready
            </span>
          ) : (
            <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral uppercase tracking-wide">
              Setup Required
            </span>
          )}
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Generate, review, upload, and attach approved narration audio for this episode.
        </p>
        {!providerStatus.configured && (
          <p className="text-xs text-warm-coral mt-1.5 leading-relaxed">
            Audio provider is not fully configured. Add ElevenLabs environment variables to enable narration generation.
          </p>
        )}
      </div>

      {/* Provider section */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Provider Status
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-black text-tiki-brown">{providerLabel}</span>
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
            label="API key configured"
            ok={providerStatus.configured}
            detail={
              !providerStatus.configured
                ? "Set ELEVENLABS_API_KEY in your .env.local file."
                : undefined
            }
          />
          <StatusRow
            label="Default voice ID configured"
            ok={providerStatus.defaultVoiceIdConfigured}
            detail={
              !providerStatus.defaultVoiceIdConfigured
                ? "Set ELEVENLABS_DEFAULT_VOICE_ID in Vercel environment variables."
                : undefined
            }
          />
          <StatusRow
            label="Model ID configured"
            ok={providerStatus.modelIdConfigured}
            detail={
              !providerStatus.modelIdConfigured
                ? "Set ELEVENLABS_MODEL_ID in Vercel environment variables (optional, uses default if unset)."
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

      {/* Script readiness */}
      <div className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Episode Script Readiness
        </p>

        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Active Scenes",
              value: String(readiness.activeScenes),
              accent: "text-tiki-brown",
            },
            {
              label: "With Script",
              value: String(readiness.scenesWithReadAloudText),
              accent:
                readiness.scenesWithReadAloudText === readiness.activeScenes
                  ? "text-tropical-green"
                  : readiness.scenesWithReadAloudText > 0
                  ? "text-pineapple-yellow"
                  : "text-warm-coral",
            },
            {
              label: "Missing Script",
              value: String(readiness.scenesMissingReadAloudText),
              accent:
                readiness.scenesMissingReadAloudText === 0 ? "text-tropical-green" : "text-warm-coral",
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
            label="Script/read-aloud text available"
            ok={readiness.scriptAvailable}
            detail={
              !readiness.scriptAvailable
                ? "Add voiceoverNotes or dialogueDraft to scenes, or write scene summaries."
                : `${readiness.scenesWithReadAloudText} of ${readiness.activeScenes} scenes have script text.`
            }
          />
          <StatusRow
            label="Character voice guidance available"
            ok={readiness.voiceGuidanceAvailable}
            detail={
              !readiness.voiceGuidanceAvailable
                ? "No voice guidance found for scene characters. Generic tone will be used."
                : "Voice guidance is available from the character registry or built-in mappings."
            }
          />
        </div>

        {/* Blockers */}
        {readiness.blockers.length > 0 && (
          <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-3 py-2.5 flex flex-col gap-1">
            <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
              Script blockers
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

      {/* Next action */}
      <div className="bg-ube-purple/6 border border-ube-purple/15 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
        <p className="text-xs font-bold text-ube-purple/70 uppercase tracking-wide">
          Next Action
        </p>
        <p className="text-xs text-tiki-brown/60 leading-relaxed">
          Use the <strong className="font-semibold">Audio Narration Draft</strong> section below to generate a temporary draft, review it, upload the approved audio, and attach it to the episode.
        </p>
        <p className="text-xs text-tiki-brown/40 leading-relaxed">
          No audio is saved or published until explicitly approved and uploaded.
        </p>
      </div>

    </div>
  );
}
