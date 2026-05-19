// Product concept types for the Product Concept Studio.
// Planning-only — no commerce, no pricing, no inventory.

export type ProductConceptCategory =
  | "plush"
  | "squish-toy"
  | "book"
  | "card"
  | "sticker"
  | "poster"
  | "playset"
  | "apparel"
  | "classroom-material"
  | "collectible"
  | "bundle"
  | "other";

export type ProductConceptStatus =
  | "idea"
  | "planned"
  | "in-design"
  | "archived";

export type ProductConceptAudience =
  | "kids"
  | "parents"
  | "teachers"
  | "collectors"
  | "families";

export type ProductConcept = {
  id: string;
  title: string;
  characterSlug?: string;
  category: ProductConceptCategory;
  status: ProductConceptStatus;
  shortDescription: string;
  audience?: ProductConceptAudience;
  productNotes?: string;
  characterIntegrityNotes?: string;
  createdAt: string;
  updatedAt?: string;
};
