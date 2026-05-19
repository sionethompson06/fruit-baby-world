"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  getMediaLifecycleBadgeClass,
  getMediaLifecycleLabel,
} from "@/lib/mediaLifecycle";
import {
  MEDIA_TYPE_EMOJI,
  MEDIA_TYPE_LABELS,
  type MediaLibraryItem,
  type MediaLibrarySummary,
  type MediaLibraryFilter,
} from "@/lib/mediaLibraryTypes";

// ─── Filter config ────────────────────────────────────────────────────────────

type FilterDef = { id: MediaLibraryFilter; label: string; emoji: string };

const PRIMARY_FILTERS: FilterDef[] = [
  { id: "all", label: "All Media", emoji: "📦" },
  { id: "story-panel", label: "Story Panels", emoji: "🖼️" },
  { id: "narration-audio", label: "Audio", emoji: "🎧" },
  { id: "animated-clip", label: "Animated Clips", emoji: "🎞️" },
  { id: "final-video", label: "Final Videos", emoji: "🎬" },
  { id: "product-mockup", label: "Product Mockups", emoji: "🛍️" },
  { id: "character-reference", label: "References", emoji: "🍍" },
];

const STATUS_FILTERS: FilterDef[] = [
  { id: "public-ready", label: "Public Ready", emoji: "✅" },
  { id: "hidden", label: "Hidden", emoji: "🙈" },
  { id: "needs-attention", label: "Needs Attention", emoji: "⚠️" },
];

// ─── Owner link helper ────────────────────────────────────────────────────────

function getOwnerLink(item: MediaLibraryItem): string {
  if (item.ownerType === "episode" || item.ownerType === "scene") {
    return item.ownerSlug ? `/admin/episodes/${item.ownerSlug}` : "/admin/episodes";
  }
  if (item.ownerType === "product") return "/admin/products";
  if (item.ownerType === "character") {
    return "/admin/characters";
  }
  return "/admin";
}

function getOwnerLinkLabel(item: MediaLibraryItem): string {
  if (item.ownerType === "episode" || item.ownerType === "scene") return "Open Episode";
  if (item.ownerType === "product") return "Product Studio";
  if (item.ownerType === "character") return "Character Studio";
  return "Open Studio";
}

// ─── Filter function ──────────────────────────────────────────────────────────

function applyFilter(items: MediaLibraryItem[], filter: MediaLibraryFilter): MediaLibraryItem[] {
  switch (filter) {
    case "all": return items;
    case "story-panel":
    case "narration-audio":
    case "animated-clip":
    case "final-video":
    case "product-mockup":
    case "character-reference":
      return items.filter((i) => i.type === filter);
    case "public-ready":
      return items.filter((i) => i.lifecycleStage === "public-ready");
    case "hidden":
      return items.filter((i) => i.lifecycleStage === "hidden");
    case "needs-attention":
      return items.filter((i) => i.warnings.length > 0);
    default:
      return items;
  }
}

function getFilterCount(items: MediaLibraryItem[], filter: MediaLibraryFilter): number {
  return applyFilter(items, filter).length;
}

// ─── Media item thumbnail/icon ────────────────────────────────────────────────

