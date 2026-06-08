"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ShopCollectablesSection, ShopCollectableItem, ShopCollectableImage } from "@/lib/shopCollectablesTypes";
import {
  getCardImageUrl,
  getCardHoverImageUrl,
  getCollectableGalleryImages,
  getModalDefaultImage,
} from "@/lib/shopCollectablesUtils";

// ─── Card ─────────────────────────────────────────────────────────────────────

function CollectableCard({
  item,
  onClick,
}: {
  item: ShopCollectableItem;
  onClick: () => void;
}) {
  const productLabel = item.productType === "plushy" ? "Plushy Collectable" : "Squishy Collectable";
  const cardImageUrl = getCardImageUrl(item);
  const hoverImageUrl = getCardHoverImageUrl(item);
  const displayTitle = item.displayTitle || item.characterName;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`View ${displayTitle} ${productLabel}`}
      className="group/card bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden flex flex-col text-left w-full cursor-pointer hover:shadow-md transition-shadow"
    >
      {/* Image */}
      <div className="relative aspect-square bg-gradient-to-br from-pineapple-yellow/10 via-bg-cream to-ube-purple/8 flex items-center justify-center overflow-hidden">
        {cardImageUrl ? (
          <>
            {/* Primary — fades out on hover when hover image is assigned */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cardImageUrl}
              alt={`${displayTitle} ${productLabel}`}
              className={[
                "absolute inset-0 w-full h-full object-contain p-3 transition-all duration-300 ease-out",
                "motion-safe:group-hover/card:scale-[1.06]",
                hoverImageUrl ? "group-hover/card:opacity-0" : "",
              ].filter(Boolean).join(" ")}
              loading="lazy"
            />
            {/* Hover / Flip image — gentle reveal on card hover */}
            {hoverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={hoverImageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-contain p-3 opacity-0 transition-all duration-300 ease-out group-hover/card:opacity-100 motion-safe:scale-[0.97] motion-safe:group-hover/card:scale-100"
                loading="lazy"
              />
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8">
            <span className="text-4xl opacity-20">🛍️</span>
            <p className="text-xs text-tiki-brown/30 font-semibold text-center px-2">Image coming soon</p>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-black text-tiki-brown leading-tight">{displayTitle}</p>
        <p className="text-xs font-semibold text-tiki-brown/50">{productLabel}</p>
        <p className="text-xs font-bold text-ube-purple/70 mt-auto pt-2">
          {item.priceLabel ?? item.statusLabel}
        </p>
      </div>
    </button>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function ProductCta({ item }: { item: ShopCollectableItem }) {
  const [notified, setNotified] = useState(false);
  const mode = item.ctaMode ?? "coming-soon";
  const label = item.ctaLabel;

  if (mode === "disabled") return null;

  if (mode === "notify") {
    if (notified) {
      return (
        <div className="rounded-2xl bg-tropical-green/10 border border-tropical-green/25 px-5 py-4 text-center">
          <p className="text-sm font-black text-tropical-green/80">✓ Got it!</p>
          <p className="text-xs text-tiki-brown/60 mt-1 leading-snug">
            {item.notifyMessage ?? "You'll be among the first to know when this collectible is ready!"}
          </p>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setNotified(true)}
        className="w-full py-3.5 px-6 rounded-2xl bg-ube-purple text-white font-black text-sm hover:bg-ube-purple/85 transition-colors shadow-sm"
      >
        {label ?? "Notify Me"}
      </button>
    );
  }

  if (mode === "external-link" && item.externalUrl) {
    return (
      <a
        href={item.externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full py-3.5 px-6 rounded-2xl bg-tropical-green text-white font-black text-sm text-center hover:bg-tropical-green/85 transition-colors shadow-sm"
      >
        {label ?? "View Product"}
      </a>
    );
  }

  // coming-soon (default) or external-link without a URL
  return (
    <div className="rounded-2xl bg-pineapple-yellow/20 border border-pineapple-yellow/40 px-5 py-4 text-center">
      <p className="font-black text-tiki-brown text-sm">{label ?? item.statusLabel ?? "Harvest Coming Soon"}</p>
      <p className="text-xs text-tiki-brown/50 mt-1">This collectible is still growing. 🌱</p>
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ProductModal({
  item,
  initialImage,
  onClose,
}: {
  item: ShopCollectableItem;
  initialImage: ShopCollectableImage | null;
  onClose: () => void;
}) {
  const productLabel = item.productType === "plushy" ? "Plushy Collectable" : "Squishy Collectable";
  const backdropRef = useRef<HTMLDivElement>(null);
  const galleryImages = getCollectableGalleryImages(item);
  const [selectedImage, setSelectedImage] = useState<ShopCollectableImage | null>(
    initialImage ?? galleryImages[0] ?? null
  );
  const displayImage = selectedImage ?? galleryImages[0] ?? null;

  const title = item.displayTitle || item.characterName;
  const showSubtitle = item.displayTitle && item.displayTitle !== item.characterName;
  const hasDetails = !!(item.material || item.size || item.ageGuidance || item.careInstructions);

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
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      ref={backdropRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${title} ${productLabel} preview`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-gradient-to-br from-pineapple-yellow/20 via-bg-cream/85 to-ube-purple/15 backdrop-blur-sm" />

      {/* Panel — vertical stack: image → thumbnails → details */}
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl border border-tiki-brown/10 max-w-xl w-full max-h-[95vh] overflow-y-auto flex flex-col">

        {/* ─ Image area — full width, dominant ─────────────────────── */}
        <div className="relative w-full bg-gradient-to-br from-pineapple-yellow/10 via-bg-cream to-ube-purple/8 rounded-t-3xl overflow-hidden flex items-center justify-center">
          {/* Close button — always accessible in top-right corner */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close product preview"
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/18 text-white hover:bg-black/32 transition-colors text-sm font-bold"
          >
            ✕
          </button>

          {displayImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={displayImage.id}
              src={displayImage.imageUrl}
              alt={displayImage.altText ?? `${title} ${productLabel}`}
              className="w-full h-auto max-h-[70vh] object-contain p-4"
            />
          ) : (
            <div className="py-20 flex flex-col items-center gap-3">
              <span className="text-7xl opacity-20">🛍️</span>
            </div>
          )}
        </div>

        {/* ─ Thumbnail strip — below image, only when multiple ──────── */}
        {galleryImages.length > 1 && (
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-b border-tiki-brown/8">
            {galleryImages.map((img) => {
              const isSelected = img.id === displayImage?.id;
              return (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setSelectedImage(img)}
                  aria-label={img.altText ?? `Image ${img.sortOrder + 1}`}
                  aria-pressed={isSelected}
                  className={[
                    "flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all duration-150",
                    isSelected
                      ? "border-ube-purple/55 ring-2 ring-ube-purple/20 shadow-sm scale-105"
                      : "border-tiki-brown/10 opacity-55 hover:opacity-90 hover:border-tiki-brown/25",
                  ].join(" ")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.imageUrl}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-contain p-1 bg-gradient-to-br from-pineapple-yellow/10 via-bg-cream to-ube-purple/8"
                    loading="lazy"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* ─ Product details — below image/thumbnails ───────────────── */}
        <div className="px-6 py-5 flex flex-col gap-4 pb-8">

          {/* Title + badges */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pineapple-yellow/20 text-tiki-brown/70 capitalize">
                {productLabel}
              </span>
              {item.collectionName && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ube-purple/10 text-ube-purple/70">
                  {item.collectionName}
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-tiki-brown leading-tight">{title}</h2>
            {showSubtitle && (
              <p className="text-sm text-tiki-brown/45 font-semibold -mt-1">{item.characterName}</p>
            )}
          </div>

          {/* Status + price */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown">
              {item.statusLabel || "Harvest Coming Soon"}
            </span>
            {item.priceLabel && (
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-tropical-green/15 text-tropical-green/80">
                {item.priceLabel}
              </span>
            )}
          </div>

          {/* Descriptions */}
          <div className="flex flex-col gap-2">
            {item.shortDescription && (
              <p className="text-sm font-semibold text-tiki-brown/80 leading-snug">{item.shortDescription}</p>
            )}
            {item.productDescription ? (
              <p className="text-sm text-tiki-brown/60 leading-relaxed">{item.productDescription}</p>
            ) : !item.shortDescription ? (
              <p className="text-sm text-tiki-brown/40 leading-relaxed italic">
                A collectible Fruit Baby character product preview. More details are growing soon.
              </p>
            ) : null}
          </div>

          {/* Detail bullets */}
          {item.detailBullets && item.detailBullets.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {item.detailBullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-tiki-brown/65">
                  <span className="flex-shrink-0 mt-0.5 text-pineapple-yellow/80 text-xs font-black">✦</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Product details grid */}
          {hasDetails && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-tiki-brown/3 rounded-2xl px-4 py-3.5">
              {(
                [
                  item.material && { label: "Material", value: item.material },
                  item.size && { label: "Size", value: item.size },
                  item.ageGuidance && { label: "Age Guide", value: item.ageGuidance },
                  item.careInstructions && { label: "Care", value: item.careInstructions },
                ] as (false | { label: string; value: string })[]
              )
                .filter((d): d is { label: string; value: string } => !!d)
                .map((d) => (
                  <div key={d.label} className="flex flex-col gap-0.5">
                    <p className="text-[10px] font-black text-tiki-brown/35 uppercase tracking-wide">{d.label}</p>
                    <p className="text-xs font-semibold text-tiki-brown/65">{d.value}</p>
                  </div>
                ))}
            </div>
          )}

          {/* CTA */}
          <ProductCta item={item} />
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
  const [modalState, setModalState] = useState<{
    item: ShopCollectableItem;
    initialImage: ShopCollectableImage | null;
  } | null>(null);
  const handleClose = useCallback(() => setModalState(null), []);

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
                  onClick={() => setModalState({ item, initialImage: getModalDefaultImage(item) })}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {modalState && (
        <ProductModal
          key={modalState.item.id}
          item={modalState.item}
          initialImage={modalState.initialImage}
          onClose={handleClose}
        />
      )}
    </>
  );
}
