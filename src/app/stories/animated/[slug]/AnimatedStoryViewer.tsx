"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnimatedStory, AnimatedStoryClip } from "@/lib/animatedStoriesTypes";

function FullscreenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M1 5.5V1h4.5M9.5 1H14v4.5M14 9.5V14H9.5M5.5 14H1V9.5" />
    </svg>
  );
}

function ExitFullscreenIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M5.5 1v4.5H1M14 5.5H9.5V1M9.5 14V9.5H14M1 9.5h4.5V14" />
    </svg>
  );
}

export default function AnimatedStoryViewer({
  story,
  clips,
}: {
  story: AnimatedStory;
  clips: AnimatedStoryClip[];
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasPlayedRef = useRef(false);

  const clip = clips[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === clips.length - 1;

  // Keep isFullscreen state in sync with browser Escape or external exits
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Reload + autoplay when clip index changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !clip) return;
    video.src = clip.videoUrl;
    video.load();
    if (hasPlayedRef.current) {
      video.play().catch(() => {});
    }
  }, [currentIdx]);

  function handlePlay() {
    hasPlayedRef.current = true;
  }

  function handleEnded() {
    if (!isLast) {
      setCurrentIdx((i) => i + 1);
    } else {
      setFinished(true);
    }
  }

  function goTo(idx: number) {
    setFinished(false);
    setCurrentIdx(idx);
  }

  async function enterFullscreen() {
    const el = wrapperRef.current;
    if (!el || !("requestFullscreen" in el)) return;
    try {
      await el.requestFullscreen();
    } catch {
      // Fullscreen unavailable or blocked — silently skip
    }
  }

  async function exitFullscreen() {
    if (!("exitFullscreen" in document)) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Already exited or unavailable
    }
  }

  if (!clip) return null;

  return (
    <div
      ref={wrapperRef}
      className={
        isFullscreen
          ? "w-full h-full bg-black flex flex-col items-center justify-center gap-4 p-4 sm:p-8 overflow-auto"
          : "flex flex-col gap-6"
      }
    >

      {/* ── Fullscreen: header bar ── */}
      {isFullscreen && (
        <div className="w-full max-w-5xl flex items-center justify-between gap-4 flex-shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-white/50 text-xs uppercase tracking-wide font-bold">
              Clip {currentIdx + 1} of {clips.length}
            </p>
            <p className="text-white font-black text-lg leading-snug truncate">{clip.title}</p>
          </div>
          <button
            onClick={exitFullscreen}
            aria-label="Exit full screen"
            className="flex-shrink-0 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-xl bg-white/15 text-white hover:bg-white/28 transition-colors border border-white/20"
          >
            <ExitFullscreenIcon />
            Exit Full Screen
          </button>
        </div>
      )}

      {/* ── Normal: header (clip counter + dots) ── */}
      {!isFullscreen && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Clip {currentIdx + 1} of {clips.length}
            </p>
            <p className="text-lg font-black text-tiki-brown leading-snug truncate">
              {clip.title}
            </p>
          </div>
          {clips.length > 1 && (
            <div className="flex gap-2 flex-shrink-0">
              {clips.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    i === currentIdx
                      ? "bg-ube-purple"
                      : "bg-tiki-brown/20 hover:bg-tiki-brown/40"
                  }`}
                  aria-label={`Go to clip ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Video player ── */}
      <div
        className={
          isFullscreen
            ? "relative w-full max-w-5xl flex-shrink-0"
            : "relative w-full"
        }
      >
        <video
          ref={videoRef}
          src={clip.videoUrl}
          controls
          playsInline
          preload="metadata"
          onPlay={handlePlay}
          onEnded={handleEnded}
          className={`w-full bg-black aspect-video ${
            isFullscreen
              ? "rounded-xl shadow-2xl"
              : "rounded-2xl border border-tiki-brown/10 shadow-lg"
          }`}
          aria-label={clip.title}
          title={clip.title}
        >
          Your browser does not support the video element.
        </video>

        {/* Finished overlay */}
        {finished && (
          <div
            className={`absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-5 ${
              isFullscreen ? "rounded-xl" : "rounded-2xl"
            }`}
          >
            <p className="text-white font-black text-2xl">The End</p>
            <p className="text-white/70 text-sm">{story.title}</p>
            <button
              onClick={() => goTo(0)}
              className="px-6 py-3 rounded-2xl bg-white text-tiki-brown font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
            >
              Watch Again
            </button>
          </div>
        )}
      </div>

      {/* ── Fullscreen: nav bar ── */}
      {isFullscreen && (
        <div className="w-full max-w-5xl flex items-center justify-between gap-4 flex-shrink-0">
          <button
            onClick={() => goTo(currentIdx - 1)}
            disabled={isFirst}
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border border-white/20 text-white/80 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-white/12 transition-colors"
          >
            ← Prev
          </button>
          <div className="flex gap-2">
            {clips.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentIdx ? "bg-white" : "bg-white/30 hover:bg-white/55"
                }`}
                aria-label={`Go to clip ${i + 1}`}
              />
            ))}
          </div>
          {!isLast ? (
            <button
              onClick={() => goTo(currentIdx + 1)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/90 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={() => goTo(0)}
              className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl bg-pineapple-yellow/80 text-tiki-brown hover:bg-pineapple-yellow transition-colors"
            >
              Watch Again
            </button>
          )}
        </div>
      )}

      {/* ── Normal: fullscreen button + prev/next ── */}
      {!isFullscreen && (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={enterFullscreen}
            aria-label="Enter full screen"
            className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl bg-tiki-brown/7 text-tiki-brown/65 border border-tiki-brown/15 hover:bg-tiki-brown/12 hover:text-tiki-brown transition-colors"
          >
            <FullscreenIcon />
            Full Screen
          </button>

          {clips.length > 1 && (
            <>
              <button
                onClick={() => goTo(currentIdx - 1)}
                disabled={isFirst}
                className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl border border-tiki-brown/15 text-tiki-brown/70 disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:border-tiki-brown/30 hover:enabled:text-tiki-brown transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-tiki-brown/40 font-semibold">
                {currentIdx + 1} / {clips.length}
              </span>
              {!isLast ? (
                <button
                  onClick={() => goTo(currentIdx + 1)}
                  className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/90 transition-colors"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={() => goTo(0)}
                  className="flex items-center gap-2 text-sm font-bold px-4 py-2.5 rounded-2xl bg-pineapple-yellow/80 text-tiki-brown hover:bg-pineapple-yellow transition-colors"
                >
                  Watch Again
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Clip list (normal mode, more than 3 clips) ── */}
      {!isFullscreen && clips.length > 3 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">All Clips</p>
          <div className="flex flex-col gap-1">
            {clips.map((c, i) => (
              <button
                key={c.id}
                onClick={() => goTo(i)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-left transition-colors ${
                  i === currentIdx
                    ? "bg-ube-purple/10 border border-ube-purple/25"
                    : "bg-white border border-tiki-brown/10 hover:border-tiki-brown/25"
                }`}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    i === currentIdx ? "bg-ube-purple text-white" : "bg-tiki-brown/10 text-tiki-brown/60"
                  }`}
                >
                  {i + 1}
                </span>
                <span
                  className={`text-sm font-semibold leading-snug truncate ${
                    i === currentIdx ? "text-ube-purple" : "text-tiki-brown/75"
                  }`}
                >
                  {c.title}
                </span>
                {i === currentIdx && (
                  <span className="ml-auto text-xs font-bold text-ube-purple/70 flex-shrink-0">
                    Playing
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Back to Stories (normal mode only) ── */}
      {!isFullscreen && (
        <div className="pt-2 border-t border-tiki-brown/10">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            ← Back to Stories
          </Link>
        </div>
      )}
    </div>
  );
}
