import pineappleBaby from "@/content/characters/pineapple-baby.json";
import ubeBaby from "@/content/characters/ube-baby.json";
import mangoBaby from "@/content/characters/mango-baby.json";
import kiwiBaby from "@/content/characters/kiwi-baby.json";
import coconutBaby from "@/content/characters/coconut-baby.json";
import tiki from "@/content/characters/tiki.json";
import sampleEpisode from "@/content/episodes/sample-episode.json";
import sampleProduct from "@/content/products/sample-product.json";
import episodePackageTemplate from "@/content/prompt-templates/episode-package-template.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Character = {
  id: string;
  slug: string;
  name: string;
  shortName: string;
  role: string;
  type: "fruit-baby" | "villain" | "other";
  status: "active" | "draft";
  tagline: string;
  shortDescription: string;
  personality: string[];
  visualIdentity: {
    primaryColors: string[];
    accentColors: string[];
    styleNotes: string;
  };
  storyRole: string;
  characterRules: {
    always: string[];
    never: string[];
  };
  catchphrases: string[];
  image: {
    main: string;
    alt: string;
  };
  merchPotential: string[];
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
  featuredCharacters: string[];
  shortDescription: string;
  lesson: string;
  setting: string;
  scenes: Scene[];
  merchTieIns: string[];
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

const characters: Character[] = [
  pineappleBaby as Character,
  ubeBaby as Character,
  mangoBaby as Character,
  kiwiBaby as Character,
  coconutBaby as Character,
  tiki as Character,
];

const episodes: Episode[] = [sampleEpisode as Episode];

const products: Product[] = [sampleProduct as Product];

// ─── Character helpers ────────────────────────────────────────────────────────

export function getAllCharacters(): Character[] {
  return characters;
}

export function getCharacterBySlug(slug: string): Character | undefined {
  return characters.find((c) => c.slug === slug);
}

// ─── Episode helpers ──────────────────────────────────────────────────────────

export function getAllEpisodes(): Episode[] {
  return episodes;
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
