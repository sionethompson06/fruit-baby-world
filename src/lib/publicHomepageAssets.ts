// Server-only helpers for the public homepage.
// Do not import in client components.

import fs from "fs";
import path from "path";
import { getPublicCharacterProfiles } from "@/lib/characterRegistry";

export type HomepageCharacterAsset = {
  slug: string;
  name: string;
  shortName: string;
  imageUrl: string;
  type: string;
  primaryColor: string;
  tagline: string;
  shortDescription: string;
  catchphrase: string;
  personality: string[];
};

export type FeaturedStorybook = {
  slug: string;
  title: string;
  shortDescription: string;
  coverUrl?: string;
  featuredCharacters: string[];
  hasPineappleBaby: boolean;
  hasAudio: boolean;
  hasVideo: boolean;
};

export type HomepageEnvironmentAsset = {
  place: string;
  characterSlug: string;
  characterName: string;
  emoji: string;
  colorClass: string;
  borderClass: string;
  description: string;
};

function toHomepageAsset(c: ReturnType<typeof getPublicCharacterProfiles>[number]): HomepageCharacterAsset {
  const rawPersonality: unknown = c.personality;
  const personalityRaw = Array.isArray(rawPersonality) ? (rawPersonality as string[]) : [];
  // Extract clean single-word/short trait labels from personality strings like "Kind — always helpful"
  const personality = personalityRaw
    .map((p) => (p.includes("—") ? p.split("—")[0].trim() : p.split(",")[0].trim()))
    .slice(0, 3);

  return {
    slug: c.slug,
    name: c.name,
    shortName: c.shortName ?? c.name.split(" ")[0],
    imageUrl: c.image?.profileSheet ?? c.image?.main ?? "",
    type: c.type,
    primaryColor: c.visualIdentity.primaryColors[0] ?? "#FFD84D",
    tagline: c.tagline ?? "",
    shortDescription: c.shortDescription ?? "",
    catchphrase: c.catchphrases?.[0] ?? "",
    personality,
  };
}

export function getPineappleBabyHeroAsset(): HomepageCharacterAsset | null {
  const chars = getPublicCharacterProfiles();
  const pb = chars.find((c) => c.slug === "pineapple-baby");
  return pb ? toHomepageAsset(pb) : null;
}

