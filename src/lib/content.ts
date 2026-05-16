import pineappleBaby from "@/content/characters/pineapple-baby.json";
import ubeBaby from "@/content/characters/ube-baby.json";
import mangoBaby from "@/content/characters/mango-baby.json";
import kiwiBaby from "@/content/characters/kiwi-baby.json";
import coconutBaby from "@/content/characters/coconut-baby.json";
import tiki from "@/content/characters/tiki.json";
import sampleEpisode from "@/content/episodes/sample-episode.json";
import sampleProduct from "@/content/products/sample-product.json";
import ubeBabySquish from "@/content/products/ube-baby-squish.json";
import tikiTroubleCollectible from "@/content/products/tiki-trouble-collectible.json";
import fruitBabyStickerPack from "@/content/products/fruit-baby-sticker-pack.json";
import episodePackageTemplate from "@/content/prompt-templates/episode-package-template.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ColorSwatch = {
  name: string;
  hex: string;
};

export type CharacterRelationship = {
  character: string;
  description: string;
};

export type Character = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  role: string;
  type: "fruit-baby" | "villain" | "other";
  status: "active" | "draft" | "approved" | "archived";
  tagline: string;
  shortDescription: string;
  // Extended official profile fields
  about?: string;
  subtitle?: string;
  characterType?: string;
  fruitType?: string;
  home?: string;
  birthday?: string;
  favoriteQuote?: string;
  signatureQuote?: string;
  rivalry?: string;
  teaches?: string[];
  personality: string[];
  likes?: string[];
  dislikes?: string[];
  visualIdentity: {
    primaryColors: string[];
    accentColors: string[];
    palette?: ColorSwatch[];
    styleNotes: string;
  };
  expressions?: string[];
  posesAndActions?: string[];
  relationships?: CharacterRelationship[];
  storyRole: string;
  characterRules: {
    always: string[];
    never: string[];
  };
  signatureStyle?: string;
  funFact?: string;
  brandPositioning?: string;
  trademarkNotes?: string[];
  catchphrases: string[];
  image: {
    main: string;
    profileSheet?: string;
    alt: string;
  };
  merchPotential: string[];
  // Draft / canon safety fields (new characters only)
  canonStatus?: string;
  publicStatus?: string;
  approvedForStories?: boolean;
  approvedForGeneration?: boolean;
  requiresReferenceAssets?: boolean;
  referenceAssetsReviewed?: boolean;
  generationUseAllowed?: boolean;
  publicUseAllowed?: boolean;
  voiceGuide?: string;
  generationRestrictions?: string[];
  notes?: string;
  referenceAssetIds?: string[];
  approvalNotes?: string;
  approvalMode?: "draft" | "official-internal" | "public" | "archived";
  approvedAt?: string;
  publishedAt?: string;
  archivedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  primaryReferenceAssetId?: string;
  primaryReferenceAssetUrl?: string;
  primaryReferenceAssetType?: string;
  mainReferenceAssetId?: string;
};

export type Scene = {
  sceneNumber: number;
  title: string;
  summary: string;
  characters: string[];
  visualNotes: string;
};

export type Episode = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  episodeNumber?: number;
  season?: number;
  featuredCharacters: string[];
  shortDescription: string;
  lesson: string;
  setting: string;
  scenes: Scene[];
  merchTieIns: string[];
  thumbnail?: string;
  duration?: string;
  ageRange?: string;
  theme?: string;
  releaseStatus?: string;
  callout?: string;
  tags?: string[];
  publishing?: {
    publicStatus?: string;
    readyForPublicSite?: boolean;
  };
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  status: "concept" | "available" | "soldout" | "archived";
  category: string;
  relatedCharacters: string[];
  shortDescription: string;
  price: number | null;
  image: {
    main: string;
    alt: string;
  };
  tags: string[];
};

export type SceneTemplate = {
  sceneNumber: number | null;
  title: string;
  summary: string;
  characters: string[];
  dialogue: string[];
  voiceoverNote: string;
  imagePrompt: string;
  animationPrompt: string;
};

export type EpisodePackageTemplate = {
  id: string;
  name: string;
  version: string;
  purpose: string;
  sections: string[];
  rules: string[];
  sceneTemplate: SceneTemplate;
};

// ─── Data ─────────────────────────────────────────────────────────────────────
//
// NOTE: The static `characters` array below contains only the original six
// canonical characters. It exists for client-safe imports (no fs) and as a
// fallback. Server-side pages and builders should use characterRegistry.ts
// (via characterContent.ts) to load ALL characters from disk dynamically.

const characters: Character[] = [
  pineappleBaby as Character,
  ubeBaby as Character,
  mangoBaby as Character,
  kiwiBaby as Character,
  coconutBaby as Character,
  tiki as Character,
];

const episodes: Episode[] = [sampleEpisode as Episode];

const products: Product[] = [
  sampleProduct as Product,
  ubeBabySquish as Product,
  tikiTroubleCollectible as Product,
  fruitBabyStickerPack as Product,
];

// ─── Character helpers ────────────────────────────────────────────────────────

export function getAllCharacters(): Character[] {
  return characters;
}

// Returns only characters safe for public display.
// New-style: approvalMode === "public" shows it; "draft"/"official-internal"/"archived" hides it.
// Legacy: status === "active" && publicUseAllowed !== false (existing official characters).
export function getPublicCharacters(): Character[] {
  return characters.filter((c) => {
    if (
      c.approvalMode === "draft" ||
      c.approvalMode === "official-internal" ||
      c.approvalMode === "archived"
    )
      return false;
    if (c.approvalMode === "public") return true;
    return c.status === "active" && c.publicUseAllowed !== false;
  });
}

export function getCharacterBySlug(slug: string): Character | undefined {
  return characters.find((c) => c.slug === slug);
}

// Returns a character by slug only if it is safe for public display.
export function getPublicCharacterBySlug(slug: string): Character | undefined {
  const c = getCharacterBySlug(slug);
  if (!c) return undefined;
  if (
    c.approvalMode === "draft" ||
    c.approvalMode === "official-internal" ||
    c.approvalMode === "archived"
  )
    return undefined;
  if (c.approvalMode === "public") return c;
  if (c.status !== "active" || c.publicUseAllowed === false) return undefined;
  return c;
}

// ─── Episode helpers ──────────────────────────────────────────────────────────

export function getAllEpisodes(): Episode[] {
  return episodes;
}

// Returns only episodes cleared for public display.
// An episode is public if status === "published", or if its publishing
// object marks it readyForPublicSite / publicStatus "published".
// Admin-saved drafts (status "draft", readyForPublicSite false) are excluded.
export function getPublicEpisodes(): Episode[] {
  return episodes.filter(
    (e) =>
      e.status === "published" ||
      e.publishing?.readyForPublicSite === true ||
      e.publishing?.publicStatus === "published"
  );
}

export function getEpisodeBySlug(slug: string): Episode | undefined {
  return episodes.find((e) => e.slug === slug);
}

// ─── Product helpers ──────────────────────────────────────────────────────────

export function getAllProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

// ─── Template helpers ─────────────────────────────────────────────────────────

export function getEpisodePackageTemplate(): EpisodePackageTemplate {
  return episodePackageTemplate as EpisodePackageTemplate;
}
