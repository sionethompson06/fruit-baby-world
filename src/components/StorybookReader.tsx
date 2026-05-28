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
  containerCls: string;  // used by focus mode
  shadowCls: string;
  imgCls: string;
  bookMaxWidthCls: string; // used by inline flipbook flex layout
};

function getFrameStyle(page: StorybookReaderPage): FrameStyle {
  const spread   = isSpreadPage(page);
  const isCover  = page.pageRole === "front-cover" || page.layoutType === "cover";
  const isBackLike =
    page.pageRole === "back-cover" ||
    page.layoutType === "back-cover" ||
    page.pageRole === "end-page";

  if (isCover) {
    return {
      containerCls:   "w-full max-w-[260px] sm:max-w-xs mx-auto",
      shadowCls:      "rounded-2xl overflow-hidden shadow-[0_20px_64px_rgba(0,0,0,0.28)] border-2 border-white/75",
      imgCls:         "w-full block",
      bookMaxWidthCls:"max-w-[260px] sm:max-w-xs",
    };
  }
  if (isBackLike) {
    return {
      containerCls:   "w-full max-w-[260px] sm:max-w-xs mx-auto",
      shadowCls:      "rounded-2xl overflow-hidden shadow-[0_12px_48px_rgba(0,0,0,0.18)] border border-tiki-brown/12",
      imgCls:         "w-full block",
      bookMaxWidthCls:"max-w-[260px] sm:max-w-xs",
    };
  }
  if (spread) {
    return {
      containerCls:   "w-full max-w-5xl mx-auto",
      shadowCls:      "rounded-2xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-tiki-brown/10 bg-white",
      imgCls:         "w-full block max-h-[65vh] object-contain",
      bookMaxWidthCls:"max-w-5xl",
    };
  }
  return {
    containerCls:   "w-full max-w-md sm:max-w-lg mx-auto",
    shadowCls:      "rounded-2xl overflow-hidden shadow-[0_6px_32px_rgba(0,0,0,0.10)] border border-tiki-brown/8 bg-white",
    imgCls:         "w-full block",
    bookMaxWidthCls:"max-w-md sm:max-w-lg",
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
  playing,
  duration,
  currentTime,
  onToggle,
  onSeek,
  prominent = false,
}: {
  playing: boolean;
  duration: number;
  currentTime: number;
  onToggle: () => void;
  onSeek: (t: number) => void;
  prominent?: boolean;
}) {
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
        prominent
          ? "bg-ube-purple/12 border-2 border-ube-purple/25 shadow-sm"
          : "bg-ube-purple/8 border border-ube-purple/15"
      }`}
    >
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
        {formatTime(currentTime)}
        {duration > 0 ? ` / ${formatTime(duration)}` : ""}
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
            <div
              className={`rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                isActive
                  ? "border-ube-purple shadow-[0_0_0_3px_rgba(124,58,237,0.12)]"
                  : "border-transparent"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.imageUrl}
                alt={label}
                className={`${spread ? "w-20" : "w-12"} h-10 object-cover block`}
                loading="lazy"
              />
            </div>
            <span
              className={`text-[10px] font-bold leading-none truncate max-w-[4.5rem] ${
                isActive ? "text-ube-purple" : "text-tiki-brown/35"
              }`}
            >
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
  spreadPages,
  audioPlaying,
  audioDuration,
  audioCurrentTime,
  onAudioToggle,
  onAudioSeek,
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
  spreadPages: StorybookReaderPage[];
  audioPlaying?: boolean;
  audioDuration?: number;
  audioCurrentTime?: number;
  onAudioToggle?: () => void;
  onAudioSeek?: (t: number) => void;
}) {
  const thumbsRef  = useRef<HTMLDivElement>(null);
  const displayText = page.caption || page.readAloudText || null;
  const altText    = page.altText || `${episodeTitle} — Page ${page.pageNumber}`;
  const spread     = isSpreadPage(page);
  const pageLabel  = friendlyPageLabel(page, index, total, spreadPages);
  const chip       = frontMatterChip(page);

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
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-pineapple-yellow/30 bg-[#FFF7E8]/90 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg select-none" aria-hidden="true">📖</span>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-black text-tiki-brown truncate leading-tight">
              {episodeTitle}
            </span>
            {chip && (
              <span className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide leading-tight">
                {chip}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onExit}
          aria-label="Exit focus mode"
          className="flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-white/70 border border-tiki-brown/10 text-tiki-brown/60 hover:bg-white hover:text-tiki-brown transition-all flex-shrink-0"
        >
          ✕ Exit
        </button>
      </div>

      {/* Image area */}
      <div
        className="flex-1 flex items-center justify-center px-4 sm:px-10 py-4 overflow-hidden"
        onTouchStart={touchHandlers.onTouchStart}
        onTouchEnd={touchHandlers.onTouchEnd}
      >
        <div className={`relative flex items-center justify-center ${spread ? "w-full max-w-5xl" : "max-w-2xl mx-auto w-full"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.imageUrl}
            alt={altText}
            className="max-w-full max-h-[calc(100dvh-300px)] w-auto h-auto block rounded-2xl shadow-2xl"
          />
          {spread && (
            <div
              className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-gradient-to-b from-transparent via-tiki-brown/15 to-transparent pointer-events-none"
              aria-hidden="true"
            />
          )}
          <div
            className="absolute bottom-3 right-3 bg-black/45 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm select-none pointer-events-none"
            aria-hidden="true"
          >
            {pageLabel}
          </div>
          {page.pageRole === "front-cover" && index === 0 && total > 1 && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
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
      </div>

      {/* Bottom panel */}
      <div className="flex-shrink-0 bg-[#FFF7E8]/90 backdrop-blur-sm border-t border-pineapple-yellow/30 px-4 sm:px-8 py-4 flex flex-col gap-3">
        {(page.title || displayText) && (
          <div className="text-center max-w-xl mx-auto flex flex-col gap-1">
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
          <button
            type="button"
            onClick={onPrev}
            disabled={isFirst}
            aria-label="Previous page"
            className="flex items-center gap-1 text-sm font-bold px-4 py-2.5 rounded-2xl bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          >
            ← Prev
          </button>
          <div className="flex-1 flex flex-col items-center gap-1.5">
            <ProgressIndicator index={index} total={total} />
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
  direction,
  disabled,
  onClick,
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
      className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-white border-2 border-pineapple-yellow/50 text-tiki-brown/65 shadow-sm hover:bg-pineapple-yellow/20 hover:border-pineapple-yellow/75 hover:text-tiki-brown hover:shadow-md disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ube-purple/50"
    >
      <span
        className="text-2xl sm:text-3xl font-black leading-none select-none"
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
  const [index, setIndex]       = useState(0);
  const [focusMode, setFocusMode] = useState(false);
  const [turnDir, setTurnDir]   = useState<"next" | "prev" | null>(null);
  const turningRef              = useRef(false);
  const touchStartX             = useRef<number | null>(null);
  const thumbsRef               = useRef<HTMLDivElement>(null);

  // Audio state — persists across page turns and mode switches
  const audioRef              = useRef<HTMLAudioElement>(null);
  const [audioPlaying, setAudioPlaying]     = useState(false);
  const [audioDuration, setAudioDuration]   = useState(0);
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

  const total      = pages.length;
  const page       = pages[index];
  const isFirst    = index === 0;
  const isLast     = index === total - 1;
  const spreadPages  = collectSpreadPages(pages);
  const pageLabel    = friendlyPageLabel(page, index, total, spreadPages);
  const chip         = frontMatterChip(page);
  const frame        = getFrameStyle(page);
  const spreadLayout = isSpreadPage(page);
  const displayText  = page.caption || page.readAloudText || null;
  const altText      = page.altText || `${episodeTitle} — Page ${page.pageNumber}`;
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

  // ── Keyboard navigation ────────────────────────────────────────────────────

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

  // ── Keep active thumbnail in view ──────────────────────────────────────────

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

  // Animation class for the current page based on turn direction
  const pageAnimCls =
    turnDir === "next" ? "flipbook-page-enter-next" :
    turnDir === "prev" ? "flipbook-page-enter-prev" : "";

  return (
    <div>
      {/* Persistent hidden audio — stays mounted across page turns */}
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

      {/* Focus mode overlay */}
      {focusMode && (
        <FocusModeReader
          page={page}
          index={index}
          total={total}
          pages={pages}
          episodeTitle={episodeTitle}
          isFirst={isFirst}
          isLast={isLast}
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

          {/* Front-matter page chip */}
          {chip && (
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 border border-pineapple-yellow/40 uppercase tracking-wide">
                {chip}
              </span>
            </div>
          )}

          {/* ── Book stage: soft backdrop + arrows flanking the book ── */}
          <div className="rounded-3xl py-5 sm:py-8 px-2 sm:px-4 bg-gradient-to-b from-coconut-cream to-pineapple-yellow/10 border border-pineapple-yellow/20">
            <div
              className="flex items-center justify-center gap-1.5 sm:gap-3"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {/* Left arrow */}
              <FlipbookArrow direction="prev" disabled={isFirst} onClick={goPrev} />

              {/* Book frame */}
              <div
                className={`min-w-0 flex-1 ${frame.bookMaxWidthCls} select-none`}
                aria-live="polite"
                aria-atomic="true"
                aria-label={`Page: ${pageLabel}`}
              >
                <div className={`relative ${frame.shadowCls}`}>

                  {/* Page-turn animated wrapper — key remounts on each index change */}
                  <div key={`page-${index}`} className={pageAnimCls}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={page.imageUrl}
                      alt={altText}
                      className={frame.imgCls}
                    />
                  </div>

                  {/* Subtle page-thickness edges */}
                  <div
                    className="absolute inset-y-0 right-0 w-1 bg-gradient-to-r from-transparent to-black/10 z-10 pointer-events-none rounded-r-2xl"
                    aria-hidden="true"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-transparent to-black/8 z-10 pointer-events-none"
                    aria-hidden="true"
                  />

                  {/* Center gutter for two-page spreads */}
                  {spreadLayout && (
                    <div
                      className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-tiki-brown/15 to-transparent z-10 pointer-events-none"
                      aria-hidden="true"
                    />
                  )}

                  {/* Page label badge */}
                  <div
                    className="absolute bottom-3 right-3 bg-black/38 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm select-none pointer-events-none z-20"
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
          </div>

          {/* "The End" flourish */}
          {isLast && isEndingPage && (
            <div className="text-center">
              <span className="text-xl font-black text-tiki-brown/35 tracking-widest select-none">
                ✨ The End
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

          {/* Progress row */}
          <div className="flex items-center gap-3 px-1">
            <span
              className="text-xs font-bold text-tiki-brown/40 tabular-nums flex-shrink-0"
              aria-live="polite"
              aria-atomic="true"
            >
              {pageLabel}
            </span>
            <div className="flex-1 flex items-center">
              <ProgressIndicator index={index} total={total} />
            </div>
            <span className="text-xs font-bold text-tiki-brown/30 tabular-nums flex-shrink-0">
              {index + 1} / {total}
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
