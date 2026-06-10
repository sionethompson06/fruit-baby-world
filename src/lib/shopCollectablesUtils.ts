// Client-safe utilities for shop collectables public display.
// No server-only imports (no fs) — safe to use in client components.

import type { ShopCollectableItem, ShopCollectableImage } from "@/lib/shopCollectablesTypes";

// ─── Active images ────────────────────────────────────────────────────────────

/** Non-archived gallery images with valid URLs, sorted by sortOrder. Deduplicates by id. */
export function getActiveCollectableImages(item: ShopCollectableItem): ShopCollectableImage[] {
  const seen = new Set<string>();
  return (item.images ?? [])
    .filter((img) => {
      if (img.isArchived || !img.imageUrl) return false;
      if (seen.has(img.id)) return false;
      seen.add(img.id);
      return true;
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

// ─── Role lookups ─────────────────────────────────────────────────────────────

/** Primary Card Image: primaryImageId → first active → null. */
export function getPrimaryCollectableImage(item: ShopCollectableItem): ShopCollectableImage | null {
  const active = getActiveCollectableImages(item);
  if (active.length === 0) return null;
  if (item.primaryImageId) {
    return active.find((img) => img.id === item.primaryImageId) ?? active[0];
  }
  return active[0];
}

/** Hover/Flip image: hoverImageId → null. */
export function getHoverCollectableImage(item: ShopCollectableItem): ShopCollectableImage | null {
  if (!item.hoverImageId) return null;
  return getActiveCollectableImages(item).find((img) => img.id === item.hoverImageId) ?? null;
}

/** Click/Large View default: clickImageId → null. */
export function getClickCollectableImage(item: ShopCollectableItem): ShopCollectableImage | null {
  if (!item.clickImageId) return null;
  return getActiveCollectableImages(item).find((img) => img.id === item.clickImageId) ?? null;
}

// ─── Gallery images for modal ─────────────────────────────────────────────────

/**
 * All images shown in the modal thumbnail strip.
 * Falls back to a synthetic entry from legacy imageUrl when no gallery images exist.
 */
export function getCollectableGalleryImages(item: ShopCollectableItem): ShopCollectableImage[] {
  const active = getActiveCollectableImages(item);
  if (active.length > 0) return active;
  if (item.imageUrl) {
    return [
      {
        id: `legacy-${item.id}`,
        imageUrl: item.imageUrl,
        imagePathname: item.imagePathname || undefined,
        altText: `${item.characterName ?? item.productOptionName ?? ""} ${item.productType}`.trim(),
        sortOrder: 0,
      },
    ];
  }
  return [];
}

// ─── Card display helpers ─────────────────────────────────────────────────────

/**
 * URL of the image shown on the public product card.
 * 1. primary gallery image  2. legacy imageUrl  3. empty string (placeholder)
 */
export function getCardImageUrl(item: ShopCollectableItem): string {
  return getPrimaryCollectableImage(item)?.imageUrl ?? item.imageUrl ?? "";
}

/**
 * URL of the hover/flip image for the card, or null if no hover effect should run.
 * Returns null when hover image is identical to the card image (no effect needed).
 */
export function getCardHoverImageUrl(item: ShopCollectableItem): string | null {
  const hover = getHoverCollectableImage(item);
  if (!hover) return null;
  if (hover.imageUrl === getCardImageUrl(item)) return null;
  return hover.imageUrl;
}

// ─── Modal default image ──────────────────────────────────────────────────────

/**
 * The image to show first when the modal opens.
 * Priority: clickImageId → hoverImageId → primaryImageId → first active → legacy → null.
 */
export function getModalDefaultImage(item: ShopCollectableItem): ShopCollectableImage | null {
  const active = getActiveCollectableImages(item);

  if (active.length === 0) {
    if (item.imageUrl) {
      return {
        id: `legacy-${item.id}`,
        imageUrl: item.imageUrl,
        imagePathname: item.imagePathname || undefined,
        altText: `${item.characterName ?? item.productOptionName ?? ""} ${item.productType}`.trim(),
        sortOrder: 0,
      };
    }
    return null;
  }

  const tryId = (id: string | undefined) =>
    id ? active.find((img) => img.id === id) : undefined;

  return (
    tryId(item.clickImageId) ??
    tryId(item.hoverImageId) ??
    tryId(item.primaryImageId) ??
    active[0]
  );
}
