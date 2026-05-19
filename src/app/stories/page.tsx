import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { getPublicEpisodes } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import StoryCard from "@/components/StoryCard";
import { getApprovedPublicStoryPanels } from "@/lib/episodeScenes";
import { getPublicReadyVideoClipsForEpisode } from "@/lib/publicVideoClips";
import { getPublicReadyFinalVideo } from "@/lib/publicFinalVideo";
import { getPublicCharacterProfiles } from "@/lib/characterRegistry";
import { getOfficialProfileSheetUrl } from "@/lib/characterProfileAssets";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Fruit Baby Stories | Fruit Baby World",
  description:
    "Browse illustrated picture stories, audio adventures, animated clips, and full-length Fruit Baby videos — all with heart-warming lessons for little learners.",
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

// ─── Per-episode media info ────────────────────────────────────────────────────

type EpisodeMediaInfo = {
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  hasAudio: boolean;
  hasVideoClips: boolean;
  hasFinalVideo: boolean;
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

      // Thumbnail from first approved public panel
      const approved = getApprovedPublicStoryPanels(raw);
      const thumbnailUrl = approved[0]?.asset.url;
      const thumbnailAlt = approved[0]?.asset.alt;

      // Public-ready audio narration
      const an = raw.audioNarration;
      const hasAudio = !!(
        an &&
        typeof an === "object" &&
        !Array.isArray(an) &&
        (an as Record<string, unknown>).status === "approved" &&
        (an as Record<string, unknown>).visibility === "public-ready" &&
        typeof (an as Record<string, unknown>).url === "string" &&
        ((an as Record<string, unknown>).url as string).startsWith("https://")
      );

      // Public-ready animated clips
      const scenes = Array.isArray(raw.sceneBreakdown)
        ? (raw.sceneBreakdown as Record<string, unknown>[])
        : [];
      const hasVideoClips = getPublicReadyVideoClipsForEpisode(scenes).length > 0;

      // Public-ready final video
      const hasFinalVideo = getPublicReadyFinalVideo(raw) !== null;

      map[slug] = { thumbnailUrl, thumbnailAlt, hasAudio, hasVideoClips, hasFinalVideo };
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
  try { allChars = loadAllCharactersFromDisk(); } catch { /* fallback to empty */ }
  const characterMap: Record<string, import("@/lib/content").Character> = {};
  for (const c of allChars) {
    if (c.id) characterMap[c.id] = c;
    characterMap[c.slug] = c;
    if (c.slug === "tiki") characterMap["tiki-trouble"] = c;
  }

  const mediaMap = buildEpisodeMediaMap();

  // Public characters for the "Browse by Character" section
  const publicChars = getPublicCharacterProfiles();

  const episodeGridClass =
    episodes.length === 1
      ? "max-w-md w-full mx-auto"
      : episodes.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="flex flex-col">

      {/* ── A. Hero ── */}
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="text-5xl" role="img" aria-label="stories">📖</div>
          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown leading-tight">
            Fruit Baby Stories
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-lg">
            Illustrated adventures with heart-warming lessons — read, listen, and
            watch your favorite Fruit Baby characters come to life.
          </p>
          <p className="text-xs font-semibold text-tiki-brown/45 bg-white/60 border border-tiki-brown/10 px-4 py-2 rounded-full">
            ✅ All stories are reviewed before they appear here.
          </p>
        </div>
      </section>

      {/* ── B. Story Experience Types ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 pb-2">
        <div className="text-center mb-5">
          <h2 className="text-xl font-black text-tiki-brown">Story Experience Types</h2>
          <p className="text-sm text-tiki-brown/55 mt-1">
            Each story can be enjoyed in multiple ways as they become available.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">📖</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Read Story</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Full text with scene-by-scene dialogue
            </p>
          </div>
          <div className="bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">🖼️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Picture Story</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Approved illustrated story panels
            </p>
          </div>
          <div className="bg-pineapple-yellow/15 border border-pineapple-yellow/35 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">🎙️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Audio Story</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Listen to the full narration
            </p>
          </div>
          <div className="bg-warm-coral/6 border border-warm-coral/15 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">🎬</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Animated Clips</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Scene-by-scene animated shorts
            </p>
          </div>
        </div>
      </section>

      {/* ── C. Browse by Character ── */}
      {publicChars.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 pb-2">
          <div className="mb-4">
            <h2 className="text-xl font-black text-tiki-brown">Browse by Character</h2>
            <p className="text-sm text-tiki-brown/55 mt-1">
              Follow your favorite Fruit Baby through their adventures.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {publicChars.map((char) => {
              const profileUrl = getOfficialProfileSheetUrl(char);
              return (
                <Link
                  key={char.slug}
                  href={`/characters/${char.slug}`}
                  className="flex items-center gap-2.5 bg-white border border-tiki-brown/10 rounded-full px-3 py-2 shadow-sm hover:shadow transition-all hover:scale-[1.03]"
                >
                  {profileUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileUrl}
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

      {/* ── D. Available Stories ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            Available Stories
          </h2>
          <p className="text-sm text-tiki-brown/60">
            {episodes.length > 0
              ? `${episodes.length} ${episodes.length === 1 ? "story" : "stories"} available now`
              : "Stories are being reviewed in the Story Studio."}
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
              Public Fruit Baby stories are being reviewed in the Story Studio.
              Check back soon for illustrated adventures!
            </p>
          </div>
        )}
      </section>

      {/* ── E. Coming Soon ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12 flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🌟 Coming Soon
          </h2>
          <p className="text-sm text-tiki-brown/60">
            More adventures are on the way.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMING_SOON_CARDS.map((card) => (
            <div
              key={card.slug}
              className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-sm"
              aria-label={`${card.title} — coming soon`}
            >
              <div className="relative flex items-center justify-center h-44 flex-shrink-0 bg-gradient-to-br from-pineapple-yellow/20 via-sky-blue/10 to-tropical-green/10">
                <span className="text-6xl select-none" role="img" aria-label={card.title}>
                  {card.emoji}
                </span>
                <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-warm-coral/15 text-warm-coral/80">
                  Coming Soon
                </span>
              </div>
              <div className="p-5 flex flex-col gap-3 flex-1">
                <h3 className="text-lg font-black text-tiki-brown leading-tight">
                  {card.title}
                </h3>
                <p className="text-sm text-tiki-brown/65 leading-relaxed">
                  {card.description}
                </p>
                <div className="bg-pineapple-yellow/15 rounded-2xl px-3 py-2">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-0.5">
                    Lesson
                  </p>
                  <p className="text-sm text-tiki-brown/70 leading-snug">
                    {card.lesson}
                  </p>
                </div>
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
                <div className="flex items-center justify-between pt-2 border-t border-tiki-brown/10 mt-auto flex-wrap gap-2">
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45">
                      🖼️ Panels Soon
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45">
                      🎬 Clips Soon
                    </span>
                  </div>
                  <span className="text-xs font-bold text-tiki-brown/30">
                    Not yet available
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── F. For Families & Teachers ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-12">
        <div className="bg-gradient-to-r from-ube-purple/8 via-pineapple-yellow/10 to-tropical-green/8 rounded-3xl border border-tiki-brown/10 px-6 sm:px-10 py-8">
          <h2 className="text-xl font-black text-tiki-brown mb-2">
            Stories Built for Learning
          </h2>
          <p className="text-sm text-tiki-brown/65 leading-relaxed max-w-2xl mb-6">
            Every Fruit Baby story is designed around a single heart-warming lesson — patience,
            kindness, honesty, friendship — told through characters children genuinely love.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/60 rounded-2xl px-4 py-4 flex flex-col gap-1.5">
              <span className="text-xl">👨‍👩‍👧</span>
              <p className="text-sm font-black text-tiki-brown">For Families</p>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                Cozy read-aloud moments and lesson conversations built right in.
              </p>
            </div>
            <div className="bg-white/60 rounded-2xl px-4 py-4 flex flex-col gap-1.5">
              <span className="text-xl">🍎</span>
              <p className="text-sm font-black text-tiki-brown">For Teachers</p>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                Clear lesson themes make every story easy to use in circle time or storytime.
              </p>
            </div>
            <div className="bg-white/60 rounded-2xl px-4 py-4 flex flex-col gap-1.5">
              <span className="text-xl">🍍</span>
              <p className="text-sm font-black text-tiki-brown">For Kids Ages 2–7</p>
              <p className="text-xs text-tiki-brown/60 leading-relaxed">
                Colorful characters, gentle humor, and relatable feelings kids instantly connect with.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t-2 border-dashed border-tiki-brown/15" />
      </div>

      {/* ── G. Meet the Characters footer ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12">
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div className="text-4xl flex-shrink-0" role="img" aria-label="fruit babies">🍍🥭🥝</div>
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-black text-tiki-brown">
              Meet the Characters
            </h2>
            <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-md">
              Pineapple Baby, Mango Baby, Ube Baby, Coconut Baby, Kiwi Baby, and
              the mischievous Tiki Trouble — each with their own personality,
              feelings, and adventures.
            </p>
            <Link
              href="/characters"
              className="self-center sm:self-start text-sm font-bold text-ube-purple hover:text-ube-purple/70 transition-colors mt-1"
            >
              Meet the Fruit Baby characters →
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
