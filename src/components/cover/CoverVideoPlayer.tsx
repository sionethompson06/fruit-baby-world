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
  const videoRef = useRef<HTMLVideoElement>(null);

  const safeIndex = Math.min(currentIndex, videos.length - 1);
  const current = videos[safeIndex];

  useEffect(() => {
    setHasError(false);
    if (!autoplayMuted || !videoRef.current) return;
    videoRef.current.play().catch(() => {});
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
    setCurrentIndex((i) => {
      if (i < videos.length - 1) return i + 1;
      if (videoLoop) return 0;
      return i;
    });
  }

  function handlePrev() {
    setHasError(false);
    setCurrentIndex((i) => {
      if (i > 0) return i - 1;
      if (videoLoop) return videos.length - 1;
      return i;
    });
  }

  function handleDotClick(i: number) {
    setHasError(false);
    setCurrentIndex(i);
  }

  const atStart = safeIndex === 0;
  const atEnd = safeIndex === videos.length - 1;
  const canPrev = !atStart || videoLoop;
  const canNext = !atEnd || videoLoop;
  const isMulti = videos.length > 1;

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
          // key forces re-mount when video changes, triggering fresh load
          <video
            key={current.id}
            ref={videoRef}
            src={current.videoUrl}
            className="w-full h-full object-contain"
            controls
            playsInline
            autoPlay={autoplayMuted}
            muted={autoplayMuted}
            onEnded={handleEnded}
            onError={() => setHasError(true)}
            aria-label={current.title || `Sneak peek video ${safeIndex + 1}`}
          />
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

        {/* Title + counter */}
        <div className="flex-1 text-center min-w-0">
          {current.title && (
            <p className="text-sm sm:text-base font-bold text-tiki-brown truncate">
              {current.title}
            </p>
          )}
          {isMulti && (
            <p className="text-xs text-tiki-brown/40 mt-0.5">
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