/** All public fruit-baby characters excluding Pineapple Baby, in preferred display order. */
export function getSupportingFruitFriendAssets(): HomepageCharacterAsset[] {
  const PREFERRED_ORDER = [
    "ube-baby",
    "mango-baby",
    "kiwi-baby",
    "coconut-baby",
    "strawberry-baby",
    "dragonfruit-baby",
  ];
  const chars = getPublicCharacterProfiles().filter(
    (c) => c.type === "fruit-baby" && c.slug !== "pineapple-baby"
  );
  chars.sort((a, b) => {
    const ai = PREFERRED_ORDER.indexOf(a.slug);
    const bi = PREFERRED_ORDER.indexOf(b.slug);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  return chars.map(toHomepageAsset);
}

export function getTikiTroubleAsset(): HomepageCharacterAsset | null {
  const chars = getPublicCharacterProfiles();
  const tiki = chars.find((c) => c.slug === "tiki");
  return tiki ? toHomepageAsset(tiki) : null;
}

// Per-character environment display config — emoji, colors, description
const ENV_CONFIG: Record<
  string,
  { emoji: string; colorClass: string; borderClass: string; description: string; fallbackPlace: string }
> = {
  "pineapple-baby": {
    emoji: "🌴",
    colorClass: "bg-pineapple-yellow/20",
    borderClass: "border-pineapple-yellow/40",
    description: "Sunny, warm, and full of life — Pineapple Baby's golden home.",
    fallbackPlace: "Pineapple Patch",
  },
  "ube-baby": {
    emoji: "🌸",
    colorClass: "bg-ube-purple/10",
    borderClass: "border-ube-purple/22",
    description: "A dreamy garden of starlight, soft purple blooms, and tiny wishes.",
    fallbackPlace: "Starlight Garden",
  },
  "mango-baby": {
    emoji: "🥭",
    colorClass: "bg-warm-coral/10",
    borderClass: "border-warm-coral/22",
    description: "Bright, busy, and buzzing with laughter and tropical treats.",
    fallbackPlace: "Tropical Grove",
  },
  "kiwi-baby": {
    emoji: "🌿",
    colorClass: "bg-tropical-green/10",
    borderClass: "border-tropical-green/22",
    description: "Rolling canopy coves where tiny wonders hide in every leaf.",
    fallbackPlace: "Canopy Cove",
  },
  "coconut-baby": {
    emoji: "🥥",
    colorClass: "bg-tiki-brown/6",
    borderClass: "border-tiki-brown/15",
    description: "Calm, cozy, and always welcoming — a place to breathe and belong.",
    fallbackPlace: "Coconut Cove",
  },
  "strawberry-baby": {
    emoji: "🍓",
    colorClass: "bg-blush-pink/20",
    borderClass: "border-blush-pink/35",
    description: "A sweet little hollow full of love, healing, and heart-shaped surprises.",
    fallbackPlace: "Heartberry Hallow",
  },
  "dragonfruit-baby": {
    emoji: "🌺",
    colorClass: "bg-deep-purple/8",
    borderClass: "border-deep-purple/20",
    description: "A magical garden where creativity blooms in vivid, impossible colors.",
    fallbackPlace: "Dragon Fruit Dream Garden",
  },
  tiki: {
    emoji: "🌋",
    colorClass: "bg-warm-coral/15",
    borderClass: "border-warm-coral/30",
    description: "Tiki Trouble's sneaky volcanic lair — dramatic and unpredictable!",
    fallbackPlace: "Trouble Island",
  },
};

const ENV_ORDER = [
  "pineapple-baby",
  "ube-baby",
  "mango-baby",
  "kiwi-baby",
  "coconut-baby",
  "strawberry-baby",
  "dragonfruit-baby",
  "tiki",
];

export function getHomepageEnvironmentAssets(): HomepageEnvironmentAsset[] {
  const chars = getPublicCharacterProfiles();
  const results: HomepageEnvironmentAsset[] = [];

  for (const slug of ENV_ORDER) {
    const conf = ENV_CONFIG[slug];
    if (!conf) continue;
    const char = chars.find((c) => c.slug === slug);
    const place = (char as { home?: string } | undefined)?.home || conf.fallbackPlace;
    results.push({
      place,
      characterSlug: slug,
      characterName: char?.name ?? slug,
      emoji: conf.emoji,
      colorClass: conf.colorClass,
      borderClass: conf.borderClass,
      description: conf.description,
    });
  }

  return results;
}

export function getFeaturedPublicStorybooks(): FeaturedStorybook[] {
  const dir = path.join(process.cwd(), "src", "content", "episodes");
  let files: string[];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }

  const results: FeaturedStorybook[] = [];

  for (const file of files) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, file), "utf-8")
      ) as Record<string, unknown>;

      // Public eligibility gate
      const pub = raw.publication as Record<string, unknown> | undefined;
      const isPublic =
        raw.status === "published" ||
        pub?.readyForPublicSite === true ||
        pub?.publicStatus === "published";
      if (!isPublic) continue;

      const slug =
        typeof raw.slug === "string" ? raw.slug : file.replace(/\.json$/, "");
      const title = typeof raw.title === "string" ? raw.title : slug;
      const shortDescription =
        typeof raw.shortDescription === "string" ? raw.shortDescription : "";

      const storybookPages = Array.isArray(raw.storybookPages)
        ? (raw.storybookPages as Record<string, unknown>[])
        : [];
      const coverPage = storybookPages.find(
        (p) =>
          p.pageRole === "front-cover" &&
          p.status === "approved" &&
          p.visibility === "public" &&
          typeof p.imageUrl === "string"
      );
      const coverUrl = coverPage ? String(coverPage.imageUrl) : undefined;

      const featuredCharacters = Array.isArray(raw.featuredCharacters)
        ? (raw.featuredCharacters as string[])
        : [];

      const hasPineappleBaby = featuredCharacters.some((c) =>
        c.toLowerCase().includes("pineapple")
      );

      const sn = raw.storybookNarration as Record<string, unknown> | undefined;
      const hasAudio =
        typeof sn?.audioUrl === "string" &&
        sn?.visibility === "public" &&
        sn?.status !== "archived";

      const sv = raw.storybookVideo as Record<string, unknown> | undefined;
      const hasVideo =
        typeof sv?.videoUrl === "string" &&
        sv?.visibility === "public" &&
        sv?.status !== "archived";

      results.push({
        slug,
        title,
        shortDescription,
        coverUrl,
        featuredCharacters,
        hasPineappleBaby,
        hasAudio,
        hasVideo,
      });
    } catch {
      // skip unparseable files
    }
  }

  // Sort: PB + cover first → PB only → cover only → other
  results.sort((a, b) => {
    const aScore = (a.hasPineappleBaby ? 2 : 0) + (a.coverUrl ? 1 : 0);
    const bScore = (b.hasPineappleBaby ? 2 : 0) + (b.coverUrl ? 1 : 0);
    if (aScore !== bScore) return bScore - aScore;
    return a.title.localeCompare(b.title);
  });

  return results;
}
