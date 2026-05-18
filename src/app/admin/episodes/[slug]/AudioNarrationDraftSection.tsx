"use client";

import { useState, useMemo } from "react";
import type {
  NarrationVoiceStyle,
  AudioDraftReviewChecklistItem,
  AudioDraftReviewDecision,
  EpisodeAudioNarration,
} from "@/lib/audioNarrationTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_STYLE_OPTIONS: { value: NarrationVoiceStyle; label: string; description: string }[] = [
  { value: "warm-storyteller", label: "Warm Storyteller", description: "Gentle, warm, kid-friendly narration" },
  { value: "playful", label: "Playful", description: "Bright and expressive for fun scenes" },
  { value: "gentle-teacher", label: "Gentle Teacher", description: "Clear, calm, educational tone" },
  { value: "calm-bedtime", label: "Calm Bedtime", description: "Slow, soothing, winding-down pace" },
  { value: "energetic-cartoon", label: "Energetic Cartoon", description: "Upbeat, animated, high-energy delivery" },
];

const BASE_CHECKLIST: Omit<AudioDraftReviewChecklistItem, "checked">[] = [
  { id: "matches-script", label: "Audio clearly matches the story script" },
  { id: "kid-friendly-voice", label: "Voice is warm, kid-friendly, and easy to understand" },
  { id: "good-pacing", label: "Pacing feels appropriate for children" },
  { id: "tone-fits", label: "Tone fits the story mood" },
  { id: "names-correct", label: "Pronunciation of character names is acceptable" },
  { id: "no-artifacts", label: "Audio does not include strange artifacts, cutoffs, or glitches" },
  { id: "family-friendly", label: "Narration is safe, gentle, and classroom/family friendly" },
];

const TIKI_CHECKLIST_ITEM: Omit<AudioDraftReviewChecklistItem, "checked"> = {
  id: "tiki-playful",
  label: "Tiki-related narration remains playful and kid-friendly, not scary or mean",
};

// ─── Local types ──────────────────────────────────────────────────────────────

type AudioDraft = {
  audioBase64: string;
  scriptText: string;
  voiceStyle: NarrationVoiceStyle;
  voiceId: string;
  modelId: string;
  warnings: string[];
  notes: string[];
};

type GenerateError = {
  message: string;
  providerStatus?: number;
  providerMessage?: string;
  troubleshooting?: string[];
};

type UploadSuccessResult = {
  id: string;
  url: string;
  pathname: string;
  sizeBytes: number;
  provider: string;
  voiceStyle: string;
  voiceId: string;
  approvedAt: string;
};

type AttachSuccessResult = {
  path: string;
  commitMessage: string;
  attachedAt: string;
};

type GenerateResult =
  | ({ ok: true } & AudioDraft)
  | ({ ok: false } & GenerateError);

function buildInitialChecklist(hasTiki: boolean): AudioDraftReviewChecklistItem[] {
  const items = BASE_CHECKLIST.map((item) => ({ ...item, checked: false }));
  if (hasTiki) items.push({ ...TIKI_CHECKLIST_ITEM, checked: false });
  return items;
}

// ─── Review section sub-component ────────────────────────────────────────────

