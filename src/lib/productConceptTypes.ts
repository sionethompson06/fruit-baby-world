// Product concept types for the Product Concept Studio.
// Planning-only — no commerce, no pricing, no inventory.

export type ProductMockupAsset = {
  id: string;
  type?: string;
  status?: string;
  url: string;
  alt?: string;
  visibility: "draft" | "public-ready" | "hidden" | "admin-only";
  reviewStatus?: string;
  productTitle?: string;
  promptSummary?: string;
  promptText?: string;
  mockupStyle?: string;
  reviewNotes?: string;
  characterSlug?: string;
  category?: string;
  pathname?: string;
  mimeType?: string;
  sizeBytes?: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
};

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
  mockups?: ProductMockupAsset[];
  publicPreviewStatus?: "draft" | "public-ready" | "hidden";
  publicTitle?: string;
  publicDescription?: string;
  publicPreviewUpdatedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

// ─── Prompt builder types ─────────────────────────────────────────────────────

// Serializable subset of NormalizedCharacterProfile — safe to pass as props.
export type CharacterSeedData = {
  slug: string;
  displayName: string;
  shortName: string;
  tagline: string;
  shortDescription: string;
  fruitType: string;
  role: string;
  type: string;
  home: string;
  visualIdentitySummary: string;
  colorPalette: Array<{ name: string; hex?: string; usage?: string }>;
  alwaysRules: string[];
  neverRules: string[];
  doNotChangeRules: string[];
  personalityTraits: string[];
  profileImageUrl: string;
  hasProfileImage: boolean;
  hasVisualIdentity: boolean;
  hasColorPalette: boolean;
  hasCharacterRules: boolean;
};

export type ProductPromptPackage = {
  characterSlug: string;
  characterName: string;
  characterTagline: string;
  characterShortDescription: string;
  characterFruitType: string;
  characterRole: string;
  characterHome: string;
  characterType: string;
  characterPersonalityTraits: string[];
  category: ProductConceptCategory;
  productTitle: string;
  audience?: ProductConceptAudience;
  productGoal?: string;
  visualIdentitySummary: string;
  colorPalette: string[];
  alwaysRules: string[];
  neverRules: string[];
  characterRules: string[];
  doNotChangeRules: string[];
  productSpecificGuidance: string[];
  finalPrompt: string;
  warnings: string[];
};
