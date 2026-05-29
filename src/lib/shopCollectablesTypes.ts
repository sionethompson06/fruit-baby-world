// Types for the Shop Collectables system.
// Planning/display only — no commerce, no pricing, no inventory.

export type ShopCollectableProductType = "plushy" | "squishy";

export type ShopCollectableItem = {
  id: string;
  characterSlug: string;
  characterName: string;
  productType: ShopCollectableProductType;
  imageUrl: string;
  imagePathname: string;
  statusLabel: string;
  sortOrder: number;
  enabled: boolean;
  updatedAt?: string;
};

export type ShopCollectablesSection = {
  id: string;
  title: string;
  description: string;
  productType: ShopCollectableProductType;
  items: ShopCollectableItem[];
};

export type ShopCollectablesConfig = {
  sections: ShopCollectablesSection[];
  updatedAt: string;
};
