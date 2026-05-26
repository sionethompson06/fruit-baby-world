"use client";

import { useState, useRef } from "react";
import type { StorybookPage } from "@/lib/storybookPageTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "saving" }
  | { phase: "done"; page: StorybookPage }
  | { phase: "error"; message: string };

// ─── Upload Form ──────────────────────────────────────────────────────────────

function UploadForm({
  episodeSlug,
  onPageSaved,
}: {
  episodeSlug: string;
  onPageSaved: (page: StorybookPage) => void;
}) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const [altText, setAltText] = useState("");
  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [readAloudText, setReadAloudText] = useState("");
  const [status, setStatus] = useState<"draft" | "approved">("approved");
  const [visibility, setVisibility] = useState<"admin-only" | "public">("public");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setState({ phase: "error", message: "Please select an image file." });
      return;
    }
    if (!altText.trim()) {
      setState({ phase: "error", message: "Alt text is required." });
      return;
    }

    setState({ phase: "uploading" });

    // Read file as base64
    const reader = new FileReader();
    const base64Promise = new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    let imageBase64: string;
    try {
      imageBase64 = await base64Promise;
    } catch {
      setState({ phase: "error", message: "Failed to read the selected file." });
      return;
    }

    // Upload to Vercel Blob
    let uploadedAsset: { url: string; pathname: string; mimeType: string; altText: string; uploadedAt: string };
    try {
      const uploadRes = await fetch("/api/media/upload-storybook-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          imageBase64,
          mimeType: file.type,
          altText: altText.trim(),
        }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadData.ok) {
        setState({ phase: "error", message: uploadData.message ?? "Upload failed." });
        return;
      }
      uploadedAsset = uploadData.asset;
    } catch {
      setState({ phase: "error", message: "Network error during upload." });
      return;
    }

    setState({ phase: "saving" });

    // Save page metadata to GitHub
    try {
      const saveRes = await fetch("/api/github/save-storybook-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          page: {
            imageUrl: uploadedAsset.url,
            pathname: uploadedAsset.pathname,
            mimeType: uploadedAsset.mimeType,
            altText: uploadedAsset.altText,
            title: title.trim() || undefined,
            caption: caption.trim() || undefined,
            readAloudText: readAloudText.trim() || undefined,
            status,
            visibility,
          },
        }),
      });
      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to save page." });
        return;
      }
      setState({ phase: "done", page: saveData.page });
      onPageSaved(saveData.page);
      // Reset form
      setAltText("");
      setCaption("");
      setTitle("");
      setReadAloudText("");
      setStatus("approved");
      setVisibility("public");
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setState({ phase: "error", message: "Network error while saving to GitHub." });
    }
  }

  const busy = state.phase === "uploading" || state.phase === "saving";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
          Page Image <span className="text-warm-coral">*</span>
        </label>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          className="text-sm text-tiki-brown/70 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-ube-purple/10 file:text-ube-purple hover:file:bg-ube-purple/20 file:cursor-pointer disabled:opacity-50"
        />
        <p className="text-xs text-tiki-brown/45">PNG, JPEG, or WebP — up to 20 MB</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
          Alt Text <span className="text-warm-coral">*</span>
        </label>
        <input
          type="text"
          value={altText}
          onChange={(e) => setAltText(e.target.value)}
          placeholder="Describe what's happening in this image"
          disabled={busy}
          className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            Page Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title for this page"
            disabled={busy}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            Caption
          </label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Short caption shown below the image"
            disabled={busy}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
          Read-Aloud Text
        </label>
        <textarea
          value={readAloudText}
          onChange={(e) => setReadAloudText(e.target.value)}
          placeholder="Text to read aloud for this page (optional)"
          rows={2}
          disabled={busy}
          className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 resize-none disabled:opacity-50"
        />
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "approved")}
            disabled={busy}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          >
            <option value="approved">Approved</option>
            <option value="draft">Draft</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as "admin-only" | "public")}
            disabled={busy}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          >
            <option value="public">Public</option>
            <option value="admin-only">Admin Only</option>
          </select>
        </div>
      </div>

      {state.phase === "error" && (
        <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-warm-coral text-sm font-bold flex-shrink-0">!</span>
          <p className="text-sm text-warm-coral">{state.message}</p>
        </div>
      )}

      {state.phase === "done" && (
        <div className="flex items-center gap-2 bg-tropical-green/10 border border-tropical-green/25 rounded-xl px-4 py-3">
          <span className="text-tropical-green text-sm">✓</span>
          <p className="text-sm text-tropical-green font-semibold">
            Page {state.page.pageNumber} saved successfully.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="self-start flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {state.phase === "uploading" ? "Uploading…" : state.phase === "saving" ? "Saving…" : "Upload & Save Page"}
      </button>
    </form>
  );
}

// ─── Page Thumbnail ───────────────────────────────────────────────────────────

