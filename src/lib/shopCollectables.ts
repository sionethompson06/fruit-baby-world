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
  ShopCollectableCtaMode,
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
    characterSlug: typeof r.characterSlug === "string" && r.characterSlug ? r.characterSlug : fallback.characterSlug,
    characterName: typeof r.characterName === "string" && r.characterName ? r.characterName : fallback.characterName,
    productScope: r.productScope === "category" ? "category" : fallback.productScope,
    productOptionSlug: typeof r.productOptionSlug === "string" && r.productOptionSlug ? r.productOptionSlug : fallback.productOptionSlug,
    productOptionName: typeof r.productOptionName === "string" && r.productOptionName.trim() ? r.productOptionName.trim() : fallback.productOptionName,
    productOptionDescription: typeof r.productOptionDescription === "string" && r.productOptionDescription.trim() ? r.productOptionDescription.trim() : fallback.productOptionDescription,
    // Accept any non-empty string slug so dynamic product lines are preserved
    productType:   typeof r.productType === "string" && r.productType.trim() ? r.productType.trim() : fallback.productType,
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
    // Product detail / showcase fields
    displayTitle:       typeof r.displayTitle === "string" && r.displayTitle.trim() ? r.displayTitle.trim() : undefined,
    shortDescription:   typeof r.shortDescription === "string" && r.shortDescription.trim() ? r.shortDescription.trim() : undefined,
    productDescription: typeof r.productDescription === "string" && r.productDescription.trim() ? r.productDescription.trim() : undefined,
    detailBullets:      Array.isArray(r.detailBullets)
      ? (r.detailBullets as unknown[]).filter((b): b is string => typeof b === "string" && !!b.trim()).map((b) => b.trim())
      : undefined,
    collectionName:     typeof r.collectionName === "string" && r.collectionName.trim() ? r.collectionName.trim() : undefined,
    material:           typeof r.material === "string" && r.material.trim() ? r.material.trim() : undefined,
    size:               typeof r.size === "string" && r.size.trim() ? r.size.trim() : undefined,
    ageGuidance:        typeof r.ageGuidance === "string" && r.ageGuidance.trim() ? r.ageGuidance.trim() : undefined,
    careInstructions:   typeof r.careInstructions === "string" && r.careInstructions.trim() ? r.careInstructions.trim() : undefined,
    priceLabel:         typeof r.priceLabel === "string" && r.priceLabel.trim() ? r.priceLabel.trim() : undefined,
    ctaLabel:           typeof r.ctaLabel === "string" && r.ctaLabel.trim() ? r.ctaLabel.trim() : undefined,
    ctaMode:            (["coming-soon", "notify", "external-link", "disabled"] as readonly string[]).includes(r.ctaMode as string)
      ? r.ctaMode as ShopCollectableCtaMode
      : undefined,
    externalUrl:        typeof r.externalUrl === "string" && r.externalUrl.trim() ? r.externalUrl.trim() : undefined,
    notifyMessage:      typeof r.notifyMessage === "string" && r.notifyMessage.trim() ? r.notifyMessage.trim() : undefined,
  };
}

function normalizeSection(raw: unknown, fallback: ShopCollectablesSection): ShopCollectablesSection {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fallback;
  const r = raw as Record<string, unknown>;
  const productType: ShopCollectableProductType =
    typeof r.productType === "string" && r.productType.trim() ? r.productType.trim() : fallback.productType;
  const rawItems = Array.isArray(r.items) ? r.items : [];

  // Merge canonical character items with their saved data
  const fallbackIds = new Set(fallback.items.map((fb) => fb.id));
  const characterItems = fallback.items.map((fb) => {
    const match = rawItems.find(
      (ri) => typeof ri === "object" && ri !== null && (ri as Record<string, unknown>).id === fb.id
    );
    return normalizeItem(match ?? {}, fb);
  });

  // Preserve category product option items (non-canonical) added to built-in sections
  const categoryItems: ShopCollectableItem[] = rawItems
    .filter((ri) => {
      if (typeof ri !== "object" || ri === null) return false;
      const rid = (ri as Record<string, unknown>).id;
      return typeof rid === "string" && !fallbackIds.has(rid);
    })
    .map((rawItem, idx) => {
      const ri = rawItem as Record<string, unknown>;
      const itemId = typeof ri.id === "string" && ri.id ? ri.id : null;
      if (!itemId) return null;
      if (ri.productScope !== "category") return null;
      const optionSlug = typeof ri.productOptionSlug === "string" && ri.productOptionSlug ? ri.productOptionSlug : null;
      if (!optionSlug) return null;
      const optionName = typeof ri.productOptionName === "string" && ri.productOptionName ? ri.productOptionName : optionSlug;
      const fb: ShopCollectableItem = {
        id: itemId,
        productScope: "category",
        productOptionSlug: optionSlug,
        productOptionName: optionName,
        productType,
        imageUrl: "",
        imagePathname: "",
        statusLabel: "Coming Soon",
        sortOrder: characterItems.length + idx,
        enabled: false,
      };
      return normalizeItem(rawItem, fb);
    })
    .filter((it): it is ShopCollectableItem => it !== null);

  return {
    id:              typeof r.id === "string" ? r.id : fallback.id,
    title:           typeof r.title === "string" && r.title.trim() ? r.title.trim() : fallback.title,
    description:     typeof r.description === "string" ? r.description : fallback.description,
    productType,
    productLineName: typeof r.productLineName === "string" && r.productLineName.trim() ? r.productLineName.trim() : fallback.productLineName,
    conceptId:       typeof r.conceptId === "string" && r.conceptId ? r.conceptId : fallback.conceptId,
    items: [...characterItems, ...categoryItems],
  };
}

