// Formal types for the admin-managed Homepage Showcase system.
// Used by both the homepage (read) and admin editor (read/write).

export type HomepageHeroShowcase = {
  headline: string;
  subheadline: string;
  supportingCopy: string;
  pineappleBaby2dImageUrl?: string;
  pineappleBaby3dImageUrl?: string;
  backgroundImageUrl?: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaLabel: string;
  secondaryCtaHref: string;
  // Interactive 3D model
  pineappleBabyModelUrl?: string;
  pineappleBabyModelPathname?: string;
  pineappleBabyModelPosterUrl?: string;
  pineappleBabyModelPosterPathname?: string;
  pineappleBabyModelType?: "glb" | "gltf" | "none";
  enableInteractiveHeroModel?: boolean;
  heroModelAutoRotate?: boolean;
  heroModelInteractionHint?: string;
};

export type HomepageCharacterShowcaseItem = {
  id: string;
  characterSlug?: string;
  displayName: string;
  role: "hero" | "supporting-cast" | "nemesis";
  image2dUrl?: string;
  image3dUrl?: string;
  caption?: string;
  href?: string;
  sortOrder: number;
  enabled: boolean;
};

export type HomepageSupportingCastShowcase = {
  title: string;
  description?: string;
  items: HomepageCharacterShowcaseItem[];
};

export type HomepageTikiShowcase = {
  enabled: boolean;
  displayName: string;
  headline: string;
  description: string;
  image2dUrl?: string;
  image3dUrl?: string;
  href?: string;
};

export type HomepageWorldShowcaseItem = {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  href?: string;
  sortOrder: number;
  enabled: boolean;
};

export type HomepageWorldShowcase = {
  title: string;
  description?: string;
  items: HomepageWorldShowcaseItem[];
};

export type HomepageFeaturedStorybooksConfig = {
  enabled: boolean;
  title: string;
  maxItems: number;
};

export type HomepageShowcaseConfig = {
  hero: HomepageHeroShowcase;
  supportingCast: HomepageSupportingCastShowcase;
  tikiTrouble: HomepageTikiShowcase;
  worlds: HomepageWorldShowcase;
  featuredStorybooks?: HomepageFeaturedStorybooksConfig;
  updatedAt?: string;
};
