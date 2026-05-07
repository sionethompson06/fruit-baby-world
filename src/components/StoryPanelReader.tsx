"use client";

import { useState } from "react";

export type ReaderPanel = {
  sceneNumber: number;
  panelTitle: string;
  caption: string;
  sceneSummary: string;
  characterNames: string[];
  asset: { url: string; alt: string };
};

export default function StoryPanelReader({ panels }: { panels: ReaderPanel[] }) {
  const [index, setIndex] = useState(0);

  if (panels.length === 0) return null;

  const panel = panels[index];
  const total = panels.length;
  const isFirst = index === 0;
  const isLast = index === total - 1;

  const altText =
    panel.asset.alt ||
    `Story panel for Scene ${panel.sceneNumber}: ${panel.panelTitle}`;

  return (
    <div className="flex flex-col gap-5">
      {/* ── Active panel ── */}
      <div className="rounded-3xl overflow-hidden bg-white border border-tiki-brown/10 shadow-md flex flex-col">
        {/* Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={panel.asset.url}
          alt={altText}
          className="w-full block"
        />

        {/* Panel info */}
        <div className="px-5 py-5 flex flex-col gap-3 bg-pineapple-yellow/5 border-t border-tiki-brown/8">
          {/* Scene badge + title */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/15 text-ube-purple flex-shrink-0">
              Scene {panel.sceneNumber}
            </span>
            {panel.panelTitle && (
              <span className="text-sm font-black text-tiki-brown leading-snug">
                {panel.panelTitle}
              </span>
            )}
          </div>

          {/* Scene summary */}
          {panel.sceneSummary && (
            <p className="text-sm text-tiki-brown/75 leading-relaxed">
              {panel.sceneSummary}
            </p>
          )}

          {/* Character badges */}
          {panel.characterNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {panel.characterNames.map((name) => (
                <span
                  key={name}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ube-purple/10 text-ube-purple"
                >
                  {name}
                </span>
              ))}
            </div>
          )}

          {/* Public caption */}
          {panel.caption && (
            <p className="text-xs text-tiki-brown/55 leading-relaxed italic border-t border-tiki-brown/8 pt-2">
              {panel.caption}
            </p>
          )}
        </div>
      </div>

      {/* ── Navigation row ── */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          aria-label="Previous panel"
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        <span
          className="text-xs font-bold text-tiki-brown/45 flex-shrink-0"
          aria-live="polite"
          aria-atomic="true"
        >
          Panel {index + 1} of {total}
        </span>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
          disabled={isLast}
          aria-label="Next panel"
          className="flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl bg-white border border-tiki-brown/15 text-tiki-brown/70 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Story panels"
        >
          {panels.map((p, i) => {
            const isActive = i === index;
            const thumbAlt =
              p.asset.alt ||
              `Story panel for Scene ${p.sceneNumber}: ${p.panelTitle}`;
            return (
              <button
                key={p.sceneNumber}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to panel ${i + 1}: Scene ${p.sceneNumber}`}
                onClick={() => setIndex(i)}
                className={`flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ube-purple/50 ${
                  isActive
                    ? "border-ube-purple shadow-md scale-105"
                    : "border-transparent opacity-60 hover:opacity-85 hover:border-tiki-brown/20"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.asset.url}
                  alt={thumbAlt}
                  className="w-16 h-12 object-cover block"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
