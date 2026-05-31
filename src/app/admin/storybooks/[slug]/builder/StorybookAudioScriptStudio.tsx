"use client";

import { useState, useCallback } from "react";
import type {
  StorybookAudioScript,
  StorybookAudioScriptPage,
  StorybookAudioScriptBlock,
  StorybookAudioSpeaker,
  StorybookAudioScriptBlockType,
  StorybookAudioScriptStatus,
  StorybookAudioScriptBlockStatus,
} from "@/lib/storybookAudioScriptTypes";
import type { StorybookPage } from "@/lib/storybookPageTypes";

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

// ─── Main component ───────────────────────────────────────────────────────────

export default function StorybookAudioScriptStudio({
  slug,
  storybookPages,
  initialStorybookAudioScript,
}: {
  slug: string;
  storybookPages: StorybookPage[];
  initialStorybookAudioScript: StorybookAudioScript;
}) {
  const [script, setScript] = useState<StorybookAudioScript>(initialStorybookAudioScript);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(
    storybookPages.length > 0 ? storybookPages[0].id : null
  );
  const [saveState, setSaveState] = useState<SaveState>({ phase: "idle" });
  const [activeTab, setActiveTab] = useState<"pages" | "speakers">("pages");

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
