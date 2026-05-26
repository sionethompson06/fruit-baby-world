"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export type StorybookPage = {
  sceneNumber: number;
  title: string;
  text: string;
  imageUrl?: string;
};

type Props = {
  pages: StorybookPage[];
  episodeTitle: string;
  audioUrl?: string;
  videoUrl?: string;
};

const PAGE_VARIANTS = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.96,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 32 },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.22 },
  }),
};

export default function StorybookReader({ pages, episodeTitle, audioUrl, videoUrl }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showVideo, setShowVideo] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const totalPages = pages.length;
  const page = pages[currentIndex];

  const go = useCallback(
    (delta: number) => {
      const next = currentIndex + delta;
      if (next < 0 || next >= totalPages) return;
      setDirection(delta);
      setCurrentIndex(next);
    },
    [currentIndex, totalPages]
  );

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") go(1);
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") go(-1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [go]);

  // Touch/swipe
  const touchStartX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    touchStartX.current = null;
  };

  // Audio
  const toggleAudio = () => {
    const el = audioRef.current;
    if (!el) return;
    if (audioPlaying) {
      el.pause();
      setAudioPlaying(false);
    } else {
      el.play().then(() => setAudioPlaying(true)).catch(() => {});
    }
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onEnded = () => setAudioPlaying(false);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, []);

  if (totalPages === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-tiki-brown/40">
        No pages yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page counter */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide">
          Page {currentIndex + 1} of {totalPages}
        </span>
        <div className="flex gap-1.5">
          {pages.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                i === currentIndex ? "bg-ube-purple scale-125" : "bg-tiki-brown/20 hover:bg-tiki-brown/40"
              }`}
              aria-label={`Go to page ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Main panel */}
      <div
        className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-tiki-brown/8"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={PAGE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            {/* Scene image */}
            {page.imageUrl ? (
              <div className="relative w-full aspect-[4/3] bg-tiki-brown/5">
                <Image
                  src={page.imageUrl}
                  alt={page.title || `Scene ${page.sceneNumber}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 700px"
                  priority={currentIndex === 0}
                />
                {/* Scene number badge */}
                <div className="absolute top-4 left-4">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-tiki-brown shadow-sm">
                    Scene {page.sceneNumber}
                  </span>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-gradient-to-br from-pineapple-yellow/20 via-ube-purple/10 to-tropical-green/15 flex items-center justify-center">
                <span className="text-tiki-brown/30 text-sm">No image yet</span>
              </div>
            )}

            {/* Text */}
            <div className="px-6 py-6 sm:px-8 sm:py-7">
              {page.title && (
                <h3 className="text-base font-black text-tiki-brown mb-3 leading-snug">
                  {page.title}
                </h3>
              )}
              <p className="text-sm sm:text-base text-tiki-brown/80 leading-relaxed">
                {page.text}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => go(-1)}
          disabled={currentIndex === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm border border-tiki-brown/15 text-tiki-brown/60 hover:text-tiki-brown hover:border-tiki-brown/30 hover:bg-tiki-brown/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150"
        >
          ← Previous
        </button>

        {/* Audio player */}
        {audioUrl && (
          <button
            onClick={toggleAudio}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
              audioPlaying
                ? "bg-ube-purple text-white shadow-lg shadow-ube-purple/25"
                : "border border-ube-purple/30 text-ube-purple hover:bg-ube-purple/10"
            }`}
          >
            {audioPlaying ? "⏸ Pause" : "🎧 Listen"}
          </button>
        )}

        <button
          onClick={() => go(1)}
          disabled={currentIndex === totalPages - 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm bg-ube-purple text-white hover:bg-ube-purple/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 shadow-md shadow-ube-purple/20"
        >
          Next →
        </button>
      </div>

      {/* Audio element */}
      {audioUrl && <audio ref={audioRef} src={audioUrl} preload="metadata" />}

      {/* Video CTA */}
      {videoUrl && (
        <button
          onClick={() => setShowVideo(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-warm-coral/30 text-warm-coral font-bold text-sm hover:border-warm-coral/60 hover:bg-warm-coral/5 transition-all duration-200 flex items-center justify-center gap-2"
        >
          🎬 Watch the video
        </button>
      )}

      {/* Video overlay */}
      <AnimatePresence>
        {showVideo && videoUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setShowVideo(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowVideo(false)}
                className="absolute -top-10 right-0 text-white/60 hover:text-white font-bold text-sm"
              >
                ✕ Close
              </button>
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full rounded-2xl shadow-2xl"
              >
                Your browser does not support video playback.
              </video>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