function AudioReviewPanel({
  draft,
  hasTiki,
  episodeSlug,
  hasExistingAttachment,
}: {
  draft: AudioDraft;
  hasTiki: boolean;
  episodeSlug: string;
  hasExistingAttachment: boolean;
}) {
  const [checklist, setChecklist] = useState<AudioDraftReviewChecklistItem[]>(() =>
    buildInitialChecklist(hasTiki)
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [decision, setDecision] = useState<AudioDraftReviewDecision | null>(null);
  const [decidedAt, setDecidedAt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadSuccessResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [attachResult, setAttachResult] = useState<AttachSuccessResult | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  const checkedCount = checklist.filter((i) => i.checked).length;
  const allChecked = checkedCount === checklist.length;

  const recommendation = useMemo(() => {
    if (allChecked) return "ready";
    return "needs-review";
  }, [allChecked]);

  function toggleItem(id: string) {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  }

  function handleDecision(d: AudioDraftReviewDecision) {
    setDecision(d);
    setDecidedAt(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
  }

  function handleReset() {
    setDecision(null);
    setDecidedAt(null);
    setUploadResult(null);
    setUploadError(null);
    setAttachResult(null);
    setAttachError(null);
  }

  async function handleSave() {
    if (uploading || uploadResult) return;
    setUploading(true);
    setUploadError(null);

    try {
      const res = await fetch("/api/audio-narration/upload-approved-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          audioBase64: draft.audioBase64,
          mimeType: "audio/mpeg",
          scriptText: draft.scriptText,
          voiceStyle: draft.voiceStyle,
          voiceId: draft.voiceId,
          modelId: draft.modelId,
          provider: "elevenlabs",
          reviewNotes: reviewNotes.trim(),
          approvedBy: "admin",
        }),
      });

      let data: { ok: boolean; status: string; message?: string; audio?: UploadSuccessResult & Record<string, unknown> };
      try {
        data = await res.json();
      } catch {
        setUploadError(
          res.status === 504
            ? "Upload timed out — try again."
            : "Unexpected server response. Try again."
        );
        setUploading(false);
        return;
      }

      if (data.ok && data.audio) {
        setUploadResult({
          id: data.audio.id as string,
          url: data.audio.url as string,
          pathname: data.audio.pathname as string,
          sizeBytes: data.audio.sizeBytes as number,
          provider: data.audio.provider as string,
          voiceStyle: data.audio.voiceStyle as string,
          voiceId: data.audio.voiceId as string,
          approvedAt: data.audio.approvedAt as string,
        });
      } else {
        setUploadError(data.message ?? "Upload failed — check Vercel Blob configuration.");
      }
    } catch {
      setUploadError("Network error — check your connection and try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAttach() {
    if (!uploadResult || attaching || attachResult) return;
    setAttaching(true);
    setAttachError(null);

    try {
      const res = await fetch("/api/github/attach-narration-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          audio: {
            id: uploadResult.id,
            provider: uploadResult.provider,
            voiceId: draft.voiceId,
            modelId: draft.modelId,
            voiceStyle: uploadResult.voiceStyle,
            url: uploadResult.url,
            pathname: uploadResult.pathname,
            mimeType: "audio/mpeg",
            sizeBytes: uploadResult.sizeBytes,
            scriptText: draft.scriptText,
            reviewNotes: reviewNotes.trim(),
            approvedBy: "admin",
            approvedAt: uploadResult.approvedAt,
          },
        }),
      });

      let data: { ok: boolean; status: string; message?: string; path?: string; commitMessage?: string; audioNarration?: { attachedAt?: string } };
      try {
        data = await res.json();
      } catch {
        setAttachError(
          res.status === 504 ? "Request timed out — try again." : "Unexpected server response. Try again."
        );
        setAttaching(false);
        return;
      }

      if (data.ok) {
        setAttachResult({
          path: data.path ?? "",
          commitMessage: data.commitMessage ?? "",
          attachedAt: data.audioNarration?.attachedAt ?? new Date().toISOString(),
        });
      } else {
        setAttachError(data.message ?? "Attach failed — check GitHub configuration.");
      }
    } catch {
      setAttachError("Network error — check your connection and try again.");
    } finally {
      setAttaching(false);
    }
  }

  const audioSrc = `data:audio/mpeg;base64,${draft.audioBase64}`;

  return (
    <div className="flex flex-col gap-5 border-t border-tiki-brown/10 pt-6">

      {/* Review header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-black text-tiki-brown">Draft Review</span>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/70">
          Temporary — not saved
        </span>
        <span className="text-xs text-tiki-brown/45 ml-auto">
          ElevenLabs · {draft.voiceStyle} · <span className="font-mono">{draft.voiceId}</span>
          {" "}· <span className="font-mono">{draft.modelId}</span>
        </span>
      </div>

      {/* Generation warnings */}
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
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Audio Preview
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={audioSrc} className="w-full rounded-xl" />
        <p className="text-xs text-tiki-brown/35">
          Temporary narration drafts are not public. Review the audio and complete the checklist,
          then save the approved draft to Blob storage below.
        </p>
      </div>

      {/* Script comparison */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Script Used for This Draft
        </p>
        <pre className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-3 text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap break-words font-sans max-h-48 overflow-y-auto">
          {draft.scriptText}
        </pre>
        <p className="text-xs text-tiki-brown/40 italic">
          Confirm this audio matches the intended read-aloud script.
        </p>
      </div>

      {/* Review checklist */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Review Checklist
          </p>
          <span className="text-xs text-tiki-brown/40">
            {checkedCount} / {checklist.length} checked
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          {checklist.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-2.5 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleItem(item.id)}
                className="mt-0.5 flex-shrink-0 accent-ube-purple w-4 h-4"
              />
              <span
                className={`text-xs leading-relaxed transition-colors ${
                  item.checked ? "text-tiki-brown/65 line-through" : "text-tiki-brown/70"
                }`}
              >
                {item.label}
              </span>
            </label>
          ))}
        </div>

        {/* Recommendation */}
        <div
          className={`mt-1 rounded-xl px-3 py-2.5 text-xs font-semibold ${
            recommendation === "ready"
              ? "bg-tropical-green/10 border border-tropical-green/25 text-tropical-green"
              : "bg-pineapple-yellow/10 border border-pineapple-yellow/25 text-tiki-brown/65"
          }`}
        >
          {recommendation === "ready"
            ? "All checklist items passed — ready to save approved audio to storage."
            : "Review needed before saving — complete the checklist above."}
        </div>
      </div>

      {/* Review notes */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Audio Review Notes
        </label>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Optional notes about this draft — quality, pacing, any issues noticed…"
          className="text-sm border border-tiki-brown/15 rounded-xl px-4 py-3 bg-white text-tiki-brown/80 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-ube-purple/30 placeholder:text-tiki-brown/30"
        />
        <p className="text-xs text-tiki-brown/35 leading-relaxed">
          Notes are included when saving to Blob storage. Not published publicly.
        </p>
      </div>

      {/* Decision buttons / state */}
      {!decision ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleDecision("looks-good")}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25 transition-colors"
          >
            Mark Draft Looks Good
          </button>
          <button
            type="button"
            onClick={() => handleDecision("needs-regeneration")}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-warm-coral/10 text-warm-coral hover:bg-warm-coral/20 transition-colors"
          >
            Mark Needs Regeneration
          </button>
        </div>
      ) : (
        <div
          className={`rounded-2xl px-4 py-4 flex flex-col gap-2 ${
            decision === "looks-good"
              ? "bg-tropical-green/10 border border-tropical-green/25"
              : "bg-warm-coral/8 border border-warm-coral/20"
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                decision === "looks-good"
                  ? "bg-tropical-green/20 text-tropical-green"
                  : "bg-warm-coral/15 text-warm-coral"
              }`}
            >
              {decision === "looks-good" ? "Draft Looks Good" : "Needs Regeneration"}
            </span>
            {decidedAt && (
              <span className="text-xs text-tiki-brown/40">Reviewed {decidedAt}</span>
            )}
          </div>

          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            {decision === "looks-good"
              ? "This draft is ready to save. Use the Save Approved Audio button below to upload it to Blob storage."
              : "Adjust the script, voice style, or voice ID, then generate a new temporary draft using the controls above."}
          </p>

          {reviewNotes.trim() && (
            <div className="bg-white/60 rounded-lg px-3 py-2 mt-1">
              <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">
                Review notes
              </p>
              <p className="text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap">
                {reviewNotes.trim()}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="self-start mt-1 text-xs font-semibold text-tiki-brown/40 hover:text-tiki-brown/60 transition-colors underline underline-offset-2"
          >
            Change review decision
          </button>
        </div>
      )}

      {/* Save approved audio section */}
      <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-5">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Save Approved Audio
          </p>
          <p className="text-xs text-tiki-brown/45 leading-relaxed">
            This uploads the approved narration draft to Vercel Blob only. It will not attach the
            audio to the episode or publish it yet.
          </p>
        </div>

        {!uploadResult ? (
          <>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                (decision !== "looks-good" && !allChecked) || uploading
              }
              className="self-start px-5 py-2.5 rounded-xl text-sm font-black bg-tropical-green text-white hover:bg-tropical-green/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {uploading ? "Saving to Blob storage…" : "Save Approved Audio to Media Storage"}
            </button>
            {uploading && (
              <span className="text-xs text-tiki-brown/45 animate-pulse">
                Uploading to Vercel Blob — this may take a moment…
              </span>
            )}
            {decision !== "looks-good" && !allChecked && !uploading && (
              <p className="text-xs text-tiki-brown/40">
                Mark the draft as &quot;Looks Good&quot; or complete all checklist items to enable
                saving.
              </p>
            )}
            {uploadError && (
              <div className="bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-warm-coral mb-0.5">Upload failed</p>
                <p className="text-xs text-tiki-brown/70 leading-relaxed">{uploadError}</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-tropical-green/10 border border-tropical-green/25 rounded-2xl px-4 py-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green">
                Saved to Blob
              </span>
              <span className="text-xs text-tiki-brown/40">
                {new Date(uploadResult.approvedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-xs text-tiki-brown/65">
              <p>
                <span className="font-semibold">Provider:</span> {uploadResult.provider} ·{" "}
                <span className="font-semibold">Voice style:</span> {uploadResult.voiceStyle} ·{" "}
                <span className="font-semibold">Voice ID:</span>{" "}
                <span className="font-mono">{uploadResult.voiceId}</span>
              </p>
              <p>
                <span className="font-semibold">Size:</span>{" "}
                {uploadResult.sizeBytes < 1024 * 1024
                  ? `${Math.round(uploadResult.sizeBytes / 1024)}KB`
                  : `${(uploadResult.sizeBytes / 1024 / 1024).toFixed(2)}MB`}
              </p>
              <p className="font-mono break-all">{uploadResult.url}</p>
            </div>
            <div className="bg-white/60 rounded-lg px-3 py-2 mt-1">
              <p className="text-xs text-tiki-brown/50 leading-relaxed">
                Audio is stored in Blob. It has not been attached to the episode JSON or published
                publicly. Future phases will add episode attachment and public playback.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Attach to episode JSON section — only shown after blob upload succeeds */}
      {uploadResult && (
        <div className="flex flex-col gap-3 border-t border-tiki-brown/10 pt-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Attach Audio to Episode JSON
            </p>
            <p className="text-xs text-tiki-brown/45 leading-relaxed">
              This saves the approved audio metadata to the episode JSON. It will not make the audio
              public yet.
            </p>
            {hasExistingAttachment && !attachResult && (
              <p className="text-xs text-pineapple-yellow/80 font-semibold mt-1">
                Attaching a new narration audio will replace the current episode narration metadata.
                The old Blob file will not be deleted.
              </p>
            )}
          </div>

          {!attachResult ? (
            <>
              <button
                type="button"
                onClick={handleAttach}
                disabled={attaching}
                className="self-start px-5 py-2.5 rounded-xl text-sm font-black bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {attaching
                  ? "Attaching narration audio to episode…"
                  : "Attach Audio to Episode JSON"}
              </button>
              {attaching && (
                <span className="text-xs text-tiki-brown/45 animate-pulse">
                  Saving to GitHub episode JSON — this may take a moment…
                </span>
              )}
              {attachError && (
                <div className="bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-warm-coral mb-0.5">Attach failed</p>
                  <p className="text-xs text-tiki-brown/70 leading-relaxed">{attachError}</p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple">
                  Narration audio attached to episode
                </span>
                <span className="text-xs text-tiki-brown/40">
                  {new Date(attachResult.attachedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <p className="text-xs font-mono text-tiki-brown/50 break-all">{attachResult.path}</p>
              <p className="text-xs text-tiki-brown/50 italic">{attachResult.commitMessage}</p>
              <div className="bg-white/60 rounded-lg px-3 py-2 mt-1">
                <p className="text-xs text-tiki-brown/50 leading-relaxed">
                  Public audio playback comes next. Phase 13F will add the public audio story player.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes from generation API */}
      {draft.notes.length > 0 && (
        <div className="flex flex-col gap-1 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-3 py-2.5">
          {draft.notes.map((n) => (
            <p key={n} className="text-xs text-tiki-brown/55 leading-relaxed">
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── Attached narration panel sub-component ──────────────────────────────────

function AttachedNarrationPanel({ audio }: { audio: EpisodeAudioNarration }) {
  return (
    <div className="flex flex-col gap-3 bg-ube-purple/5 border border-ube-purple/15 rounded-2xl px-4 py-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple">
          Attached Narration Audio
        </span>
        <span
          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
            audio.visibility === "public-ready"
              ? "bg-tropical-green/15 text-tropical-green"
              : "bg-pineapple-yellow/25 text-tiki-brown/70"
          }`}
        >
          {audio.visibility === "public-ready" ? "Public Ready" : "Admin Only"}
        </span>
        <span className="text-xs text-tiki-brown/40 ml-auto">
          Attached{" "}
          {new Date(audio.attachedAt).toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-tiki-brown/60">
        {audio.provider && (
          <div>
            Provider: <span className="font-semibold text-tiki-brown/75">{audio.provider}</span>
          </div>
        )}
        {audio.voiceStyle && (
          <div>
            Voice style:{" "}
            <span className="font-semibold text-tiki-brown/75">{audio.voiceStyle}</span>
          </div>
        )}
        {audio.voiceId && (
          <div>
            Voice ID:{" "}
            <span className="font-mono font-semibold text-tiki-brown/75">{audio.voiceId}</span>
          </div>
        )}
        {audio.sizeBytes && (
          <div>
            Size:{" "}
            <span className="font-semibold text-tiki-brown/75">
              {audio.sizeBytes < 1024 * 1024
                ? `${Math.round(audio.sizeBytes / 1024)}KB`
                : `${(audio.sizeBytes / 1024 / 1024).toFixed(2)}MB`}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs font-mono text-tiki-brown/45 break-all">{audio.url}</p>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio controls src={audio.url} className="w-full rounded-xl" />

      <p className="text-xs text-tiki-brown/40 italic">
        Admin-only preview. Public audio playback is not yet enabled (Phase 13F).
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AudioNarrationDraftSection({
  episodeSlug,
  initialScript,
  providerConfigured,
  defaultVoiceId,
  defaultModelId,
  hasTiki = false,
  existingAudioNarration = null,
}: {
  episodeSlug: string;
  initialScript: string;
  providerConfigured: boolean;
  defaultVoiceId?: string;
  defaultModelId?: string;
  hasTiki?: boolean;
  existingAudioNarration?: EpisodeAudioNarration | null;
}) {
  const [script, setScript] = useState(initialScript);
  const [voiceStyle, setVoiceStyle] = useState<NarrationVoiceStyle>("warm-storyteller");
  const [voiceId, setVoiceId] = useState(defaultVoiceId ?? "");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<AudioDraft | null>(null);
  const [error, setError] = useState<GenerateError | null>(null);

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

      let data: GenerateResult;
      try {
        data = (await res.json()) as GenerateResult;
      } catch {
        // Non-JSON response — most likely a Vercel gateway timeout (504) or
        // server crash. Give an actionable hint instead of a generic message.
        const hint =
          res.status === 504
            ? "The request timed out — try a shorter script or regenerate."
            : res.status >= 500
            ? "A server error occurred. Check your environment variables and try again."
            : "Unexpected response from server. Try again.";
        setError({ message: hint });
        setLoading(false);
        return;
      }

      if (data.ok) {
        setDraft({
          audioBase64: data.audioBase64,
          scriptText: data.scriptText,
          voiceStyle: data.voiceStyle,
          voiceId: data.voiceId,
          modelId: data.modelId,
          warnings: data.warnings,
          notes: data.notes,
        });
      } else {
        setError({
          message: data.message,
          providerStatus: data.providerStatus,
          providerMessage: data.providerMessage,
          troubleshooting: data.troubleshooting,
        });
      }
    } catch {
      setError({ message: "Network error — check your connection and try again." });
    } finally {
      setLoading(false);
    }
  }

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

      {/* Currently attached narration audio */}
      {existingAudioNarration && (
        <AttachedNarrationPanel audio={existingAudioNarration} />
      )}

      {/* Provider status banner */}
      {!providerConfigured && (
        <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-bold text-warm-coral">ElevenLabs not configured</p>
            <p className="text-xs text-tiki-brown/60 leading-relaxed">
              Add{" "}
              <span className="font-mono font-bold">ELEVENLABS_API_KEY</span> and{" "}
              <span className="font-mono font-bold">ELEVENLABS_DEFAULT_VOICE_ID</span> in your
              environment variables to enable narration draft generation.
            </p>
          </div>
        </div>
      )}

      {/* Voice controls */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            placeholder={
              defaultVoiceId ? `Default: ${defaultVoiceId}` : "e.g. EXAVITQu4vr4xnSDxMaL"
            }
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50 font-mono"
          />
          <p className="text-xs text-tiki-brown/40 leading-relaxed">
            Voice IDs are case-sensitive. Use a voice ID from your ElevenLabs account.
          </p>
          {!voiceId.trim() && !defaultVoiceId && providerConfigured && (
            <p className="text-xs text-warm-coral/80">
              Add{" "}
              <span className="font-mono font-bold">ELEVENLABS_DEFAULT_VOICE_ID</span> or enter a
              voice ID above.
            </p>
          )}
        </div>
      </div>

      {/* Model ID display */}
      <p className="text-xs text-tiki-brown/40 -mt-1">
        Model:{" "}
        <span className="font-mono">
          {defaultModelId ?? "eleven_multilingual_v2"}
        </span>
        {" "}
        <span className="text-tiki-brown/30">(set via ELEVENLABS_MODEL_ID)</span>
      </p>

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
        <div className="bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-warm-coral">Generation failed</p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">{error.message}</p>
          {error.providerStatus !== undefined && (
            <p className="text-xs text-tiki-brown/55">
              Provider status: <span className="font-mono font-bold">{error.providerStatus}</span>
            </p>
          )}
          {error.providerMessage && (
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              Provider message: {error.providerMessage}
            </p>
          )}
          {error.troubleshooting && error.troubleshooting.length > 0 && (
            <div className="mt-0.5">
              <p className="text-xs font-bold text-tiki-brown/45 mb-1">Try:</p>
              <ul className="flex flex-col gap-0.5">
                {error.troubleshooting.map((tip) => (
                  <li key={tip} className="text-xs text-tiki-brown/60 leading-relaxed">
                    • {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Review panel — appears after draft is generated */}
      {draft && (
        <AudioReviewPanel
          draft={draft}
          hasTiki={hasTiki}
          episodeSlug={episodeSlug}
          hasExistingAttachment={!!existingAudioNarration}
        />
      )}
    </div>
  );
}
