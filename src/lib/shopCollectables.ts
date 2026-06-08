// Server-only helper for the Shop Collectables system.
// Do not import in client components.

import fs from "fs";
import path from "path";
import type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
  ShopCollectableImage,
  ShopCollectableProductType,
} from "@/lib/shopCollectablesTypes";

export type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
  ShopCollectableImage,
  ShopCollectableProductType,
};

const COLLECTABLES_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "shop",
  "collectables.json"
);

// ─── Defaults ─────────────────────────────────────────────────────────────────

function defaultItem(
  id: string,
  characterSlug: string,
  characterName: string,
  productType: ShopCollectableProductType,
  sortOrder: number
): ShopCollectableItem {
  return {
    id,
    characterSlug,
    characterName,
    productType,
    imageUrl: "",
    imagePathname: "",
    statusLabel: "Harvest Coming Soon",
    sortOrder,
    enabled: true,
  };
}

const DEFAULT_CHARACTERS: Array<{ slug: string; name: string }> = [
  { slug: "pineapple-baby",   name: "Pineapple Baby" },
  { slug: "ube-baby",         name: "Ube Baby" },
  { slug: "mango-baby",       name: "Mango Baby" },
  { slug: "kiwi-baby",        name: "Kiwi Baby" },
  { slug: "coconut-baby",     name: "Coconut Baby" },
  { slug: "strawberry-baby",  name: "Strawberry Baby" },
  { slug: "dragonfruit-baby", name: "Dragon Fruit Baby" },
  { slug: "tiki",             name: "Tiki Trouble" },
];

function defaultSection(productType: ShopCollectableProductType): ShopCollectablesSection {
  const title = productType === "plushy" ? "Plushy Collectables" : "Squishy Collectables";
  const description =
    productType === "plushy"
      ? "Soft Fruit Baby friends to collect and cuddle."
      : "Squeezable Fruit Baby collectibles full of sweet personality.";
  return {
    id: `${productType}-collectables`,
    title,
    description,
    productType,
    items: DEFAULT_CHARACTERS.map((c, i) =>
      defaultItem(`${c.slug}-${productType}`, c.slug, c.name, productType, i)
    ),
  };
}

const DEFAULT_CONFIG: ShopCollectablesConfig = {
  sections: [defaultSection("plushy"), defaultSection("squishy")],
  updatedAt: "",
};

// ─── Image normalization ──────────────────────────────────────────────────────

