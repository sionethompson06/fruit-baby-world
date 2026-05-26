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

type Mode = "read" | "watch";

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

  return (
    <div className="flex flex-col gap-5">
      {/* Mode switcher — only shown when video is available */}
      {video && (
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
            <span aria-hidden>📖</span> Read Storybook
          </button>
          <button
            type="button"
            onClick={() => setMode("watch")}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-4 py-2.5 rounded-xl transition-all ${
              mode === "watch"
                ? "bg-white shadow-sm text-tropical-green border border-tropical-green/20"
                : "text-tiki-brown/55 hover:text-tiki-brown"
            }`}
          >
            <span aria-hidden>🎬</span> Watch Cartoon
          </button>
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

      {/* Watch mode */}
      {mode === "watch" && video && (
        <StorybookVideoPlayer video={video} fallbackPosterUrl={fallbackPosterUrl} />
      )}
    </div>
  );
}
