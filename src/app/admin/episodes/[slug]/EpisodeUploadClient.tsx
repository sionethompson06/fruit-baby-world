"use client";

import { useState, useRef } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SceneUploadState = {
  sceneNumber: number;
  title: string;
  text: string;
  imageUrl?: string;
};

type UploadTarget =
  | { kind: "scene-image"; sceneNumber: number }
  | { kind: "cover-image" }
  | { kind: "audio" }
  | { kind: "video" };

type UploadState = {
  status: "idle" | "uploading" | "done" | "error";
  message?: string;
  url?: string;
};

// ─── Single upload field ──────────────────────────────────────────────────────

function UploadField({
  label,
  accept,
  folder,
  episodeSlug,
  target,
  currentUrl,
  onSuccess,
}: {
  label: string;
  accept: string;
  folder: string;
  episodeSlug: string;
  target: UploadTarget;
  currentUrl?: string;
  onSuccess?: (url: string) => void;
}) {
  const [state, setState] = useState<UploadState>({ status: "idle" });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setState({ status: "uploading" });

    // Upload to blob
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);

    const uploadRes = await fetch("/api/upload", { method: "POST", body: form });
    const uploadData = await uploadRes.json() as { ok: boolean; url?: string; error?: string };

    if (!uploadData.ok || !uploadData.url) {
      setState({ status: "error", message: uploadData.error ?? "Upload failed" });
      return;
    }

    const mediaUrl = uploadData.url;

    // Attach to episode JSON
    const attachBody: Record<string, unknown> = {
      episodeSlug,
      mediaUrl,
      type: target.kind,
    };
    if (target.kind === "scene-image") attachBody.sceneNumber = target.sceneNumber;

    const attachRes = await fetch("/api/github/attach-episode-media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attachBody),
    });
    const attachData = await attachRes.json() as { ok: boolean; message?: string };

    if (!attachData.ok) {
      setState({ status: "error", message: attachData.message ?? "Failed to save URL" });
      return;
    }

    setState({ status: "done", url: mediaUrl });
    onSuccess?.(mediaUrl);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">{label}</label>

      {currentUrl && target.kind === "scene-image" && (
        <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-tiki-brown/5 border border-tiki-brown/10">
          <Image src={state.url ?? currentUrl} alt={label} fill className="object-cover" sizes="400px" />
        </div>
      )}

      {currentUrl && target.kind === "cover-image" && (
        <div className="relative w-full aspect-[16/7] rounded-xl overflow-hidden bg-tiki-brown/5 border border-tiki-brown/10">
          <Image src={state.url ?? currentUrl} alt="Cover" fill className="object-cover" sizes="700px" />
        </div>
      )}

      {currentUrl && (target.kind === "audio" || target.kind === "video") && (
        <p className="text-xs text-ube-purple font-medium break-all">
          ✓ {(state.url ?? currentUrl).split("/").pop()}
        </p>
      )}

      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={state.status === "uploading"}
          onClick={() => inputRef.current?.click()}
          className="px-4 py-2 rounded-xl border border-tiki-brown/20 text-tiki-brown text-sm font-semibold hover:border-tiki-brown/40 hover:bg-tiki-brown/5 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {state.status === "uploading" ? "Uploading…" : currentUrl ? "Replace" : "Upload"}
        </button>

        {state.status === "done" && (
          <span className="text-xs font-semibold text-tropical-green">✓ Saved</span>
        )}
        {state.status === "error" && (
          <span className="text-xs font-semibold text-warm-coral">{state.message}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function EpisodeUploadClient({
  episodeSlug,
  initialScenes,
  initialCoverImage,
  initialAudioUrl,
  initialVideoUrl,
}: {
  episodeSlug: string;
  initialScenes: SceneUploadState[];
  initialCoverImage?: string;
  initialAudioUrl?: string;
  initialVideoUrl?: string;
}) {
  const [scenes, setScenes] = useState(initialScenes);
  const [coverImage, setCoverImage] = useState(initialCoverImage);
  const [audioUrl, setAudioUrl] = useState(initialAudioUrl);
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);

  const updateSceneImage = (sceneNumber: number, url: string) => {
    setScenes((prev) =>
      prev.map((s) => (s.sceneNumber === sceneNumber ? { ...s, imageUrl: url } : s))
    );
  };

  return (
    <div className="flex flex-col gap-10">
      {/* Cover Image */}
      <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
        <h2 className="text-base font-black text-tiki-brown mb-5">🖼 Cover Image</h2>
        <UploadField
          label="Episode cover"
          accept="image/jpeg,image/png,image/webp"
          folder={`episodes/${episodeSlug}/cover`}
          episodeSlug={episodeSlug}
          target={{ kind: "cover-image" }}
          currentUrl={coverImage}
          onSuccess={setCoverImage}
        />
      </section>

      {/* Audio */}
      <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
        <h2 className="text-base font-black text-tiki-brown mb-1">🎧 Audio Narration</h2>
        <p className="text-xs text-tiki-brown/50 mb-5">MP3 or M4A file. Will play as users read the story.</p>
        <UploadField
          label="Narration audio"
          accept="audio/mpeg,audio/mp4,audio/x-m4a"
          folder={`episodes/${episodeSlug}/audio`}
          episodeSlug={episodeSlug}
          target={{ kind: "audio" }}
          currentUrl={audioUrl}
          onSuccess={setAudioUrl}
        />
        {audioUrl && (
          <audio controls src={audioUrl} className="mt-4 w-full rounded-xl" />
        )}
      </section>

      {/* Video */}
      <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
        <h2 className="text-base font-black text-tiki-brown mb-1">🎬 Episode Video</h2>
        <p className="text-xs text-tiki-brown/50 mb-5">MP4 file. Users can choose to watch instead of reading.</p>
        <UploadField
          label="Episode video"
          accept="video/mp4,video/quicktime"
          folder={`episodes/${episodeSlug}/video`}
          episodeSlug={episodeSlug}
          target={{ kind: "video" }}
          currentUrl={videoUrl}
          onSuccess={setVideoUrl}
        />
        {videoUrl && (
          <video controls src={videoUrl} className="mt-4 w-full rounded-xl" />
        )}
      </section>

      {/* Scene images */}
      <section className="flex flex-col gap-5">
        <h2 className="text-base font-black text-tiki-brown">🎨 Scene Images</h2>
        {scenes.length === 0 && (
          <p className="text-sm text-tiki-brown/50">No scenes yet. Add scenes below.</p>
        )}
        {scenes.map((scene) => (
          <div
            key={scene.sceneNumber}
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 sm:p-6"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/12 text-ube-purple flex-shrink-0">
                Scene {scene.sceneNumber}
              </span>
              {scene.title && (
                <span className="text-sm font-bold text-tiki-brown">{scene.title}</span>
              )}
            </div>
            {scene.text && (
              <p className="text-xs text-tiki-brown/60 mb-4 leading-relaxed line-clamp-3">{scene.text}</p>
            )}
            <UploadField
              label="Scene illustration"
              accept="image/jpeg,image/png,image/webp"
              folder={`episodes/${episodeSlug}/scenes`}
              episodeSlug={episodeSlug}
              target={{ kind: "scene-image", sceneNumber: scene.sceneNumber }}
              currentUrl={scene.imageUrl}
              onSuccess={(url) => updateSceneImage(scene.sceneNumber, url)}
            />
          </div>
        ))}
      </section>
    </div>
  );
}