// Normalize a dynamic product-line section (not one of the two built-in plushy/squishy sections).
// Items are taken directly from raw data rather than merged with a canonical character list.
function normalizeExtraSection(raw: unknown): ShopCollectablesSection | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : null;
  const productType = typeof r.productType === "string" && r.productType.trim() ? r.productType.trim() : null;
  if (!id || !productType) return null;

  const title =
    typeof r.title === "string" && r.title.trim()
      ? r.title.trim()
      : productType.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " Collectables";
  const description = typeof r.description === "string" ? r.description : "";
  const productLineName =
    typeof r.productLineName === "string" && r.productLineName.trim() ? r.productLineName.trim() : undefined;
  const conceptId = typeof r.conceptId === "string" && r.conceptId ? r.conceptId : undefined;

  const rawItems = Array.isArray(r.items) ? r.items : [];
  const items: ShopCollectableItem[] = rawItems
    .map((rawItem: unknown, idx: number) => {
      if (typeof rawItem !== "object" || rawItem === null) return null;
      const ri = rawItem as Record<string, unknown>;
      const itemId = typeof ri.id === "string" && ri.id ? ri.id : null;
      if (!itemId) return null;

      const isCategory = ri.productScope === "category";

      if (isCategory) {
        const optionSlug = typeof ri.productOptionSlug === "string" && ri.productOptionSlug ? ri.productOptionSlug : null;
        if (!optionSlug) return null;
        const optionName = typeof ri.productOptionName === "string" && ri.productOptionName ? ri.productOptionName : optionSlug;
        const fb: ShopCollectableItem = {
          id: itemId,
          productScope: "category",
          productOptionSlug: optionSlug,
          productOptionName: optionName,
          productType,
          imageUrl: "",
          imagePathname: "",
          statusLabel: "Coming Soon",
          sortOrder: idx,
          enabled: false,
        };
        return normalizeItem(rawItem, fb);
      }

      const charSlug = typeof ri.characterSlug === "string" && ri.characterSlug ? ri.characterSlug : null;
      if (!charSlug) return null;
      const charName = typeof ri.characterName === "string" && ri.characterName ? ri.characterName : charSlug;
      const fb = defaultItem(itemId, charSlug, charName, productType, idx);
      return normalizeItem(rawItem, fb);
    })
    .filter((it): it is ShopCollectableItem => it !== null);

  return { id, title, description, productType, productLineName, conceptId, items };
}

export function normalizeShopCollectablesConfig(raw: unknown): ShopCollectablesConfig {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return DEFAULT_CONFIG;
  const r = raw as Record<string, unknown>;
  const rawSections = Array.isArray(r.sections) ? r.sections : [];

  // Built-in sections: merge with canonical character fallbacks
  const defaultSectionIds = new Set(DEFAULT_CONFIG.sections.map((s) => s.id));
  const builtInSections = DEFAULT_CONFIG.sections.map((fb) => {
    const match = rawSections.find(
      (rs) => typeof rs === "object" && rs !== null && (rs as Record<string, unknown>).id === fb.id
    );
    return normalizeSection(match ?? {}, fb);
  });

  // Extra (dynamic) sections: preserve as-is with safe normalization
  const extraSections = rawSections
    .filter((rs) => {
      if (typeof rs !== "object" || rs === null) return false;
      const id = (rs as Record<string, unknown>).id;
      return typeof id === "string" && !defaultSectionIds.has(id);
    })
    .map((rs) => normalizeExtraSection(rs))
    .filter((s): s is ShopCollectablesSection => s !== null);

  return {
    sections: [...builtInSections, ...extraSections],
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
