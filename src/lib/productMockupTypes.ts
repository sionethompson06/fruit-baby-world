// Product mockup draft types — planning and generation phase only.
// No persistent media storage schema yet. No commerce. No public product pages.

import type { ProductConceptCategory } from "@/lib/productConceptTypes";

export type ProductMockupStyle =
  | "clean-product-mockup"
  | "storybook-product"
  | "collector-display"
  | "classroom-display";

export type ProductMockupDraftRequest = {
  productConceptId?: string;
  characterSlug: string;
  category: ProductConceptCategory;
  productTitle: string;
  promptText: string;
  mockupStyle?: ProductMockupStyle;
};

export type ProductMockupDraftResult = {
  id: string;
  characterSlug: string;
  category: ProductConceptCategory;
  productTitle: string;
  promptText: string;
  imageBase64?: string;
  imageUrl?: string;
  mimeType: string;
  createdAt: string;
  warnings: string[];
};
