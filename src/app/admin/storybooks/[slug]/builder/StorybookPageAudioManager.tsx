"use client";

import { useState, useRef } from "react";
import type { StorybookPage } from "@/lib/storybookPageTypes";
import type {
  StorybookPageAudioConfig,
  StorybookPageAudioItem,
} from "@/lib/storybookPageAudioTypes";
import {
  getPageAudioForPage,
  upsertPageAudioItem,
  archivePageAudioItem,
  getPageDisplayFilename,
} from "@/lib/storybookPageAudio";

type PageUploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "saving" }
  | { phase: "error"; message: string }
  | { phase: "done" };

export default function StorybookPageAudioManager({
  episodeSlug,
  storybookPages,
  initialPageAudioConfig,
}: {
  episodeSlug: string;
  storybookPages: StorybookPage[];
  initialPageAudioConfig: StorybookPageAudioConfig;
}) {
  const [config, setConfig] = useState<StorybookPageAudioConfig>(initialPageAudioConfig);
  const [pageStates, setPageStates] = useState<Record<string, PageUploadState>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function setPageState(pageId: string, state: PageUploadState) {
    setPageStates((prev) => ({ ...prev, [pageId]: state }));
  }

  async function saveConfig(updatedConfig: StorybookPageAudioConfig, pageId: string) {
    setPageState(pageId, { phase: "saving" });
    try {
      const res = await fetch("/api/github/save-storybook-page-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: episodeSlug, storybookPageAudio: updatedConfig }),
      });
      const data = await res.json();
      if (!data.ok) {
        setPageState(pageId, { phase: "error", message: data.message ?? "Failed to save." });
        return;
      }
      setConfig(data.storybookPageAudio);
      setPageState(pageId, { phase: "done" });
    } catch {
      setPageState(pageId, { phase: "error", message: "Network error." });
    }
  }

  async function handleFileSelect(page: StorybookPage, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    const allowed = [
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/aac",
      "audio/x-m4a",
    ];
    if (!allowed.includes(mime)) {
      setPageState(page.id, { phase: "error", message: "Please use MP3, WAV, or M4A/AAC." });
      return;
    }

    setPageState(page.id, { phase: "uploading" });

    try {
      const formData = new FormData();
      formData.append("slug", episodeSlug);
      formData.append("pageId", page.id);
      formData.append("file", file);

      const uploadRes = await fetch("/api/media/upload-storybook-page-audio", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) {
        setPageState(page.id, {
          phase: "error",
          message: uploadData.message ?? "Upload failed.",
        });
        return;
      }

      const now = new Date().toISOString();
      const newItem: StorybookPageAudioItem = {
        pageId: page.id,
        audioUrl: uploadData.audioUrl,
        pathname: uploadData.pathname,
        originalAudioFilename: uploadData.originalAudioFilename,
        mimeType: uploadData.mimeType,
        sizeBytes: uploadData.sizeBytes,
        status: "draft",
        visibility: "hidden",
        uploadedAt: uploadData.uploadedAt ?? now,
        updatedAt: now,
      };

      const updatedConfig = upsertPageAudioItem(config, newItem);
      await saveConfig(updatedConfig, page.id);

      const fileInput = fileRefs.current[page.id];
      if (fileInput) fileInput.value = "";
    } catch {
      setPageState(page.id, { phase: "error", message: "Network error." });
    }
  }

  async function updateItemVisibility(
    page: StorybookPage,
    visibility: "public" | "hidden"
  ) {
    const item = getPageAudioForPage(config, page.id);
    if (!item) return;
    const updated: StorybookPageAudioItem = {
      ...item,
      visibility,
      status: visibility === "public" ? "approved" : item.status,
      updatedAt: new Date().toISOString(),
    };
    const updatedConfig = upsertPageAudioItem(config, updated);
    await saveConfig(updatedConfig, page.id);
  }

  async function handleArchive(page: StorybookPage) {
    const updatedConfig = archivePageAudioItem(config, page.id);
    await saveConfig(updatedConfig, page.id);
  }

  if (storybookPages.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6">
        <p className="text-sm text-tiki-brown/50 italic">
          Upload storybook pages first to add per-page audio.
        </p>
      </div>
    );
  }

  const publicCount = config.pages.filter(
    (p) => p.status === "approved" && p.visibility === "public"
  ).length;
  const uploadedCount = config.pages.filter((p) => p.status !== "archived").length;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎵</span>
          <div>
            <h3 className="text-sm font-black text-tiki-brown">Page Audio</h3>
            <p className="text-xs text-tiki-brown/50 mt-0.5">
              Upload audio for each storybook page. Readers hear it while viewing that page.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {uploadedCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55">
              {uploadedCount} uploaded
            </span>
          )}
          {publicCount > 0 && (
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green">
              {publicCount} public
            </span>
          )}
        </div>
      </div>

      {/* Page rows */}
      <div className="flex flex-col gap-2.5">
        {storybookPages.map((page) => {
          const audioItem = getPageAudioForPage(config, page.id);
          const isArchived = audioItem?.status === "archived";
          const activeItem = isArchived ? null : audioItem;
          const pageState = pageStates[page.id] ?? { phase: "idle" };
          const busy = pageState.phase === "uploading" || pageState.phase === "saving";
          const isPublic = activeItem?.visibility === "public";
          const displayName = getPageDisplayFilename(page);

          return (
            <div
              key={page.id}
              className={`flex flex-col gap-2.5 rounded-2xl border p-4 transition-colors ${
                activeItem
                  ? "border-tiki-brown/12 bg-tiki-brown/2"
                  : "border-tiki-brown/8 bg-transparent"
              }`}
            >
              {/* Page title row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm flex-shrink-0" aria-hidden="true">📄</span>
                  <span className="text-xs font-bold text-tiki-brown/70 truncate max-w-[240px]">
                    {displayName}
                  </span>
                  {page.pageRole && (
                    <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/6 text-tiki-brown/35 uppercase tracking-wide flex-shrink-0">
                      {page.pageRole.replace(/-/g, " ")}
                    </span>
                  )}
                </div>
                {activeItem && (
                  <span
                    className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isPublic
                        ? "bg-tropical-green/15 text-tropical-green"
                        : "bg-tiki-brown/8 text-tiki-brown/45"
                    }`}
                  >
                    {isPublic ? "Public" : "Hidden"}
                  </span>
                )}
              </div>

              {/* Audio player + controls */}
              {activeItem && (
                <div className="flex flex-col gap-2">
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <audio
                    src={activeItem.audioUrl}
                    controls
                    preload="metadata"
                    className="w-full rounded-lg"
                    style={{ height: "36px" }}
                  />
                  {activeItem.originalAudioFilename && (
                    <p className="text-[10px] text-tiki-brown/35 truncate leading-tight">
                      {activeItem.originalAudioFilename}
                    </p>
                  )}
                  {/* Status controls */}
                  <div className="flex flex-wrap gap-1.5">
                    {isPublic ? (
                      <button
                        type="button"
                        onClick={() => updateItemVisibility(page, "hidden")}
                        disabled={busy}
                        className="text-xs font-semibold px-3 py-1 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/14 disabled:opacity-40 transition-colors"
                      >
                        {busy ? "Saving…" : "Hide"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => updateItemVisibility(page, "public")}
                        disabled={busy}
                        className="text-xs font-semibold px-3 py-1 rounded-xl bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25 disabled:opacity-40 transition-colors"
                      >
                        {busy ? "Saving…" : "Approve + Make Public"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleArchive(page)}
                      disabled={busy}
                      className="text-xs font-semibold px-3 py-1 rounded-xl bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-40 transition-colors"
                    >
                      {busy ? "…" : "Archive"}
                    </button>
                  </div>
                </div>
              )}

              {/* Upload area */}
              <label
                className={`flex items-center gap-2 rounded-xl border border-dashed px-3 py-2 cursor-pointer transition-all ${
                  busy
                    ? "opacity-50 pointer-events-none border-tiki-brown/15"
                    : "hover:border-ube-purple/40 hover:bg-ube-purple/3 border-tiki-brown/15"
                }`}
              >
                <span className="text-sm flex-shrink-0" aria-hidden="true">
                  {busy ? "⏳" : "🎵"}
                </span>
                <span className="text-xs font-semibold text-tiki-brown/50">
                  {pageState.phase === "uploading"
                    ? "Uploading…"
                    : pageState.phase === "saving"
                    ? "Saving to storybook…"
                    : activeItem
                    ? "Replace Audio"
                    : "Upload Audio"}
                </span>
                <input
                  ref={(el) => {
                    fileRefs.current[page.id] = el;
                  }}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/x-m4a,.mp3,.wav,.m4a,.aac"
                  onChange={(e) => handleFileSelect(page, e)}
                  disabled={busy}
                  className="hidden"
                />
              </label>

              {/* Status feedback */}
              {pageState.phase === "error" && (
                <p className="text-xs text-warm-coral bg-warm-coral/8 rounded-xl px-3 py-2">
                  {(pageState as { phase: "error"; message: string }).message}
                </p>
              )}
              {pageState.phase === "done" && (
                <p className="text-xs text-tropical-green font-semibold">Saved.</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-tiki-brown/30 leading-relaxed">
        Accepted: MP3, WAV, M4A/AAC — up to 50 MB per page. Audio starts hidden; use
        &ldquo;Approve + Make Public&rdquo; to make it available to readers.
      </p>
    </div>
  );
}
