"use client";

import { useState, useEffect, useRef, useCallback } from "react";

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
  pageRole?: "front-cover" | "title-page" | "publication-page" | "acknowledgement-page" | "introduction-page" | "inside-cover" | "story-page" | "story-spread" | "end-page" | "back-cover";
};

export type StorybookNarrationAudioProp = {
  audioUrl: string;
  title?: string;
  mimeType?: string;
};

// ─── Layout helpers ───────────────────────────────────────────────────────────

function isSpreadPage(p: StorybookReaderPage): boolean {
  return (
    p.displayMode === "spread" ||
    p.layoutType === "two-page-spread" ||
    p.pageRole === "story-spread"
  );
}

function collectSpreadPages(pages: StorybookReaderPage[]): StorybookReaderPage[] {
  return pages.filter(isSpreadPage);
}

function friendlyPageLabel(
  page: StorybookReaderPage,
  index: number,
  total: number,
  spreadPages: StorybookReaderPage[]
): string {
  switch (page.pageRole) {
    case "front-cover":          return "Cover";
    case "title-page":           return "Title Page";
    case "publication-page":     return "Publication Page";
    case "acknowledgement-page": return "Acknowledgements";
    case "introduction-page":    return "Introduction";
    case "inside-cover":         return "Inside Cover";
    case "end-page":             return "The End";
    case "back-cover":           return "Back Cover";
    case "story-spread": {
      const si = spreadPages.indexOf(page);
      return si >= 0 ? `Spread ${si + 1} of ${spreadPages.length}` : "Spread";
    }
    case "story-page": return `Page ${index + 1} of ${total}`;
    default:
      if (isSpreadPage(page)) {
        const si = spreadPages.indexOf(page);
        return si >= 0 ? `Spread ${si + 1} of ${spreadPages.length}` : "Spread";
      }
      return `Page ${index + 1} of ${total}`;
  }
}

function thumbLabel(page: StorybookReaderPage, index: number): string {
  switch (page.pageRole) {
    case "front-cover":          return "Cover";
    case "title-page":           return "Title";
    case "publication-page":     return "Pub.";
    case "acknowledgement-page": return "Ack.";
    case "introduction-page":    return "Intro";
    case "inside-cover":         return "Inside";
    case "end-page":             return "End";
    case "back-cover":           return "Back";
    default:                     return String(index + 1);
  }
}

function frontMatterChip(page: StorybookReaderPage): string | null {
  switch (page.pageRole) {
    case "title-page":           return "Title Page";
    case "publication-page":     return "Publication Page";
    case "acknowledgement-page": return "Acknowledgements";
    case "introduction-page":    return "Introduction";
    case "inside-cover":         return "Inside Cover";
    default:                     return null;
  }
}

// ─── Frame styles ─────────────────────────────────────────────────────────────

type FrameStyle = {
  containerCls: string;    // focus mode
  shadowCls: string;
  imgCls: string;
  bookMaxWidthCls: string; // inline flex layout
};

function getFrameStyle(page: StorybookReaderPage): FrameStyle {
  const spread    = isSpreadPage(page);
  const isCover   = page.pageRole === "front-cover" || page.layoutType === "cover";
  const isBackLike =
    page.pageRole === "back-cover" ||
    page.layoutType === "back-cover" ||
    page.pageRole === "end-page";

  if (isCover) {
    return {
      containerCls:    "w-full max-w-[260px] sm:max-w-xs mx-auto",
      // Strong cover shadow + warm gold trim ring
      shadowCls:       "rounded-2xl overflow-hidden shadow-[0_28px_80px_rgba(0,0,0,0.32),0_8px_24px_rgba(0,0,0,0.16)] ring-2 ring-pineapple-yellow/55 ring-offset-2 ring-offset-transparent",
      imgCls:          "w-full block",
      bookMaxWidthCls: "max-w-[260px] sm:max-w-xs",
    };
  }
  if (isBackLike) {
    return {
      containerCls:    "w-full max-w-[260px] sm:max-w-xs mx-auto",
      shadowCls:       "rounded-2xl overflow-hidden shadow-[0_16px_56px_rgba(0,0,0,0.22),0_4px_16px_rgba(0,0,0,0.10)] ring-1 ring-pineapple-yellow/35 ring-offset-1",
      imgCls:          "w-full block",
      bookMaxWidthCls: "max-w-[260px] sm:max-w-xs",
    };
  }
  if (spread) {
    return {
      containerCls:    "w-full max-w-5xl mx-auto",
      shadowCls:       "rounded-2xl overflow-hidden shadow-[0_12px_52px_rgba(0,0,0,0.14),0_3px_14px_rgba(0,0,0,0.08)] border border-amber-100/80 bg-white",
      imgCls:          "w-full block max-h-[65vh] object-contain",
      bookMaxWidthCls: "max-w-5xl",
    };
  }
  // Single page / front matter
  return {
    containerCls:    "w-full max-w-md sm:max-w-lg mx-auto",
    shadowCls:       "rounded-2xl overflow-hidden shadow-[0_8px_44px_rgba(0,0,0,0.12),0_2px_10px_rgba(0,0,0,0.07)] border border-amber-100/60 bg-white",
    imgCls:          "w-full block",
    bookMaxWidthCls: "max-w-md sm:max-w-lg",
  };
}

