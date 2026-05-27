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
};

export type FeaturedStorybook = {
  slug: string;
  title: string;
  shortDescription: string;
  coverUrl?: string;
  featuredCharacters: string[];
  hasAudio: boolean;
  hasVideo: boolean;
};

function toHomepageAsset(c: ReturnType<typeof getPublicCharacterProfiles>[number]): HomepageCharacterAsset {
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
  };
}

export function getPineappleBabyHeroAsset(): HomepageCharacterAsset | null {
  const chars = getPublicCharacterProfiles();
  const pb = chars.find((c) => c.slug === "pineapple-baby");
  return pb ? toHomepageAsset(pb) : null;
}

/** All public fruit-baby characters excluding Pineapple Baby, ordered by slug preference. */
export function getSupportingFruitFriendAssets(): HomepageCharacterAsset[] {
  const PREFERRED_ORDER = ["ube-baby", "mango-baby", "kiwi-baby", "coconut-baby", "strawberry-baby", "dragonfruit-baby"];
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

      const slug = typeof raw.slug === "string" ? raw.slug : file.replace(/\.json$/, "");
      const title = typeof raw.title === "string" ? raw.title : slug;
      const shortDescription = typeof raw.shortDescription === "string" ? raw.shortDescription : "";

      const storybookPages = Array.isArray(raw.storybookPages)
        ? (raw.storybookPages as Record<string, unknown>[])
        : [];
      const coverPage = storybookPages.find(
        (p) => p.pageRole === "front-cover" && p.status === "approved" && p.visibility === "public" && typeof p.imageUrl === "string"
      );
      const coverUrl = coverPage ? String(coverPage.imageUrl) : undefined;

      const featuredCharacters = Array.isArray(raw.featuredCharacters)
        ? (raw.featuredCharacters as string[])
        : [];

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

      results.push({ slug, title, shortDescription, coverUrl, featuredCharacters, hasAudio, hasVideo });
    } catch {
      // skip
    }
  }

  // Pineapple Baby stories first, then alphabetical
  results.sort((a, b) => {
    const aHasPB = a.featuredCharacters.some((c) => c.toLowerCase().includes("pineapple"));
    const bHasPB = b.featuredCharacters.some((c) => c.toLowerCase().includes("pineapple"));
    if (aHasPB && !bHasPB) return -1;
    if (!aHasPB && bHasPB) return 1;
    return a.title.localeCompare(b.title);
  });

  return results;
}
