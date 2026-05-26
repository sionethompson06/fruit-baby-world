"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import type { StorybookPage, StorybookPageRole, StorybookLayoutType } from "@/lib/storybookPageTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type BulkUploadProgress = {
  total: number;
  uploaded: number;
  failed: number;
  current: number;
  errors: Record<string, string>;
};

type BulkUploadState =
  | { phase: "idle" }
  | { phase: "preview"; files: File[] }
  | { phase: "uploading"; progress: BulkUploadProgress }
  | { phase: "done"; added: number }
  | { phase: "error"; message: string };

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "saving" }
  | { phase: "done"; page: StorybookPage }
  | { phase: "error"; message: string };

// ─── Bulk Upload Form (Spreads or Single Pages) ───────────────────────────────

function BulkUploadForm({
  episodeSlug,
  existingPageCount,
  existingSpreadCount,
  uploadMode,
  onPagesSaved,
}: {
  episodeSlug: string;
  existingPageCount: number;
  existingSpreadCount: number;
  uploadMode: "spread" | "single";
  onPagesSaved: (pages: StorybookPage[]) => void;
}) {
  const [state, setState] = useState<BulkUploadState>({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((f) => {
      const mime = f.type.toLowerCase();
      return ["image/png", "image/jpeg", "image/webp"].includes(mime);
    });

    if (validFiles.length === 0) {
      setState({ phase: "error", message: "No valid image files selected. Please use PNG, JPEG, or WebP." });
      return;
    }

    if (validFiles.length !== files.length) {
      setState({
        phase: "error",
        message: `${files.length - validFiles.length} file(s) were skipped (invalid format).`,
      });
      return;
    }

    setState({ phase: "preview", files: validFiles });
  };

  async function uploadBulk() {
    const files = (state as { phase: "preview"; files: File[] }).files;
    if (!files || files.length === 0) return;

    const progress: BulkUploadProgress = {
      total: files.length,
      uploaded: 0,
      failed: 0,
      current: 0,
      errors: {},
    };

    setState({ phase: "uploading", progress });

    const uploadedPages: StorybookPage[] = [];
    let pageNumber = existingPageCount + 1;
    let spreadNumber = existingSpreadCount + 1;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progress.current = i + 1;

      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await fetch("/api/media/upload-storybook-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            episodeSlug,
            imageBase64: base64,
            mimeType: file.type,
            altText: uploadMode === "spread" ? `Spread ${spreadNumber}` : `Page ${pageNumber}`,
          }),
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.ok) {
          progress.failed++;
          progress.errors[file.name] = uploadData.message ?? "Upload failed";
          setState({ phase: "uploading", progress: { ...progress } });
          continue;
        }

        const pagePayload: Record<string, unknown> = {
          imageUrl: uploadData.asset.url,
          pathname: uploadData.asset.pathname,
          mimeType: uploadData.asset.mimeType,
          altText: uploadMode === "spread" ? `Spread ${spreadNumber}` : `Page ${pageNumber}`,
          status: "draft",
          visibility: "admin-only",
        };

        if (uploadMode === "spread") {
          pagePayload.pageRole = "story-spread";
          pagePayload.layoutType = "two-page-spread";
          pagePayload.displayMode = "spread";
          pagePayload.spreadNumber = spreadNumber;
        } else {
          pagePayload.pageRole = "story-page";
          pagePayload.layoutType = "single-page";
          pagePayload.displayMode = "single";
        }

        const saveRes = await fetch("/api/github/save-storybook-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ episodeSlug, page: pagePayload }),
        });

        const saveData = await saveRes.json();
        if (!saveData.ok) {
          progress.failed++;
          progress.errors[file.name] = saveData.message ?? "Failed to save";
          setState({ phase: "uploading", progress: { ...progress } });
          continue;
        }

        uploadedPages.push(saveData.page);
        progress.uploaded++;
        pageNumber++;
        if (uploadMode === "spread") spreadNumber++;
        setState({ phase: "uploading", progress: { ...progress } });
      } catch (e) {
        progress.failed++;
        progress.errors[file.name] = e instanceof Error ? e.message : "Unknown error";
        setState({ phase: "uploading", progress: { ...progress } });
      }
    }

    if (uploadedPages.length > 0) {
      setState({ phase: "done", added: uploadedPages.length });
      onPagesSaved(uploadedPages);
      if (fileRef.current) fileRef.current.value = "";
    } else {
      setState({
        phase: "error",
        message: `Failed to upload all ${files.length} file(s). Please try again.`,
      });
    }
  }

  function cancelPreview() {
    setState({ phase: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  const noun = uploadMode === "spread" ? "spread" : "page";
  const Noun = uploadMode === "spread" ? "Spread" : "Page";

  if (state.phase === "preview") {
    const files = (state as { phase: "preview"; files: File[] }).files;
    return (
      <div className="bg-white rounded-2xl border border-ube-purple/20 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3 className="text-sm font-bold text-tiki-brown">Review & Upload</h3>
        </div>
        <p className="text-xs text-tiki-brown/60">
          {files.length} image{files.length !== 1 ? "s" : ""} ready to upload as {uploadMode === "spread" ? "two-page spreads" : "single pages"}:
        </p>
        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="text-xs bg-tiki-brown/3 rounded-lg px-3 py-2 flex items-center gap-2"
            >
              <span className="text-ube-purple font-bold flex-shrink-0">
                {uploadMode === "spread" ? `Spread ${existingSpreadCount + idx + 1}` : `Page ${existingPageCount + idx + 1}`}
              </span>
              <span className="text-tiki-brown/70 flex-1 truncate">{file.name}</span>
              <span className="text-tiki-brown/40 flex-shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={uploadBulk}
            className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors"
          >
            Upload {files.length} {Noun}{files.length !== 1 ? "s" : ""}
          </button>
          <button
            type="button"
            onClick={cancelPreview}
            className="flex-1 text-sm font-bold px-4 py-2.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/70 hover:bg-tiki-brown/12 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "uploading") {
    const { progress } = state as { phase: "uploading"; progress: BulkUploadProgress };
    const percentComplete = Math.round((progress.current / progress.total) * 100);
    return (
      <div className="bg-white rounded-2xl border border-ube-purple/20 p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">⏳</span>
          <h3 className="text-sm font-bold text-tiki-brown">Uploading {Noun}s…</h3>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs text-tiki-brown/60 font-semibold">
            <span>{progress.current} of {progress.total}</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="w-full bg-tiki-brown/10 rounded-full h-2">
            <div
              className="bg-ube-purple rounded-full h-2 transition-all"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
          <div className="text-xs text-tiki-brown/55 flex items-center gap-2">
            <span>✓ {progress.uploaded}</span>
            {progress.failed > 0 && <span>✕ {progress.failed}</span>}
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "done") {
    const { added } = state as { phase: "done"; added: number };
    return (
      <div className="bg-tropical-green/10 border border-tropical-green/30 rounded-2xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">✓</span>
          <div>
            <h3 className="text-sm font-bold text-tropical-green">
              {added} {noun}{added !== 1 ? "s" : ""} uploaded
            </h3>
            <p className="text-xs text-tropical-green/70">
              Review and approve pages below. Mark as public when ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="bg-warm-coral/10 border border-warm-coral/30 rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-sm text-warm-coral font-semibold">
          {(state as { phase: "error"; message: string }).message}
        </p>
      </div>
    );
  }

  const isSpreadMode = uploadMode === "spread";

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-3 cursor-pointer">
        <div className={`flex items-center gap-3 rounded-2xl border-2 border-dashed p-6 transition-all ${
          isSpreadMode
            ? "bg-gradient-to-br from-ube-purple/10 to-tropical-green/10 border-ube-purple/30 hover:border-ube-purple/50 hover:from-ube-purple/15 hover:to-tropical-green/15"
            : "bg-tiki-brown/3 border-tiki-brown/20 hover:border-tiki-brown/35"
        }`}>
          <span className={`text-3xl ${isSpreadMode ? "" : "text-2xl"}`}>{isSpreadMode ? "📖" : "📄"}</span>
          <div>
            <p className={`text-sm font-bold ${isSpreadMode ? "text-ube-purple" : "text-tiki-brown/70"}`}>
              {isSpreadMode ? "Select Spread Images" : "Select Single Page Images"}
            </p>
            <p className="text-xs text-tiki-brown/55">PNG, JPEG, or WebP — up to 20 MB per image</p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>
      <p className="text-xs text-tiki-brown/40 text-center">
        {isSpreadMode
          ? "Each image becomes a two-page spread. Upload them in reading order."
          : "Each image becomes a single story page. Add front/back covers using slots above."}
      </p>
    </div>
  );
}

// ─── Slot Upload Form (Front Cover, Back Cover, End Page) ─────────────────────

function SlotUploadForm({
  episodeSlug,
  pageRole,
  layoutType,
  label,
  hint,
  existingPage,
  onPageSaved,
}: {
  episodeSlug: string;
  pageRole: StorybookPageRole;
  layoutType: StorybookLayoutType;
  label: string;
  hint: string;
  existingPage?: StorybookPage;
  onPageSaved: (page: StorybookPage) => void;
}) {
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    if (!["image/png", "image/jpeg", "image/webp"].includes(mime)) {
      setState({ phase: "error", message: "Please use PNG, JPEG, or WebP." });
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

      const uploadRes = await fetch("/api/media/upload-storybook-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, imageBase64: base64, mimeType: file.type, altText: label }),
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.ok) {
        setState({ phase: "error", message: uploadData.message ?? "Upload failed." });
        return;
      }

      setState({ phase: "saving" });

      const saveRes = await fetch("/api/github/save-storybook-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          page: {
            ...(existingPage ? { id: existingPage.id } : {}),
            imageUrl: uploadData.asset.url,
            pathname: uploadData.asset.pathname,
            mimeType: uploadData.asset.mimeType,
            altText: label,
            status: "draft",
            visibility: "admin-only",
            pageRole,
            layoutType,
            displayMode: layoutType === "two-page-spread" ? "spread" : "single",
          },
        }),
      });

      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to save." });
        return;
      }

      setState({ phase: "done", page: saveData.page });
      onPageSaved(saveData.page);
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  const busy = state.phase === "uploading" || state.phase === "saving";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-tiki-brown/70">{label}</p>
          <p className="text-xs text-tiki-brown/40">{hint}</p>
        </div>
        {existingPage && (
          <div className="flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={existingPage.imageUrl}
              alt={existingPage.altText}
              className="w-12 h-9 object-cover rounded-lg border border-tiki-brown/10"
            />
          </div>
        )}
      </div>
      <label className={`flex items-center gap-2 rounded-xl border border-dashed p-3 cursor-pointer transition-all ${
        busy ? "opacity-50 pointer-events-none" : "hover:border-ube-purple/40 hover:bg-ube-purple/3"
      } border-tiki-brown/20 bg-tiki-brown/2`}>
        <span className="text-sm">{busy ? "⏳" : existingPage ? "🔄" : "+"}</span>
        <span className="text-xs font-semibold text-tiki-brown/55">
          {busy ? (state.phase === "uploading" ? "Uploading…" : "Saving…") : existingPage ? "Replace Image" : "Upload Image"}
        </span>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileSelect}
          disabled={busy}
          className="hidden"
        />
      </label>
      {state.phase === "error" && (
        <p className="text-xs text-warm-coral">{(state as { phase: "error"; message: string }).message}</p>
      )}
      {state.phase === "done" && (
        <p className="text-xs text-tropical-green font-semibold">Saved.</p>
      )}
    </div>
  );
}