function MediaThumb({ item }: { item: MediaLibraryItem }) {
  const emoji = MEDIA_TYPE_EMOJI[item.type];
  const canShowImage = item.url && (item.type === "story-panel" || item.type === "product-mockup" || item.type === "character-reference");
  const canShowThumbnail = item.thumbnailUrl;

  if (canShowThumbnail) {
    return (
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-tiki-brown/5 flex-shrink-0">
        <Image src={item.thumbnailUrl!} alt={item.title} fill className="object-cover" sizes="48px" />
      </div>
    );
  }

  if (canShowImage) {
    return (
      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-tiki-brown/5 flex-shrink-0">
        <Image src={item.url!} alt={item.title} fill className="object-cover" sizes="48px" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded-xl bg-tiki-brown/6 flex items-center justify-center flex-shrink-0">
      <span className="text-xl">{emoji}</span>
    </div>
  );
}

// ─── Single media item card ───────────────────────────────────────────────────

function MediaItemCard({ item }: { item: MediaLibraryItem }) {
  const badgeClass = getMediaLifecycleBadgeClass(item.lifecycleStage);
  const stageLabel = getMediaLifecycleLabel(item.lifecycleStage);
  const ownerLink = getOwnerLink(item);
  const ownerLinkLabel = getOwnerLinkLabel(item);
  const hasWarnings = item.warnings.length > 0;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm px-4 py-3.5 flex items-start gap-3 ${hasWarnings ? "border-warm-coral/25" : "border-tiki-brown/10"}`}>
      <MediaThumb item={item} />

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Title + type */}
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-sm font-bold text-tiki-brown leading-snug break-words min-w-0">
            {item.title}
          </span>
        </div>

        {/* Type + lifecycle badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 whitespace-nowrap">
            {MEDIA_TYPE_EMOJI[item.type]} {MEDIA_TYPE_LABELS[item.type]}
          </span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${badgeClass}`}>
            {stageLabel}
          </span>
          {hasWarnings && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral border border-warm-coral/25 whitespace-nowrap">
              ⚠️ {item.warnings[0]}
            </span>
          )}
        </div>

        {/* Source / owner */}
        <p className="text-xs text-tiki-brown/50 leading-snug">
          {item.sourceLabel}
          {item.createdAt && (
            <span className="text-tiki-brown/30 ml-1.5">
              · {new Date(item.createdAt).toLocaleDateString()}
            </span>
          )}
        </p>

        {/* Link to source studio */}
        <div className="flex items-center gap-2 mt-0.5">
          <Link
            href={ownerLink}
            className="text-[11px] font-bold text-ube-purple/70 hover:text-ube-purple transition-colors whitespace-nowrap"
          >
            {ownerLinkLabel} →
          </Link>
          <span className="text-[10px] text-tiki-brown/25">
            Manage visibility from source studio
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  items: MediaLibraryItem[];
  summary: MediaLibrarySummary;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MediaLibraryClient({ items, summary }: Props) {
  const [activeFilter, setActiveFilter] = useState<MediaLibraryFilter>("all");

  const filtered = applyFilter(items, activeFilter);

  return (
    <div className="flex flex-col gap-8">

      {/* ── A. Summary cards ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-black text-tiki-brown">Library Overview</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "Total Media", count: summary.total, emoji: "📦", colorClass: "text-tiki-brown" },
            { label: "Public Ready", count: summary.publicReady, emoji: "✅", colorClass: "text-tropical-green" },
            { label: "Admin / Attached", count: summary.adminOnly, emoji: "🔐", colorClass: "text-ube-purple" },
            { label: "Hidden", count: summary.hidden, emoji: "🙈", colorClass: "text-warm-coral/80" },
            { label: "URL Warnings", count: summary.missingUrl, emoji: "⚠️", colorClass: "text-pineapple-yellow/90" },
          ].map(({ label, count, emoji, colorClass }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-4 py-4 text-center"
            >
              <div className="text-xl mb-1">{emoji}</div>
              <div className={`text-2xl font-black ${colorClass}`}>{count}</div>
              <div className="text-[11px] font-semibold text-tiki-brown/45 mt-0.5 leading-snug">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── B. Filter controls ──────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {/* Type filters */}
          <div className="flex flex-wrap gap-1.5">
            {PRIMARY_FILTERS.map(({ id, label, emoji }) => {
              const count = getFilterCount(items, id);
              return (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    activeFilter === id
                      ? "bg-ube-purple text-white shadow-sm"
                      : "bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:border-ube-purple/30 hover:text-ube-purple"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${activeFilter === id ? "bg-white/20 text-white" : "bg-tiki-brown/8 text-tiki-brown/50"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map(({ id, label, emoji }) => {
              const count = getFilterCount(items, id);
              return (
                <button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    activeFilter === id
                      ? id === "public-ready"
                        ? "bg-tropical-green text-white shadow-sm"
                        : id === "hidden"
                        ? "bg-warm-coral/80 text-white shadow-sm"
                        : "bg-pineapple-yellow/70 text-tiki-brown shadow-sm"
                      : "bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:border-ube-purple/30 hover:text-ube-purple"
                  }`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${activeFilter === id ? "bg-white/20 text-white" : "bg-tiki-brown/8 text-tiki-brown/50"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── C. Items grid ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-black text-tiki-brown">
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
            {activeFilter !== "all" && (
              <span className="font-normal text-tiki-brown/50 ml-1.5">— filtered</span>
            )}
          </h2>
          <p className="text-xs text-tiki-brown/40">
            Read-only · Manage visibility from the source studio
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-tiki-brown/15 px-8 py-10 text-center">
            <p className="text-sm text-tiki-brown/40 font-semibold">No media found for this filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map((item) => (
              <MediaItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
