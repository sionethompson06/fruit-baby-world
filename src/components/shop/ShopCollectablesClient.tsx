"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ShopCollectablesSection, ShopCollectableItem } from "@/lib/shopCollectablesTypes";

// ─── Card ─────────────────────────────────────────────────────────────────────

function CollectableCard({
  item,
  onClick,
}: {
  item: ShopCollectableItem;
  onClick: () => void;
}) {
  const productLabel = item.productType === "plushy" ? "Plushy Collectable" : "Squishy Collectable";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${item.characterName} ${productLabel}`}
      className="group/card bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden flex flex-col text-left w-full cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-pineapple-yellow/10 via-bg-cream to-ube-purple/8 flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={`${item.characterName} ${productLabel}`}
            className="absolute inset-0 w-full h-full object-contain p-3 transition-transform duration-300 ease-out group-hover/card:scale-[1.06]"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-8">
            <span className="text-4xl opacity-20">🛍️</span>
            <p className="text-xs text-tiki-brown/30 font-semibold text-center px-2">Image coming soon</p>
          </div>
        )}

      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-black text-tiki-brown leading-tight">{item.characterName}</p>
        <p className="text-xs font-semibold text-tiki-brown/50">{productLabel}</p>
        <p className="text-xs font-bold text-ube-purple/70 mt-auto pt-2">{item.statusLabel}</p>
      </div>
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ProductModal({
  item,
  onClose,
}: {
  item: ShopCollectableItem;
  onClose: () => void;
}) {
  const productLabel = item.productType === "plushy" ? "Plushy Collectable" : "Squishy Collectable";
  const backdropRef = useRef<HTMLDivElement>(null);

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${item.characterName} ${productLabel} preview`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      {/* Soft pastel backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-pineapple-yellow/20 via-bg-cream/85 to-ube-purple/15 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-tiki-brown/10 max-w-xl w-full flex flex-col overflow-hidden">
        {/* Close */}
        <div className="flex justify-end p-3 pb-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product preview"
            className="w-8 h-8 flex items-center justify-center rounded-full bg-tiki-brown/6 text-tiki-brown/55 hover:bg-tiki-brown/14 transition-colors text-sm font-bold leading-none"
          >
            ✕
          </button>
        </div>

        {/* Large image */}
        <div className="relative aspect-square mx-4 rounded-2xl overflow-hidden bg-gradient-to-br from-pineapple-yellow/10 via-bg-cream to-ube-purple/8 flex items-center justify-center">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.imageUrl}
              alt={`${item.characterName} ${productLabel}`}
              className="absolute inset-0 w-full h-full object-contain p-4"
            />
          ) : (
            <span className="text-6xl opacity-20">🛍️</span>
          )}
        </div>

        {/* Info */}
        <div className="px-6 py-5 flex flex-col gap-1.5">
          <p className="text-lg font-black text-tiki-brown leading-tight">{item.characterName}</p>
          <p className="text-sm font-semibold text-tiki-brown/50">{productLabel}</p>
          <div className="mt-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown">
              {item.statusLabel || "Harvest Coming Soon"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function ShopCollectablesClient({
  sections,
}: {
  sections: ShopCollectablesSection[];
}) {
  const [selectedItem, setSelectedItem] = useState<ShopCollectableItem | null>(null);
  const handleClose = useCallback(() => setSelectedItem(null), []);

  return (
    <>
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col gap-10 py-12 pb-20">
        {sections.map((section) => (
          <section
            key={section.id}
            className={
              section.productType === "plushy"
                ? "rounded-3xl shadow-sm border border-pineapple-yellow/25 p-8 sm:p-10 bg-gradient-to-br from-pineapple-yellow/15 via-warm-coral/8 to-bg-cream flex flex-col gap-6"
                : "rounded-3xl shadow-sm border border-sky-blue/25 p-8 sm:p-10 bg-gradient-to-br from-sky-blue/15 via-ube-purple/8 to-bg-cream flex flex-col gap-6"
            }
          >
            <div>
              <h2 className="brand-title-section-logo text-2xl font-black mb-1">
                {section.productType === "plushy" ? "🧸" : "🫶"} {section.title}
              </h2>
              <p className="text-sm text-tiki-brown/55">{section.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {section.items.map((item) => (
                <CollectableCard
                  key={item.id}
                  item={item}
                  onClick={() => setSelectedItem(item)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {selectedItem && (
        <ProductModal item={selectedItem} onClose={handleClose} />
      )}
    </>
  );
}
