"use client";

import { useState, useRef } from "react";
import type { StorybookVideoAsset } from "@/lib/storybookVideoTypes";

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading" }
  | { phase: "saving" }
  | { phase: "done" }
  | { phase: "error"; message: string };

export default function StorybookVideoManager({
  episodeSlug,
  initialVideo,
}: {
  episodeSlug: string;
  initialVideo?: StorybookVideoAsset | null;
}) {
  const [video, setVideo] = useState<StorybookVideoAsset | null>(initialVideo ?? null);
  const [state, setState] = useState<UploadState>({ phase: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = state.phase === "uploading" || state.phase === "saving";

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    const mime = file.type.toLowerCase();
    const allowed = ["video/mp4", "video/webm", "video/quicktime", "video/x-m4v"];
    if (!allowed.includes(mime)) {
      setState({ phase: "error", message: "Please use MP4, WebM, or MOV/M4V." });
      return;
    }

    setState({ phase: "uploading" });

    try {
      const formData = new FormData();
      formData.append("episodeSlug", episodeSlug);
      formData.append("file", file);

      const uploadRes = await fetch("/api/media/upload-storybook-video", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (!uploadData.ok) {
        setState({ phase: "error", message: uploadData.message ?? "Upload failed." });
        return;
      }

      setState({ phase: "saving" });

      const videoPayload: Partial<StorybookVideoAsset> = {
        ...(video ? { id: video.id } : {}),
        videoUrl: uploadData.asset.videoUrl,
        pathname: uploadData.asset.pathname,
        mimeType: uploadData.asset.mimeType,
        sizeBytes: uploadData.asset.sizeBytes,
        sourceType: "admin-uploaded",
        status: "approved",
        visibility: "hidden",
        createdAt: video?.createdAt ?? uploadData.asset.uploadedAt,
      };

      const saveRes = await fetch("/api/github/save-storybook-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, video: videoPayload }),
      });

      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to save." });
        return;
      }

      setVideo(saveData.video);
      setState({ phase: "done" });
      if (fileRef.current) fileRef.current.value = "";
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  async function updateVisibility(visibility: "public" | "hidden") {
    if (!video) return;
    setState({ phase: "saving" });
    try {
      const saveRes = await fetch("/api/github/save-storybook-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, video: { ...video, visibility } }),
      });
      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to update." });
        return;
      }
      setVideo(saveData.video);
      setState({ phase: "done" });
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  async function archiveVideo() {
    if (!video) return;
    setState({ phase: "saving" });
    try {
      const saveRes = await fetch("/api/github/save-storybook-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug, video: { ...video, status: "archived", visibility: "hidden" } }),
      });
      const saveData = await saveRes.json();
      if (!saveData.ok) {
        setState({ phase: "error", message: saveData.message ?? "Failed to archive." });
        return;
      }
      setVideo(saveData.video);
      setState({ phase: "done" });
    } catch {
      setState({ phase: "error", message: "Network error." });
    }
  }

  const isPublic = video?.visibility === "public";
  const isArchived = video?.status === "archived";

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎬</span>
          <div>
            <h3 className="text-sm font-black text-tiki-brown">Video / Cartoon</h3>
            <p className="text-xs text-tiki-brown/50 mt-0.5">
              Upload a finished cartoon or video so readers can watch the story.
            </p>
          </div>
        </div>
        {video && !isArchived && (
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

      {/* Existing video player */}
      {video && !isArchived && (
        <div className="flex flex-col gap-3 bg-tiki-brown/3 rounded-2xl border border-tiki-brown/8 p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Current Video</span>
            <span className="text-xs text-tiki-brown/40">{video.mimeType}</span>
            {video.sizeBytes && (
              <span className="text-xs text-tiki-brown/35">{(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
            )}
          </div>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={video.videoUrl}
            controls
            preload="metadata"
            className="w-full rounded-xl"
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
              onClick={archiveVideo}
              disabled={busy}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-40 transition-colors"
            >
              {busy ? "Saving…" : "Archive Video"}
            </button>
          </div>
        </div>
      )}

      {isArchived && (
        <p className="text-xs text-tiki-brown/45 bg-tiki-brown/3 rounded-xl px-4 py-3">
          This video has been archived. Upload a new file to replace it.
        </p>
      )}

      {/* Upload section */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          {video && !isArchived ? "Replace Video" : "Upload Video"}
        </p>
        <p className="text-xs text-tiki-brown/40">Accepted: MP4, WebM, MOV — file size subject to platform limits</p>
        <label className={`flex items-center gap-3 rounded-xl border border-dashed p-4 cursor-pointer transition-all ${
          busy ? "opacity-50 pointer-events-none" : "hover:border-ube-purple/40 hover:bg-ube-purple/3"
        } border-tiki-brown/20 bg-tiki-brown/2`}>
          <span className="text-base">{busy ? "⏳" : "🎥"}</span>
          <span className="text-sm font-semibold text-tiki-brown/55">
            {state.phase === "uploading" ? "Uploading video…" :
             state.phase === "saving" ? "Saving to storybook…" :
             video && !isArchived ? "Replace Video File" : "Select Video File"}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-m4v,.mp4,.webm,.mov,.m4v"
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
