// Server-only helper for the Homepage Showcase system.
// Do not import in client components.

import fs from "fs";
import path from "path";
import type {
  HomepageShowcaseConfig,
  HomepageHeroShowcase,
  HomepageSupportingCastShowcase,
  HomepageTikiShowcase,
  HomepageWorldShowcase,
  HomepageCharacterShowcaseItem,
  HomepageWorldShowcaseItem,
} from "@/lib/homepageShowcaseTypes";

export type {
  HomepageShowcaseConfig,
  HomepageHeroShowcase,
  HomepageSupportingCastShowcase,
  HomepageTikiShowcase,
  HomepageWorldShowcase,
  HomepageCharacterShowcaseItem,
  HomepageWorldShowcaseItem,
};

const SHOWCASE_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "site",
  "homepage-showcase.json"
);

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_HERO: HomepageHeroShowcase = {
  headline: "Welcome to Pineapple Baby World",
  subheadline: "Big heart. Bright adventures. Sweet stories.",
  supportingCopy:
    "Read colorful storybooks, listen along with narration, and watch playful Fruit Baby cartoons.",
  pineappleBaby2dImageUrl: "",
  pineappleBaby3dImageUrl: "",
  backgroundImageUrl: "",
  primaryCtaLabel: "Read Storybooks",
  primaryCtaHref: "/stories",
  secondaryCtaLabel: "Meet the Characters",
  secondaryCtaHref: "/characters",
};

const DEFAULT_SUPPORTING_CAST: HomepageSupportingCastShowcase = {
  title: "Meet Pineapple Baby and Friends",
  description: "Every adventure is sweeter with friends.",
  items: [],
};

const DEFAULT_TIKI: HomepageTikiShowcase = {
  enabled: true,
  displayName: "Tiki Trouble",
  headline: "Watch out for Tiki Trouble!",
  description:
    "Tiki Trouble brings mischief, surprises, and silly problems for Pineapple Baby and friends to solve.",
  image2dUrl: "",
  image3dUrl: "",
  href: "/characters/tiki",
};

const DEFAULT_WORLDS: HomepageWorldShowcase = {
  title: "Explore Pineapple Baby's World",
  description:
    "Every story grows from a colorful world of homes, gardens, and magical little places.",
  items: [],
};

// ─── Normalize ────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeItem(raw: unknown, index: number): HomepageCharacterShowcaseItem {
  const r = isRecord(raw) ? raw : {};
  return {
    id: typeof r.id === "string" && r.id ? r.id : `item-${index}`,
    characterSlug: typeof r.characterSlug === "string" ? r.characterSlug : undefined,
    displayName: typeof r.displayName === "string" ? r.displayName : "Character",
    role:
      r.role === "hero" || r.role === "supporting-cast" || r.role === "nemesis"
        ? r.role
        : "supporting-cast",
    image2dUrl: typeof r.image2dUrl === "string" ? r.image2dUrl : undefined,
    image3dUrl: typeof r.image3dUrl === "string" ? r.image3dUrl : undefined,
    caption: typeof r.caption === "string" ? r.caption : undefined,
    href: typeof r.href === "string" ? r.href : undefined,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : index,
    enabled: r.enabled !== false,
  };
}

function normalizeWorldItem(raw: unknown, index: number): HomepageWorldShowcaseItem {
  const r = isRecord(raw) ? raw : {};
  return {
    id: typeof r.id === "string" && r.id ? r.id : `world-${index}`,
    title: typeof r.title === "string" ? r.title : "Location",
    description: typeof r.description === "string" ? r.description : undefined,
    imageUrl: typeof r.imageUrl === "string" ? r.imageUrl : undefined,
    href: typeof r.href === "string" ? r.href : undefined,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : index,
    enabled: r.enabled !== false,
  };
}