function PageThumbnail({
  page,
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast,
  isSaving,
}: {
  page: StorybookPage;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
  isSaving: boolean;
}) {
  const statusColor =
    page.status === "approved"
      ? "bg-tropical-green/15 text-tropical-green"
      : page.status === "archived"
      ? "bg-warm-coral/15 text-warm-coral/70"
      : "bg-tiki-brown/8 text-tiki-brown/50";

  const visibilityColor =
    page.visibility === "public"
      ? "bg-sky-blue/15 text-sky-blue"
      : "bg-tiki-brown/8 text-tiki-brown/45";

  return (
    <div className="flex gap-3 items-start bg-white border border-tiki-brown/10 rounded-2xl p-3 shadow-sm">
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.imageUrl}
        alt={page.altText}
        className="w-20 h-16 object-cover rounded-xl flex-shrink-0 border border-tiki-brown/8"
      />

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
            Page {page.pageNumber}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
            {page.status}
          </span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${visibilityColor}`}>
            {page.visibility === "public" ? "Public" : "Admin Only"}
          </span>
        </div>
        {page.title && (
          <p className="text-xs font-semibold text-tiki-brown truncate">{page.title}</p>
        )}
        {page.caption && (
          <p className="text-xs text-tiki-brown/55 truncate italic">{page.caption}</p>
        )}
        <p className="text-xs text-tiki-brown/40 truncate">{page.altText}</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst || isSaving}
          title="Move up"
          className="text-xs px-2 py-1 rounded-lg bg-tiki-brown/5 text-tiki-brown/60 hover:bg-tiki-brown/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast || isSaving}
          title="Move down"
          className="text-xs px-2 py-1 rounded-lg bg-tiki-brown/5 text-tiki-brown/60 hover:bg-tiki-brown/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={onRemove}
          disabled={isSaving}
          title="Archive page"
          className="text-xs px-2 py-1 rounded-lg bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Page List with Reorder ───────────────────────────────────────────────────

function PageList({
  episodeSlug,
  initialPages,
}: {
  episodeSlug: string;
  initialPages: StorybookPage[];
}) {
  const [pages, setPages] = useState<StorybookPage[]>(
    [...initialPages].sort((a, b) => a.pageNumber - b.pageNumber)
  );
  const [reorderState, setReorderState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...pages];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    setPages(next.map((p, i) => ({ ...p, pageNumber: i + 1 })));
    setReorderState("idle");
  }

  function moveDown(idx: number) {
    if (idx === pages.length - 1) return;
    const next = [...pages];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    setPages(next.map((p, i) => ({ ...p, pageNumber: i + 1 })));
    setReorderState("idle");
  }

  function removePage(idx: number) {
    // Archive locally (filter out for display; GitHub keeps the full array intact)
    setPages(
      pages
        .filter((_, i) => i !== idx)
        .map((p, i) => ({ ...p, pageNumber: i + 1 }))
    );
    setReorderState("idle");
  }

  async function saveOrder() {
    setReorderState("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/github/reorder-storybook-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          orderedIds: pages.map((p) => p.id),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setReorderState("error");
        setErrorMsg(data.message ?? "Failed to save order.");
        return;
      }
      setReorderState("saved");
    } catch {
      setReorderState("error");
      setErrorMsg("Network error while saving order.");
    }
  }

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-20 rounded-2xl bg-tiki-brown/4 border border-tiki-brown/8">
        <p className="text-xs text-tiki-brown/35 font-semibold">No pages added yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {pages.map((page, idx) => (
          <PageThumbnail
            key={page.id}
            page={page}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
            onRemove={() => removePage(idx)}
            isFirst={idx === 0}
            isLast={idx === pages.length - 1}
            isSaving={reorderState === "saving"}
          />
        ))}
      </div>

      {reorderState === "error" && (
        <p className="text-xs text-warm-coral">{errorMsg}</p>
      )}

      {reorderState === "saved" && (
        <p className="text-xs text-tropical-green font-semibold">Order saved to GitHub.</p>
      )}

      <button
        type="button"
        onClick={saveOrder}
        disabled={reorderState === "saving"}
        className="self-start text-xs font-bold px-4 py-2 rounded-xl bg-tiki-brown/8 text-tiki-brown/70 hover:bg-tiki-brown/12 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {reorderState === "saving" ? "Saving order…" : "Save Page Order to GitHub"}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StorybookPagesManager({
  episodeSlug,
  initialPages,
}: {
  episodeSlug: string;
  initialPages: StorybookPage[];
}) {
  const [pages, setPages] = useState<StorybookPage[]>(initialPages);
  const publicPageCount = pages.filter((p) => p.status === "approved" && p.visibility === "public").length;

  function handlePageSaved(page: StorybookPage) {
    setPages((prev) => {
      const idx = prev.findIndex((p) => p.id === page.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = page;
        return next;
      }
      return [...prev, page];
    });
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-black text-tiki-brown flex items-center gap-2">
            <span>📚</span> Storybook Pages
          </h2>
          <p className="text-xs text-tiki-brown/55 leading-relaxed">
            Upload final artwork images to build the public storybook reader.
            Approved + public pages replace the legacy panels on the public story page.
          </p>
        </div>
        {publicPageCount > 0 && (
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-tropical-green/15 text-tropical-green flex-shrink-0">
            {publicPageCount} public {publicPageCount === 1 ? "page" : "pages"} live
          </span>
        )}
      </div>

      {/* Existing pages */}
      {pages.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Current Pages ({pages.length})
          </p>
          <PageList
            episodeSlug={episodeSlug}
            initialPages={pages}
          />
        </div>
      )}

      {/* Upload new page */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
          Add New Page
        </p>
        <UploadForm episodeSlug={episodeSlug} onPageSaved={handlePageSaved} />
      </div>

      {/* Usage hint */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-2xl px-4 py-3">
        <span className="text-sm flex-shrink-0">💡</span>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-tiki-brown/65">How storybook pages work</p>
          <p className="text-xs text-tiki-brown/50 leading-relaxed">
            Upload each page image as a PNG or JPEG. Set status to <strong>Approved</strong> and
            visibility to <strong>Public</strong> to show it in the public reader. Pages appear in
            order by page number. Use the arrows to reorder, then click "Save Page Order to GitHub".
          </p>
        </div>
      </div>
    </div>
  );
}
