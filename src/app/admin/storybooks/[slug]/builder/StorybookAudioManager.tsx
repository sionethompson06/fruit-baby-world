"use client";

import { useState, useRef } from "react";
import type { StorybookNarrationAudio } from "@/lib/storybookAudioTypes";
import { isStorybookNarrationSequence, getStorybookNarrationPlayableBlockCount } from "@/lib/storybookAudio";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "saving" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export default function StorybookAudioManager({
  episodeSlug,
  initialNarration,
}: {
  episodeSlug: string;
  initialNarration?: StorybookNarrationAudio | null;
}) {
  const [narration, setNarration] = useState<StorybookNarrationAudio | null>(initialNarration ?? null);
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = state.phase === "uploading" || state.phase === "saving";

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    const allowed = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/mp4", "audio/aac", "audio/x-m4a"];
    if (!allowed.includes(mime)) {
      setState({ phase: "error", message: "Please use MP3, WAV, or M4A/AAC." });
      return;
    }

    setState({ phase: "uploading" });

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const uploadRes = await fetch("/api/media/upload-storybook-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, audioBase64: base64, mimeType: file.type }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.ok) {
        setState({ phase: "error", message: uploadData.message ?? "Upload failed." });
        return;
      }

      setState({ phase: "saving" });

      const audioPayload: Partial<StorybookNarrationAudio> = {
        ...(narration ? { id: narration.id } : {}),
        audioUrl: uploadData.asset.audioUrl,
        pathname: uploadData.asset.pathname,
        mimeType: uploadData.asset.mimeType,
        sizeBytes: uploadData.asset.sizeBytes,
        sourceType: "admin-uploaded",
        status: "approved",
        visibility: "hidden",
        createdAt: narration?.createdAt ?? uploadData.asset.uploadedAt,
      };

      const saveRes = await fetch("/api/github/save-storybook-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, audio: audioPayload }),
      });

      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to save." });
        return;
      }

      setNarration(saveData.audio);
      setState({ phase: "done" });
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  async function updateVisibility(visibility: "public" | "hidden") {
    if (!narration) return;
    setState({ phase: "saving" });
    try {
      const saveRes = await fetch("/api/github/save-storybook-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, audio: { ...narration, visibility } }),
      });
      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to update." });
        return;
      }
      setNarration(saveData.audio);
      setState({ phase: "done" });
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  async function archiveNarration() {
    if (!narration) return;
    setState({ phase: "saving" });
    try {
      const saveRes = await fetch("/api/github/save-storybook-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, audio: { ...narration, status: "archived", visibility: "hidden" } }),
      });
      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to archive." });
        return;
      }
      setNarration(saveData.audio);
      setState({ phase: "done" });
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  const isPublic = narration?.visibility === "public";
  const isArchived = narration?.status === "archived";
  const isSequenceMode = isStorybookNarrationSequence(narration);
  const isSingleFileMode = !isSequenceMode;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎧</span>
          <div>
            <h3 className="text-sm font-black text-tiki-brown">Audio Narration</h3>
            <p className="text-xs text-tiki-brown/50 mt-0.5">
              Upload a finished narration file so readers can listen while they enjoy the storybook.
            </p>
          </div>
        </div>
        {narration && !isArchived && (
          <span className={`flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full ${
            isPublic ? "bg-tropical-green/15 text-tropical-green" : "bg-tiki-brown/8 text-tiki-brown/50"
          }`}>
            {isPublic ? "Public" : "Hidden"}
          </span>
        )}
        {isArchived && (
          <span className="flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full bg-warm-coral/15 text-warm-coral/70">
            Archived
          </span>
        )}
      </div>

      {/* Existing audio — sequence mode summary card */}
      {narration && !isArchived && isSequenceMode && (
        <div className="flex flex-col gap-3 bg-ube-purple/4 rounded-2xl border border-ube-purple/15 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base">🎵</span>
            <span className="text-xs font-bold text-ube-purple/80">Current public audio: Generated audio sequence</span>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-tiki-brown/60">
            <span>
              Playable blocks:{" "}
              <strong className="text-tiki-brown/80">{getStorybookNarrationPlayableBlockCount(narration)}</strong>
            </span>
            <span>
              Status:{" "}
              <strong className={isPublic ? "text-tropical-green" : "text-tiki-brown/55"}>
                {isPublic ? "Public" : "Hidden"}
              </strong>
            </span>
          </div>
          <p className="text-[10px] text-tiki-brown/45 leading-snug">
            Published from Audio Script Studio. Use the Audio Reader Script Studio below to preview the sequence.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {isPublic ? (
              <button
                type="button"
                onClick={() => updateVisibility("hidden")}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/12 disabled:opacity-40 transition-colors"
              >
                {busy ? "Saving…" : "Hide from Public"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateVisibility("public")}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25 disabled:opacity-40 transition-colors"
              >
                {busy ? "Saving…" : "Make Public"}
              </button>
            )}
            <button
              type="button"
              onClick={archiveNarration}
              disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-40 transition-colors"
            >
              {busy ? "Saving…" : "Archive Audio"}
            </button>
          </div>
        </div>
      )}

      {/* Existing audio — single-file mode player */}
      {narration && !isArchived && isSingleFileMode && (
        <div className="flex flex-col gap-3 bg-tiki-brown/3 rounded-2xl border border-tiki-brown/8 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Current Narration</span>
            <span className="text-xs text-tiki-brown/40">{narration.mimeType}</span>
            {narration.sizeBytes && (
              <span className="text-xs text-tiki-brown/35">{(narration.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
            )}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            src={narration.audioUrl}
            controls
            preload="metadata"
            className="w-full h-10"
          />
          <div className="flex flex-wrap gap-2 pt-1">
            {isPublic ? (
              <button
                type="button"
                onClick={() => updateVisibility("hidden")}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/12 disabled:opacity-40 transition-colors"
              >
                {busy ? "Saving…" : "Hide from Public"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => updateVisibility("public")}
                disabled={busy}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25 disabled:opacity-40 transition-colors"
              >
                {busy ? "Saving…" : "Make Public"}
              </button>
            )}
            <button
              type="button"
              onClick={archiveNarration}
              disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-40 transition-colors"
            >
              {busy ? "Saving…" : "Archive Audio"}
            </button>
          </div>
        </div>
      )}

      {isArchived && (
        <p className="text-xs text-tiki-brown/45 bg-tiki-brown/3 rounded-xl px-4 py-3">
          This narration has been archived. Upload a new file to replace it.
        </p>
      )}

      {/* Upload section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          {narration && !isArchived ? "Replace Narration" : "Upload Narration"}
        </p>
        {isSequenceMode && narration && !isArchived && (
          <p className="text-[10px] text-tiki-brown/45 leading-snug">
            Uploading a new file will replace the generated audio sequence as the public audio source.
          </p>
        )}
        <p className="text-xs text-tiki-brown/40">Accepted: MP3, WAV, M4A / AAC — up to 45 MB</p>
        <label className={`flex items-center gap-3 rounded-xl border border-dashed p-4 cursor-pointer transition-all ${
          busy ? "opacity-50 pointer-events-none" : "hover:border-ube-purple/40 hover:bg-ube-purple/3"
        } border-tiki-brown/20 bg-tiki-brown/2`}>
          <span className="text-base">{busy ? "⏳" : "🎵"}</span>
          <span className="text-sm font-semibold text-tiki-brown/55">
            {state.phase === "uploading" ? "Uploading audio…" :
             state.phase === "saving" ? "Saving to storybook…" :
             narration && !isArchived ? "Replace Audio File" : "Select Audio File"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/x-m4a,.mp3,.wav,.m4a,.aac"
            onChange={handleFileSelect}
            disabled={busy}
            className="hidden"
          />
        </label>
      </div>

      {state.phase === "error" && (
        <p className="text-xs text-warm-coral bg-warm-coral/8 rounded-xl px-4 py-2.5">
          {(state as { phase: "error"; message: string }).message}
        </p>
      )}

      {state.phase === "done" && (
        <p className="text-xs text-tropical-green font-semibold">Saved to storybook.</p>
      )}
    </div>
  );
}