// ─── Time formatter ───────────────────────────────────────────────────────────

function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Narration player bar ─────────────────────────────────────────────────────

function NarrationPlayerBar({
  playing, duration, currentTime, onToggle, onSeek, prominent = false,
}: {
  playing: boolean; duration: number; currentTime: number;
  onToggle: () => void; onSeek: (t: number) => void; prominent?: boolean;
}) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
      prominent
        ? "bg-ube-purple/12 border-2 border-ube-purple/25 shadow-sm"
        : "bg-ube-purple/8 border border-ube-purple/15"
    }`}>
      <button
        type="button"
        onClick={onToggle}
        aria-label={playing ? "Pause narration" : "Play narration"}
        className={`flex-shrink-0 flex items-center justify-center rounded-full text-white transition-all active:scale-95 ${
          prominent
            ? "w-11 h-11 bg-ube-purple shadow-md hover:bg-ube-purple/88"
            : "w-9 h-9 bg-ube-purple hover:bg-ube-purple/85"
        }`}
      >
        <span className="text-sm">{playing ? "⏸" : "▶"}</span>
      </button>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        <span className="text-xs font-black text-ube-purple leading-none">
          {prominent ? "🎧 Listen While You Read" : "Listen While Reading"}
        </span>
        <div
          className="h-2 rounded-full bg-ube-purple/15 overflow-hidden cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(ratio * duration);
          }}
          role="slider"
          aria-label="Audio playback position"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-ube-purple/60 transition-all duration-150 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="flex-shrink-0 text-xs tabular-nums text-ube-purple/60 font-semibold">
        {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
      </span>
    </div>
  );
}

// ─── Progress pips / bar ──────────────────────────────────────────────────────

function ProgressIndicator({ index, total }: { index: number; total: number }) {
  if (total <= 14) {
    return (
      <div className="flex gap-1 flex-wrap justify-center" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-200 ${
              i === index
                ? "w-4 h-1.5 bg-ube-purple"
                : i < index
                ? "w-1.5 h-1.5 bg-ube-purple/30"
                : "w-1.5 h-1.5 bg-tiki-brown/12"
            }`}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="h-1.5 rounded-full bg-tiki-brown/10 overflow-hidden flex-1" aria-hidden="true">
      <div
        className="h-full rounded-full bg-ube-purple/45 transition-all duration-300 ease-out"
        style={{ width: `${((index + 1) / total) * 100}%` }}
      />
    </div>
  );
}

// ─── Thumbnail strip ──────────────────────────────────────────────────────────

