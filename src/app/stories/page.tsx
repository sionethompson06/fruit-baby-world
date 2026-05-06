import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import { getPublicEpisodes, getAllCharacters } from "@/lib/content";
import { loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import StoryCard from "@/components/StoryCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fruit Baby Stories | Fruit Baby World",
  description:
    "Read playful educational adventures, explore illustrated story panels, and discover animated shorts coming soon.",
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

// ─── Approved panel thumbnail extractor ───────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

type ThumbnailEntry = { url: string; alt: string };

function buildThumbnailMap(): Record<string, ThumbnailEntry> {
  const dir = path.join(process.cwd(), "src", "content", "episodes");
  let filenames: string[];
  try {
    filenames = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return {};
  }

  const map: Record<string, ThumbnailEntry> = {};

  for (const filename of filenames) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(path.join(dir, filename), "utf-8")
      ) as unknown;
      if (!isRecord(raw)) continue;

      const slug =
        typeof raw.slug === "string" && raw.slug.length > 0
          ? raw.slug
          : filename.replace(/\.json$/, "");

      const media = isRecord(raw.media) ? raw.media : null;
      const spm = isRecord(media?.storyPanelMode) ? media!.storyPanelMode : null;
      const panels = Array.isArray(spm?.panels) ? spm!.panels : [];

      const approved = (panels as unknown[])
        .filter((p): p is Record<string, unknown> => isRecord(p))
        .filter((p) => {
          const asset = isRecord(p.asset) ? p.asset : null;
          const review = isRecord(p.review) ? p.review : null;
          const publicUse = isRecord(p.publicUse) ? p.publicUse : null;
          return (
            asset !== null &&
            typeof asset.url === "string" &&
            asset.url.startsWith("https://") &&
            asset.storageProvider === "vercel-blob" &&
            review?.characterFidelityApproved === true &&
            publicUse?.allowed === true &&
            publicUse?.appearsOnPublicStoryPage === true &&
            (p.status === "approved" || p.approvalStatus === "approved") &&
            typeof p.sceneNumber === "number" &&
            p.sceneNumber >= 1
          );
        })
        .sort(
          (a, b) => (a.sceneNumber as number) - (b.sceneNumber as number)
        );

      if (approved.length > 0) {
        const first = approved[0];
        const asset = first.asset as Record<string, unknown>;
        map[slug] = {
          url: asset.url as string,
          alt:
            typeof asset.alt === "string" && asset.alt.trim().length > 0
              ? asset.alt.trim()
              : `Story panel for ${slug}`,
        };
      }
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

  const characters = getAllCharacters();
  const characterMap = Object.fromEntries(characters.map((c) => [c.id, c]));
  const thumbnailMap = buildThumbnailMap();

  const episodeGridClass =
    episodes.length === 1
      ? "max-w-md w-full mx-auto"
      : episodes.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="flex flex-col">

      {/* ── Hero ── */}
      <section className="bg-gradient-to-b from-mango-orange/20 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <div className="text-5xl" role="img" aria-label="stories">📖</div>
          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown leading-tight">
            Fruit Baby Stories
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-lg">
            Read playful educational adventures, explore illustrated story
            panels, and discover animated shorts coming soon.
          </p>
          <p className="text-xs font-semibold text-tiki-brown/45 bg-white/60 border border-tiki-brown/10 px-4 py-2 rounded-full">
            ✅ New stories are reviewed before they appear here.
          </p>
        </div>
      </section>

      {/* ── Ways to Enjoy Stories ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-12 pb-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-black text-tiki-brown">Ways to Enjoy Stories</h2>
          <p className="text-sm text-tiki-brown/55 mt-1">
            Each story is built to be experienced in multiple ways.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">📖</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Read Story</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Scene-by-scene with dialogue
            </p>
          </div>
          <div className="bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">🖼️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Illustrated Panels</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Approved story artwork
            </p>
          </div>
          <div className="bg-pineapple-yellow/15 border border-pineapple-yellow/35 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">🎙️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Read-Aloud</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Prompts for shared reading
            </p>
          </div>
          <div className="bg-warm-coral/6 border border-warm-coral/15 rounded-2xl px-4 py-4 flex flex-col gap-2 text-center">
            <span className="text-2xl">🎬</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Animated Shorts</p>
            <p className="text-xs text-tiki-brown/55 leading-snug">
              Coming in a future release
            </p>
          </div>
        </div>
      </section>

      {/* ── Episode gallery ── */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col gap-14">

        {/* Available stories */}
        <div>
          <div className="mb-8">
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
                const thumb = thumbnailMap[episode.slug];
                return (
                  <StoryCard
                    key={episode.id}
                    episode={episode}
                    characterMap={characterMap}
                    thumbnailUrl={thumb?.url}
                    thumbnailAlt={thumb?.alt}
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
                Check back soon for illustrated adventures.
              </p>
            </div>
          )}
        </div>

        {/* Coming Soon placeholders */}
        <div>
          <div className="mb-8">
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
                {/* Placeholder thumbnail */}
                <div className="relative flex items-center justify-center h-44 flex-shrink-0 bg-gradient-to-br from-pineapple-yellow/20 via-sky-blue/10 to-tropical-green/10">
                  <span className="text-6xl select-none" role="img" aria-label={card.title}>
                    {card.emoji}
                  </span>
                  <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-warm-coral/15 text-warm-coral/80">
                    Coming Soon
                  </span>
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <h3 className="text-lg font-black text-tiki-brown leading-tight">
                    {card.title}
                  </h3>

                  <p className="text-sm text-tiki-brown/65 leading-relaxed">
                    {card.description}
                  </p>

                  {/* Lesson teaser */}
                  <div className="bg-pineapple-yellow/15 rounded-2xl px-3 py-2">
                    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-0.5">
                      Lesson
                    </p>
                    <p className="text-sm text-tiki-brown/70 leading-snug">
                      {card.lesson}
                    </p>
                  </div>

                  {/* Character names */}
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

                  {/* Coming soon mode badges */}
                  <div className="flex items-center justify-between pt-2 border-t border-tiki-brown/10 mt-auto flex-wrap gap-2">
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45">
                        🖼️ Panels Soon
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45">
                        🎬 Short Soon
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
        </div>

      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t-2 border-dashed border-tiki-brown/15" />
      </div>

      {/* Footer note */}
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
            <a
              href="/characters"
              className="self-start text-sm font-bold text-ube-purple hover:text-ube-purple/70 transition-colors mt-1"
            >
              Meet the Fruit Baby characters →
            </a>
          </div>
        </div>
      </section>

    </div>
  );
}