function normalizeCollectableImage(raw: unknown, idx: number): ShopCollectableImage | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const imageUrl = typeof r.imageUrl === "string" ? r.imageUrl : "";
  if (!imageUrl) return null;
  return {
    id: typeof r.id === "string" && r.id ? r.id : `img-legacy-${idx}`,
    imageUrl,
    imagePathname: typeof r.imagePathname === "string" ? r.imagePathname : undefined,
    originalFilename: typeof r.originalFilename === "string" ? r.originalFilename : undefined,
    altText: typeof r.altText === "string" ? r.altText : undefined,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : idx,
    isArchived: typeof r.isArchived === "boolean" ? r.isArchived : false,
    uploadedAt: typeof r.uploadedAt === "string" ? r.uploadedAt : undefined,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeItem(raw: unknown, fallback: ShopCollectableItem): ShopCollectableItem {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fallback;
  const r = raw as Record<string, unknown>;

  // Normalize gallery images
  const rawImages = Array.isArray(r.images) ? r.images : [];
  const images: ShopCollectableImage[] = rawImages
    .map((img, idx) => normalizeCollectableImage(img, idx))
    .filter((img): img is ShopCollectableImage => img !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Preserve role IDs as-is (validation happens at read time via helpers)
  const primaryImageId =
    typeof r.primaryImageId === "string" && r.primaryImageId ? r.primaryImageId : undefined;
  const hoverImageId =
    typeof r.hoverImageId === "string" && r.hoverImageId ? r.hoverImageId : undefined;
  const clickImageId =
    typeof r.clickImageId === "string" && r.clickImageId ? r.clickImageId : undefined;

  return {
    id:            typeof r.id === "string" ? r.id : fallback.id,
    characterSlug: typeof r.characterSlug === "string" ? r.characterSlug : fallback.characterSlug,
    characterName: typeof r.characterName === "string" ? r.characterName : fallback.characterName,
    productType:   r.productType === "plushy" || r.productType === "squishy" ? r.productType : fallback.productType,
    imageUrl:      typeof r.imageUrl === "string" ? r.imageUrl : "",
    imagePathname: typeof r.imagePathname === "string" ? r.imagePathname : "",
    statusLabel:   typeof r.statusLabel === "string" && r.statusLabel.trim() ? r.statusLabel.trim() : "Harvest Coming Soon",
    sortOrder:     typeof r.sortOrder === "number" ? r.sortOrder : fallback.sortOrder,
    enabled:       typeof r.enabled === "boolean" ? r.enabled : true,
    updatedAt:     typeof r.updatedAt === "string" ? r.updatedAt : undefined,
    images:        images.length > 0 ? images : undefined,
    primaryImageId,
    hoverImageId,
    clickImageId,
  };
}

function normalizeSection(raw: unknown, fallback: ShopCollectablesSection): ShopCollectablesSection {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fallback;
  const r = raw as Record<string, unknown>;
  const productType: ShopCollectableProductType =
    r.productType === "plushy" || r.productType === "squishy" ? r.productType : fallback.productType;
  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items = fallback.items.map((fb) => {
    const match = rawItems.find(
      (ri) => typeof ri === "object" && ri !== null && (ri as Record<string, unknown>).id === fb.id
    );
    return normalizeItem(match ?? {}, fb);
  });
  return {
    id:          typeof r.id === "string" ? r.id : fallback.id,
    title:       typeof r.title === "string" && r.title.trim() ? r.title.trim() : fallback.title,
    description: typeof r.description === "string" ? r.description : fallback.description,
    productType,
    items,
  };
}

export function normalizeShopCollectablesConfig(raw: unknown): ShopCollectablesConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return DEFAULT_CONFIG;
  const r = raw as Record<string, unknown>;
  const rawSections = Array.isArray(r.sections) ? r.sections : [];
  const sections = DEFAULT_CONFIG.sections.map((fb) => {
    const match = rawSections.find(
      (rs) => typeof rs === "object" && rs !== null && (rs as Record<string, unknown>).id === fb.id
    );
    return normalizeSection(match ?? {}, fb);
  });
  return {
    sections,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
  };
}

// ─── Loader ───────────────────────────────────────────────────────────────────

export function getShopCollectablesConfig(): ShopCollectablesConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(COLLECTABLES_PATH, "utf-8")) as unknown;
    return normalizeShopCollectablesConfig(raw);
  } catch {
    return DEFAULT_CONFIG;
  }
}

// ─── Gallery helpers ──────────────────────────────────────────────────────────

/** Non-archived images sorted by sortOrder. */
export function getActiveCollectableImages(item: ShopCollectableItem): ShopCollectableImage[] {
  return (item.images ?? [])
    .filter((img) => !img.isArchived)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** The image assigned as Primary, falling back to the first active image, or null. */
export function getPrimaryCollectableImage(item: ShopCollectableItem): ShopCollectableImage | null {
  const active = getActiveCollectableImages(item);
  if (active.length === 0) return null;
  if (item.primaryImageId) {
    return active.find((img) => img.id === item.primaryImageId) ?? active[0];
  }
  return active[0];
}

/** The image assigned as Hover, or null if not set / not active. */
export function getHoverCollectableImage(item: ShopCollectableItem): ShopCollectableImage | null {
  if (!item.hoverImageId) return null;
  return getActiveCollectableImages(item).find((img) => img.id === item.hoverImageId) ?? null;
}

/** The image assigned as Click/Large View, or null if not set / not active. */
export function getClickCollectableImage(item: ShopCollectableItem): ShopCollectableImage | null {
  if (!item.clickImageId) return null;
  return getActiveCollectableImages(item).find((img) => img.id === item.clickImageId) ?? null;
}

// ─── Public view ─────────────────────────────────────────────────────────────

export function getPublicShopCollectableSections(): ShopCollectablesSection[] {
  const config = getShopCollectablesConfig();
  return config.sections.map((section) => ({
    ...section,
    items: [...section.items]
      .filter((item) => item.enabled)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
}
