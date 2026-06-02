"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { CoverPageVideo } from "@/lib/coverPageTypes";

export default function CoverVideoPlayer({
  videos,
  videoLoop,
  autoplayMuted,
  videoSectionTitle,
}: {
  videos: CoverPageVideo[];
  videoLoop: boolean;
  autoplayMuted: boolean;
  videoSectionTitle: string;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [soundFailed, setSoundFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Ref mirrors soundEnabled so the video-change effect can read the latest
  // value without adding soundEnabled to its dependency array (which would
  // retrigger the effect and restart the video on every sound-state change).
  const soundEnabledRef = useRef(false);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const safeIndex = Math.min(currentIndex, videos.length - 1);
  const current = videos[safeIndex];

  // Runs when the current video changes: apply current mute state and autoplay.
  useEffect(() => {
    setHasError(false);
    setSoundFailed(false);
    const video = videoRef.current;
    if (!video) return;
    video.muted = !soundEnabledRef.current;
    if (autoplayMuted || soundEnabledRef.current) {
      video.play().catch(() => {});
    }
  }, [current?.id, autoplayMuted]);

  const handleEnded = useCallback(() => {
    setCurrentIndex((i) => {
      if (i < videos.length - 1) return i + 1;
      if (videoLoop) return 0;
      return i;
    });
  }, [videos.length, videoLoop]);

  function handleNext() {
    setHasError(false);
    setSoundFailed(false);
    setCurrentIndex((i) => {
      if (i < videos.length - 1) return i + 1;
      if (videoLoop) return 0;
      return i;
    });
  }

  function handlePrev() {
    setHasError(false);
    setSoundFailed(false);
    setCurrentIndex((i) => {
      if (i > 0) return i - 1;
      if (videoLoop) return videos.length - 1;
      return i;
    });
  }

  function handleDotClick(i: number) {
    setHasError(false);
    setSoundFailed(false);
    setCurrentIndex(i);
  }

  function handleEnableSound() {
    const video = videoRef.current;
    if (!video) return;
    setSoundFailed(false);
    // Restart from beginning so visitors hear the teaser from the start
    if (video.currentTime > 2) {
      video.currentTime = 0;
    }
    video.muted = false;
    soundEnabledRef.current = true;
    setSoundEnabled(true);
    video.play().catch(() => {
      setSoundFailed(true);
    });
  }

  const atStart = safeIndex === 0;
  const atEnd = safeIndex === videos.length - 1;
  const canPrev = !atStart || videoLoop;
  const canNext = !atEnd || videoLoop;
  const isMulti = videos.length > 1;
  const soundButtonText = isPlaying ? "Turn Sound On" : "Play With Sound";

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Section title */}
      <h2
        className="text-lg sm:text-xl font-black text-tiki-brown mb-5 text-center"
        style={{ fontFamily: "var(--font-bubblegum-sans)" }}
      >
        {videoSectionTitle}
      </h2>

      {/* Cinematic video frame */}
      <div
        className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-2xl"
        style={{
          background: "#0a0a0a",
          boxShadow:
            "0 0 0 2px rgba(255, 213, 79, 0.25), 0 24px 48px rgba(0,0,0,0.20)",
        }}
      >
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3">
            <p className="text-white/50 text-sm font-semibold">
              Video could not be loaded.
            </p>
            <button
              type="button"
              onClick={() => setHasError(false)}
              className="text-xs text-white/40 hover:text-white/60 underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {/* key forces re-mount when video changes, triggering fresh load */}
            <video
              key={current.id}
              ref={videoRef}
              src={current.videoUrl}
              className="w-full h-full object-contain"
              controls
              playsInline
              autoPlay={autoplayMuted}
              muted
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={handleEnded}
              onError={() => setHasError(true)}
              aria-label={current.title || `Sneak peek video ${safeIndex + 1}`}
            />

            {/* Sound prompt overlay — pointer-events-none on the positioner so
                native video controls remain fully reachable; only the button
                itself captures clicks. */}
            {!soundEnabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pb-12 pointer-events-none">
                <div className="pointer-events-auto flex flex-col items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleEnableSound}
                    aria-label="Turn video sound on"
                    className="flex items-center gap-3 px-7 py-4 rounded-full font-black text-base sm:text-xl text-tiki-brown transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-pineapple-yellow/60"
                    style={{
                      background:
                        "linear-gradient(135deg, #ffd84d 0%, #ffb8c8 100%)",
                      boxShadow:
                        "0 6px 28px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.35) inset",
                    }}
                  >
                    <span aria-hidden="true" className="text-2xl leading-none">
                      🔊
                    </span>
                    {soundButtonText}
                  </button>
                  <p className="text-white/75 text-xs sm:text-sm font-semibold drop-shadow">
                    Tap to hear the sneak peek
                  </p>
                  {soundFailed && (
                    <p className="text-pineapple-yellow text-xs font-semibold drop-shadow mt-0.5">
                      Tap play on the video controls to start sound.
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Navigation row */}
      <div className="mt-4 flex items-center gap-3 px-1">
        {/* Prev */}
        {isMulti ? (
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canPrev}
            aria-label="Previous video"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-pineapple-yellow/20 hover:bg-pineapple-yellow/40 text-tiki-brown font-bold transition-colors disabled:opacity-25 flex items-center justify-center text-xl leading-none"
          >
            ‹
          </button>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}

        {/* Counter only — title intentionally hidden on public page */}
        <div className="flex-1 text-center min-w-0">
          {isMulti && (
            <p className="text-xs text-tiki-brown/40">
              {safeIndex + 1} of {videos.length}
            </p>
          )}
        </div>

        {/* Next */}
        {isMulti ? (
          <button
            type="button"
            onClick={handleNext}
            disabled={!canNext}
            aria-label="Next video"
            className="flex-shrink-0 w-10 h-10 rounded-full bg-pineapple-yellow/20 hover:bg-pineapple-yellow/40 text-tiki-brown font-bold transition-colors disabled:opacity-25 flex items-center justify-center text-xl leading-none"
          >
            ›
          </button>
        ) : (
          <div className="w-10 flex-shrink-0" />
        )}
      </div>

      {/* Playlist dots */}
      {isMulti && (
        <div
          className="flex justify-center items-center gap-2 mt-4"
          role="tablist"
          aria-label="Video playlist"
        >
          {videos.map((v, i) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={i === safeIndex}
              aria-label={`Video ${i + 1}${v.title ? `: ${v.title}` : ""}`}
              onClick={() => handleDotClick(i)}
              className={`rounded-full transition-all duration-200 ${
                i === safeIndex
                  ? "w-6 h-2.5 bg-pineapple-yellow"
                  : "w-2.5 h-2.5 bg-tiki-brown/20 hover:bg-tiki-brown/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
