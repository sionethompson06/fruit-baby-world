import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { getPublicEpisodes } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import StoryCard from "@/components/StoryCard";
import { getPublicCharacterProfiles } from "@/lib/characterRegistry";

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
    description: "Pineapple Baby discovers that small acts of kindness can bloom into something wonderful.",
    characters: ["Pineapple Baby", "Coconut Baby"],
    lesson: "Kindness grows when you share it.",
  },
  {
    slug: "mangos-big-silly-day",
    title: "Mango's Big Silly Day",
    emoji: "🥭",
    description: "Mango Baby has a day full of wobbles, giggles, and friendly surprises.",
    characters: ["Mango Baby", "Ube Baby"],
    lesson: "It's okay to laugh at yourself.",
  },
  {
    slug: "tikis-tiny-trick",
    title: "Tiki's Tiny Trick",
    emoji: "🌴",
    description: "Tiki Trouble tries a sneaky little trick — but things don't go quite as planned!",
    characters: ["Tiki Trouble", "Kiwi Baby"],
    lesson: "Honesty is always the better trick.",
  },
] as const;

// ─── Episode media map ────────────────────────────────────────────────────────

type EpisodeMediaInfo = {
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  hasAudio: boolean;
  hasVideoClips: boolean;
  hasFinalVideo: boolean;
  hasStorybookPages: boolean;
  hasStorybookAudio: boolean;
  hasStorybookVideo: boolean;
};

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
      const storybookPages = Array.isArray(raw.storybookPages) ? raw.storybookPages as Record<string, unknown>[] : [];
      const storybookFrontCover = storybookPages.find(
        (p) => p.pageRole === "front-cover" && p.status === "approved" && p.visibility === "public" && typeof p.imageUrl === "string"
      );
      const storybookFrontCoverUrl = storybookFrontCover ? String(storybookFrontCover.imageUrl) : undefined;

      // Cover image as thumbnail, or first scene image
      const coverImage = typeof raw.coverImage === "string" ? raw.coverImage : undefined;
      const scenes = Array.isArray(raw.sceneBreakdown) && raw.sceneBreakdown.length > 0
        ? raw.sceneBreakdown as Record<string, unknown>[]
        : Array.isArray(raw.scenes) ? raw.scenes as Record<string, unknown>[] : [];
      const firstSceneImageUrl = scenes.find((s) => typeof s.imageUrl === "string" && s.imageUrl)?.imageUrl as string | undefined;
      const thumbnailUrl = storybookFrontCoverUrl ?? coverImage ?? firstSceneImageUrl;
      const thumbnailAlt = typeof raw.title === "string" ? raw.title : undefined;

      const hasAudio = typeof raw.audioUrl === "string" && raw.audioUrl.startsWith("https://");
      const hasVideoClips = false;
      const hasFinalVideo = typeof raw.videoUrl === "string" && raw.videoUrl.startsWith("https://");

      // Storybook-specific media
      const hasStorybookPages = storybookPages.some(
        (p) => p.status === "approved" && p.visibility === "public"
      );
      const sn = raw.storybookNarration;
      const hasStorybookAudio = typeof sn === "object" && sn !== null && !Array.isArray(sn)
        && typeof (sn as Record<string, unknown>).audioUrl === "string"
        && (sn as Record<string, unknown>).visibility === "public"
        && (sn as Record<string, unknown>).status !== "archived";
      const sv = raw.storybookVideo;
      const hasStorybookVideo = typeof sv === "object" && sv !== null && !Array.isArray(sv)
        && typeof (sv as Record<string, unknown>).videoUrl === "string"
        && (sv as Record<string, unknown>).visibility === "public"
        && (sv as Record<string, unknown>).status !== "archived";

      map[slug] = { thumbnailUrl, thumbnailAlt, hasAudio, hasVideoClips, hasFinalVideo, hasStorybookPages, hasStorybookAudio, hasStorybookVideo };
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

  let allChars: import("@/lib/content").Character[] = [];
  try { allChars = loadAllCharactersFromDisk(); } catch { /* fallback */ }
  const characterMap: Record<string, import("@/lib/content").Character> = {};
  for (const c of allChars) {
    if (c.id) characterMap[c.id] = c;
    characterMap[c.slug] = c;
    if (c.slug === "tiki") characterMap["tiki-trouble"] = c;
  }

  const mediaMap = buildEpisodeMediaMap();
  const publicChars = getPublicCharacterProfiles();

  const episodeGridClass =
    episodes.length === 1
      ? "max-w-md w-full mx-auto"
      : episodes.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

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
            Illustrated adventures with heart-warming lessons — read, listen, and watch your favorite Pineapple Baby characters come to life.
          </p>
        </div>
      </section>

      {/* Browse by Character */}
      {publicChars.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 pb-2">
          <div className="mb-4">
            <h2 className="text-xl font-black text-tiki-brown">Browse by Character</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {publicChars.map((char) => {
              const imgUrl = char.image?.profileSheet ?? char.image?.main ?? "";
              return (
                <Link
                  key={char.slug}
                  href={`/characters/${char.slug}`}
                  className="flex items-center gap-2.5 bg-white border border-tiki-brown/10 rounded-full px-3 py-2 shadow-sm hover:shadow transition-all hover:scale-[1.03]"
                >
                  {imgUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt={char.name}
                      className="w-8 h-8 rounded-full object-cover object-top border border-tiki-brown/10 flex-shrink-0"
                    />
                  )}
                  <span className="text-sm font-bold text-tiki-brown pr-0.5">
                    {char.shortName ?? char.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Available Stories */}
      <div
        className="w-full relative"
        style={{
          backgroundImage: "url('/backgrounds/pineapple_grove_1.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-[#FFF9EC]/85 pointer-events-none" />
      <section className="relative max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-black text-tiki-brown mb-1">Available Stories</h2>
          <p className="text-sm text-tiki-brown/60">
            {episodes.length > 0
              ? `${episodes.length} ${episodes.length === 1 ? "story" : "stories"} available now`
              : "Stories coming soon!"}
          </p>
        </div>

        {episodes.length > 0 ? (
          <div className={episodeGridClass}>
            {episodes.map((episode) => {
              const media = mediaMap[episode.slug];
              return (
                <StoryCard
                  key={episode.id}
                  episode={episode}
                  characterMap={characterMap}
                  thumbnailUrl={media?.thumbnailUrl}
                  thumbnailAlt={media?.thumbnailAlt}
                  mediaFlags={{
                    hasAudio: media?.hasAudio ?? false,
                    hasVideoClips: media?.hasVideoClips ?? false,
                    hasFinalVideo: media?.hasFinalVideo ?? false,
                    hasStorybookPages: media?.hasStorybookPages ?? false,
                    hasStorybookAudio: media?.hasStorybookAudio ?? false,
                    hasStorybookVideo: media?.hasStorybookVideo ?? false,
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 flex flex-col items-center gap-4 bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6">
            <p className="text-5xl">🌺</p>
            <p className="text-base font-black text-tiki-brown">Coming Soon</p>
            <p className="text-sm text-tiki-brown/55 leading-relaxed max-w-md mx-auto">
              Public Pineapple Baby stories are being prepared. Check back soon!
            </p>
          </div>
        )}
      </section>
      </div>

      {/* Coming Soon */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12 flex flex-col gap-6">
        <h2 className="text-2xl font-black text-tiki-brown">🌟 Coming Soon</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMING_SOON_CARDS.map((card) => (
            <div
              key={card.slug}
              className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-sm"
            >
              <div className="relative flex items-center justify-center h-44 bg-gradient-to-br from-pineapple-yellow/20 via-sky-blue/10 to-tropical-green/10">
                <span className="text-6xl select-none">{card.emoji}</span>
                <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-warm-coral/15 text-warm-coral/80">
                  Coming Soon
                </span>
              </div>
              <div className="p-5 flex flex-col gap-3 flex-1">
                <h3 className="text-lg font-black text-tiki-brown leading-tight">{card.title}</h3>
                <p className="text-sm text-tiki-brown/65 leading-relaxed">{card.description}</p>
                <div className="bg-pineapple-yellow/15 rounded-2xl px-3 py-2">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-0.5">Lesson</p>
                  <p className="text-sm text-tiki-brown/70 leading-snug">{card.lesson}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {card.characters.map((name) => (
                    <span key={name} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ube-purple/8 text-ube-purple/70">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
