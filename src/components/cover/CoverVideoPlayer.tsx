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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Fullscreen is requested on this stable wrapper so fullscreen persists while clip sources change.
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Ref mirrors soundEnabled so the video-change effect can read the latest
  // value without adding soundEnabled to its dependency array.
  const soundEnabledRef = useRef(false);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  // Track fullscreen changes (including Escape key exit and native video fullscreen)
  useEffect(() => {
    function onFullscreenChange() {
      const fsEl = document.fullscreenElement;
      setIsFullscreen(
        fsEl !== null &&
          (fsEl === wrapperRef.current ||
            wrapperRef.current?.contains(fsEl) === true)
      );
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const safeIndex = Math.min(currentIndex, videos.length - 1);
  const current = videos[safeIndex];

  // Runs when the current video changes: load new source, apply mute state, autoplay.
  // video.load() is required because we no longer use key= to remount the element —
  // React updates the src attribute but the browser needs an explicit load() call.
  useEffect(() => {
    setHasError(false);
    setSoundFailed(false);
    const video = videoRef.current;
    if (!video) return;
    video.muted = !soundEnabledRef.current;
    video.load();
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

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapperRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
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

      {/* Cinematic video frame — stable fullscreen wrapper.
          Fullscreen is requested on this div so it persists while clip sources change. */}
      <div
        ref={wrapperRef}
        className={`relative w-full overflow-hidden shadow-2xl ${
          isFullscreen ? "" : "aspect-video rounded-3xl"
        }`}
        style={{
          background: "#0a0a0a",
          boxShadow: isFullscreen
            ? "none"
            : "0 0 0 2px rgba(255, 213, 79, 0.25), 0 24px 48px rgba(0,0,0,0.20)",
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
            {/* No key= prop — the same video element is reused across clips so the
                browser fullscreen state stays attached and persists through transitions. */}
            <video
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
                native video controls remain fully reachable. */}
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

            {/* Custom fullscreen toggle — top-right corner.
                Enter/exit fullscreen on the stable wrapper div. */}
            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors backdrop-blur-sm"
            >
              {isFullscreen ? (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                  <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                  <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                  <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-4 h-4"
                >
                  <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                  <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                  <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                  <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                </svg>
              )}
            </button>

            {/* In-fullscreen playlist controls — prev/next/counter overlay */}
            {isFullscreen && isMulti && (
              <div className="absolute bottom-20 left-0 right-0 flex items-center justify-center gap-4 z-10 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-4">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={!canPrev}
                    aria-label="Previous video"
                    className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white font-bold transition-colors disabled:opacity-25 flex items-center justify-center text-xl backdrop-blur-sm"
                  >
                    ‹
                  </button>
                  <span className="text-white/70 text-sm font-semibold tabular-nums drop-shadow">
                    {safeIndex + 1} / {videos.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canNext}
                    aria-label="Next video"
                    className="w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 text-white font-bold transition-colors disabled:opacity-25 flex items-center justify-center text-xl backdrop-blur-sm"
                  >
                    ›
                  </button>
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
