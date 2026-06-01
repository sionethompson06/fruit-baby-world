"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  StorybookAudioScript,
  StorybookAudioScriptPage,
  StorybookAudioScriptPageAudioPreview,
  StorybookAudioScriptBlock,
  StorybookAudioSpeaker,
  StorybookAudioScriptBlockType,
  StorybookAudioScriptStatus,
  StorybookAudioScriptBlockStatus,
  StorybookFullBookAudioPreview,
} from "@/lib/storybookAudioScriptTypes";
import {
  getPlayableBlocksForPage,
  getMissingAudioBlocks,
  hasMissingBlockAudio,
  getFullBookAudioSequence,
  getFullBookAudioStats,
} from "@/lib/storybookAudioScript";
import type { StorybookPage } from "@/lib/storybookPageTypes";
import type { StorybookNarrationAudio } from "@/lib/storybookAudioTypes";
import { isStorybookNarrationPublic } from "@/lib/storybookAudio";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved" }
  | { phase: "error"; message: string };

type BlockGenerateState =
  | { phase: "idle" }
  | { phase: "generating" }
  | { phase: "success"; message: string }
  | { phase: "error"; message: string };

type PageGenState =
  | { phase: "idle" }
  | { phase: "generating"; mode: "missing" | "all" }
  | { phase: "done"; message: string; blockErrors?: { blockId: string; error: string }[] }
  | { phase: "error"; message: string };

type FullBookGenState =
  | { phase: "idle" }
  | { phase: "generating"; mode: "missing-only" | "regenerate-all" }
  | { phase: "done"; message: string; blockErrors?: { pageId: string; blockId: string; error: string }[] }
  | { phase: "error"; message: string };

type GeneratedBlockResult = {
  blockId: string;
  audioUrl: string | null;
  pathname: string | null;
  mimeType: "audio/mpeg" | null;
  sizeBytes: number | null;
  generatedAt: string | null;
  provider: "elevenlabs" | "existing" | null;
  modelId: string | null;
  error: string | null;
};

