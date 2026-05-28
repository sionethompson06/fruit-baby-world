"use client";

import { useState, useEffect } from "react";
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
  immersiveOnly = false,
}: {
  pages: StorybookReaderPage[];
  episodeTitle: string;
  backHref: string;
  narrationAudio?: StorybookNarrationAudioProp;
  video?: VideoProps;
  fallbackPosterUrl?: string;
  immersiveOnly?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("read");

  // Hash-based deep linking: hero CTAs can link to #open-reader / #listen-story / #watch-story
  useEffect(() => {
    const check = () => {
      const h = window.location.hash;
      if (h === "#open-reader") setMode("read");
      else if (h === "#listen-story" && narrationAudio) setMode("listen");
      else if (h === "#watch-story" && video) setMode("watch");
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [narrationAudio, video]);

  const hasTabs = narrationAudio || video;

  return (
    <div className="flex flex-col gap-5">
      {/* Always-present anchor targets so hero CTAs can scroll + trigger mode */}
      <span id="open-reader" className="sr-only" aria-hidden="true" />
      {narrationAudio && <span id="listen-story" className="sr-only" aria-hidden="true" />}
      {video && <span id="watch-story" className="sr-only" aria-hidden="true" />}

      {/* Mode switcher tab bar — hidden in immersiveOnly mode */}
      {hasTabs && !immersiveOnly && (
        <div className="flex items-center gap-1.5 bg-tiki-brown/4 rounded-2xl p-1.5">
          <button
            type="button"
            onClick={() => setMode("read")}
            aria-pressed={mode === "read"}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl transition-all ${
              mode === "read"
                ? "bg-white shadow-sm text-ube-purple border border-ube-purple/15"
                : "text-tiki-brown/55 hover:text-tiki-brown"
            }`}
          >
            <span aria-hidden>📖</span>
            <span className="hidden sm:inline">Read Storybook</span>
            <span className="sm:hidden">Read</span>
          </button>
          {narrationAudio && (
            <button
              type="button"
              onClick={() => setMode("listen")}
              aria-pressed={mode === "listen"}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl transition-all ${
                mode === "listen"
                  ? "bg-white shadow-sm text-ube-purple border border-ube-purple/15"
                  : "text-tiki-brown/55 hover:text-tiki-brown"
              }`}
            >
              <span aria-hidden>🎧</span>
              <span className="hidden sm:inline">Listen &amp; Read</span>
              <span className="sm:hidden">Listen</span>
            </button>
          )}
          {video && (
            <button
              type="button"
              onClick={() => setMode("watch")}
              aria-pressed={mode === "watch"}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold px-3 py-2.5 rounded-xl transition-all ${
                mode === "watch"
                  ? "bg-white shadow-sm text-tropical-green border border-tropical-green/20"
                  : "text-tiki-brown/55 hover:text-tiki-brown"
              }`}
            >
              <span aria-hidden>🎬</span>
              <span className="hidden sm:inline">Watch Cartoon</span>
              <span className="sm:hidden">Watch</span>
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
          immersiveOnly={immersiveOnly}
        />
      )}

      {/* Listen & Read mode — prominent audio bar is handled inside StorybookReader */}
      {mode === "listen" && narrationAudio && (
        <StorybookReader
          pages={pages}
          episodeTitle={episodeTitle}
          backHref={backHref}
          narrationAudio={narrationAudio}
          listenModeActive={true}
          immersiveOnly={immersiveOnly}
        />
      )}

      {/* Watch Cartoon mode */}
      {mode === "watch" && video && (
        <div className="flex flex-col gap-4">
          <StorybookVideoPlayer video={video} fallbackPosterUrl={fallbackPosterUrl} />
          <button
            type="button"
            onClick={() => setMode("read")}
            aria-label="Return to reading the storybook"
            className="self-start flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-2xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            ← Back to Reading
          </button>
        </div>
      )}
    </div>
  );
}
