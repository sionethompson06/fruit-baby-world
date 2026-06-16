"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { AnimatedStory, AnimatedStoryClip } from "@/lib/animatedStoriesTypes";

export default function AnimatedStoryViewer({
  story,
  clips,
}: {
  story: AnimatedStory;
  clips: AnimatedStoryClip[];
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasPlayedRef = useRef(false);

  const clip = clips[currentIdx];
  const isFirst = currentIdx === 0;
  const isLast = currentIdx === clips.length - 1;

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

  if (!clip) return null;

  return (
    <div className="flex flex-col gap-6">

      {/* Clip counter + dot navigation */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Clip {currentIdx + 1} of {clips.length}
          </p>
          <p className="text-lg font-black text-tiki-brown leading-snug">
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

      {/* Video player */}
      <div className="relative">
        <video
          ref={videoRef}
          src={clip.videoUrl}
          controls
          playsInline
          preload="metadata"
          onPlay={handlePlay}
          onEnded={handleEnded}
          className="w-full rounded-2xl border border-tiki-brown/10 bg-black shadow-md aspect-video"
          aria-label={clip.title}
          title={clip.title}
        >
          Your browser does not support the video element.
        </video>
        {finished && (
          <div className="absolute inset-0 rounded-2xl bg-black/65 flex flex-col items-center justify-center gap-5">
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

      {/* Prev / Next navigation */}
      {clips.length > 1 && (
        <div className="flex items-center justify-between gap-4">
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
        </div>
      )}

      {/* Clip list (when more than 3 clips) */}
      {clips.length > 3 && (
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

      {/* Back link */}
      <div className="pt-2 border-t border-tiki-brown/10">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
        >
          ← Back to Stories
        </Link>
      </div>
    </div>
  );
}
