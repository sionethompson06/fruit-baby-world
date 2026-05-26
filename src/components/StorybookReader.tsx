"use client";

import { useState, useEffect, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StorybookReaderPage = {
  id: string;
  pageNumber: number;
  title?: string;
  caption?: string;
  readAloudText?: string;
  imageUrl: string;
  altText?: string;
  characters?: string[];
  layoutType?: "single-page" | "two-page-spread" | "cover" | "back-cover";
  displayMode?: "single" | "spread";
  spreadNumber?: number;
  pageRole?: "front-cover" | "inside-cover" | "story-page" | "story-spread" | "end-page" | "back-cover";
};

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ index, total }: { index: number; total: number }) {
  return (
    <div className="flex items-center gap-2.5" aria-hidden="true">
      <div className="flex-1 h-1.5 rounded-full bg-tiki-brown/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-ube-purple/50 transition-all duration-300 ease-out"
          style={{ width: `${((index + 1) / total) * 100}%` }}
        />
      </div>
      <span className="text-xs font-bold text-tiki-brown/45 tabular-nums flex-shrink-0">
        {index + 1} / {total}
      </span>
    </div>
  );
}

// ─── Thumbnail strip ──────────────────────────────────────────────────────────

function ThumbnailStrip({
  pages,
  activeIndex,
  onSelect,
  stripRef,
}: {
  pages: StorybookReaderPage[];
  activeIndex: number;
  onSelect: (i: number) => void;
  stripRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (pages.length <= 1) return null;

  return (
    <div
      ref={stripRef}
      className="flex gap-2.5 overflow-x-auto pb-2 scroll-smooth"
      role="tablist"
      aria-label="Story pages"
      style={{ scrollbarWidth: "thin" }}
    >
      {pages.map((p, i) => {
        const isActive = i === activeIndex;
        const isSpread = p.displayMode === "spread" || p.layoutType === "two-page-spread";
        const label = `Page ${i + 1}${p.title ? `: ${p.title}` : ""}`;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Go to ${label}`}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 flex flex-col items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ube-purple/60 rounded-xl transition-all duration-200 ${
              isActive ? "scale-110 opacity-100" : "opacity-45 hover:opacity-70"
            }`}
          >
            <div
              className={`rounded-xl overflow-hidden border-2 transition-colors duration-200 ${
                isActive
                  ? "border-ube-purple shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
                  : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={label}
                className={`${isSpread ? "w-20" : "w-14"} h-10 object-cover block`}
                loading="lazy"
              />
            </div>
            <span
              className={`text-xs font-bold leading-none tabular-nums ${
                isActive ? "text-ube-purple" : "text-tiki-brown/40"
              }`}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Focus Mode Overlay ───────────────────────────────────────────────────────

function FocusModeReader({
  page,
  index,
  total,
  pages,
  episodeTitle,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onSelect,
  onExit,
  onReadAgain,
  backHref,
  touchHandlers,
}: {
  page: StorybookReaderPage;
  index: number;
  total: number;
  pages: StorybookReaderPage[];
  episodeTitle: string;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (i: number) => void;
  onExit: () => void;
  onReadAgain: () => void;
  backHref: string;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
}) {
  const thumbsRef = useRef<HTMLDivElement>(null);
  const displayText = page.caption || page.readAloudText || null;
  const altText = page.altText || `${episodeTitle} — Page ${page.pageNumber}`;
  const isSpread = page.displayMode === "spread" || page.layoutType === "two-page-spread";
  const spreadPages = pages.filter((p) => p.displayMode === "spread" || p.layoutType === "two-page-spread");
  const spreadIndex = isSpread ? spreadPages.indexOf(page) : -1;
  const spreadTotal = spreadPages.length;
  const pageLabel = isSpread && spreadIndex >= 0
    ? `Spread ${spreadIndex + 1} of ${spreadTotal}`
    : `${index + 1} / ${total}`;

  useEffect(() => {
    if (thumbsRef.current) {
      const activeBtn = thumbsRef.current.querySelector('[aria-selected="true"]') as HTMLElement;
      activeBtn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [index]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[#FFF9ED] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${episodeTitle}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-tiki-brown/10 bg-[#FFF9ED]/95 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base select-none" aria-hidden>📖</span>
          <span className="text-sm font-black text-tiki-brown truncate">{episodeTitle}</span>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit focus mode"
          className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 hover:text-tiki-brown transition-colors flex-shrink-0"
        >
          ✕ Exit
        </button>
      </div>

      {/* Image area — fills remaining space */}
      <div
        className="flex-1 flex items-center justify-center px-4 sm:px-8 py-4 overflow-hidden"
        onTouchStart={touchHandlers.onTouchStart}
        onTouchEnd={touchHandlers.onTouchEnd}
      >
        <div className={`relative max-h-full flex items-center justify-center ${isSpread ? "w-full max-w-5xl" : "w-full max-w-2xl"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.imageUrl}
            alt={altText}
            className="max-w-full max-h-[calc(100vh-280px)] w-auto h-auto rounded-3xl shadow-2xl border border-tiki-brown/8 block"
          />
          {/* Center gutter overlay for spreads */}
          {isSpread && (
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-tiki-brown/20 to-transparent pointer-events-none"
              aria-hidden="true"
            />
          )}
          {/* Overlay progress badge */}
          <div className="absolute bottom-3 right-3 bg-black/40 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm tabular-nums select-none pointer-events-none">
            {pageLabel}
          </div>
          {/* Start Reading overlay on front cover */}
          {page.pageRole === "front-cover" && index === 0 && total > 1 && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
              <button
                type="button"
                onClick={onNext}
                className="pointer-events-auto flex items-center gap-2 text-sm font-black px-6 py-3 rounded-2xl bg-ube-purple text-white shadow-xl hover:bg-ube-purple/90 transition-all active:scale-95"
              >
                Start Reading →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom panel */}
      <div className="flex-shrink-0 bg-[#FFF9ED]/95 backdrop-blur-sm border-t border-tiki-brown/10 px-4 sm:px-8 py-4 flex flex-col gap-3">
        {/* Caption */}
        {(page.title || displayText) && (
          <div className="text-center flex flex-col gap-1 max-w-xl mx-auto">
            {page.title && (
              <p className="text-sm font-black text-tiki-brown leading-snug">{page.title}</p>
            )}
            {displayText && (
              <p className="text-sm text-tiki-brown/65 leading-relaxed">{displayText}</p>
            )}
          </div>
        )}

        {/* Progress + nav */}
        <div className="flex items-center gap-3 max-w-xl mx-auto w-full">
          <button
            type="button"
            onClick={onPrev}
            disabled={isFirst}
            aria-label="Previous page"
            className="flex items-center gap-1 text-sm font-bold px-4 py-2.5 rounded-2xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>

          <div className="flex-1">
            <ProgressBar index={index} total={total} />
          </div>

          <button
            type="button"
            onClick={onNext}
            disabled={isLast}
            aria-label="Next page"
            className="flex items-center gap-1 text-sm font-bold px-4 py-2.5 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        </div>

        {/* Thumbnail strip */}
        <div className="max-w-xl mx-auto w-full">
          <ThumbnailStrip pages={pages} activeIndex={index} onSelect={onSelect} stripRef={thumbsRef} />
        </div>

        {/* End-of-book actions */}
        {isLast && (
          <div className="flex items-center justify-center gap-3 max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={onReadAgain}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
            >
              Read Again
            </button>
            <a
              href={backHref}
              className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors"
            >
              ← Back to Stories
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StorybookReader({
  pages,
  episodeTitle,
  backHref = "/stories",
}: {
  pages: StorybookReaderPage[];
  episodeTitle: string;
  backHref?: string;
}) {
  const [index, setIndex] = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  const total = pages.length;
  const page = pages[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't intercept when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "ArrowRight") setIndex((i) => Math.min(total - 1, i + 1));
      if (e.key === "Escape" && focusMode) setFocusMode(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total, focusMode]);

  // Scroll active thumbnail into view
  useEffect(() => {
    if (thumbsRef.current) {
      const activeBtn = thumbsRef.current.querySelector(
        '[aria-selected="true"]'
      ) as HTMLElement;
      activeBtn?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [index]);

  // Touch/swipe support
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) setIndex((i) => Math.min(total - 1, i + 1)); // swipe left → next
    if (dx > 0) setIndex((i) => Math.max(0, i - 1));         // swipe right → prev
  }

  const touchHandlers = { onTouchStart, onTouchEnd };
  const displayText = page.caption || page.readAloudText || null;
  const altText = page.altText || `${episodeTitle} — Page ${page.pageNumber}`;
  const isSpread = page.displayMode === "spread" || page.layoutType === "two-page-spread";

  // Compute spread number among spread pages only
  const spreadPages = pages.filter((p) => p.displayMode === "spread" || p.layoutType === "two-page-spread");
  const spreadIndex = isSpread ? spreadPages.indexOf(page) : -1;
  const spreadTotal = spreadPages.length;
  const pageLabel = isSpread && spreadIndex >= 0
    ? `Spread ${spreadIndex + 1} of ${spreadTotal}`
    : `Page ${index + 1} of ${total}`;

  if (total === 0) return null;

  // Focus mode — full-screen overlay reader
  if (focusMode) {
    return (
      <FocusModeReader
        page={page}
        index={index}
        total={total}
        pages={pages}
        episodeTitle={episodeTitle}
        isFirst={isFirst}
        isLast={isLast}
        onPrev={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={() => setIndex((i) => Math.min(total - 1, i + 1))}
        onSelect={setIndex}
        onExit={() => setFocusMode(false)}
        onReadAgain={() => { setIndex(0); }}
        backHref={backHref}
        touchHandlers={touchHandlers}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">

      {/* ── Main image frame ─────────────────────────────────────────────── */}
      <div
        className={`relative rounded-3xl overflow-hidden bg-white select-none ${
          page.pageRole === "front-cover" || page.pageRole === "back-cover"
            ? "shadow-[0_8px_32px_rgba(0,0,0,0.14)] border-2 border-tiki-brown/12"
            : "shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-tiki-brown/8"
        }`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={page.imageUrl}
          alt={altText}
          className="w-full block"
          style={{ minHeight: "180px" }}
        />

        {/* Center gutter overlay for spreads */}
        {isSpread && (
          <div
            className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-tiki-brown/15 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Overlay page badge */}
        <div
          className="absolute bottom-3 right-3 bg-black/35 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm tabular-nums select-none pointer-events-none"
          aria-hidden="true"
        >
          {index + 1} / {total}
        </div>

        {/* Start Reading overlay on front cover */}
        {page.pageRole === "front-cover" && index === 0 && total > 1 && (
          <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
            <button
              type="button"
              onClick={() => setIndex(1)}
              className="pointer-events-auto flex items-center gap-2 text-sm font-black px-6 py-3 rounded-2xl bg-ube-purple text-white shadow-xl hover:bg-ube-purple/90 transition-all active:scale-95"
            >
              Start Reading →
            </button>
          </div>
        )}

        {/* Swipe hints on mobile */}
        {!isFirst && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none pl-2 sm:hidden" aria-hidden>
            <div className="text-white/50 text-xl font-black">‹</div>
          </div>
        )}
        {!isLast && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none pr-2 sm:hidden" aria-hidden>
            <div className="text-white/50 text-xl font-black">›</div>
          </div>
        )}
      </div>

      {/* ── Page title + caption / read-aloud text ───────────────────────── */}
      {(page.title || displayText) && (
        <div className="px-1 flex flex-col gap-2">
          {page.title && (
            <h3 className="text-base sm:text-lg font-black text-tiki-brown leading-snug">
              {page.title}
            </h3>
          )}
          {displayText && (
            <p className="text-sm sm:text-base text-tiki-brown/70 leading-relaxed max-w-prose">
              {displayText}
            </p>
          )}
        </div>
      )}

      {/* ── Navigation row ───────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Previous */}
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          aria-label="Previous page"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-bold px-5 py-3 rounded-2xl bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors active:scale-95"
        >
          <span aria-hidden>←</span>
          <span className="hidden sm:inline">Previous</span>
          <span className="sm:hidden">Prev</span>
        </button>

        {/* Progress */}
        <div className="flex-1 flex flex-col gap-1.5">
          <span
            className="text-center text-xs font-bold text-tiki-brown/40 tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {pageLabel}
          </span>
          <div className="h-1.5 rounded-full bg-tiki-brown/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-ube-purple/50 transition-all duration-300 ease-out"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={isLast}
          aria-label="Next page"
          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-sm font-bold px-5 py-3 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-25 disabled:cursor-not-allowed transition-colors active:scale-95"
        >
          <span className="hidden sm:inline">Next</span>
          <span className="sm:hidden">Next</span>
          <span aria-hidden>→</span>
        </button>
      </div>

      {/* ── Thumbnail strip ──────────────────────────────────────────────── */}
      <ThumbnailStrip
        pages={pages}
        activeIndex={index}
        onSelect={setIndex}
        stripRef={thumbsRef}
      />

      {/* ── End-of-book actions ──────────────────────────────────────────── */}
      {isLast && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setIndex(0)}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-2xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            Read Again
          </button>
          <a
            href={backHref}
            className="flex items-center gap-1.5 text-sm font-bold px-4 py-2.5 rounded-2xl bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors"
          >
            ← Back to Stories
          </a>
        </div>
      )}

      {/* ── Focus mode / keyboard hint ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setFocusMode(true)}
          aria-label="Open focus mode for immersive reading"
          className="flex items-center gap-1.5 text-xs font-semibold text-tiki-brown/35 hover:text-tiki-brown/60 transition-colors"
        >
          <span aria-hidden>⛶</span>
          <span>Focus Mode</span>
        </button>
        <span className="hidden sm:flex items-center gap-1 text-xs text-tiki-brown/25" aria-hidden>
          <kbd className="px-1.5 py-0.5 rounded border border-tiki-brown/20 font-mono text-xs">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded border border-tiki-brown/20 font-mono text-xs">→</kbd>
          <span>to navigate</span>
        </span>
      </div>

    </div>
  );
}
