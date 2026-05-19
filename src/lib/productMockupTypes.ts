// Product mockup types — planning, generation, and review phases.
// No commerce. No public product pages. Visibility defaults to admin-only.

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

export type ProductMockupAsset = {
  id: string;
  type: "product-mockup";
  status: "saved";
  visibility: "admin-only" | "public-ready" | "hidden";
  characterSlug: string;
  category: ProductConceptCategory;
  productTitle: string;
  url: string;
  pathname?: string;
  mimeType: string;
  sizeBytes?: number;
  promptText?: string;
  mockupStyle?: string;
  reviewNotes?: string;
  approvedBy?: string;
  approvedAt: string;
  createdAt: string;
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
