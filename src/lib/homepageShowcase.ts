// Server-only helper for homepage showcase content.
// Do not import in client components.

import fs from "fs";
import path from "path";

export type HeroShowcase = {
  title: string;
  subtitle: string;
  description: string;
  pineappleBaby2dImage: string;
  pineappleBaby3dImage: string;
  backgroundImage: string;
  ctaPrimaryLabel: string;
  ctaPrimaryHref: string;
  ctaSecondaryLabel: string;
  ctaSecondaryHref: string;
};

export type SupportingCastItem = {
  characterSlug: string;
  displayName: string;
  image2d: string;
  image3d: string;
  role: string;
};

export type SupportingCastShowcase = {
  enabled: boolean;
  title: string;
  description: string;
  items: SupportingCastItem[];
};

export type FeaturedVillainShowcase = {
  enabled: boolean;
  characterSlug: string;
  displayName: string;
  image2d: string;
  image3d: string;
  headline: string;
  description: string;
};

export type HomepageShowcase = {
  hero: HeroShowcase;
  supportingCast: SupportingCastShowcase;
  featuredVillain: FeaturedVillainShowcase;
};

const SHOWCASE_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "site",
  "homepage-showcase.json"
);

const DEFAULT_HERO: HeroShowcase = {
  title: "Welcome to Pineapple Baby World",
  subtitle: "Big heart. Bright adventures. Sweet stories.",
  description:
    "Read colorful storybooks, listen along with narration, and watch playful Fruit Baby cartoons.",
  pineappleBaby2dImage: "",
  pineappleBaby3dImage: "",
  backgroundImage: "",
  ctaPrimaryLabel: "Read Storybooks",
  ctaPrimaryHref: "/stories",
  ctaSecondaryLabel: "Meet the Characters",
  ctaSecondaryHref: "/characters",
};

const DEFAULT_SHOWCASE: HomepageShowcase = {
  hero: DEFAULT_HERO,
  supportingCast: {
    enabled: true,
    title: "Meet Pineapple Baby and Friends",
    description: "Every adventure is sweeter with friends.",
    items: [],
  },
  featuredVillain: {
    enabled: true,
    characterSlug: "tiki",
    displayName: "Tiki Trouble",
    image2d: "",
    image3d: "",
    headline: "Watch out for Tiki Trouble!",
    description:
      "Tiki Trouble brings mischief, surprises, and silly problems for Pineapple Baby and friends to solve.",
  },
};

export function loadHomepageShowcase(): HomepageShowcase {
  try {
    const raw = JSON.parse(
      fs.readFileSync(SHOWCASE_PATH, "utf-8")
    ) as Partial<HomepageShowcase>;
    return {
      hero: { ...DEFAULT_SHOWCASE.hero, ...(raw.hero ?? {}) },
      supportingCast: {
        ...DEFAULT_SHOWCASE.supportingCast,
        ...(raw.supportingCast ?? {}),
      },
      featuredVillain: {
        ...DEFAULT_SHOWCASE.featuredVillain,
        ...(raw.featuredVillain ?? {}),
      },
    };
  } catch {
    return DEFAULT_SHOWCASE;
  }
}

/**
 * Resolves the best display image for a showcase slot.
 * Priority: 3D promo → 2D promo → character fallback image
 */
export function resolveShowcaseImage(
  image3d: string,
  image2d: string,
  fallback: string
): string {
  if (image3d?.trim()) return image3d.trim();
  if (image2d?.trim()) return image2d.trim();
  return fallback;
}