function ThumbnailStrip({
  pages, activeIndex, onSelect, stripRef,
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
      className="flex gap-2 overflow-x-auto py-2 scroll-smooth"
      role="tablist"
      aria-label="Story pages"
      style={{ scrollbarWidth: "thin" }}
    >
      {pages.map((p, i) => {
        const isActive = i === activeIndex;
        const spread   = isSpreadPage(p);
        const label    = thumbLabel(p, i);
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Go to ${label}`}
            onClick={() => onSelect(i)}
            className={`flex-shrink-0 flex flex-col items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ube-purple/60 rounded-xl transition-all duration-200 ${
              isActive ? "scale-110 opacity-100" : "opacity-40 hover:opacity-65"
            }`}
          >
            <div className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
              isActive
                ? "border-ube-purple shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
                : "border-transparent"
            }`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={label}
                className={`${spread ? "w-20" : "w-12"} h-10 object-cover block`}
                loading="lazy"
              />
            </div>
            <span className={`text-[10px] font-bold leading-none truncate max-w-[4.5rem] ${
              isActive ? "text-ube-purple" : "text-tiki-brown/35"
            }`}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Focus mode overlay ───────────────────────────────────────────────────────

function FocusModeReader({
  page, index, total, pages, episodeTitle,
  isFirst, isLast, pageAnimCls,
  onPrev, onNext, onSelect, onExit, onReadAgain,
  backHref, touchHandlers, spreadPages,
  audioPlaying, audioDuration, audioCurrentTime, onAudioToggle, onAudioSeek,
}: {
  page: StorybookReaderPage; index: number; total: number;
  pages: StorybookReaderPage[]; episodeTitle: string;
  isFirst: boolean; isLast: boolean; pageAnimCls: string;
  onPrev: () => void; onNext: () => void;
  onSelect: (i: number) => void; onExit: () => void; onReadAgain: () => void;
  backHref: string;
  touchHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  spreadPages: StorybookReaderPage[];
  audioPlaying?: boolean; audioDuration?: number; audioCurrentTime?: number;
  onAudioToggle?: () => void; onAudioSeek?: (t: number) => void;
}) {
  const thumbsRef   = useRef<HTMLDivElement>(null);
  const displayText = page.caption || page.readAloudText || null;
  const altText     = page.altText || `${episodeTitle} — Page ${page.pageNumber}`;
  const spread      = isSpreadPage(page);
  const pageLabel   = friendlyPageLabel(page, index, total, spreadPages);

  useEffect(() => {
    if (thumbsRef.current) {
      const active = thumbsRef.current.querySelector('[aria-selected="true"]') as HTMLElement;
      active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [index]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(180deg, #FFF7E8 0%, #FFFAF0 100%)" }}
      role="dialog"
      aria-modal="true"
      aria-label={`Reading: ${episodeTitle}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-pineapple-yellow/30 bg-[#FFF7E8]/90 backdrop-blur-sm flex-shrink-0 gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-base select-none flex-shrink-0" aria-hidden="true">📖</span>
          <span className="text-sm font-black text-tiki-brown truncate leading-tight">{episodeTitle}</span>
        </div>
        <span
          className="flex-shrink-0 text-[11px] font-bold px-3 py-1 rounded-full bg-pineapple-yellow/30 text-tiki-brown/65 border border-pineapple-yellow/40 select-none hidden sm:block"
          aria-live="polite"
          aria-atomic="true"
        >
          {pageLabel}
        </span>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit reader"
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white/70 border border-tiki-brown/10 text-tiki-brown/60 hover:bg-white hover:text-tiki-brown transition-all"
        >
          ✕ Exit Reader
        </button>
      </div>

      {/* Main area: left arrow | image | right arrow */}
      <div
        className="flex-1 flex items-center justify-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 overflow-hidden"
        onTouchStart={touchHandlers.onTouchStart}
        onTouchEnd={touchHandlers.onTouchEnd}
      >
        <FlipbookArrow direction="prev" disabled={isFirst} onClick={onPrev} />

        {/* Image container */}
        <div className={`relative min-w-0 flex-1 flex items-center justify-center ${spread ? "max-w-5xl" : "max-w-sm sm:max-w-md"}`}>
          <div key={`focus-page-${index}`} className={pageAnimCls}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.imageUrl}
              alt={altText}
              className="max-w-full max-h-[calc(100dvh-220px)] w-auto h-auto block rounded-2xl shadow-2xl"
            />
          </div>
          {spread && (
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, transparent, rgba(139,90,43,0.12) 30%, rgba(139,90,43,0.20) 50%, rgba(139,90,43,0.12) 70%, transparent)" }}
              aria-hidden="true"
            />
          )}
          {page.pageRole === "front-cover" && index === 0 && total > 1 && (
            <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none">
              <button
                type="button"
                onClick={onNext}
                className="pointer-events-auto flex items-center gap-2 text-sm font-black px-7 py-3.5 rounded-2xl bg-ube-purple text-white shadow-2xl hover:bg-ube-purple/90 transition-all active:scale-95"
              >
                📖 Start Reading →
              </button>
            </div>
          )}
        </div>

        <FlipbookArrow direction="next" disabled={isLast} onClick={onNext} />
      </div>

      {/* Bottom panel — caption, progress, thumbnails, audio, end actions */}
      <div className="flex-shrink-0 bg-[#FFF7E8]/90 backdrop-blur-sm border-t border-pineapple-yellow/30 px-4 sm:px-8 py-3 flex flex-col gap-2.5">
        {(page.title || displayText) && (
          <div className="text-center max-w-xl mx-auto flex flex-col gap-0.5">
            {page.title && (
              <p className="text-sm font-black text-tiki-brown leading-snug">{page.title}</p>
            )}
            {displayText && (
              <p className="text-sm text-tiki-brown/60 leading-relaxed italic">
                &ldquo;{displayText}&rdquo;
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 max-w-xl mx-auto w-full">
          <ProgressIndicator index={index} total={total} />
          <span className="flex-shrink-0 text-xs tabular-nums text-tiki-brown/28 font-semibold select-none">
            {index + 1}/{total}
          </span>
        </div>

        <div className="max-w-xl mx-auto w-full">
          <ThumbnailStrip pages={pages} activeIndex={index} onSelect={onSelect} stripRef={thumbsRef} />
        </div>

        {onAudioToggle && (
          <div className="max-w-xl mx-auto w-full">
            <NarrationPlayerBar
              playing={audioPlaying ?? false}
              duration={audioDuration ?? 0}
              currentTime={audioCurrentTime ?? 0}
              onToggle={onAudioToggle}
              onSeek={onAudioSeek ?? (() => {})}
            />
          </div>
        )}

        {isLast && (
          <div className="flex items-center justify-center gap-3 max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={onReadAgain}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl bg-pineapple-yellow/30 border border-pineapple-yellow/50 text-tiki-brown hover:bg-pineapple-yellow/50 transition-colors"
            >
              🔁 Read Again
            </button>
            <a
              href={backHref}
              className="flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors"
            >
              ← Stories
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Flipbook arrow button ────────────────────────────────────────────────────

function FlipbookArrow({
  direction, disabled, onClick,
}: {
  direction: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "prev" ? "Previous page" : "Next page"}
      className={`
        flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-full
        flex items-center justify-center
        bg-white/90 backdrop-blur-sm
        border-2 border-pineapple-yellow/55
        text-tiki-brown/65
        shadow-[0_4px_18px_rgba(212,160,16,0.20)]
        hover:bg-pineapple-yellow/22 hover:border-pineapple-yellow/85
        hover:text-tiki-brown hover:-translate-y-0.5
        hover:shadow-[0_7px_22px_rgba(212,160,16,0.32)]
        disabled:opacity-18 disabled:cursor-not-allowed
        disabled:shadow-none disabled:translate-y-0
        transition-all duration-200
        active:scale-90 active:translate-y-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ube-purple/50
      `}
    >
      <span
        className="text-[1.75rem] sm:text-[2.25rem] font-black leading-none select-none"
        aria-hidden="true"
      >
        {direction === "prev" ? "‹" : "›"}
      </span>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StorybookReader({
  pages,
  episodeTitle,
  backHref = "/stories",
  narrationAudio,
  listenModeActive = false,
}: {
  pages: StorybookReaderPage[];
  episodeTitle: string;
  backHref?: string;
  narrationAudio?: StorybookNarrationAudioProp;
  listenModeActive?: boolean;
}) {
  const [index, setIndex]         = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [turnDir, setTurnDir]     = useState<"next" | "prev" | null>(null);
  const turningRef                = useRef(false);
  const touchStartX               = useRef<number | null>(null);
  const thumbsRef                 = useRef<HTMLDivElement>(null);

  // Audio — persists across page turns and mode switches
  const audioRef                        = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);

  const toggleAudio = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (audioPlaying) { el.pause(); } else { el.play().catch(() => {}); }
  }, [audioPlaying]);

  const seekAudio = useCallback((t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = t;
    setAudioCurrentTime(t);
  }, []);

  const total       = pages.length;
  const page        = pages[index];
  const isFirst     = index === 0;
  const isLast      = index === total - 1;
  const spreadPages = collectSpreadPages(pages);
  const pageLabel   = friendlyPageLabel(page, index, total, spreadPages);
  const chip        = frontMatterChip(page);
  const frame       = getFrameStyle(page);
  const spreadLayout = isSpreadPage(page);
  const displayText = page.caption || page.readAloudText || null;
  const altText     = page.altText || `${episodeTitle} — Page ${page.pageNumber}`;
  const isEndingPage = page.pageRole === "end-page" || page.pageRole === "back-cover";

  // ── Navigation ─────────────────────────────────────────────────────────────

  const goNext = useCallback(() => {
    if (index >= total - 1 || turningRef.current) return;
    turningRef.current = true;
    setTurnDir("next");
    setIndex((i) => Math.min(total - 1, i + 1));
    setTimeout(() => { turningRef.current = false; }, 380);
  }, [index, total]);

  const goPrev = useCallback(() => {
    if (index <= 0 || turningRef.current) return;
    turningRef.current = true;
    setTurnDir("prev");
    setIndex((i) => Math.max(0, i - 1));
    setTimeout(() => { turningRef.current = false; }, 380);
  }, [index]);

  const goToPage = useCallback((i: number) => {
    if (i === index || turningRef.current) return;
    turningRef.current = true;
    setTurnDir(i > index ? "next" : "prev");
    setIndex(i);
    setTimeout(() => { turningRef.current = false; }, 380);
  }, [index]);

  // ── Keyboard ───────────────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft")  goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape" && focusMode) setFocusMode(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, focusMode]);

  // ── Hash-based trigger: #open-reader → open immersive reader ───────────────

  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#open-reader") setFocusMode(true);
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // ── Scroll lock while immersive reader is open ─────────────────────────────

  useEffect(() => {
    if (focusMode) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [focusMode]);

  // ── Thumbnail scroll ───────────────────────────────────────────────────────

  useEffect(() => {
    if (thumbsRef.current) {
      const active = thumbsRef.current.querySelector('[aria-selected="true"]') as HTMLElement;
      active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [index]);

  // ── Touch / swipe ──────────────────────────────────────────────────────────

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) goNext();
    if (dx > 0) goPrev();
  }

  if (total === 0) {
    return (
      <div className="py-16 text-center text-tiki-brown/50 italic text-sm">
        Storybook coming soon.
      </div>
    );
  }

  const audioProps = narrationAudio
    ? { audioPlaying, audioDuration, audioCurrentTime, onAudioToggle: toggleAudio, onAudioSeek: seekAudio }
    : {};

  const pageAnimCls =
    turnDir === "next" ? "flipbook-page-enter-next" :
    turnDir === "prev" ? "flipbook-page-enter-prev" : "";

  return (
    <div>
      {/* Hidden persistent audio — stays mounted across page turns */}
      {narrationAudio && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio
          ref={audioRef}
          src={narrationAudio.audioUrl}
          preload="metadata"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={() => setAudioPlaying(false)}
          onTimeUpdate={() => setAudioCurrentTime(audioRef.current?.currentTime ?? 0)}
          onLoadedMetadata={() => setAudioDuration(audioRef.current?.duration ?? 0)}
          className="hidden"
        />
      )}

      {/* Immersive full-screen reader overlay */}
      {focusMode && (
        <FocusModeReader
          page={page}
          index={index}
          total={total}
          pages={pages}
          episodeTitle={episodeTitle}
          isFirst={isFirst}
          isLast={isLast}
          pageAnimCls={pageAnimCls}
          onPrev={goPrev}
          onNext={goNext}
          onSelect={goToPage}
          onExit={() => setFocusMode(false)}
          onReadAgain={() => { setTurnDir(null); setIndex(0); }}
          backHref={backHref}
          touchHandlers={{ onTouchStart, onTouchEnd }}
          spreadPages={spreadPages}
          {...audioProps}
        />
      )}

      {/* ── Inline flipbook reader ── */}
      {!focusMode && (
        <div className="flex flex-col gap-4">

          {/* Prominent audio bar — listen mode */}
          {narrationAudio && listenModeActive && (
            <NarrationPlayerBar
              playing={audioPlaying}
              duration={audioDuration}
              currentTime={audioCurrentTime}
              onToggle={toggleAudio}
              onSeek={seekAudio}
              prominent
            />
          )}

          {/* Front-matter chip */}
          {chip && (
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 border border-pineapple-yellow/40 uppercase tracking-wide">
                {chip}
              </span>
            </div>
          )}

          {/* ══ Magical book stage ══════════════════════════════════════════ */}
          <div className="flipbook-stage-bg rounded-[2rem] relative overflow-hidden py-6 sm:py-10 px-3 sm:px-6 border border-pineapple-yellow/35 shadow-[0_2px_20px_rgba(220,180,50,0.14)]">

            {/* ── CSS-only stage decorations — aria-hidden, outside image ── */}
            {/* Top-left sparkle */}
            <span
              className="absolute top-2.5 left-3 text-[13px] text-pineapple-yellow/70 select-none pointer-events-none flipbook-sparkle"
              aria-hidden="true"
            >✦</span>
            {/* Top-right heart */}
            <span
              className="absolute top-2.5 right-3.5 text-[11px] text-blush-pink/65 select-none pointer-events-none flipbook-sparkle flipbook-sparkle-d1"
              aria-hidden="true"
            >♡</span>
            {/* Top inner-left diamond */}
            <span
              className="absolute top-2 left-[28%] text-[9px] text-sky-blue/65 select-none pointer-events-none hidden sm:block flipbook-sparkle flipbook-sparkle-d2"
              aria-hidden="true"
            >✧</span>
            {/* Top inner-right diamond */}
            <span
              className="absolute top-2 right-[28%] text-[9px] text-mango-orange/55 select-none pointer-events-none hidden sm:block flipbook-sparkle flipbook-sparkle-d3"
              aria-hidden="true"
            >◆</span>
            {/* Mid-left edge star */}
            <span
              className="absolute top-[38%] left-1.5 text-[9px] text-tropical-green/38 select-none pointer-events-none hidden sm:block flipbook-sparkle flipbook-sparkle-d4"
              aria-hidden="true"
            >◇</span>
            {/* Mid-right edge star */}
            <span
              className="absolute top-[38%] right-1.5 text-[10px] text-blush-pink/38 select-none pointer-events-none hidden sm:block flipbook-sparkle flipbook-sparkle-d2"
              aria-hidden="true"
            >★</span>

            {/* Arrow + book + arrow */}
            <div
              className="relative z-10 flex items-center justify-center gap-2 sm:gap-4"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Left arrow */}
              <FlipbookArrow direction="prev" disabled={isFirst} onClick={goPrev} />

              {/* Book frame wrapper */}
              <div
                className={`relative min-w-0 flex-1 ${frame.bookMaxWidthCls} select-none`}
                aria-live="polite"
                aria-atomic="true"
                aria-label={`Page: ${pageLabel}`}
              >
                {/* Floor shadow — oval under the book */}
                <div
                  className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-4/5 h-6 rounded-full pointer-events-none -z-10"
                  style={{ background: "radial-gradient(ellipse, rgba(139,90,43,0.18) 0%, transparent 72%)" }}
                  aria-hidden="true"
                />

                {/* Book frame */}
                <div className={`relative ${frame.shadowCls}`}>

                  {/* Page-turn animated wrapper */}
                  <div key={`page-${index}`} className={pageAnimCls}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.imageUrl}
                      alt={altText}
                      className={frame.imgCls}
                    />
                  </div>

                  {/* Page thickness — right edge (warm amber) */}
                  <div
                    className="absolute inset-y-0 right-0 w-[5px] bg-gradient-to-r from-transparent via-amber-200/40 to-amber-300/55 z-10 pointer-events-none rounded-r-2xl"
                    aria-hidden="true"
                  />
                  {/* Page thickness — bottom edge */}
                  <div
                    className="absolute inset-x-0 bottom-0 h-[4px] bg-gradient-to-b from-transparent to-amber-200/35 z-10 pointer-events-none"
                    aria-hidden="true"
                  />

                  {/* Center gutter for spreads */}
                  {spreadLayout && (
                    <div
                      className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[3px] bg-gradient-to-b from-transparent via-tiki-brown/12 to-transparent z-10 pointer-events-none"
                      style={{ background: "linear-gradient(to bottom, transparent, rgba(139,90,43,0.10) 30%, rgba(139,90,43,0.18) 50%, rgba(139,90,43,0.10) 70%, transparent)" }}
                      aria-hidden="true"
                    />
                  )}

                  {/* Page label badge */}
                  <div
                    className="absolute bottom-2.5 right-2.5 bg-black/35 text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 sm:py-1 rounded-full backdrop-blur-sm select-none pointer-events-none z-20"
                    aria-hidden="true"
                  >
                    {pageLabel}
                  </div>

                  {/* Start Reading overlay on front cover */}
                  {page.pageRole === "front-cover" && index === 0 && total > 1 && (
                    <div className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-none z-20">
                      <button
                        type="button"
                        onClick={goNext}
                        className="pointer-events-auto flex items-center gap-2 text-sm font-black px-7 py-3.5 rounded-2xl bg-ube-purple text-white shadow-2xl hover:bg-ube-purple/90 transition-all active:scale-95"
                      >
                        📖 Start Reading →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right arrow */}
              <FlipbookArrow direction="next" disabled={isLast} onClick={goNext} />
            </div>

            {/* ── Title plaque + page badge — inside stage ── */}
            <div className="relative z-10 mt-4 sm:mt-5 flex flex-col items-center gap-2">
              {/* Story title plaque */}
              <div className="px-4 sm:px-6 py-1.5 sm:py-2 rounded-2xl bg-white/55 border border-pineapple-yellow/42 shadow-sm text-center max-w-[88%] backdrop-blur-sm">
                <span
                  className="[font-family:var(--font-margarine)] text-xs sm:text-sm text-tiki-brown/65 leading-snug block truncate"
                >
                  {episodeTitle}
                </span>
              </div>
              {/* Page progress badge */}
              <span
                className="text-[11px] font-bold px-4 py-1 rounded-full bg-pineapple-yellow/30 text-tiki-brown/58 border border-pineapple-yellow/45 select-none"
                aria-live="polite"
                aria-atomic="true"
              >
                {pageLabel}
              </span>
            </div>
          </div>
          {/* ══ End stage ═══════════════════════════════════════════════════ */}

          {/* "The End" flourish */}
          {isLast && isEndingPage && (
            <div className="text-center py-1">
              <span
                className="[font-family:var(--font-margarine)] text-lg text-pineapple-yellow/75 tracking-widest select-none"
                aria-hidden="true"
              >
                ✨ The End ✨
              </span>
            </div>
          )}

          {/* Caption / read-aloud text */}
          {(page.title || displayText) && (
            <div className="px-1 flex flex-col gap-1.5">
              {page.title && (
                <h3 className="text-base sm:text-lg font-black text-tiki-brown leading-snug">
                  {page.title}
                </h3>
              )}
              {displayText && (
                <p className="text-sm sm:text-base text-tiki-brown/65 leading-relaxed italic max-w-prose">
                  &ldquo;{displayText}&rdquo;
                </p>
              )}
            </div>
          )}

          {/* Progress row — pips only (label is in the stage plaque) */}
          <div className="flex items-center justify-center gap-3 px-1">
            <ProgressIndicator index={index} total={total} />
            <span className="text-xs font-bold text-tiki-brown/28 tabular-nums flex-shrink-0">
              {index + 1}/{total}
            </span>
          </div>

          {/* Thumbnail strip */}
          <ThumbnailStrip
            pages={pages}
            activeIndex={index}
            onSelect={goToPage}
            stripRef={thumbsRef}
          />

          {/* Audio bar (standard read mode) */}
          {narrationAudio && !listenModeActive && (
            <NarrationPlayerBar
              playing={audioPlaying}
              duration={audioDuration}
              currentTime={audioCurrentTime}
              onToggle={toggleAudio}
              onSeek={seekAudio}
            />
          )}

          {/* End-of-book actions */}
          {isLast && (
            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setTurnDir(null); setIndex(0); }}
                className="flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-2xl bg-pineapple-yellow/25 border border-pineapple-yellow/50 text-tiki-brown hover:bg-pineapple-yellow/45 transition-all"
              >
                🔁 Read Again
              </button>
              <a
                href={backHref}
                className="flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-2xl bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-all"
              >
                ← Back to Stories
              </a>
            </div>
          )}

          {/* Focus mode toggle + keyboard hint */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setFocusMode(true)}
              aria-label="Open focus mode for immersive reading"
              className="flex items-center gap-1.5 text-xs font-semibold text-tiki-brown/30 hover:text-tiki-brown/55 transition-colors"
            >
              <span aria-hidden="true">⛶</span>
              <span>Focus Mode</span>
            </button>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-tiki-brown/20" aria-hidden="true">
              <kbd className="px-1.5 py-0.5 rounded border border-tiki-brown/18 font-mono text-[10px]">←</kbd>
              <kbd className="px-1.5 py-0.5 rounded border border-tiki-brown/18 font-mono text-[10px]">→</kbd>
              <span>navigate</span>
            </span>
          </div>

        </div>
      )}
    </div>
  );
}
