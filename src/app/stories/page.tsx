import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { getPublicEpisodes } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { loadPublicSavedEpisodes, loadComingSoonSavedEpisodes } from "@/lib/savedEpisodes";
import { getPublicCharacterProfiles } from "@/lib/characterRegistry";
import StoriesPageClient, {
  type EpisodeMediaInfo,
} from "@/components/stories/StoriesPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pineapple Baby Stories | Pineapple Baby",
  description:
    "Browse illustrated picture stories, audio adventures, and videos — all with heart-warming lessons from Pineapple Baby and friends.",
};

// ─── Coming Soon placeholder data ─────────────────────────────────────────────

const COMING_SOON_CARDS = [
  {
    slug: "the-kindness-garden",
    title: "The Kindness Garden",
    emoji: "🌱",
    description:
      "Pineapple Baby discovers that small acts of kindness can bloom into something wonderful.",
    characters: ["Pineapple Baby", "Coconut Baby"],
    lesson: "Kindness grows when you share it.",
  },
  {
    slug: "mangos-big-silly-day",
    title: "Mango's Big Silly Day",
    emoji: "🥭",
    description:
      "Mango Baby has a day full of wobbles, giggles, and friendly surprises.",
    characters: ["Mango Baby", "Ube Baby"],
    lesson: "It's okay to laugh at yourself.",
  },
  {
    slug: "tikis-tiny-trick",
    title: "Tiki's Tiny Trick",
    emoji: "🌴",
    description:
      "Tiki Trouble tries a sneaky little trick — but things don't go quite as planned!",
    characters: ["Tiki Trouble", "Kiwi Baby"],
    lesson: "Honesty is always the better trick.",
  },
] as const;

// ─── Episode media map ────────────────────────────────────────────────────────

