"use client";

import { useState, useRef } from "react";
import { put } from "@vercel/blob/client";
import type {
  AnimatedStoriesContent,
  AnimatedStory,
  AnimatedStoryClip,
  AnimatedStoryStatus,
  AnimatedStoryVisibility,
  AnimatedStoryClipStatus,
  AnimatedStoryClipVisibility,
} from "@/lib/animatedStoriesTypes";

// ── Utilities ──────────────────────────────────────────────────────────────────

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
function isValidSlug(slug: string): boolean {
  const s = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SLUG_PATTERN.test(s);
}

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Clip row ───────────────────────────────────────────────────────────────────

function AnimatedStoryClipRow({
  clip,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onArchive,
}: {
  clip: AnimatedStoryClip;
  index: number;
  total: number;
  onUpdate: (updates: Partial<AnimatedStoryClip>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onArchive: () => void;
}) {
  const isArchived = clip.status === "archived";

  return (
    <div
      className={`rounded-2xl border border-tiki-brown/15 shadow-sm bg-white p-4 flex flex-col gap-3 transition-opacity ${
        isArchived ? "opacity-50" : ""
      }`}
    >
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-black text-tiki-brown/40 w-6 flex-shrink-0 text-center">
          #{index + 1}
        </span>

        <input
          type="text"
          value={clip.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 min-w-0 text-sm font-semibold text-tiki-brown border border-tiki-brown/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-ube-purple/50"
          placeholder="Clip title"
        />

        <select
          value={clip.status}
          onChange={(e) => onUpdate({ status: e.target.value as AnimatedStoryClipStatus })}
          className="text-xs border border-tiki-brown/20 rounded-lg px-2 py-1.5 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
        >
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={clip.visibility}
          onChange={(e) =>
            onUpdate({ visibility: e.target.value as AnimatedStoryClipVisibility })
          }
          className="text-xs border border-tiki-brown/20 rounded-lg px-2 py-1.5 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
        >
          <option value="hidden">Hidden</option>
          <option value="public">Public</option>
        </select>
      </div>

      {/* Video preview */}
      {clip.videoUrl && (
        <video
          src={clip.videoUrl}
          controls
          className="w-full rounded-xl max-h-48 bg-black"
          preload="metadata"
        />
      )}

      {/* Meta + actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {clip.originalFilename && (
          <span className="text-xs text-tiki-brown/40 flex-1 truncate min-w-0">
            {clip.originalFilename}
          </span>
        )}
        {clip.uploadedAt && (
          <span className="text-xs text-tiki-brown/30 flex-shrink-0">
            {clip.uploadedAt.slice(0, 10)}
          </span>
        )}

        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-tiki-brown/20 text-tiki-brown/60 hover:bg-tiki-brown/5 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="px-2 py-1 text-xs font-bold rounded-lg border border-tiki-brown/20 text-tiki-brown/60 hover:bg-tiki-brown/5 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Move down"
          >
            ↓
          </button>
          {!isArchived && (
            <button
              type="button"
              onClick={onArchive}
              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-warm-coral/30 text-warm-coral/70 hover:bg-warm-coral/10 transition-colors"
            >
              Archive
            </button>
          )}
          {isArchived && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-tiki-brown/10 text-tiki-brown/50">
              Archived
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Story panel ────────────────────────────────────────────────────────────────

function AnimatedStoryPanel({
  story,
  index,
  total,
  onUpdate,
  onMoveUp,
  onMoveDown,
  onClipAdded,
  onClipUpdate,
  onClipMove,
  onClipArchive,
}: {
  story: AnimatedStory;
  index: number;
  total: number;
  onUpdate: (updates: Partial<AnimatedStory>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClipAdded: (clip: AnimatedStoryClip) => void;
  onClipUpdate: (clipId: string, updates: Partial<AnimatedStoryClip>) => void;
  onClipMove: (clipId: string, direction: "up" | "down") => void;
  onClipArchive: (clipId: string) => void;
}) {
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!uploadFile) {
      setUploadError("Select a video file first.");
      return;
    }
    if (!story.slug) {
      setUploadError("Add a slug to this story before uploading clips.");
      return;
    }

    setUploading(true);
    setUploadError("");

    // Step 1: Get a short-lived client token from the server.
    // This tiny GET request goes through the proxy for auth — no file body.
    let tokenData: { token: string; pathname: string };
    try {
      const params = new URLSearchParams({
        filename: uploadFile.name,
        contentType: uploadFile.type,
        storySlug: story.slug,
      });
      const tokenRes = await fetch(
        `/api/media/animated-story-clip-upload-token?${params}`
      );
      const json = (await tokenRes.json()) as {
        ok: boolean;
        token?: string;
        pathname?: string;
        message?: string;
      };
      if (!json.ok || !json.token || !json.pathname) {
        setUploadError(json.message ?? "Could not get upload token.");
        setUploading(false);
        return;
      }
      tokenData = { token: json.token, pathname: json.pathname };
    } catch {
      setUploadError("Could not reach the server. Please try again.");
      setUploading(false);
      return;
    }

    // Step 2: Upload the file directly from the browser to Vercel Blob.
    // Bypasses the serverless function entirely — no body size limit.
    let blobUrl: string;
    let blobPathname: string;
    try {
      const blob = await put(tokenData.pathname, uploadFile, {
        access: "public",
        token: tokenData.token,
        contentType: uploadFile.type,
        multipart: true,
      });
      blobUrl = blob.url;
      blobPathname = blob.pathname;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(`Upload failed: ${msg}`);
      setUploading(false);
      return;
    }

    // Step 3: Build the clip record locally and notify parent.
    const now = new Date().toISOString();
    const clip: AnimatedStoryClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: uploadTitle.trim() || uploadFile.name.replace(/\.[^.]+$/, ""),
      videoUrl: blobUrl,
      pathname: blobPathname,
      originalFilename: uploadFile.name,
      mimeType: uploadFile.type,
      sizeBytes: uploadFile.size,
      sortOrder: 9999,
      status: "approved",
      visibility: "public",
      uploadedAt: now,
      updatedAt: now,
    };

    onClipAdded(clip);
    setUploadFile(null);
    setUploadTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
  }

  const hasClips = story.clips.length > 0;
  const hasSlug = !!story.slug;

  return (
    <div className="rounded-3xl border-2 border-tiki-brown/10 bg-white overflow-hidden shadow-sm">
      {/* Story header */}
      <div className="bg-ube-purple/5 border-b border-tiki-brown/10 p-5">
        <div className="flex items-start gap-3">
          {/* Order badge */}
          <span className="text-xs font-black text-ube-purple/60 bg-ube-purple/10 rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 mt-1">
            {index + 1}
          </span>

          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            {/* Title + status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={story.title}
                onChange={(e) => onUpdate({ title: e.target.value })}
                className="flex-1 min-w-0 font-black text-lg text-tiki-brown bg-transparent border-b-2 border-transparent focus:border-ube-purple/50 focus:outline-none"
                placeholder="Story Title"
              />
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  story.status === "published"
                    ? "bg-tropical-green/20 text-tropical-green"
                    : story.status === "archived"
                    ? "bg-tiki-brown/10 text-tiki-brown/50"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {story.status}
              </span>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  story.visibility === "public"
                    ? "bg-ube-purple/10 text-ube-purple"
                    : "bg-tiki-brown/10 text-tiki-brown/50"
                }`}
              >
                {story.visibility}
              </span>
            </div>

            {/* Slug row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-tiki-brown/40 font-semibold flex-shrink-0">
                Slug:
              </span>
              <input
                type="text"
                value={story.slug}
                onChange={(e) => onUpdate({ slug: e.target.value })}
                className="flex-1 min-w-0 text-xs text-tiki-brown/70 border border-tiki-brown/20 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-ube-purple/50 font-mono"
                placeholder="story-slug"
              />
              {hasClips && (
                <span className="text-xs text-warm-coral/70 font-semibold flex-shrink-0">
                  ⚠ Has clips — keep slug stable
                </span>
              )}
            </div>
          </div>

          {/* Move buttons */}
          <div className="flex flex-col gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-tiki-brown/20 text-tiki-brown/60 hover:bg-tiki-brown/5 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move story up"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === total - 1}
              className="px-2 py-1 text-xs font-bold rounded-lg border border-tiki-brown/20 text-tiki-brown/60 hover:bg-tiki-brown/5 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Move story down"
            >
              ↓
            </button>
          </div>
        </div>
      </div>

      {/* Story body */}
      <div className="p-5 flex flex-col gap-5">
        {/* Description */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Description
          </label>
          <textarea
            value={story.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value || undefined })}
            rows={2}
            className="w-full text-sm text-tiki-brown border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/50 resize-none"
            placeholder="Optional description..."
          />
        </div>

        {/* Status / Visibility / Sort Order */}
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Status
            </label>
            <select
              value={story.status}
              onChange={(e) =>
                onUpdate({ status: e.target.value as AnimatedStoryStatus })
              }
              className="text-sm border border-tiki-brown/20 rounded-lg px-3 py-1.5 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Visibility
            </label>
            <select
              value={story.visibility}
              onChange={(e) =>
                onUpdate({ visibility: e.target.value as AnimatedStoryVisibility })
              }
              className="text-sm border border-tiki-brown/20 rounded-lg px-3 py-1.5 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
            >
              <option value="hidden">Hidden</option>
              <option value="public">Public</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Sort Order
            </label>
            <input
              type="number"
              value={story.sortOrder}
              onChange={(e) =>
                onUpdate({ sortOrder: parseInt(e.target.value, 10) || 0 })
              }
              className="w-20 text-sm border border-tiki-brown/20 rounded-lg px-3 py-1.5 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-tiki-brown/15" />

        {/* Clips section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <h3 className="font-black text-sm text-tiki-brown">Video Clips</h3>
            <span className="text-xs text-tiki-brown/40">
              ({story.clips.length} clip{story.clips.length !== 1 ? "s" : ""})
            </span>
          </div>
          <p className="text-xs text-tiki-brown/50">
            Clips will play in this order on the public viewer in the next phase.
          </p>

          {/* Upload form */}
          <div className="bg-ube-purple/5 rounded-2xl p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-tiki-brown/60">
              Upload Video Clip
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setUploadFile(f);
                setUploadError("");
              }}
              className="text-sm text-tiki-brown/70 file:mr-3 file:text-xs file:font-bold file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-ube-purple/15 file:text-ube-purple hover:file:bg-ube-purple/20 file:cursor-pointer"
            />
            <input
              type="text"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Clip title (optional — defaults to filename)"
              className="text-sm border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:border-ube-purple/50"
            />
            {uploadError && (
              <p className="text-xs text-red-500 font-semibold">{uploadError}</p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading || !uploadFile || !hasSlug}
                className="text-sm font-bold px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploading ? "Uploading…" : "Upload Clip"}
              </button>
              {!hasSlug && (
                <p className="text-xs text-warm-coral/70 font-semibold">
                  Add a slug to this story before uploading clips.
                </p>
              )}
            </div>
          </div>

          {/* Clip list */}
          {hasClips ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-tiki-brown/40 font-semibold">
                Use ↑↓ buttons to set playback order. Order # reflects clip sequence.
              </p>
              {story.clips.map((clip, clipIdx) => (
                <AnimatedStoryClipRow
                  key={clip.id}
                  clip={clip}
                  index={clipIdx}
                  total={story.clips.length}
                  onUpdate={(updates) => onClipUpdate(clip.id, updates)}
                  onMoveUp={() => onClipMove(clip.id, "up")}
                  onMoveDown={() => onClipMove(clip.id, "down")}
                  onArchive={() => onClipArchive(clip.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-tiki-brown/30 text-sm border border-dashed border-tiki-brown/15 rounded-2xl">
              No clips uploaded yet. Upload clips to build this animated story.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main manager ───────────────────────────────────────────────────────────────

export default function AnimatedStoriesManager({
  initialContent,
}: {
  initialContent: AnimatedStoriesContent;
}) {
  const [config, setConfig] = useState<AnimatedStoriesContent>(initialContent);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");

  // Create form state
  const [createTitle, setCreateTitle] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStatus, setCreateStatus] = useState<AnimatedStoryStatus>("draft");
  const [createVisibility, setCreateVisibility] =
    useState<AnimatedStoryVisibility>("hidden");
  const [createSortOrder, setCreateSortOrder] = useState(0);
  const [slugTouched, setSlugTouched] = useState(false);
  const [createError, setCreateError] = useState("");

  function handleCreateTitleChange(title: string) {
    setCreateTitle(title);
    if (!slugTouched) setCreateSlug(slugify(title));
  }

  function handleCreateStory() {
    const t = createTitle.trim();
    const s = createSlug.trim();
    if (!t) {
      setCreateError("Title is required.");
      return;
    }
    if (!s) {
      setCreateError("Slug is required.");
      return;
    }
    if (!isValidSlug(s)) {
      setCreateError(
        "Slug must be URL-safe: lowercase letters, numbers, and dashes only (no leading/trailing dash)."
      );
      return;
    }
    if (config.stories.some((st) => st.slug === s)) {
      setCreateError(
        "A story with this slug already exists. Choose a different slug."
      );
      return;
    }

    const newStory: AnimatedStory = {
      id: makeId("story"),
      slug: s,
      title: t,
      ...(createDescription.trim() ? { description: createDescription.trim() } : {}),
      status: createStatus,
      visibility: createVisibility,
      sortOrder: createSortOrder,
      clips: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    setConfig((prev) => ({ ...prev, stories: [...prev.stories, newStory] }));
    setSaveStatus("idle");

    // Reset form
    setCreateTitle("");
    setCreateSlug("");
    setCreateDescription("");
    setCreateStatus("draft");
    setCreateVisibility("hidden");
    setCreateSortOrder(config.stories.length + 1);
    setSlugTouched(false);
    setCreateError("");
  }

  function handleUpdateStory(storyId: string, updates: Partial<AnimatedStory>) {
    setConfig((prev) => ({
      ...prev,
      stories: prev.stories.map((s) =>
        s.id === storyId ? { ...s, ...updates, updatedAt: nowIso() } : s
      ),
    }));
    setSaveStatus("idle");
  }

  function handleMoveStory(storyId: string, direction: "up" | "down") {
    setConfig((prev) => {
      const stories = [...prev.stories];
      const idx = stories.findIndex((s) => s.id === storyId);
      if (idx < 0) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= stories.length) return prev;
      const newStories = [...stories];
      [newStories[idx], newStories[swapIdx]] = [newStories[swapIdx], newStories[idx]];
      return {
        ...prev,
        stories: newStories.map((s, i) => ({ ...s, sortOrder: i })),
      };
    });
    setSaveStatus("idle");
  }

  function handleClipAdded(storyId: string, clip: AnimatedStoryClip) {
    setConfig((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => {
        if (s.id !== storyId) return s;
        const nextOrder = s.clips.length;
        return {
          ...s,
          clips: [...s.clips, { ...clip, sortOrder: nextOrder }],
          updatedAt: nowIso(),
        };
      }),
    }));
    setSaveStatus("idle");
  }

  function handleClipUpdate(
    storyId: string,
    clipId: string,
    updates: Partial<AnimatedStoryClip>
  ) {
    setConfig((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => {
        if (s.id !== storyId) return s;
        return {
          ...s,
          clips: s.clips.map((c) =>
            c.id === clipId ? { ...c, ...updates, updatedAt: nowIso() } : c
          ),
          updatedAt: nowIso(),
        };
      }),
    }));
    setSaveStatus("idle");
  }

  function handleClipMove(
    storyId: string,
    clipId: string,
    direction: "up" | "down"
  ) {
    setConfig((prev) => ({
      ...prev,
      stories: prev.stories.map((s) => {
        if (s.id !== storyId) return s;
        const clips = [...s.clips];
        const idx = clips.findIndex((c) => c.id === clipId);
        if (idx < 0) return s;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= clips.length) return s;
        const newClips = [...clips];
        [newClips[idx], newClips[swapIdx]] = [newClips[swapIdx], newClips[idx]];
        return {
          ...s,
          clips: newClips.map((c, i) => ({ ...c, sortOrder: i })),
          updatedAt: nowIso(),
        };
      }),
    }));
    setSaveStatus("idle");
  }

  function handleClipArchive(storyId: string, clipId: string) {
    handleClipUpdate(storyId, clipId, { status: "archived" });
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/github/save-animated-stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: config }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        content?: AnimatedStoriesContent;
        message?: string;
      };
      if (data.ok && data.content) {
        setSaveStatus("saved");
        setConfig(data.content);
      } else {
        setSaveStatus("error");
        setSaveError(data.message ?? "Save failed.");
      }
    } catch {
      setSaveStatus("error");
      setSaveError("Network error. Please try again.");
    }
  }

  const hasStories = config.stories.length > 0;

  return (
    <div className="flex flex-col gap-8">
      {/* Helper tip */}
      <div className="bg-ube-purple/10 rounded-2xl px-5 py-4 text-sm text-tiki-brown/70 leading-relaxed">
        <p className="font-semibold text-tiki-brown mb-2">How it works</p>
        <ul className="list-disc list-inside flex flex-col gap-1 text-xs">
          <li>Create a title first, then upload clips into that story.</li>
          <li>
            Clips will play in this order on the public viewer in the next phase.
          </li>
          <li>
            Published/public controls are saved now; public display will be added
            in the next phase.
          </li>
          <li>
            Archive hides a clip without deleting the uploaded video file.
          </li>
        </ul>
      </div>

      {/* Create story form */}
      <div className="rounded-3xl border-2 border-tiki-brown/10 bg-white overflow-hidden">
        <div className="bg-ube-purple/5 border-b border-tiki-brown/10 px-5 py-4">
          <h2 className="font-black text-tiki-brown text-base">
            + Create Animated Story
          </h2>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
                Title <span className="text-warm-coral">*</span>
              </label>
              <input
                type="text"
                value={createTitle}
                onChange={(e) => handleCreateTitleChange(e.target.value)}
                placeholder="My Animated Story"
                className="text-sm border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
                Slug <span className="text-warm-coral">*</span>
              </label>
              <input
                type="text"
                value={createSlug}
                onChange={(e) => {
                  setCreateSlug(e.target.value);
                  setSlugTouched(true);
                }}
                placeholder="my-animated-story"
                className="text-sm border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/50 font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={createDescription}
              onChange={(e) => setCreateDescription(e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="text-sm border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/50 resize-none"
            />
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
                Status
              </label>
              <select
                value={createStatus}
                onChange={(e) =>
                  setCreateStatus(e.target.value as AnimatedStoryStatus)
                }
                className="text-sm border border-tiki-brown/20 rounded-lg px-3 py-2 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
                Visibility
              </label>
              <select
                value={createVisibility}
                onChange={(e) =>
                  setCreateVisibility(e.target.value as AnimatedStoryVisibility)
                }
                className="text-sm border border-tiki-brown/20 rounded-lg px-3 py-2 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
              >
                <option value="hidden">Hidden</option>
                <option value="public">Public</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
                Sort Order
              </label>
              <input
                type="number"
                value={createSortOrder}
                onChange={(e) =>
                  setCreateSortOrder(parseInt(e.target.value, 10) || 0)
                }
                className="w-20 text-sm border border-tiki-brown/20 rounded-lg px-3 py-2 text-tiki-brown/70 focus:outline-none focus:border-ube-purple/50"
              />
            </div>
          </div>

          {createError && (
            <p className="text-sm text-red-500 font-semibold">{createError}</p>
          )}

          <button
            type="button"
            onClick={handleCreateStory}
            className="self-start text-sm font-bold px-5 py-2.5 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/90 transition-colors"
          >
            Create Animated Story
          </button>
        </div>
      </div>

      {/* Stories list */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-tiki-brown text-base">
            Animated Stories ({config.stories.length})
          </h2>
          {hasStories && (
            <p className="text-xs text-tiki-brown/40">
              Use ↑↓ to reorder stories
            </p>
          )}
        </div>

        {hasStories ? (
          <div className="flex flex-col gap-6">
            {config.stories.map((story, idx) => (
              <AnimatedStoryPanel
                key={story.id}
                story={story}
                index={idx}
                total={config.stories.length}
                onUpdate={(updates) => handleUpdateStory(story.id, updates)}
                onMoveUp={() => handleMoveStory(story.id, "up")}
                onMoveDown={() => handleMoveStory(story.id, "down")}
                onClipAdded={(clip) => handleClipAdded(story.id, clip)}
                onClipUpdate={(clipId, updates) =>
                  handleClipUpdate(story.id, clipId, updates)
                }
                onClipMove={(clipId, dir) =>
                  handleClipMove(story.id, clipId, dir)
                }
                onClipArchive={(clipId) => handleClipArchive(story.id, clipId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-14 bg-white rounded-3xl border border-tiki-brown/10">
            <p className="text-4xl mb-3">🎬</p>
            <p className="text-sm font-semibold text-tiki-brown/40">
              No animated stories yet. Create your first animated story title above.
            </p>
          </div>
        )}
      </div>

      {/* Sticky save bar */}
      <div className="sticky bottom-4 flex justify-end">
        <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-lg px-5 py-3 flex items-center gap-4">
          {saveStatus === "saved" && (
            <span className="text-xs font-bold text-tropical-green">
              ✓ Saved successfully
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs font-bold text-red-500">{saveError}</span>
          )}
          {saveStatus === "saving" && (
            <span className="text-xs font-bold text-tiki-brown/50">
              Saving…
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="text-sm font-bold px-5 py-2.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saveStatus === "saving" ? "Saving…" : "Save Animated Stories"}
          </button>
        </div>
      </div>
    </div>
  );
}
