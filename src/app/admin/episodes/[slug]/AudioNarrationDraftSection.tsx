"use client";

import { useState } from "react";
import type { NarrationVoiceStyle } from "@/lib/audioNarrationTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type AudioDraft = {
  audioBase64: string;
  scriptText: string;
  voiceStyle: NarrationVoiceStyle;
  voiceId: string;
  warnings: string[];
  notes: string[];
};

type GenerateResult =
  | { ok: true } & AudioDraft
  | { ok: false; message: string };

const VOICE_STYLE_OPTIONS: { value: NarrationVoiceStyle; label: string; description: string }[] = [
  { value: "warm-storyteller", label: "Warm Storyteller", description: "Gentle, warm, kid-friendly narration" },
  { value: "playful", label: "Playful", description: "Bright and expressive for fun scenes" },
  { value: "gentle-teacher", label: "Gentle Teacher", description: "Clear, calm, educational tone" },
  { value: "calm-bedtime", label: "Calm Bedtime", description: "Slow, soothing, winding-down pace" },
  { value: "energetic-cartoon", label: "Energetic Cartoon", description: "Upbeat, animated, high-energy delivery" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AudioNarrationDraftSection({
  episodeSlug,
  initialScript,
  providerConfigured,
  defaultVoiceId,
}: {
  episodeSlug: string;
  initialScript: string;
  providerConfigured: boolean;
  defaultVoiceId?: string;
}) {
  const [script, setScript] = useState(initialScript);
  const [voiceStyle, setVoiceStyle] = useState<NarrationVoiceStyle>("warm-storyteller");
  const [voiceId, setVoiceId] = useState(defaultVoiceId ?? "");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<AudioDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canGenerate = providerConfigured && script.trim().length > 0 && !loading;

  async function handleGenerate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setDraft(null);

    try {
      const res = await fetch("/api/audio-narration/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          voiceStyle,
          voiceId: voiceId.trim() || undefined,
          scriptText: script.trim(),
        }),
      });

      const data = (await res.json()) as GenerateResult;

      if (data.ok) {
        setDraft({
          audioBase64: data.audioBase64,
          scriptText: data.scriptText,
          voiceStyle: data.voiceStyle,
          voiceId: data.voiceId,
          warnings: data.warnings,
          notes: data.notes,
        });
      } else {
        setError(data.message);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const audioSrc = draft
    ? `data:audio/mpeg;base64,${draft.audioBase64}`
    : undefined;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg">🎧</span>
          <h2 className="text-base font-black text-tiki-brown">Audio Narration Draft</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 uppercase tracking-wide">
            Temporary Draft
          </span>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Generate a temporary narration audio draft for admin review. The draft is not saved,
          uploaded, or published. Review the audio and script before any future save step.
        </p>
      </div>

      {/* Provider status banner */}
      {!providerConfigured && (
        <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-warm-coral">ElevenLabs not configured</p>
            <p className="text-xs text-tiki-brown/60 leading-relaxed">
              Add <span className="font-mono font-bold">ELEVENLABS_API_KEY</span> and{" "}
              <span className="font-mono font-bold">ELEVENLABS_DEFAULT_VOICE_ID</span> in your
              environment variables to enable narration draft generation.
            </p>
          </div>
        </div>
      )}

      {/* Voice controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Voice style */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Voice Style
          </label>
          <select
            value={voiceStyle}
            onChange={(e) => setVoiceStyle(e.target.value as NarrationVoiceStyle)}
            disabled={loading}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          >
            {VOICE_STYLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>

        {/* Voice ID */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Voice ID{" "}
            <span className="text-tiki-brown/35 normal-case font-normal">
              (ElevenLabs voice ID)
            </span>
          </label>
          <input
            type="text"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={loading}
            placeholder={defaultVoiceId ? `Default: ${defaultVoiceId}` : "e.g. EXAVITQu4vr4xnSDxMaL"}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50 font-mono"
          />
          {!voiceId.trim() && !defaultVoiceId && providerConfigured && (
            <p className="text-xs text-warm-coral/80">
              Add{" "}
              <span className="font-mono font-bold">ELEVENLABS_DEFAULT_VOICE_ID</span> or enter a
              voice ID above.
            </p>
          )}
        </div>
      </div>

      {/* Script textarea */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Narration Script
          </label>
          <span
            className={`text-xs font-semibold ${
              script.length > 4500
                ? "text-warm-coral"
                : script.length > 3500
                ? "text-pineapple-yellow"
                : "text-tiki-brown/35"
            }`}
          >
            {script.length.toLocaleString()} / 5,000 chars
          </span>
        </div>
        <textarea
          value={script}
          onChange={(e) => setScript(e.target.value)}
          disabled={loading}
          rows={10}
          maxLength={5000}
          placeholder="Narration script will appear here. Edit before generating."
          className="text-sm border border-tiki-brown/15 rounded-xl px-4 py-3 bg-white text-tiki-brown/80 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50 placeholder:text-tiki-brown/30"
        />
        <p className="text-xs text-tiki-brown/35 leading-relaxed">
          Review and edit the script before generating. This text is only used for the temporary
          draft — it is not saved to episode JSON.
        </p>
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="px-5 py-2.5 rounded-xl text-sm font-black bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Generating narration draft…" : "Generate Temporary Narration Draft"}
        </button>
        {loading && (
          <span className="text-xs text-tiki-brown/45 animate-pulse">
            Calling ElevenLabs — this may take a few seconds…
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-warm-coral mb-0.5">Generation failed</p>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Draft result */}
      {draft && (
        <div className="flex flex-col gap-4 border-t border-tiki-brown/8 pt-5">
          {/* Temp draft badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/70">
              Temporary Draft
            </span>
            <span className="text-xs text-tiki-brown/45">
              Provider: ElevenLabs · Voice style: {draft.voiceStyle} · Voice ID:{" "}
              <span className="font-mono">{draft.voiceId}</span>
            </span>
          </div>

          {/* Warnings */}
          {draft.warnings.length > 0 && (
            <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5 flex flex-col gap-1">
              {draft.warnings.map((w) => (
                <p key={w} className="text-xs text-tiki-brown/60">
                  <span className="text-pineapple-yellow font-bold">▲</span> {w}
                </p>
              ))}
            </div>
          )}

          {/* Audio player */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Audio Preview
            </p>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              controls
              src={audioSrc}
              className="w-full rounded-xl"
            />
          </div>

          {/* Script used */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Script Used
            </p>
            <pre className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-3 text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap break-words font-sans">
              {draft.scriptText}
            </pre>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-3 py-2.5">
            {draft.notes.map((n) => (
              <p key={n} className="text-xs text-tiki-brown/55 leading-relaxed">
                {n}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
