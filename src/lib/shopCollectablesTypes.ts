// Types for the Shop Collectables system.
// Planning/display only — no commerce, no pricing, no inventory.

export type ShopCollectableProductType = "plushy" | "squishy";

export type ShopCollectableCtaMode = "coming-soon" | "notify" | "external-link" | "disabled";

export type ShopCollectableImage = {
  id: string;
  imageUrl: string;
  imagePathname?: string;
  originalFilename?: string;
  altText?: string;
  sortOrder: number;
  isArchived?: boolean;
  uploadedAt?: string;
  updatedAt?: string;
};

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
  // Gallery — up to 4 uploaded images with role assignments
  images?: ShopCollectableImage[];
  primaryImageId?: string;
  hoverImageId?: string;
  clickImageId?: string;
  // Product detail / showcase fields (all optional — legacy products without them still work)
  displayTitle?: string;
  shortDescription?: string;
  productDescription?: string;
  detailBullets?: string[];
  collectionName?: string;
  material?: string;
  size?: string;
  ageGuidance?: string;
  careInstructions?: string;
  priceLabel?: string;
  ctaLabel?: string;
  ctaMode?: ShopCollectableCtaMode;
  externalUrl?: string;
  notifyMessage?: string;
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