// ─── Single Page Upload Form ──────────────────────────────────────────────────

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

    let uploadedAsset: { url: string; pathname: string; mimeType: string; altText: string; uploadedAt: string };
    try {
      const uploadRes = await fetch("/api/media/upload-storybook-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, imageBase64, mimeType: file.type, altText: altText.trim() }),
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
            pageRole: "story-page",
            layoutType: "single-page",
            displayMode: "single",
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
          <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Page Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
            disabled={busy}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Caption</label>
          <input
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Short caption"
            disabled={busy}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Read-Aloud Text</label>
        <textarea
          value={readAloudText}
          onChange={(e) => setReadAloudText(e.target.value)}
          placeholder="Text to read aloud (optional)"
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
          <p className="text-sm text-warm-coral">{(state as { phase: "error"; message: string }).message}</p>
        </div>
      )}

      {state.phase === "done" && (
        <div className="flex items-center gap-2 bg-tropical-green/10 border border-tropical-green/25 rounded-xl px-4 py-3">
          <span className="text-tropical-green text-sm">✓</span>
          <p className="text-sm text-tropical-green font-semibold">
            Page {(state as { phase: "done"; page: StorybookPage }).page.pageNumber} saved successfully.
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

const ROLE_LABELS: Record<string, string> = {
  "front-cover":  "Front Cover",
  "inside-cover": "Inside Cover",
  "story-spread": "Spread",
  "story-page":   "Page",
  "end-page":     "End Page",
  "back-cover":   "Back Cover",
};

const LAYOUT_COLORS: Record<string, string> = {
  "two-page-spread": "bg-ube-purple/10 text-ube-purple",
  "cover":           "bg-pineapple-yellow/20 text-tiki-brown/70",
  "back-cover":      "bg-pineapple-yellow/20 text-tiki-brown/70",
  "single-page":     "bg-tiki-brown/8 text-tiki-brown/50",
};

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

  const roleLabel = page.pageRole ? ROLE_LABELS[page.pageRole] : null;
  const layoutColor = page.layoutType ? LAYOUT_COLORS[page.layoutType] ?? "bg-tiki-brown/8 text-tiki-brown/50" : null;

  const isSpread = page.layoutType === "two-page-spread" || page.displayMode === "spread";

  return (
    <div className="flex gap-3 items-start bg-white border border-tiki-brown/10 rounded-2xl p-3 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={page.imageUrl}
        alt={page.altText}
        className={`${isSpread ? "w-28" : "w-20"} h-16 object-cover rounded-xl flex-shrink-0 border border-tiki-brown/8`}
      />

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
            #{page.pageNumber}
          </span>
          {roleLabel && layoutColor && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${layoutColor}`}>
              {roleLabel}{page.spreadNumber ? ` ${page.spreadNumber}` : ""}
            </span>
          )}
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
          title="Remove from list"
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
        body: JSON.stringify({ episodeSlug, orderedIds: pages.map((p) => p.id) }),
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
  const spreadCount = pages.filter((p) => p.pageRole === "story-spread").length;
  const frontCover = pages.find((p) => p.pageRole === "front-cover");
  const backCover = pages.find((p) => p.pageRole === "back-cover");
  const endPage = pages.find((p) => p.pageRole === "end-page");

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

  function handlePagesSaved(newPages: StorybookPage[]) {
    setPages((prev) => [...prev, ...newPages]);
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-black text-tiki-brown flex items-center gap-2">
            <span>📚</span> Storybook Images
          </h2>
          <p className="text-xs text-tiki-brown/55 leading-relaxed">
            Upload finished storybook artwork. Approved public pages appear in the public storybook reader.
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          {publicPageCount > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tropical-green/15 text-tropical-green text-center">
              {publicPageCount} public {publicPageCount === 1 ? "page" : "pages"} live
            </span>
          )}
          <Link
            href={`/stories/${episodeSlug}`}
            target="_blank"
            className="text-xs font-bold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/15 transition-colors text-center"
          >
            Preview Storybook →
          </Link>
        </div>
      </div>

      {/* ── Checklist ── */}
      <div className="bg-gradient-to-br from-ube-purple/5 to-tropical-green/5 border border-ube-purple/15 rounded-2xl p-4 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
          📖 Publishing Checklist
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { done: !!frontCover,       label: "Front cover uploaded" },
            { done: spreadCount > 0,    label: "Story spreads uploaded" },
            { done: publicPageCount > 0, label: "Pages marked public" },
            { done: publicPageCount > 0, label: "Preview & publish" },
          ].map(({ done, label }) => (
            <div key={label} className="flex items-center gap-2 text-xs text-tiki-brown/60">
              <span className={done ? "text-tropical-green" : "text-tiki-brown/30"}>
                {done ? "✓" : "○"}
              </span>
              <span className={done ? "text-tropical-green font-semibold" : ""}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary: Upload Storybook Spreads ── */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-bold text-tiki-brown flex items-center gap-2">
            <span>📖</span> Upload Storybook Spreads
          </p>
          <p className="text-xs text-tiki-brown/50 mt-0.5">
            Primary story content — each image is a two-page spread. Upload in reading order.
          </p>
        </div>
        <BulkUploadForm
          episodeSlug={episodeSlug}
          existingPageCount={pages.length}
          existingSpreadCount={spreadCount}
          uploadMode="spread"
          onPagesSaved={handlePagesSaved}
        />
      </div>

      {/* ── Cover / Slot Uploads ── */}
      <div className="flex flex-col gap-3">
        <div>
          <p className="text-sm font-bold text-tiki-brown flex items-center gap-2">
            <span>🖼️</span> Cover & End Pages
          </p>
          <p className="text-xs text-tiki-brown/50 mt-0.5">
            Upload front cover, back cover, and end page separately.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-tiki-brown/3 rounded-2xl border border-tiki-brown/10 p-4">
          <SlotUploadForm
            episodeSlug={episodeSlug}
            pageRole="front-cover"
            layoutType="cover"
            label="Front Cover"
            hint="First page — displayed alone"
            existingPage={frontCover}
            onPageSaved={handlePageSaved}
          />
          <SlotUploadForm
            episodeSlug={episodeSlug}
            pageRole="end-page"
            layoutType="single-page"
            label="End Page"
            hint="Last story page before back cover"
            existingPage={endPage}
            onPageSaved={handlePageSaved}
          />
          <SlotUploadForm
            episodeSlug={episodeSlug}
            pageRole="back-cover"
            layoutType="back-cover"
            label="Back Cover"
            hint="Final page — displayed alone"
            existingPage={backCover}
            onPageSaved={handlePageSaved}
          />
        </div>
      </div>

      {/* ── Current Pages ── */}
      {pages.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              📋 Current Pages ({pages.length})
            </p>
            {pages.length > 1 && (
              <p className="text-xs text-tiki-brown/40">Use arrows to reorder</p>
            )}
          </div>
          <PageList episodeSlug={episodeSlug} initialPages={pages} />
        </div>
      )}

      {/* ── Optional: Single Page Upload ── */}
      <div className="border-t border-tiki-brown/10 pt-4 flex flex-col gap-3">
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Optional: Upload Single Story Pages
          </p>
          <p className="text-xs text-tiki-brown/40 mt-0.5">
            For individual pages that are not two-page spreads.
          </p>
        </div>
        <BulkUploadForm
          episodeSlug={episodeSlug}
          existingPageCount={pages.length}
          existingSpreadCount={spreadCount}
          uploadMode="single"
          onPagesSaved={handlePagesSaved}
        />
        <details className="group">
          <summary className="text-xs font-semibold text-tiki-brown/45 cursor-pointer hover:text-tiki-brown/60 list-none flex items-center gap-1">
            <span className="group-open:rotate-90 inline-block transition-transform">▸</span>
            Add single page with metadata
          </summary>
          <div className="mt-3 pl-3 border-l border-tiki-brown/10">
            <UploadForm episodeSlug={episodeSlug} onPageSaved={handlePageSaved} />
          </div>
        </details>
      </div>

      {/* ── Help Text ── */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-2xl px-4 py-3">
        <span className="text-sm flex-shrink-0">💡</span>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-tiki-brown/65">Publishing workflow</p>
          <p className="text-xs text-tiki-brown/50 leading-relaxed">
            Upload spreads in reading order, then add cover images. Set pages to <strong>Approved</strong> + <strong>Public</strong> to make them visible. Spreads display as open-book frames in the reader.
          </p>
        </div>
      </div>
    </div>
  );
}