function buildEpisodeMediaMap(): Record<string, EpisodeMediaInfo> {
  const dir = path.join(process.cwd(), "src", "content", "episodes");
  let filenames: string[];
  try {
    filenames = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return {};
  }

  const map: Record<string, EpisodeMediaInfo> = {};

  for (const filename of filenames) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, filename), "utf-8")
      ) as Record<string, unknown>;

      const slug =
        typeof raw.slug === "string" && raw.slug.length > 0
          ? raw.slug
          : filename.replace(/\.json$/, "");

      // Storybook front cover (preferred thumbnail)
      const storybookPages = Array.isArray(raw.storybookPages)
        ? (raw.storybookPages as Record<string, unknown>[])
        : [];
      const storybookFrontCover = storybookPages.find(
        (p) =>
          p.pageRole === "front-cover" &&
          p.status === "approved" &&
          p.visibility === "public" &&
          typeof p.imageUrl === "string"
      );
      const storybookFrontCoverUrl = storybookFrontCover
        ? String(storybookFrontCover.imageUrl)
        : undefined;

      const coverImage =
        typeof raw.coverImage === "string" ? raw.coverImage : undefined;
      const scenes =
        Array.isArray(raw.sceneBreakdown) && raw.sceneBreakdown.length > 0
          ? (raw.sceneBreakdown as Record<string, unknown>[])
          : Array.isArray(raw.scenes)
          ? (raw.scenes as Record<string, unknown>[])
          : [];
      const firstSceneImageUrl = scenes.find(
        (s) => typeof s.imageUrl === "string" && s.imageUrl
      )?.imageUrl as string | undefined;
      const thumbnailUrl = storybookFrontCoverUrl ?? coverImage ?? firstSceneImageUrl;
      const thumbnailAlt =
        typeof raw.title === "string" ? raw.title : undefined;

      const hasAudio =
        typeof raw.audioUrl === "string" && raw.audioUrl.startsWith("https://");
      const hasVideoClips = false;
      const hasFinalVideo =
        typeof raw.videoUrl === "string" && raw.videoUrl.startsWith("https://");

      const hasStorybookPages = storybookPages.some(
        (p) => p.status === "approved" && p.visibility === "public"
      );
      const sn = raw.storybookNarration;
      const hasStorybookAudio =
        typeof sn === "object" &&
        sn !== null &&
        !Array.isArray(sn) &&
        typeof (sn as Record<string, unknown>).audioUrl === "string" &&
        (sn as Record<string, unknown>).visibility === "public" &&
        (sn as Record<string, unknown>).status !== "archived";
      const sv = raw.storybookVideo;
      const hasStorybookVideo =
        typeof sv === "object" &&
        sv !== null &&
        !Array.isArray(sv) &&
        typeof (sv as Record<string, unknown>).videoUrl === "string" &&
        (sv as Record<string, unknown>).visibility === "public" &&
        (sv as Record<string, unknown>).status !== "archived";

      map[slug] = {
        thumbnailUrl,
        thumbnailAlt,
        hasAudio,
        hasVideoClips,
        hasFinalVideo,
        hasStorybookPages,
        hasStorybookAudio,
        hasStorybookVideo,
      };
    } catch {
      // skip unparseable files
    }
  }

  return map;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StoriesPage() {
  const staticEpisodes = getPublicEpisodes();
  const savedEpisodes = loadPublicSavedEpisodes();
  const staticSlugs = new Set(staticEpisodes.map((e) => e.slug));
  const episodes = [
    ...staticEpisodes,
    ...savedEpisodes.filter((e) => !staticSlugs.has(e.slug)),
  ];

  // Real coming-soon storybooks from the CMS
  const realComingSoon = loadComingSoonSavedEpisodes();
  const realComingSoonSlugs = new Set(realComingSoon.map((e) => e.slug));
  // Merge real + hardcoded placeholders, real entries win by slug
  const comingSoonCards = [
    ...realComingSoon.map((e) => ({
      slug: e.slug,
      title: e.title,
      emoji: null as string | null,
      coverImageUrl: e.coverImageUrl,
      description: e.shortDescription,
      characters: e.featuredCharacters,
      lesson: e.lesson,
      isReal: true,
    })),
    ...COMING_SOON_CARDS.filter((c) => !realComingSoonSlugs.has(c.slug)).map((c) => ({
      slug: c.slug,
      title: c.title,
      emoji: c.emoji as string,
      coverImageUrl: null as string | null,
      description: c.description,
      characters: [...c.characters],
      lesson: c.lesson,
      isReal: false,
    })),
  ];

  let allChars: import("@/lib/content").Character[] = [];
  try {
    allChars = loadAllCharactersFromDisk();
  } catch {
    /* fallback */
  }
  const characterMap: Record<string, import("@/lib/content").Character> = {};
  for (const c of allChars) {
    if (c.id) characterMap[c.id] = c;
    characterMap[c.slug] = c;
    if (c.slug === "tiki") characterMap["tiki-trouble"] = c;
  }

  const mediaMap = buildEpisodeMediaMap();
  const publicChars = getPublicCharacterProfiles();

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
            <h1 className="brand-bubblegum-title brand-bubblegum-title--hero text-4xl sm:text-5xl leading-tight">
              <span className="brand-word-pineapple">Pineapple</span>{" "}
              <span className="brand-word-baby">Baby</span>{" "}
              <span className="brand-word-pink">Stories</span>
            </h1>
            <span className="title-charm title-charm-heart" aria-hidden="true">♥</span>
          </div>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-lg">
            Illustrated adventures with heart-warming lessons — read, listen, and
            watch your favorite Pineapple Baby characters come to life.
          </p>
        </div>
      </section>

      {/* Browse by Character + Available Stories (interactive, client component) */}
      <StoriesPageClient
        episodes={episodes}
        characterMap={characterMap}
        mediaMap={mediaMap}
        publicChars={publicChars}
      />

      {/* Coming Soon */}
      {comingSoonCards.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12 flex flex-col gap-6">
          <h2 className="text-2xl font-black text-tiki-brown">🌟 Coming Soon</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {comingSoonCards.map((card) => (
              <div
                key={card.slug}
                className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-sm"
              >
                {/* Cover / placeholder image */}
                <div className="relative flex items-center justify-center h-44 bg-gradient-to-br from-pineapple-yellow/20 via-sky-blue/10 to-tropical-green/10 overflow-hidden">
                  {card.coverImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.coverImageUrl}
                      alt={card.title}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : card.emoji ? (
                    <span className="text-6xl select-none">{card.emoji}</span>
                  ) : (
                    <span className="text-6xl select-none opacity-30">📖</span>
                  )}
                  <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-pineapple-yellow/80 text-tiki-brown/80 shadow-sm">
                    🌟 Coming Soon
                  </span>
                </div>

                <div className="p-5 flex flex-col gap-3 flex-1">
                  <h3 className="text-lg font-black text-tiki-brown leading-tight">
                    {card.title}
                  </h3>
                  {card.description && (
                    <p className="text-sm text-tiki-brown/65 leading-relaxed">
                      {card.description}
                    </p>
                  )}
                  {card.lesson && (
                    <div className="bg-pineapple-yellow/15 rounded-2xl px-3 py-2">
                      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-0.5">
                        Lesson
                      </p>
                      <p className="text-sm text-tiki-brown/70 leading-snug">
                        {card.lesson}
                      </p>
                    </div>
                  )}
                  {card.characters.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {card.characters.map((name) => (
                        <span
                          key={name}
                          className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ube-purple/8 text-ube-purple/70"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