type FullBookGeneratedBlockResult = GeneratedBlockResult & {
  pageId: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeEmptyBlock(speakerSlug: string, speakerName: string, sortOrder: number): StorybookAudioScriptBlock {
  return {
    id: generateId(),
    type: "narration",
    speakerSlug,
    speakerName,
    text: "",
    sortOrder,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

const BLOCK_TYPE_LABELS: Record<StorybookAudioScriptBlockType, string> = {
  narration: "Narration",
  dialogue: "Dialogue",
  "sound-effect": "Sound Effect",
};

const BLOCK_STATUS_LABELS: Record<StorybookAudioScriptBlockStatus, string> = {
  draft: "Draft",
  approved: "Approved",
  archived: "Archived",
};

const SCRIPT_STATUS_LABELS: Record<StorybookAudioScriptStatus, string> = {
  draft: "Draft",
  "ready-for-generation": "Ready for Generation",
  approved: "Approved",
  archived: "Archived",
};

function pageLabel(page: StorybookPage): string {
  if (page.pageRole === "front-cover") return "Front Cover";
  if (page.pageRole === "back-cover") return "Back Cover";
  if (page.pageRole === "title-page") return "Title Page";
  if (page.pageRole === "end-page") return "End Page";
  if (page.title) return page.title;
  return `Page ${page.pageNumber}`;
}

function formatGeneratedAt(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso;
  }
}

// ─── Voice ID resolution ──────────────────────────────────────────────────────

function resolveVoiceId(
  block: StorybookAudioScriptBlock,
  speakers: StorybookAudioSpeaker[],
  defaultNarratorVoiceId: string | undefined
): string | undefined {
  if (block.voiceId) return block.voiceId;
  const speaker = speakers.find((s) => s.speakerSlug === block.speakerSlug);
  if (speaker?.voiceId) return speaker.voiceId;
  if (block.speakerSlug === "narrator" && defaultNarratorVoiceId) return defaultNarratorVoiceId;
  return undefined;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpeakerRow({
  speaker,
  onChange,
}: {
  speaker: StorybookAudioSpeaker;
  onChange: (updated: StorybookAudioSpeaker) => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 items-center py-2 border-b border-tiki-brown/8 last:border-0">
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-xs font-bold text-tiki-brown/70 truncate">{speaker.speakerName}</span>
        <span className="text-[10px] text-tiki-brown/40 font-mono truncate">{speaker.speakerSlug}</span>
      </div>
      <input
        type="text"
        value={speaker.voiceLabel ?? ""}
        placeholder="Voice label (optional)"
        onChange={(e) => onChange({ ...speaker, voiceLabel: e.target.value || undefined })}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/70 placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40 transition-colors"
      />
      <input
        type="text"
        value={speaker.voiceId ?? ""}
        placeholder="ElevenLabs voice ID"
        onChange={(e) => onChange({ ...speaker, voiceId: e.target.value || undefined })}
        className="text-xs px-2.5 py-1.5 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/70 placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40 transition-colors font-mono"
      />
    </div>
  );
}

function BlockEditor({
  block,
  speakers,
  script,
  slug,
  pageId,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onAutoSave,
}: {
  block: StorybookAudioScriptBlock;
  speakers: StorybookAudioSpeaker[];
  script: StorybookAudioScript;
  slug: string;
  pageId: string;
  onUpdate: (updated: StorybookAudioScriptBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onAutoSave: (updatedBlock: StorybookAudioScriptBlock) => Promise<void>;
}) {
  const [genState, setGenState] = useState<BlockGenerateState>({ phase: "idle" });

  const resolvedVoiceId = resolveVoiceId(block, speakers, script.defaultNarratorVoiceId);
  const canGenerate = block.text.trim().length > 0 && !!resolvedVoiceId && genState.phase !== "generating";
  const hasAudio = !!block.audioUrl;

  const handleSpeakerChange = (slug: string) => {
    const found = speakers.find((s) => s.speakerSlug === slug);
    onUpdate({
      ...block,
      speakerSlug: slug,
      speakerName: found?.speakerName ?? slug,
    });
  };

  const handleGenerateAudio = async () => {
    if (!canGenerate) return;
    setGenState({ phase: "generating" });

    const speaker = speakers.find((s) => s.speakerSlug === block.speakerSlug);

    try {
      const res = await fetch("/api/storybook-audio/generate-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          pageId,
          blockId: block.id,
          text: block.text,
          speakerSlug: block.speakerSlug,
          speakerName: block.speakerName,
          voiceId: resolvedVoiceId,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        audioUrl?: string;
        pathname?: string;
        mimeType?: string;
        sizeBytes?: number;
        generatedAt?: string;
        provider?: string;
        modelId?: string;
        message?: string;
        providerMessage?: string;
      };

      if (!data.ok) {
        const msg = data.providerMessage ?? data.message ?? "Audio generation failed.";
        setGenState({ phase: "error", message: msg });
        return;
      }

      const updatedBlock: StorybookAudioScriptBlock = {
        ...block,
        audioUrl: data.audioUrl,
        pathname: data.pathname,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        generatedAt: data.generatedAt,
        generationProvider: "elevenlabs",
        generationModelId: data.modelId,
        generationError: undefined,
        updatedAt: new Date().toISOString(),
      };

      onUpdate(updatedBlock);
      setGenState({ phase: "success", message: "Audio draft generated and saved." });

      // Auto-save to GitHub
      await onAutoSave(updatedBlock);
    } catch {
      setGenState({ phase: "error", message: "Network error. Please try again." });
    }
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-tiki-brown/12 bg-tiki-brown/2 p-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Block type */}
        <select
          value={block.type}
          onChange={(e) => onUpdate({ ...block, type: e.target.value as StorybookAudioScriptBlockType })}
          className="text-xs font-bold px-2 py-1 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/65 focus:outline-none focus:border-ube-purple/40 transition-colors"
        >
          {(["narration", "dialogue", "sound-effect"] as StorybookAudioScriptBlockType[]).map((t) => (
            <option key={t} value={t}>{BLOCK_TYPE_LABELS[t]}</option>
          ))}
        </select>

        {/* Speaker */}
        {block.type !== "sound-effect" && (
          <select
            value={block.speakerSlug}
            onChange={(e) => handleSpeakerChange(e.target.value)}
            className="text-xs px-2 py-1 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/65 focus:outline-none focus:border-ube-purple/40 transition-colors flex-1 min-w-0"
          >
            {speakers.map((s) => (
              <option key={s.speakerSlug} value={s.speakerSlug}>{s.speakerName}</option>
            ))}
          </select>
        )}

        {/* Block status */}
        <select
          value={block.status}
          onChange={(e) => onUpdate({ ...block, status: e.target.value as StorybookAudioScriptBlockStatus })}
          className="text-xs px-2 py-1 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/65 focus:outline-none focus:border-ube-purple/40 transition-colors"
        >
          {(["draft", "approved", "archived"] as StorybookAudioScriptBlockStatus[]).map((s) => (
            <option key={s} value={s}>{BLOCK_STATUS_LABELS[s]}</option>
          ))}
        </select>

        {/* Reorder / remove controls */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            title="Move up"
            className="text-xs px-1.5 py-1 rounded-lg text-tiki-brown/40 hover:text-tiki-brown/70 hover:bg-tiki-brown/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            title="Move down"
            className="text-xs px-1.5 py-1 rounded-lg text-tiki-brown/40 hover:text-tiki-brown/70 hover:bg-tiki-brown/8 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            ▼
          </button>
          <button
            type="button"
            onClick={onRemove}
            title="Remove block"
            className="text-xs px-1.5 py-1 rounded-lg text-warm-coral/50 hover:text-warm-coral hover:bg-warm-coral/8 transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Text */}
      <textarea
        value={block.text}
        onChange={(e) => onUpdate({ ...block, text: e.target.value })}
        placeholder={
          block.type === "sound-effect"
            ? "Describe the sound effect, e.g. 'soft rustling of leaves'"
            : block.type === "dialogue"
            ? "Character's spoken words..."
            : "Narration text..."
        }
        rows={2}
        className="text-xs px-3 py-2 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/75 placeholder:text-tiki-brown/30 resize-y focus:outline-none focus:border-ube-purple/40 transition-colors leading-relaxed"
      />

      {/* Audio preview player */}
      {hasAudio && block.audioUrl && (
        <audio
          src={block.audioUrl}
          controls
          preload="metadata"
          aria-label={`Preview ${block.speakerName} audio draft`}
          className="w-full h-10"
        />
      )}

      {/* Generated metadata badge */}
      {hasAudio && block.generatedAt && (
        <p className="text-[10px] text-tiki-brown/40 leading-snug">
          {block.generationProvider === "elevenlabs" ? "ElevenLabs" : block.generationProvider ?? "Generated"}
          {" · generated "}
          {formatGeneratedAt(block.generatedAt)}
          {block.generationModelId && (
            <span className="font-mono"> · {block.generationModelId}</span>
          )}
        </p>
      )}

      {/* Voice ID warning / generate button */}
      {block.type !== "sound-effect" && (
        <div className="flex items-center gap-2 flex-wrap">
          {!resolvedVoiceId ? (
            <p className="text-[10px] text-warm-coral/70 italic">
              Add a voice ID to this speaker before generating audio.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleGenerateAudio}
              disabled={!canGenerate}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-tropical-green/10 text-tropical-green hover:bg-tropical-green/20 border border-tropical-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {genState.phase === "generating"
                ? "Generating…"
                : hasAudio
                ? "Regenerate Draft"
                : "Generate Audio Draft"}
            </button>
          )}

          {genState.phase === "success" && (
            <span className="text-[10px] text-tropical-green font-semibold">
              ✓ {genState.message}
            </span>
          )}
          {genState.phase === "error" && (
            <span className="text-[10px] text-warm-coral font-semibold">
              ✕ {genState.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── PageSequencePlayer ───────────────────────────────────────────────────────

function PageSequencePlayer({
  blocks,
  speakerName,
}: {
  blocks: StorybookAudioScriptBlock[];
  speakerName: (slug: string) => string;
}) {
  const playableBlocks = blocks.filter((b) => !!b.audioUrl);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);

  // Reset player when blocks change
  useEffect(() => {
    setCurrentIndex(0);
    setPlaying(false);
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.src = "";
    }
  }, [blocks]);

  // Attach ended listener whenever index changes
  useEffect(() => {
    const audio = playerRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const nextIdx = currentIndex + 1;
      if (nextIdx < playableBlocks.length) {
        setCurrentIndex(nextIdx);
        const nextUrl = playableBlocks[nextIdx]?.audioUrl;
        if (nextUrl) {
          audio.src = nextUrl;
          audio.play().catch(() => setPlaying(false));
        }
      } else {
        setPlaying(false);
        setCurrentIndex(0);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentIndex, playableBlocks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
      }
    };
  }, []);

  const handlePlay = () => {
    const audio = playerRef.current;
    if (!audio) return;
    const block = playableBlocks[currentIndex];
    if (!block?.audioUrl) return;

    if (!playing) {
      if (audio.src !== block.audioUrl) {
        audio.src = block.audioUrl;
      }
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const handlePause = () => {
    playerRef.current?.pause();
    setPlaying(false);
  };

  const handleStop = () => {
    const audio = playerRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setPlaying(false);
    setCurrentIndex(0);
  };

  if (playableBlocks.length === 0) return null;

  const currentBlock = playableBlocks[currentIndex];
  const missingCount = blocks.filter(
    (b) => b.status !== "archived" && b.text.trim().length > 0 && !b.audioUrl
  ).length;

  return (
    <div className="rounded-xl border border-ube-purple/20 bg-ube-purple/4 p-3 flex flex-col gap-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={playerRef} preload="none" />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-ube-purple/80">
          Page Preview
        </span>
        {currentBlock && (
          <span className="text-[10px] text-tiki-brown/55">
            Now playing: {speakerName(currentBlock.speakerSlug)} (block {currentIndex + 1} of {playableBlocks.length})
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={playing}
          title="Play"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/20 border border-ube-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ▶ Play
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!playing}
          title="Pause"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ⏸ Pause
        </button>
        <button
          type="button"
          onClick={handleStop}
          title="Stop"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 transition-colors"
        >
          ⏹ Stop
        </button>
      </div>

      {/* Block progress dots */}
      <div className="flex items-center gap-1 flex-wrap">
        {playableBlocks.map((b, i) => (
          <button
            key={b.id}
            type="button"
            onClick={() => {
              handleStop();
              setCurrentIndex(i);
            }}
            title={`Block ${i + 1}: ${speakerName(b.speakerSlug)}`}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              i === currentIndex
                ? "text-ube-purple font-bold"
                : "text-tiki-brown/40"
            }`}
          >
            {i === currentIndex ? "●" : "○"} {i + 1}
          </button>
        ))}
      </div>

      {missingCount > 0 && (
        <p className="text-[10px] text-amber-600/80 bg-amber-50 border border-amber-200 rounded px-2 py-1 leading-snug">
          {missingCount} block{missingCount !== 1 ? "s are" : " is"} missing audio. Generate Missing Audio to enable full page preview.
        </p>
      )}
    </div>
  );
}

// ─── FullBookSequencePlayer ───────────────────────────────────────────────────

type FullBookSequenceItem = {
  pageId: string;
  pageNumber?: number;
  pageRole?: string;
  pageLabel: string;
  block: StorybookAudioScriptBlock;
};

function FullBookSequencePlayer({
  sequence,
  speakerName,
  onClose,
}: {
  sequence: FullBookSequenceItem[];
  speakerName: (slug: string) => string;
  onClose: () => void;
}) {
  const playableItems = sequence.filter((item) => !!item.block.audioUrl);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset player when sequence changes
  useEffect(() => {
    setCurrentIndex(0);
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
  }, [sequence]);

  // Attach ended listener whenever index changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      const nextIdx = currentIndex + 1;
      if (nextIdx < playableItems.length) {
        setCurrentIndex(nextIdx);
        const nextUrl = playableItems[nextIdx]?.block.audioUrl;
        if (nextUrl) {
          audio.src = nextUrl;
          audio.play().catch(() => setPlaying(false));
        }
      } else {
        setPlaying(false);
        setCurrentIndex(0);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [currentIndex, playableItems]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handlePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const item = playableItems[currentIndex];
    if (!item?.block.audioUrl) return;

    if (!playing) {
      if (audio.src !== item.block.audioUrl) {
        audio.src = item.block.audioUrl;
      }
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setPlaying(false);
    setCurrentIndex(0);
  };

  const handleSkip = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = "";
    }
    setPlaying(false);
    const nextIdx = currentIndex + 1;
    if (nextIdx < playableItems.length) {
      setCurrentIndex(nextIdx);
    } else {
      setCurrentIndex(0);
    }
  };

  if (playableItems.length === 0) {
    return (
      <div className="rounded-xl border border-ube-purple/20 bg-ube-purple/4 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ube-purple/80">Full Storybook Preview</span>
          <button type="button" onClick={onClose} className="text-xs text-tiki-brown/40 hover:text-tiki-brown/70 transition-colors">
            ✕ Close
          </button>
        </div>
        <p className="text-xs text-tiki-brown/50">No blocks have audio yet. Generate audio to preview.</p>
      </div>
    );
  }

  const currentItem = playableItems[currentIndex];
  const missingCount = sequence.filter((item) => !item.block.audioUrl).length;
  const displayDots = playableItems.slice(0, 20);

  return (
    <div className="rounded-xl border border-ube-purple/20 bg-ube-purple/4 p-3 flex flex-col gap-2">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={audioRef} preload="none" />

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs font-bold text-ube-purple/80">Full Storybook Preview</span>
        <div className="flex items-center gap-2">
          {currentItem && (
            <span className="text-[10px] text-tiki-brown/55">
              {currentItem.pageLabel} — Block {currentIndex + 1} of {playableItems.length}
            </span>
          )}
          <button
            type="button"
            onClick={() => { handleStop(); onClose(); }}
            className="text-xs text-tiki-brown/40 hover:text-tiki-brown/70 transition-colors"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {currentItem && (
        <div className="text-[10px] text-tiki-brown/60 leading-snug">
          <span className="font-semibold">Now playing: {speakerName(currentItem.block.speakerSlug)}</span>
          {currentItem.block.text && (
            <span className="block text-tiki-brown/45 italic mt-0.5">
              &ldquo;{currentItem.block.text.slice(0, 80)}{currentItem.block.text.length > 80 ? "…" : ""}&rdquo;
            </span>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handlePlay}
          disabled={playing}
          title="Play"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/20 border border-ube-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ▶ Play
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!playing}
          title="Pause"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ⏸ Pause
        </button>
        <button
          type="button"
          onClick={handleStop}
          title="Stop"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 transition-colors"
        >
          ⏹ Stop
        </button>
        <button
          type="button"
          onClick={handleSkip}
          disabled={playableItems.length <= 1}
          title="Skip to next block"
          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ⏭ Skip
        </button>
      </div>

      {/* Block progress dots (max 20) */}
      <div className="flex items-center gap-1 flex-wrap">
        {displayDots.map((item, i) => (
          <button
            key={item.block.id}
            type="button"
            onClick={() => {
              handleStop();
              setCurrentIndex(i);
            }}
            title={`Block ${i + 1}: ${speakerName(item.block.speakerSlug)} — ${item.pageLabel}`}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
              i === currentIndex
                ? "text-ube-purple font-bold"
                : "text-tiki-brown/40"
            }`}
          >
            {i === currentIndex ? "●" : "○"}
          </button>
        ))}
        {playableItems.length > 20 && (
          <span className="text-[10px] text-tiki-brown/35">+{playableItems.length - 20} more</span>
        )}
      </div>

      {missingCount > 0 && (
        <p className="text-[10px] text-amber-600/80 bg-amber-50 border border-amber-200 rounded px-2 py-1 leading-snug">
          {missingCount} block{missingCount !== 1 ? "s are" : " is"} missing audio and will be skipped during preview.
        </p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PublishState =
  | { phase: "idle" }
  | { phase: "publishing" }
  | { phase: "done"; message: string }
  | { phase: "error"; message: string };

export default function StorybookAudioScriptStudio({
  slug,
  storybookPages,
  initialStorybookAudioScript,
  initialNarration,
}: {
  slug: string;
  storybookPages: StorybookPage[];
  initialStorybookAudioScript: StorybookAudioScript;
  initialNarration?: StorybookNarrationAudio | null;
}) {
  const [script, setScript] = useState<StorybookAudioScript>(initialStorybookAudioScript);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    storybookPages.length > 0 ? storybookPages[0].id : null
  );
  const [saveState, setSaveState] = useState<SaveState>({ phase: "idle" });
  const [activeTab, setActiveTab] = useState<"pages" | "speakers">("pages");
  const [pageGenStates, setPageGenStates] = useState<Map<string, PageGenState>>(new Map());
  const [showPagePlayer, setShowPagePlayer] = useState(false);
  const [fullBookGenState, setFullBookGenState] = useState<FullBookGenState>({ phase: "idle" });
  const [showFullBookPlayer, setShowFullBookPlayer] = useState(false);
  const [currentNarration, setCurrentNarration] = useState<StorybookNarrationAudio | null>(initialNarration ?? null);
  const [publishState, setPublishState] = useState<PublishState>({ phase: "idle" });

  const selectedPage = script.pages.find((p) => p.pageId === selectedPageId) ?? null;
  const selectedStorybookPage = storybookPages.find((p) => p.id === selectedPageId) ?? null;

  // ── Speakers ──────────────────────────────────────────────────────────────

  const updateSpeaker = useCallback((updated: StorybookAudioSpeaker) => {
    setScript((prev) => ({
      ...prev,
      speakers: prev.speakers.map((s) =>
        s.speakerSlug === updated.speakerSlug ? updated : s
      ),
    }));
  }, []);

  const updateDefaultNarratorVoiceId = useCallback((value: string) => {
    setScript((prev) => ({
      ...prev,
      defaultNarratorVoiceId: value.trim() || undefined,
    }));
  }, []);

  // ── Blocks ────────────────────────────────────────────────────────────────

  const updateBlock = useCallback(
    (pageId: string, updatedBlock: StorybookAudioScriptBlock) => {
      setScript((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.pageId !== pageId
            ? p
            : {
                ...p,
                scriptBlocks: p.scriptBlocks.map((b) =>
                  b.id === updatedBlock.id ? updatedBlock : b
                ),
                updatedAt: new Date().toISOString(),
              }
        ),
      }));
    },
    []
  );

  const removeBlock = useCallback(
    (pageId: string, blockId: string) => {
      setScript((prev) => ({
        ...prev,
        pages: prev.pages.map((p) =>
          p.pageId !== pageId
            ? p
            : {
                ...p,
                scriptBlocks: p.scriptBlocks
                  .filter((b) => b.id !== blockId)
                  .map((b, i) => ({ ...b, sortOrder: i })),
                updatedAt: new Date().toISOString(),
              }
        ),
      }));
    },
    []
  );

  const moveBlock = useCallback(
    (pageId: string, blockId: string, direction: "up" | "down") => {
      setScript((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => {
          if (p.pageId !== pageId) return p;
          const blocks = [...p.scriptBlocks];
          const idx = blocks.findIndex((b) => b.id === blockId);
          if (idx < 0) return p;
          const targetIdx = direction === "up" ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= blocks.length) return p;
          [blocks[idx], blocks[targetIdx]] = [blocks[targetIdx], blocks[idx]];
          return {
            ...p,
            scriptBlocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    []
  );

  const addBlock = useCallback(
    (pageId: string) => {
      const defaultSpeaker = script.speakers[0] ?? { speakerSlug: "narrator", speakerName: "Narrator" };
      setScript((prev) => ({
        ...prev,
        pages: prev.pages.map((p) => {
          if (p.pageId !== pageId) return p;
          const newBlock = makeEmptyBlock(
            defaultSpeaker.speakerSlug,
            defaultSpeaker.speakerName,
            p.scriptBlocks.length
          );
          return {
            ...p,
            scriptBlocks: [...p.scriptBlocks, newBlock],
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
    },
    [script.speakers]
  );

  // ── Save ──────────────────────────────────────────────────────────────────

  const saveScript = useCallback(async (scriptToSave: StorybookAudioScript): Promise<boolean> => {
    try {
      const res = await fetch("/api/github/save-storybook-audio-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, storybookAudioScript: scriptToSave }),
      });
      const data = (await res.json()) as { ok: boolean; storybookAudioScript?: StorybookAudioScript; message?: string };
      if (!data.ok) return false;
      if (data.storybookAudioScript) setScript(data.storybookAudioScript);
      return true;
    } catch {
      return false;
    }
  }, [slug]);

  const handleSave = async () => {
    setSaveState({ phase: "saving" });
    try {
      const res = await fetch("/api/github/save-storybook-audio-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, storybookAudioScript: script }),
      });
      const data = (await res.json()) as { ok: boolean; storybookAudioScript?: StorybookAudioScript; message?: string };
      if (!data.ok) {
        setSaveState({ phase: "error", message: data.message ?? "Failed to save." });
        return;
      }
      if (data.storybookAudioScript) setScript(data.storybookAudioScript);
      setSaveState({ phase: "saved" });
    } catch {
      setSaveState({ phase: "error", message: "Network error. Please try again." });
    }
  };

  // Auto-save after audio generation: update the script state with the new block
  // and then persist to GitHub silently.
  const handleAutoSaveAfterGeneration = useCallback(async (pageId: string, updatedBlock: StorybookAudioScriptBlock) => {
    // Build updated script with the new block already applied
    setScript((prev) => {
      const updatedScript: StorybookAudioScript = {
        ...prev,
        pages: prev.pages.map((p) =>
          p.pageId !== pageId
            ? p
            : {
                ...p,
                scriptBlocks: p.scriptBlocks.map((b) =>
                  b.id === updatedBlock.id ? updatedBlock : b
                ),
                updatedAt: new Date().toISOString(),
              }
        ),
      };
      // Fire-and-forget save (errors silently ignored — user can still manual-save)
      saveScript(updatedScript).catch(() => undefined);
      return updatedScript;
    });
  }, [saveScript]);

  // ── Page generation ───────────────────────────────────────────────────────

  const setPageGenState = useCallback((pageId: string, state: PageGenState) => {
    setPageGenStates((prev) => {
      const next = new Map(prev);
      next.set(pageId, state);
      return next;
    });
  }, []);

  const handleGeneratePage = useCallback(
    async (page: StorybookAudioScriptPage, mode: "missing" | "all") => {
      const pageId = page.pageId;
      const playable = getPlayableBlocksForPage(page);

      const blocksToProcess = mode === "missing"
        ? getMissingAudioBlocks(page)
        : playable;

      if (blocksToProcess.length === 0) return;

      if (mode === "all") {
        const confirmed = window.confirm(
          "Regenerate all audio drafts for this page? Existing draft audio links will be replaced."
        );
        if (!confirmed) return;
      }

      setPageGenState(pageId, { phase: "generating", mode });

      // Build blocks payload with resolved voiceIds
      const blocksPayload = blocksToProcess.map((block) => ({
        blockId: block.id,
        text: block.text,
        speakerSlug: block.speakerSlug,
        speakerName: block.speakerName,
        voiceId: resolveVoiceId(block, script.speakers, script.defaultNarratorVoiceId),
        audioUrl: block.audioUrl,
        regenerate: mode === "all",
      }));

      try {
        const res = await fetch("/api/storybook-audio/generate-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            pageId,
            blocks: blocksPayload,
          }),
        });

        const data = (await res.json()) as {
          ok: boolean;
          pageId?: string;
          generatedBlocks?: GeneratedBlockResult[];
          pageAudioPreview?: StorybookAudioScriptPageAudioPreview;
          message?: string;
        };

        if (!data.ok && !data.generatedBlocks) {
          setPageGenState(pageId, {
            phase: "error",
            message: data.message ?? "Page audio generation failed.",
          });
          return;
        }

        const generatedBlocks = data.generatedBlocks ?? [];
        const blockErrors = generatedBlocks
          .filter((b) => b.error !== null)
          .map((b) => ({ blockId: b.blockId, error: b.error! }));

        // Apply generated audio back to script state
        setScript((prev) => {
          const updatedScript: StorybookAudioScript = {
            ...prev,
            pages: prev.pages.map((p) => {
              if (p.pageId !== pageId) return p;

              // Build a map of results by blockId
              const resultMap = new Map<string, GeneratedBlockResult>();
              for (const gb of generatedBlocks) {
                if (gb.audioUrl) resultMap.set(gb.blockId, gb);
              }

              const updatedBlocks = p.scriptBlocks.map((b) => {
                const result = resultMap.get(b.id);
                if (!result) return b;
                return {
                  ...b,
                  audioUrl: result.audioUrl ?? b.audioUrl,
                  pathname: result.pathname ?? b.pathname,
                  mimeType: result.mimeType ?? b.mimeType,
                  sizeBytes: result.sizeBytes ?? b.sizeBytes,
                  generatedAt: result.generatedAt ?? b.generatedAt,
                  generationProvider: result.provider === "elevenlabs" ? ("elevenlabs" as const) : b.generationProvider,
                  generationModelId: result.modelId ?? b.generationModelId,
                  generationError: undefined,
                  updatedAt: new Date().toISOString(),
                };
              });

              return {
                ...p,
                scriptBlocks: updatedBlocks,
                pageAudioPreview: data.pageAudioPreview ?? p.pageAudioPreview,
                updatedAt: new Date().toISOString(),
              };
            }),
          };

          // Auto-save to GitHub
          saveScript(updatedScript).catch(() => undefined);
          return updatedScript;
        });

        const successCount = generatedBlocks.filter((b) => b.audioUrl !== null).length;
        const doneMessage = blockErrors.length > 0
          ? `${successCount} of ${generatedBlocks.length} blocks generated. ${blockErrors.length} failed.`
          : `Page audio generated and saved. (${successCount} block${successCount !== 1 ? "s" : ""})`;

        setPageGenState(pageId, {
          phase: "done",
          message: doneMessage,
          blockErrors: blockErrors.length > 0 ? blockErrors : undefined,
        });
      } catch {
        setPageGenState(pageId, {
          phase: "error",
          message: "Network error during page audio generation. Please try again.",
        });
      }
    },
    [script, slug, saveScript, setPageGenState]
  );

  // ── Full-book generation ──────────────────────────────────────────────────

  const handleGenerateFullBook = useCallback(
    async (mode: "missing-only" | "regenerate-all") => {
      const sequence = getFullBookAudioSequence(script, storybookPages);
      if (sequence.length === 0) return;

      if (mode === "regenerate-all") {
        const confirmed = window.confirm(
          "Regenerate all audio drafts for this storybook? Existing draft audio links in the script will be replaced. The final public narration file will not be changed."
        );
        if (!confirmed) return;
      }

      // Build blocks payload, grouped by page
      const pageMap = new Map<string, { pageId: string; blocks: Array<{
        blockId: string;
        text: string;
        speakerSlug: string;
        speakerName: string;
        voiceId: string | undefined;
        audioUrl: string | undefined;
        regenerate: boolean;
      }> }>();

      const voiceErrors: Array<{ speakerName: string; pageLabel: string; blockIndex: number }> = [];

      for (const item of sequence) {
        // For missing-only mode, skip blocks that already have audio
        if (mode === "missing-only" && item.block.audioUrl) {
          // Still need to include in payload so API can track them
          // Just mark them as not needing regeneration
        }

        const resolvedVoiceId = resolveVoiceId(item.block, script.speakers, script.defaultNarratorVoiceId);
        // Only flag missing voiceId error if this block needs generation
        const needsGeneration = mode === "regenerate-all" || !item.block.audioUrl;
        if (needsGeneration && !resolvedVoiceId) {
          const sbPage = storybookPages.find((p) => p.id === item.pageId);
          const label = sbPage ? pageLabel(sbPage) : item.pageId;
          voiceErrors.push({
            speakerName: item.block.speakerName,
            pageLabel: label,
            blockIndex: pageMap.get(item.pageId)?.blocks.length ?? 0,
          });
        }

        if (!pageMap.has(item.pageId)) {
          pageMap.set(item.pageId, { pageId: item.pageId, blocks: [] });
        }
        pageMap.get(item.pageId)!.blocks.push({
          blockId: item.block.id,
          text: item.block.text,
          speakerSlug: item.block.speakerSlug,
          speakerName: item.block.speakerName,
          voiceId: resolvedVoiceId,
          audioUrl: item.block.audioUrl,
          regenerate: mode === "regenerate-all",
        });
      }

      // Pre-validation: show voice ID errors before calling API
      if (voiceErrors.length > 0) {
        const errorLines = voiceErrors
          .map((e) => `• ${e.speakerName} (${e.pageLabel}, block ${e.blockIndex + 1})`)
          .join("\n");
        setFullBookGenState({
          phase: "error",
          message: `Cannot generate: missing voice ID for:\n${errorLines}\nAdd voice IDs in the Speakers tab above.`,
        });
        return;
      }

      const pages = Array.from(pageMap.values());
      setFullBookGenState({ phase: "generating", mode });

      try {
        const res = await fetch("/api/storybook-audio/generate-full-book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, mode, pages }),
        });

        const data = (await res.json()) as {
          ok: boolean;
          generatedBlocks?: FullBookGeneratedBlockResult[];
          fullBookAudioPreview?: StorybookFullBookAudioPreview;
          message?: string;
        };

        if (!data.ok && !data.generatedBlocks) {
          setFullBookGenState({
            phase: "error",
            message: data.message ?? "Full storybook audio generation failed.",
          });
          return;
        }

        const generatedBlocks = data.generatedBlocks ?? [];
        const blockErrors = generatedBlocks
          .filter((b) => b.error !== null)
          .map((b) => ({ pageId: b.pageId, blockId: b.blockId, error: b.error! }));

        // Apply generated audio back to script state
        setScript((prev) => {
          // Build result map keyed by blockId
          const resultMap = new Map<string, FullBookGeneratedBlockResult>();
          for (const gb of generatedBlocks) {
            if (gb.audioUrl) resultMap.set(gb.blockId, gb);
          }

          const updatedScript: StorybookAudioScript = {
            ...prev,
            pages: prev.pages.map((p) => {
              const updatedBlocks = p.scriptBlocks.map((b) => {
                const result = resultMap.get(b.id);
                if (!result) return b;
                return {
                  ...b,
                  audioUrl: result.audioUrl ?? b.audioUrl,
                  pathname: result.pathname ?? b.pathname,
                  mimeType: result.mimeType ?? b.mimeType,
                  sizeBytes: result.sizeBytes ?? b.sizeBytes,
                  generatedAt: result.generatedAt ?? b.generatedAt,
                  generationProvider: result.provider === "elevenlabs" ? ("elevenlabs" as const) : b.generationProvider,
                  generationModelId: result.modelId ?? b.generationModelId,
                  generationError: undefined,
                  updatedAt: new Date().toISOString(),
                };
              });
              const hadUpdates = updatedBlocks.some((b, i) => b !== p.scriptBlocks[i]);
              return hadUpdates ? { ...p, scriptBlocks: updatedBlocks, updatedAt: new Date().toISOString() } : p;
            }),
            fullBookAudioPreview: data.fullBookAudioPreview ?? prev.fullBookAudioPreview,
          };

          // Auto-save to GitHub
          saveScript(updatedScript).catch(() => undefined);
          return updatedScript;
        });

        const successCount = generatedBlocks.filter((b) => b.audioUrl !== null && b.provider !== "existing").length;
        const doneMessage = blockErrors.length > 0
          ? `${successCount} of ${generatedBlocks.length} blocks generated. ${blockErrors.length} failed. Full storybook audio draft saved.`
          : `Full storybook audio draft updated and saved. (${successCount} block${successCount !== 1 ? "s" : ""} generated)`;

        setFullBookGenState({
          phase: "done",
          message: doneMessage,
          blockErrors: blockErrors.length > 0 ? blockErrors : undefined,
        });
      } catch {
        setFullBookGenState({
          phase: "error",
          message: "Network error during full storybook audio generation. Please try again.",
        });
      }
    },
    [script, storybookPages, slug, saveScript]
  );

  const updateScriptStatus = (status: StorybookAudioScriptStatus) => {
    setScript((prev) => ({ ...prev, status }));
    setSaveState({ phase: "idle" });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const totalBlocks = script.pages.reduce((sum, p) => sum + p.scriptBlocks.length, 0);
  const pagesWithBlocks = script.pages.filter((p) => p.scriptBlocks.length > 0).length;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-tiki-brown/10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📝</span>
          <div>
            <h3 className="text-sm font-black text-tiki-brown">Audio Script Studio</h3>
            <p className="text-xs text-tiki-brown/50 mt-0.5">
              Write page-by-page narration and dialogue scripts.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <select
            value={script.status}
            onChange={(e) => updateScriptStatus(e.target.value as StorybookAudioScriptStatus)}
            className="text-xs font-bold px-3 py-1.5 rounded-full border border-tiki-brown/15 bg-tiki-brown/3 text-tiki-brown/60 focus:outline-none focus:border-ube-purple/40 transition-colors"
          >
            {(["draft", "ready-for-generation", "approved", "archived"] as StorybookAudioScriptStatus[]).map((s) => (
              <option key={s} value={s}>{SCRIPT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          {totalBlocks > 0 && (
            <span className="text-[10px] text-tiki-brown/40">
              {totalBlocks} block{totalBlocks !== 1 ? "s" : ""} across {pagesWithBlocks} page{pagesWithBlocks !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="flex border-b border-tiki-brown/10">
        {(["pages", "speakers"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wide transition-colors ${
              activeTab === tab
                ? "border-b-2 border-ube-purple text-ube-purple"
                : "text-tiki-brown/45 hover:text-tiki-brown/70"
            }`}
          >
            {tab === "pages" ? "📖 Pages" : "🎭 Speakers"}
          </button>
        ))}
      </div>

      {/* ── Speakers tab ── */}
      {activeTab === "speakers" && (
        <div className="px-6 py-4 flex flex-col gap-3">
          {/* Default Narrator Voice ID */}
          <div className="flex items-center gap-3 pb-3 border-b border-tiki-brown/10">
            <label className="text-xs font-bold text-tiki-brown/60 whitespace-nowrap">
              Default Narrator Voice ID:
            </label>
            <input
              type="text"
              value={script.defaultNarratorVoiceId ?? ""}
              placeholder="ElevenLabs voice ID for narrator"
              onChange={(e) => updateDefaultNarratorVoiceId(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-tiki-brown/15 bg-white text-tiki-brown/70 placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40 transition-colors font-mono"
            />
          </div>

          <p className="text-xs text-tiki-brown/50 leading-relaxed">
            Assign voice IDs to speakers for audio generation. Voice labels are optional.
          </p>
          <div className="flex flex-col">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 py-1.5 border-b border-tiki-brown/10">
              <span className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">Speaker</span>
              <span className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">Voice Label</span>
              <span className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">Voice ID (ElevenLabs)</span>
            </div>
            {script.speakers.map((speaker) => (
              <SpeakerRow key={speaker.speakerSlug} speaker={speaker} onChange={updateSpeaker} />
            ))}
          </div>
        </div>
      )}

      {/* ── Pages tab ── */}
      {activeTab === "pages" && (
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">

          {/* Page selector sidebar */}
          <div className="sm:w-44 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-tiki-brown/10 overflow-y-auto">
            {storybookPages.length === 0 ? (
              <p className="text-xs text-tiki-brown/40 px-4 py-4">No pages uploaded yet.</p>
            ) : (
              <ul className="flex sm:flex-col flex-row overflow-x-auto">
                {storybookPages.map((sbPage) => {
                  const scriptPage = script.pages.find((p) => p.pageId === sbPage.id);
                  const blockCount = scriptPage?.scriptBlocks.length ?? 0;
                  const isSelected = selectedPageId === sbPage.id;
                  return (
                    <li key={sbPage.id} className="flex-shrink-0 sm:flex-shrink">
                      <button
                        type="button"
                        onClick={() => setSelectedPageId(sbPage.id)}
                        className={`w-full text-left px-3 py-2.5 border-b border-tiki-brown/8 last:border-0 transition-colors flex items-center gap-2 ${
                          isSelected
                            ? "bg-ube-purple/8 border-l-2 border-l-ube-purple"
                            : "hover:bg-tiki-brown/4"
                        }`}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="text-xs font-semibold text-tiki-brown/70 block truncate">
                            {pageLabel(sbPage)}
                          </span>
                          {blockCount > 0 && (
                            <span className="text-[10px] text-ube-purple/60">
                              {blockCount} block{blockCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Page script editor */}
          <div className="flex-1 min-w-0 px-5 py-4 flex flex-col gap-3 overflow-y-auto">
            {!selectedPage || !selectedStorybookPage ? (
              <p className="text-xs text-tiki-brown/40">Select a page to edit its script.</p>
            ) : (
              <>
                {/* Page identity */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-tiki-brown">
                    {pageLabel(selectedStorybookPage)}
                  </span>
                  {selectedStorybookPage.pageRole && (
                    <span className="text-[10px] font-mono text-tiki-brown/35 bg-tiki-brown/5 px-1.5 py-0.5 rounded">
                      {selectedStorybookPage.pageRole}
                    </span>
                  )}
                </div>

                {/* ── Page Audio Controls ── */}
                {(() => {
                  const pageId = selectedPage.pageId;
                  const playable = getPlayableBlocksForPage(selectedPage);
                  const missing = getMissingAudioBlocks(selectedPage);
                  const hasAnyAudio = playable.some((b) => !!b.audioUrl);
                  const allHaveAudio = playable.length > 0 && !hasMissingBlockAudio(selectedPage);
                  const pageGenState = pageGenStates.get(pageId) ?? { phase: "idle" };
                  const isGenerating = pageGenState.phase === "generating";

                  if (playable.length === 0) return null;

                  return (
                    <div className="rounded-xl border border-tiki-brown/12 bg-tiki-brown/2 p-3 flex flex-col gap-2">
                      <span className="text-[10px] font-bold text-tiki-brown/50 uppercase tracking-wide">
                        Page Audio
                      </span>

                      {/* Generation buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleGeneratePage(selectedPage, "missing")}
                          disabled={isGenerating || allHaveAudio || missing.length === 0}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tropical-green/10 text-tropical-green hover:bg-tropical-green/20 border border-tropical-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {isGenerating && pageGenState.mode === "missing"
                            ? "Generating…"
                            : "Generate Missing Audio"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleGeneratePage(selectedPage, "all")}
                          disabled={isGenerating || playable.length === 0}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {isGenerating && pageGenState.mode === "all"
                            ? "Regenerating…"
                            : "Regenerate All Drafts"}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowPagePlayer((prev) => !prev)}
                          disabled={!hasAnyAudio}
                          className="text-xs font-bold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/20 border border-ube-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {showPagePlayer ? "▼ Hide Preview" : "▶ Preview Page Audio"}
                        </button>
                      </div>

                      {/* Generation status */}
                      {pageGenState.phase === "done" && (
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-tropical-green font-semibold">
                            ✓ {pageGenState.message}
                          </span>
                          {pageGenState.blockErrors?.map((e) => (
                            <span key={e.blockId} className="text-[10px] text-warm-coral">
                              Block {e.blockId}: {e.error}
                            </span>
                          ))}
                        </div>
                      )}
                      {pageGenState.phase === "error" && (
                        <span className="text-[10px] text-warm-coral font-semibold">
                          ✕ {pageGenState.message}
                        </span>
                      )}

                      {/* Sequential player */}
                      {showPagePlayer && hasAnyAudio && (
                        <PageSequencePlayer
                          blocks={playable}
                          speakerName={(speakerSlug) => {
                            const found = script.speakers.find((s) => s.speakerSlug === speakerSlug);
                            return found?.speakerName ?? speakerSlug;
                          }}
                        />
                      )}
                    </div>
                  );
                })()}

                {/* Script blocks */}
                {selectedPage.scriptBlocks.length === 0 ? (
                  <p className="text-xs text-tiki-brown/35 italic">No script blocks yet. Add one below.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedPage.scriptBlocks
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((block, idx, arr) => (
                        <BlockEditor
                          key={block.id}
                          block={block}
                          speakers={script.speakers}
                          script={script}
                          slug={slug}
                          pageId={selectedPage.pageId}
                          onUpdate={(updated) => updateBlock(selectedPage.pageId, updated)}
                          onRemove={() => removeBlock(selectedPage.pageId, block.id)}
                          onMoveUp={() => moveBlock(selectedPage.pageId, block.id, "up")}
                          onMoveDown={() => moveBlock(selectedPage.pageId, block.id, "down")}
                          isFirst={idx === 0}
                          isLast={idx === arr.length - 1}
                          onAutoSave={(updatedBlock) =>
                            handleAutoSaveAfterGeneration(selectedPage.pageId, updatedBlock)
                          }
                        />
                      ))}
                  </div>
                )}

                {/* Add block */}
                <button
                  type="button"
                  onClick={() => addBlock(selectedPage.pageId)}
                  className="self-start text-xs font-bold px-3.5 py-2 rounded-full bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/20 transition-colors border border-ube-purple/20"
                >
                  + Add Script Block
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Full Storybook Audio Draft panel ── */}
      {(() => {
        const fullBookStats = getFullBookAudioStats(script, storybookPages);
        const fullBookSequence = getFullBookAudioSequence(script, storybookPages);
        const isGenerating = fullBookGenState.phase === "generating";
        const hasAnyAudio = fullBookSequence.some((item) => !!item.block.audioUrl);
        const allHaveAudio = fullBookStats.missingAudioBlocks === 0 && fullBookStats.totalBlocks > 0;

        if (fullBookStats.totalBlocks === 0) return null;

        const fullBookPlayerSequence: FullBookSequenceItem[] = fullBookSequence.map((item) => {
          const sbPage = storybookPages.find((p) => p.id === item.pageId);
          return {
            ...item,
            pageLabel: sbPage ? pageLabel(sbPage) : item.pageId,
          };
        });

        return (
          <details className="border-t border-tiki-brown/10">
            <summary className="flex items-center gap-2 px-6 py-3 cursor-pointer select-none hover:bg-tiki-brown/3 transition-colors list-none">
              <span className="text-sm font-black text-tiki-brown">Full Storybook Audio Draft</span>
              <span className="text-[10px] text-tiki-brown/40 ml-auto">click to expand</span>
            </summary>

            <div className="px-6 pb-5 flex flex-col gap-3">
              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-[11px] text-tiki-brown/60">
                <span>Total pages with script: <strong className="text-tiki-brown/80">{fullBookStats.totalPages}</strong></span>
                <span>Total blocks: <strong className="text-tiki-brown/80">{fullBookStats.totalBlocks}</strong></span>
                <span>
                  Missing audio:{" "}
                  <strong className={fullBookStats.missingAudioBlocks > 0 ? "text-warm-coral" : "text-tropical-green"}>
                    {fullBookStats.missingAudioBlocks}
                  </strong>
                </span>
                {script.fullBookAudioPreview && (
                  <>
                    <span>Last generated: <strong className="text-tiki-brown/80">{formatGeneratedAt(script.fullBookAudioPreview.generatedAt)}</strong></span>
                    <span>Status: <strong className="text-tiki-brown/80">{script.fullBookAudioPreview.status}</strong></span>
                  </>
                )}
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleGenerateFullBook("missing-only")}
                  disabled={isGenerating || allHaveAudio || fullBookStats.totalBlocks === 0}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-tropical-green/10 text-tropical-green hover:bg-tropical-green/20 border border-tropical-green/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating && fullBookGenState.phase === "generating" && fullBookGenState.mode === "missing-only"
                    ? "Generating…"
                    : "Generate Missing Audio for Full Storybook"}
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateFullBook("regenerate-all")}
                  disabled={isGenerating || fullBookStats.totalBlocks === 0}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 border border-tiki-brown/15 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating && fullBookGenState.phase === "generating" && fullBookGenState.mode === "regenerate-all"
                    ? "Regenerating…"
                    : "Regenerate Full Storybook Draft Audio"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullBookPlayer((prev) => !prev)}
                  disabled={isGenerating || !hasAnyAudio}
                  className="text-xs font-bold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/20 border border-ube-purple/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {showFullBookPlayer ? "Stop Preview" : "Preview Full Storybook Audio"}
                </button>
              </div>

              {/* Generation status */}
              {fullBookGenState.phase === "done" && (
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-tropical-green font-semibold">
                    ✓ {fullBookGenState.message}
                  </span>
                  {fullBookGenState.blockErrors?.map((e) => (
                    <span key={`${e.pageId}-${e.blockId}`} className="text-[10px] text-warm-coral">
                      Page {e.pageId}, Block {e.blockId}: {e.error}
                    </span>
                  ))}
                </div>
              )}
              {fullBookGenState.phase === "error" && (
                <span className="text-[10px] text-warm-coral font-semibold whitespace-pre-line">
                  ✕ {fullBookGenState.message}
                </span>
              )}

              {/* Full book player */}
              {showFullBookPlayer && hasAnyAudio && (
                <FullBookSequencePlayer
                  sequence={fullBookPlayerSequence}
                  speakerName={(speakerSlug) => {
                    const found = script.speakers.find((s) => s.speakerSlug === speakerSlug);
                    return found?.speakerName ?? speakerSlug;
                  }}
                  onClose={() => setShowFullBookPlayer(false)}
                />
              )}
            </div>
          </details>
        );
      })()}

      {/* ── Publish Listen & Read Audio panel ── */}
      {(() => {
        const fullBookStats = getFullBookAudioStats(script, storybookPages);
        const { totalBlocks, missingAudioBlocks } = fullBookStats;

        if (totalBlocks === 0) return null;

        const isPublishing = publishState.phase === "publishing";
        const canPublish = missingAudioBlocks === 0 && totalBlocks > 0 && !isPublishing;

        const narrationMode = currentNarration?.mode ?? "single-file";
        let currentSourceLabel: string;
        if (isStorybookNarrationPublic(currentNarration)) {
          if (narrationMode === "sequence") {
            currentSourceLabel = "Generated audio sequence is live";
          } else {
            currentSourceLabel = "Manual uploaded audio is live";
          }
        } else {
          currentSourceLabel = "No public audio yet";
        }

        const handlePublish = async () => {
          if (!canPublish) return;
          const confirmed = window.confirm(
            "Publish the generated audio reader sequence as the public Listen & Read audio? This will replace any existing public audio source."
          );
          if (!confirmed) return;

          setPublishState({ phase: "publishing" });
          try {
            const res = await fetch("/api/github/publish-storybook-audio-sequence", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ slug }),
            });
            const data = (await res.json()) as {
              ok: boolean;
              storybookNarration?: StorybookNarrationAudio;
              sequenceBlockCount?: number;
              message?: string;
            };
            if (!data.ok) {
              setPublishState({ phase: "error", message: data.message ?? "Failed to publish." });
              return;
            }
            if (data.storybookNarration) {
              setCurrentNarration(data.storybookNarration);
            }
            setPublishState({ phase: "done", message: "Generated audio reader is now public for Listen & Read." });
          } catch {
            setPublishState({ phase: "error", message: "Network error. Please try again." });
          }
        };

        return (
          <details className="border-t border-tiki-brown/10">
            <summary className="flex items-center gap-2 px-6 py-3 cursor-pointer select-none hover:bg-tiki-brown/3 transition-colors list-none">
              <span className="text-sm font-black text-tiki-brown">Publish Listen &amp; Read Audio</span>
              <span className="text-[10px] text-tiki-brown/40 ml-auto">click to expand</span>
            </summary>

            <div className="px-6 pb-5 flex flex-col gap-3">
              {/* Stats */}
              <div className="flex flex-wrap gap-4 text-[11px] text-tiki-brown/60">
                <span>
                  Total sequence blocks:{" "}
                  <strong className="text-tiki-brown/80">{totalBlocks}</strong>
                </span>
                <span>
                  Missing audio:{" "}
                  <strong className={missingAudioBlocks > 0 ? "text-warm-coral" : "text-tropical-green"}>
                    {missingAudioBlocks}
                  </strong>
                </span>
                <span>
                  Current public audio source:{" "}
                  <strong className={isStorybookNarrationPublic(currentNarration) ? "text-tropical-green" : "text-tiki-brown/55"}>
                    {currentSourceLabel}
                  </strong>
                </span>
              </div>

              {/* Publish button */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className="text-xs font-bold px-4 py-2 rounded-full bg-ube-purple/15 text-ube-purple hover:bg-ube-purple/25 border border-ube-purple/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isPublishing ? "Publishing…" : "Publish Generated Audio Reader"}
                </button>
              </div>

              {/* Status feedback */}
              {publishState.phase === "done" && (
                <span className="text-[10px] text-tropical-green font-semibold">
                  ✓ {publishState.message}
                </span>
              )}
              {publishState.phase === "error" && (
                <span className="text-[10px] text-warm-coral font-semibold">
                  ✕ {(publishState as { phase: "error"; message: string }).message}
                </span>
              )}

              {/* Info text */}
              <p className="text-[10px] text-tiki-brown/45 leading-relaxed">
                Manual uploaded audio and generated audio reader are two ways to power Listen &amp; Read. Publishing one will set it as the public audio source.
              </p>
            </div>
          </details>
        );
      })()}

      {/* ── Save bar ── */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-tiki-brown/10 bg-tiki-brown/2 flex-wrap">
        <div className="text-xs text-tiki-brown/50 leading-snug">
          {saveState.phase === "error" && (
            <span className="text-warm-coral font-semibold">✕ {saveState.message}</span>
          )}
          {saveState.phase === "saved" && (
            <span className="text-tropical-green font-semibold">✓ Script saved to storybook.</span>
          )}
          {saveState.phase === "idle" && totalBlocks === 0 && (
            <span>Add script blocks to pages, then save.</span>
          )}
          {saveState.phase === "idle" && totalBlocks > 0 && (
            <span>{totalBlocks} block{totalBlocks !== 1 ? "s" : ""} — save when ready.</span>
          )}
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveState.phase === "saving"}
          className="text-xs font-bold px-5 py-2 rounded-full bg-ube-purple/15 text-ube-purple hover:bg-ube-purple/25 border border-ube-purple/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saveState.phase === "saving" ? "Saving…" : "Save Script"}
        </button>
        {/* TODO: Phase Audio 3+ — "Compile Full Narration" and "Approve Final" buttons here */}
      </div>
    </div>
  );
}
