// Server-only helper for the Shop Collectables system.
// Do not import in client components.

import fs from "fs";
import path from "path";
import type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
  ShopCollectableProductType,
} from "@/lib/shopCollectablesTypes";

export type {
  ShopCollectablesConfig,
  ShopCollectablesSection,
  ShopCollectableItem,
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

// ─── Normalization ────────────────────────────────────────────────────────────

function normalizeItem(raw: unknown, fallback: ShopCollectableItem): ShopCollectableItem {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fallback;
  const r = raw as Record<string, unknown>;
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