export function normalizeHomepageShowcaseConfig(
  raw: unknown
): HomepageShowcaseConfig {
  const r = isRecord(raw) ? raw : {};

  const rawHero = isRecord(r.hero) ? r.hero : {};
  const hero: HomepageHeroShowcase = {
    headline:
      typeof rawHero.headline === "string"
        ? rawHero.headline
        : DEFAULT_HERO.headline,
    subheadline:
      typeof rawHero.subheadline === "string"
        ? rawHero.subheadline
        : DEFAULT_HERO.subheadline,
    supportingCopy:
      typeof rawHero.supportingCopy === "string"
        ? rawHero.supportingCopy
        : DEFAULT_HERO.supportingCopy,
    pineappleBaby2dImageUrl:
      typeof rawHero.pineappleBaby2dImageUrl === "string"
        ? rawHero.pineappleBaby2dImageUrl
        : "",
    pineappleBaby3dImageUrl:
      typeof rawHero.pineappleBaby3dImageUrl === "string"
        ? rawHero.pineappleBaby3dImageUrl
        : "",
    backgroundImageUrl:
      typeof rawHero.backgroundImageUrl === "string"
        ? rawHero.backgroundImageUrl
        : "",
    primaryCtaLabel:
      typeof rawHero.primaryCtaLabel === "string"
        ? rawHero.primaryCtaLabel
        : DEFAULT_HERO.primaryCtaLabel,
    primaryCtaHref:
      typeof rawHero.primaryCtaHref === "string"
        ? rawHero.primaryCtaHref
        : DEFAULT_HERO.primaryCtaHref,
    secondaryCtaLabel:
      typeof rawHero.secondaryCtaLabel === "string"
        ? rawHero.secondaryCtaLabel
        : DEFAULT_HERO.secondaryCtaLabel,
    secondaryCtaHref:
      typeof rawHero.secondaryCtaHref === "string"
        ? rawHero.secondaryCtaHref
        : DEFAULT_HERO.secondaryCtaHref,
    pineappleBabyModelUrl:
      typeof rawHero.pineappleBabyModelUrl === "string"
        ? rawHero.pineappleBabyModelUrl
        : undefined,
    pineappleBabyModelPathname:
      typeof rawHero.pineappleBabyModelPathname === "string"
        ? rawHero.pineappleBabyModelPathname
        : undefined,
    pineappleBabyModelPosterUrl:
      typeof rawHero.pineappleBabyModelPosterUrl === "string"
        ? rawHero.pineappleBabyModelPosterUrl
        : undefined,
    pineappleBabyModelPosterPathname:
      typeof rawHero.pineappleBabyModelPosterPathname === "string"
        ? rawHero.pineappleBabyModelPosterPathname
        : undefined,
    pineappleBabyModelType:
      rawHero.pineappleBabyModelType === "glb" ||
      rawHero.pineappleBabyModelType === "gltf"
        ? rawHero.pineappleBabyModelType
        : "none",
    enableInteractiveHeroModel: rawHero.enableInteractiveHeroModel === true,
    heroModelAutoRotate: rawHero.heroModelAutoRotate !== false,
    heroModelInteractionHint:
      typeof rawHero.heroModelInteractionHint === "string"
        ? rawHero.heroModelInteractionHint
        : "Drag to spin Pineapple Baby",
  };

  const rawCast = isRecord(r.supportingCast) ? r.supportingCast : {};
  const castItems = Array.isArray(rawCast.items)
    ? rawCast.items.map((item: unknown, i: number) => normalizeItem(item, i))
    : [];
  const supportingCast: HomepageSupportingCastShowcase = {
    title:
      typeof rawCast.title === "string"
        ? rawCast.title
        : DEFAULT_SUPPORTING_CAST.title,
    description:
      typeof rawCast.description === "string" ? rawCast.description : undefined,
    items: castItems,
  };

  const rawTiki = isRecord(r.tikiTrouble) ? r.tikiTrouble : {};
  const tikiTrouble: HomepageTikiShowcase = {
    enabled: rawTiki.enabled !== false,
    displayName:
      typeof rawTiki.displayName === "string"
        ? rawTiki.displayName
        : DEFAULT_TIKI.displayName,
    headline:
      typeof rawTiki.headline === "string"
        ? rawTiki.headline
        : DEFAULT_TIKI.headline,
    description:
      typeof rawTiki.description === "string"
        ? rawTiki.description
        : DEFAULT_TIKI.description,
    image2dUrl:
      typeof rawTiki.image2dUrl === "string" ? rawTiki.image2dUrl : undefined,
    image3dUrl:
      typeof rawTiki.image3dUrl === "string" ? rawTiki.image3dUrl : undefined,
    href: typeof rawTiki.href === "string" ? rawTiki.href : undefined,
  };

  const rawWorlds = isRecord(r.worlds) ? r.worlds : {};
  const worldItems = Array.isArray(rawWorlds.items)
    ? rawWorlds.items.map((item: unknown, i: number) =>
        normalizeWorldItem(item, i)
      )
    : [];
  const worlds: HomepageWorldShowcase = {
    title:
      typeof rawWorlds.title === "string"
        ? rawWorlds.title
        : DEFAULT_WORLDS.title,
    description:
      typeof rawWorlds.description === "string"
        ? rawWorlds.description
        : undefined,
    items: worldItems,
  };

  return {
    hero,
    supportingCast,
    tikiTrouble,
    worlds,
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : undefined,
  };
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export function getHomepageShowcaseConfig(): HomepageShowcaseConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(SHOWCASE_PATH, "utf-8")) as unknown;
    return normalizeHomepageShowcaseConfig(raw);
  } catch {
    return normalizeHomepageShowcaseConfig({});
  }
}

// ─── Image resolution helpers ────────────────────────────────────────────────

/** Priority: 3D promo → 2D promo → fallback character action art */
export function resolveShowcaseImage(
  image3d: string | undefined,
  image2d: string | undefined,
  fallback: string
): string {
  if (image3d?.trim()) return image3d.trim();
  if (image2d?.trim()) return image2d.trim();
  return fallback;
}

export function getHomepageHeroImage(config: HomepageShowcaseConfig): string {
  return resolveShowcaseImage(
    config.hero.pineappleBaby3dImageUrl,
    config.hero.pineappleBaby2dImageUrl,
    ""
  );
}

export function getHomepageCharacterImage(
  item: HomepageCharacterShowcaseItem
): string {
  return resolveShowcaseImage(item.image3dUrl, item.image2dUrl, "");
}

// ─── Filtered views ───────────────────────────────────────────────────────────

export function getEnabledSupportingCast(
  config: HomepageShowcaseConfig
): HomepageCharacterShowcaseItem[] {
  return [...config.supportingCast.items]
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getEnabledWorldItems(
  config: HomepageShowcaseConfig
): HomepageWorldShowcaseItem[] {
  return [...config.worlds.items]
    .filter((item) => item.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getHomepageShowcaseFallbacks(): HomepageShowcaseConfig {
  return normalizeHomepageShowcaseConfig({});
}
