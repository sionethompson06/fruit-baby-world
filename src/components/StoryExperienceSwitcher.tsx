"use client";

import { useState } from "react";
import StorybookReader, {
  type StorybookReaderPage,
  type StorybookNarrationAudioProp,
} from "@/components/StorybookReader";
import StorybookVideoPlayer from "@/components/StorybookVideoPlayer";

type VideoProps = {
  videoUrl: string;
  title?: string;
  description?: string;
  posterImageUrl?: string;
  mimeType?: string;
};

type Mode = "read" | "listen" | "watch";

export default function StoryExperienceSwitcher({
  pages,
  episodeTitle,
  backHref,
  narrationAudio,
  video,
  fallbackPosterUrl,
}: {
  pages: StorybookReaderPage[];
  episodeTitle: string;
  backHref: string;
  narrationAudio?: StorybookNarrationAudioProp;
  video?: VideoProps;
  fallbackPosterUrl?: string;
}) {
  const [mode, setMode] = useState<Mode>("read");
  const hasTabs = narrationAudio || video;

  return (
    <div className="flex flex-col gap-5">
      {/* Mode switcher — shown when audio or video is available */}
      {hasTabs && (
        <div className="flex items-center gap-1.5 bg-tiki-brown/4 rounded-2xl p-1.5">
          <button
            type="button"
            onClick={() => setMode("read")}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all ${
              mode === "read"
                ? "bg-white shadow-sm text-ube-purple border border-ube-purple/15"
                : "text-tiki-brown/55 hover:text-tiki-brown"
            }`}
          >
            <span aria-hidden>📖</span> Read
          </button>
          {narrationAudio && (
            <button
              type="button"
              onClick={() => setMode("listen")}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all ${
                mode === "listen"
                  ? "bg-white shadow-sm text-ube-purple border border-ube-purple/15"
                  : "text-tiki-brown/55 hover:text-tiki-brown"
              }`}
            >
              <span aria-hidden>🎧</span> Listen
            </button>
          )}
          {video && (
            <button
              type="button"
              onClick={() => setMode("watch")}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all ${
                mode === "watch"
                  ? "bg-white shadow-sm text-tropical-green border border-tropical-green/20"
                  : "text-tiki-brown/55 hover:text-tiki-brown"
              }`}
            >
              <span aria-hidden>🎬</span> Watch
            </button>
          )}
        </div>
      )}

      {/* Read mode */}
      {mode === "read" && (
        <StorybookReader
          pages={pages}
          episodeTitle={episodeTitle}
          backHref={backHref}
          narrationAudio={narrationAudio}
        />
      )}

      {/* Listen mode — reader with audio intro banner */}
      {mode === "listen" && narrationAudio && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 bg-ube-purple/8 border border-ube-purple/15 rounded-2xl px-4 py-3">
            <span className="text-xl flex-shrink-0" aria-hidden>🎧</span>
            <div>
              <p className="text-xs font-black text-ube-purple leading-snug">
                {narrationAudio.title ?? "Story Narration"}
              </p>
              <p className="text-xs text-ube-purple/60 leading-snug mt-0.5">
                Press play below to listen while following along with the storybook.
              </p>
            </div>
          </div>
          <StorybookReader
            pages={pages}
            episodeTitle={episodeTitle}
            backHref={backHref}
            narrationAudio={narrationAudio}
          />
        </div>
      )}

      {/* Watch mode */}
      {mode === "watch" && video && (
        <StorybookVideoPlayer video={video} fallbackPosterUrl={fallbackPosterUrl} />
      )}
    </div>
  );
}
