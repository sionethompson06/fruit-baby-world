"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { CoverPageSettings, CoverPageVideo } from "@/lib/coverPageTypes";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

function fromDatetimeLocal(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}

// ─── Video list helpers ───────────────────────────────────────────────────────

function getNonArchived(videos: CoverPageVideo[]): CoverPageVideo[] {
  return [...videos]
    .filter((v) => !v.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

function getArchived(videos: CoverPageVideo[]): CoverPageVideo[] {
  return videos.filter((v) => Boolean(v.archivedAt));
}

function reassignSortOrders(videos: CoverPageVideo[]): CoverPageVideo[] {
  return videos.map((v, i) => ({ ...v, sortOrder: i }));
}

// ─── Video card ───────────────────────────────────────────────────────────────

function VideoCard({
  video,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onArchive,
}: {
  video: CoverPageVideo;
  index: number;
  total: number;
  onUpdate: (changes: Partial<CoverPageVideo>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchive: () => void;
}) {
  const isMovQuicktime =
    video.mimeType === "video/quicktime" || video.originalFilename?.toLowerCase().endsWith(".mov");

  return (
    <div
      className={`rounded-2xl border p-4 flex flex-col gap-3 ${
        video.isActive
          ? "bg-white border-tiki-brown/10"
          : "bg-tiki-brown/3 border-tiki-brown/8"
      }`}
    >
      {/* Top row: preview + controls */}
      <div className="flex gap-3">
        {/* Video preview */}
        <div className="flex-shrink-0 w-32 sm:w-40">
          <video
            src={video.videoUrl}
            className="w-full aspect-video rounded-xl object-contain bg-black"
            controls
            preload="metadata"
            aria-label={video.title || video.originalFilename || "Video preview"}
          />
          {isMovQuicktime && (
            <p className="text-[10px] text-warm-coral/70 mt-1 font-semibold">
              .mov — browser playback may vary
            </p>
          )}
        </div>

        {/* Meta + actions */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Title input */}
          <input
            type="text"
            value={video.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Video title"
            className="w-full rounded-lg border border-tiki-brown/15 bg-transparent px-2.5 py-1.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30"
            aria-label="Video title"
          />

          {/* Filename */}
          {video.originalFilename && (
            <p className="text-xs text-tiki-brown/40 truncate">
              {video.originalFilename}
              {video.sizeBytes && (
                <span className="ml-1">
                  ({(video.sizeBytes / 1024 / 1024).toFixed(1)} MB)
                </span>
              )}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {/* Active toggle */}
            <button
              type="button"
              onClick={() => onUpdate({ isActive: !video.isActive })}
              className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
                video.isActive
                  ? "bg-tropical-green/12 text-tropical-green hover:bg-tropical-green/20"
                  : "bg-tiki-brown/8 text-tiki-brown/50 hover:bg-tiki-brown/15"
              }`}
            >
              {video.isActive ? "✓ Active" : "○ Inactive"}
            </button>

            {/* Move up */}
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              aria-label="Move video up"
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-tiki-brown/6 text-tiki-brown/60 hover:bg-tiki-brown/12 disabled:opacity-30 transition-colors"
            >
              ↑
            </button>

            {/* Move down */}
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              aria-label="Move video down"
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-tiki-brown/6 text-tiki-brown/60 hover:bg-tiki-brown/12 disabled:opacity-30 transition-colors"
            >
              ↓
            </button>

            {/* Archive */}
            <button
              type="button"
              onClick={onArchive}
              aria-label="Archive video"
              className="text-xs font-bold px-2.5 py-1 rounded-full bg-warm-coral/8 text-warm-coral/70 hover:bg-warm-coral/15 transition-colors ml-auto"
            >
              Archive
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export default function AdminCoverForm({
  initial,
}: {
  initial: CoverPageSettings;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<CoverPageSettings>(initial);
  const [unsaved, setUnsaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Upload state
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Archived section visibility
  const [showArchived, setShowArchived] = useState(false);

  // ── Settings helpers ──────────────────────────────────────────────────────

  function set<K extends keyof CoverPageSettings>(
    key: K,
    value: CoverPageSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setUnsaved(true);
    setSaveResult(null);
  }

  // ── Video helpers ─────────────────────────────────────────────────────────

  function updateVideo(id: string, changes: Partial<CoverPageVideo>) {
    setSettings((prev) => ({
      ...prev,
      videos: prev.videos.map((v) => (v.id === id ? { ...v, ...changes } : v)),
    }));
    setUnsaved(true);
    setSaveResult(null);
  }

  function archiveVideo(id: string) {
    updateVideo(id, {
      archivedAt: new Date().toISOString(),
      isActive: false,
    });
  }

  function moveVideoUp(id: string) {
    setSettings((prev) => {
      const sorted = getNonArchived(prev.videos);
      const idx = sorted.findIndex((v) => v.id === id);
      if (idx <= 0) return prev;
      [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
      const reordered = reassignSortOrders(sorted);
      const orderMap = new Map(reordered.map((v) => [v.id, v.sortOrder]));
      return {
        ...prev,
        videos: prev.videos.map((v) =>
          orderMap.has(v.id) ? { ...v, sortOrder: orderMap.get(v.id)! } : v
        ),
      };
    });
    setUnsaved(true);
    setSaveResult(null);
  }

  function moveVideoDown(id: string) {
    setSettings((prev) => {
      const sorted = getNonArchived(prev.videos);
      const idx = sorted.findIndex((v) => v.id === id);
      if (idx < 0 || idx >= sorted.length - 1) return prev;
      [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      const reordered = reassignSortOrders(sorted);
      const orderMap = new Map(reordered.map((v) => [v.id, v.sortOrder]));
      return {
        ...prev,
        videos: prev.videos.map((v) =>
          orderMap.has(v.id) ? { ...v, sortOrder: orderMap.get(v.id)! } : v
        ),
      };
    });
    setUnsaved(true);
    setSaveResult(null);
  }

  function unarchiveVideo(id: string) {
    setSettings((prev) => {
      const maxSort = Math.max(
        0,
        ...prev.videos.filter((v) => !v.archivedAt).map((v) => v.sortOrder)
      );
      return {
        ...prev,
        videos: prev.videos.map((v) =>
          v.id === id
            ? { ...v, archivedAt: undefined, isActive: true, sortOrder: maxSort + 1 }
            : v
        ),
      };
    });
    setUnsaved(true);
    setSaveResult(null);
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const fd = new FormData();
      fd.append("file", uploadFile);
      if (uploadTitle.trim()) fd.append("title", uploadTitle.trim());

      const res = await fetch("/api/media/upload-cover-video", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        ok: boolean;
        video?: CoverPageVideo;
        message?: string;
      };

      if (data.ok && data.video) {
        const nonArchived = getNonArchived(settings.videos);
        const newVideo: CoverPageVideo = {
          ...data.video,
          sortOrder: nonArchived.length,
        };
        setSettings((prev) => ({
          ...prev,
          videos: [...prev.videos, newVideo],
        }));
        setUnsaved(true);
        setSaveResult(null);
        setUploadFile(null);
        setUploadTitle("");
        if (fileInputRef.current) fileInputRef.current.value = "";
        setUploadResult({ ok: true, message: "Video uploaded. Save settings to persist." });
      } else {
        setUploadResult({
          ok: false,
          message: data.message ?? "Upload failed.",
        });
      }
    } catch {
      setUploadResult({ ok: false, message: "Network error during upload." });
    } finally {
      setUploading(false);
    }
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSaveResult(null);
    try {
      const res = await fetch("/api/github/save-cover-page-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      setSaveResult({
        ok: data.ok,
        message: data.ok
          ? "Settings saved successfully."
          : (data.message ?? "Save failed."),
      });
      if (data.ok) {
        setUnsaved(false);
        router.refresh();
      }
    } catch {
      setSaveResult({ ok: false, message: "Network error — please try again." });
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inputClass =
    "w-full rounded-xl border border-tiki-brown/15 bg-white px-3 py-2 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30";
  const labelClass =
    "block text-xs font-bold text-tiki-brown/60 uppercase tracking-wider mb-1";

  const nonArchivedVideos = getNonArchived(settings.videos);
  const archivedVideos = getArchived(settings.videos);

  return (
    <div className="flex flex-col gap-8 max-w-2xl">

      {/* ON / OFF toggle */}
      <div className="flex items-center justify-between rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm">
        <div>
          <p className="font-black text-tiki-brown text-base">Cover Page</p>
          <p className="text-xs text-tiki-brown/50 mt-0.5">
            {settings.enabled
              ? "Public website is hidden — cover page is active."
              : "Cover page is off — public website is visible."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => set("enabled", !settings.enabled)}
          aria-label={settings.enabled ? "Disable cover page" : "Enable cover page"}
          className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
            settings.enabled ? "bg-warm-coral" : "bg-tiki-brown/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              settings.enabled ? "translate-x-8" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Countdown */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="font-black text-tiki-brown text-sm">Countdown</h2>
        <div>
          <label className={labelClass}>Unveiling date &amp; time</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={toDatetimeLocal(settings.unveilingAt)}
            onChange={(e) => set("unveilingAt", fromDatetimeLocal(e.target.value))}
          />
          <p className="text-xs text-tiki-brown/40 mt-1">
            Countdown reaching zero shows the complete message — but does NOT
            automatically reveal the site.
          </p>
        </div>
        <div>
          <label className={labelClass}>Countdown label</label>
          <input
            type="text"
            className={inputClass}
            value={settings.countdownLabel}
            onChange={(e) => set("countdownLabel", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Complete message</label>
          <input
            type="text"
            className={inputClass}
            value={settings.completeMessage}
            onChange={(e) => set("completeMessage", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Complete subtext</label>
          <input
            type="text"
            className={inputClass}
            value={settings.completeSubtext}
            onChange={(e) => set("completeSubtext", e.target.value)}
          />
        </div>
      </div>

      {/* Page copy */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm flex flex-col gap-4">
        <h2 className="font-black text-tiki-brown text-sm">Page copy</h2>
        <div>
          <label className={labelClass}>Eyebrow</label>
          <input
            type="text"
            className={inputClass}
            value={settings.eyebrow}
            onChange={(e) => set("eyebrow", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            className={inputClass}
            value={settings.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Subtitle</label>
          <textarea
            className={`${inputClass} resize-none`}
            rows={2}
            value={settings.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
      </div>

      {/* Cover Video Playlist */}
      <div className="rounded-2xl border border-tiki-brown/10 bg-white p-5 shadow-sm flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-black text-tiki-brown text-sm">
              Cover Video Playlist
            </h2>
            <p className="text-xs text-tiki-brown/50 mt-0.5">
              Active videos appear in the Sneak Peek Theater on the public cover page.
            </p>
          </div>
          {nonArchivedVideos.length > 0 && (
            <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-pineapple-yellow/20 text-tiki-brown/60">
              {nonArchivedVideos.filter((v) => v.isActive).length} active
            </span>
          )}
        </div>

        {/* Section label fields */}
        <div className="flex flex-col gap-3">
          <div>
            <label className={labelClass}>Theater section title</label>
            <input
              type="text"
              className={inputClass}
              value={settings.videoSectionTitle}
              onChange={(e) => set("videoSectionTitle", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Placeholder text (shown when no videos)</label>
            <input
              type="text"
              className={inputClass}
              value={settings.videoPlaceholderText}
              onChange={(e) => set("videoPlaceholderText", e.target.value)}
            />
          </div>
        </div>

        {/* Playlist behavior */}
        <div className="flex flex-col gap-3 pt-1 border-t border-tiki-brown/8">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wider">
            Playlist behavior
          </p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-tiki-brown">Loop playlist</p>
              <p className="text-xs text-tiki-brown/45">
                After the last video, restart from the first.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("videoLoop", !settings.videoLoop)}
              aria-label={settings.videoLoop ? "Disable loop" : "Enable loop"}
              className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
                settings.videoLoop ? "bg-ube-purple" : "bg-tiki-brown/20"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.videoLoop ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-tiki-brown">
                Autoplay (muted)
              </p>
              <p className="text-xs text-tiki-brown/45">
                Videos start playing silently. Visitors can unmute.
              </p>
            </div>
            <button
              type="button"
              onClick={() => set("autoplayMuted", !settings.autoplayMuted)}
              aria-label={
                settings.autoplayMuted ? "Disable autoplay" : "Enable autoplay"
              }
              className={`relative inline-flex h-7 w-14 flex-shrink-0 items-center rounded-full transition-colors ${
                settings.autoplayMuted ? "bg-ube-purple" : "bg-tiki-brown/20"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  settings.autoplayMuted ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Upload */}
        <div className="flex flex-col gap-3 pt-1 border-t border-tiki-brown/8">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wider">
            Upload video
          </p>
          <div>
            <label htmlFor="cover-video-file" className={labelClass}>
              Video file (mp4, webm, mov, m4v)
            </label>
            <input
              id="cover-video-file"
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
              onChange={(e) => {
                setUploadFile(e.target.files?.[0] ?? null);
                setUploadResult(null);
              }}
              className="block w-full text-sm text-tiki-brown/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-ube-purple/10 file:text-ube-purple hover:file:bg-ube-purple/15 cursor-pointer"
            />
          </div>
          <div>
            <label htmlFor="cover-video-title" className={labelClass}>
              Title (optional — defaults to filename)
            </label>
            <input
              id="cover-video-title"
              type="text"
              className={inputClass}
              placeholder="e.g. Pineapple Baby Teaser"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="rounded-xl bg-ube-purple/90 text-white font-black py-2.5 text-sm hover:bg-ube-purple transition-colors disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload Video"}
          </button>
          {uploadResult && (
            <p
              className={`text-xs font-semibold ${
                uploadResult.ok ? "text-tropical-green" : "text-warm-coral"
              }`}
            >
              {uploadResult.message}
            </p>
          )}
        </div>

        {/* Video list */}
        {nonArchivedVideos.length > 0 && (
          <div className="flex flex-col gap-3 pt-1 border-t border-tiki-brown/8">
            <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wider">
              Playlist ({nonArchivedVideos.length}{" "}
              {nonArchivedVideos.length === 1 ? "video" : "videos"})
            </p>
            {nonArchivedVideos.map((video, idx) => (
              <VideoCard
                key={video.id}
                video={video}
                index={idx}
                total={nonArchivedVideos.length}
                onUpdate={(changes) => updateVideo(video.id, changes)}
                onMoveUp={() => moveVideoUp(video.id)}
                onMoveDown={() => moveVideoDown(video.id)}
                onArchive={() => archiveVideo(video.id)}
              />
            ))}
          </div>
        )}

        {nonArchivedVideos.length === 0 && (
          <p className="text-xs text-tiki-brown/40 text-center py-2">
            No videos yet. Upload one above.
          </p>
        )}

        {/* Archived */}
        {archivedVideos.length > 0 && (
          <div className="flex flex-col gap-3 pt-1 border-t border-tiki-brown/8">
            <button
              type="button"
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-bold text-tiki-brown/40 hover:text-tiki-brown/60 text-left"
            >
              {showArchived ? "▼" : "▶"} Archived ({archivedVideos.length})
            </button>
            {showArchived &&
              archivedVideos.map((video) => (
                <div
                  key={video.id}
                  className="rounded-xl border border-tiki-brown/8 bg-tiki-brown/3 p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-tiki-brown/50 truncate">
                      {video.title || video.originalFilename || video.id}
                    </p>
                    <p className="text-[10px] text-tiki-brown/30">
                      Archived{" "}
                      {video.archivedAt
                        ? new Date(video.archivedAt).toLocaleDateString()
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => unarchiveVideo(video.id)}
                    className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-tiki-brown/8 text-tiki-brown/50 hover:bg-tiki-brown/15 transition-colors"
                  >
                    Restore
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex flex-col gap-3">
        {unsaved && (
          <p className="text-xs font-bold text-warm-coral/80 text-center">
            ⚠ You have unsaved changes
          </p>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-ube-purple text-white font-black py-3 text-sm hover:bg-ube-purple/90 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Cover Page Settings"}
        </button>
        {saveResult && (
          <p
            className={`text-sm font-semibold text-center ${
              saveResult.ok ? "text-tropical-green" : "text-warm-coral"
            }`}
          >
            {saveResult.message}
          </p>
        )}
        <p className="text-xs text-tiki-brown/35 text-center">
          Save settings before previewing latest changes.
        </p>
        <a
          href="/admin/cover/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-xs font-bold text-ube-purple/70 hover:text-ube-purple underline"
        >
          Preview cover page →
        </a>
      </div>
    </div>
  );
}
