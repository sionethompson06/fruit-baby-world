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
    "Follow the Fruit Baby friends through playful adventures, gentle lessons, and mischievous surprises.",
};

// ─── Coming Soon placeholder data ─────────────────────────────────────────────

const COMING_SOON_CARDS = [
  { slug: "the-kindness-garden", title: "The Kindness Garden", emoji: "🌱" },
  { slug: "mangos-big-silly-day", title: "Mango's Big Silly Day", emoji: "🥭" },
  { slug: "tikis-tiny-trick", title: "Tiki's Tiny Trick", emoji: "🌴" },
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
      const raw = JSON.parse(fs.readFileSync(path.join(dir, filename), "utf-8")) as unknown;
      if (!isRecord(raw)) continue;

      const slug = typeof raw.slug === "string" && raw.slug.length > 0
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
        .sort((a, b) => (a.sceneNumber as number) - (b.sceneNumber as number));

      if (approved.length > 0) {
        const first = approved[0];
        const asset = first.asset as Record<string, unknown>;
        map[slug] = {
          url: asset.url as string,
          alt: typeof asset.alt === "string" && asset.alt.trim().length > 0
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
  // Combine static public episodes with public-ready saved episode JSON files.
  // Deduplicate by slug so a saved episode that's also in the static array only appears once.
  const staticEpisodes = getPublicEpisodes();
  const savedEpisodes = loadPublicSavedEpisodes();
  const staticSlugs = new Set(staticEpisodes.map((e) => e.slug));
  const episodes = [...staticEpisodes, ...savedEpisodes.filter((e) => !staticSlugs.has(e.slug))];

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

      {/* Hero */}
      <section className="bg-gradient-to-b from-mango-orange/20 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4" role="img" aria-label="stories">🎬</div>
          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown mb-4 leading-tight">
            Fruit Baby Stories
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed">
            Follow the Fruit Baby friends through playful adventures, gentle
            lessons, and mischievous surprises.
          </p>
        </div>
      </section>

      {/* Pipeline info banner */}
      <section className="bg-coconut-cream border-y border-pineapple-yellow/30 py-4 px-4 text-center">
        <p className="text-sm font-semibold text-tiki-brown/70 max-w-xl mx-auto">
          📖 Stories begin as episode concepts and grow into storyboards,
          scripts, scene prompts, animation clips, and merchandise ideas.
        </p>
      </section>

      {/* Episode gallery */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14 flex flex-col gap-14">

        {/* Published episodes */}
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-black text-tiki-brown mb-1">
              🎬 Episodes
            </h2>
            <p className="text-sm text-tiki-brown/60">
              {episodes.length > 0
                ? `${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"} — more on the way`
                : "Public Fruit Baby stories are coming soon."}
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
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <p className="text-5xl">📖</p>
              <p className="text-sm text-tiki-brown/55 leading-relaxed max-w-md mx-auto">
                Saved episode drafts are currently being reviewed in the Story
                Studio before publication. Check back for the first published
                adventures!
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
              These adventures are in the Story Studio pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {COMING_SOON_CARDS.map((card) => (
              <div
                key={card.slug}
                className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-sm opacity-70 select-none"
                aria-label={`${card.title} — coming soon`}
              >
                {/* Placeholder thumbnail */}
                <div className="relative flex items-center justify-center h-44 flex-shrink-0 bg-gradient-to-br from-pineapple-yellow/20 to-mango-orange/10">
                  <span className="text-6xl" role="img" aria-label={card.title}>
                    {card.emoji}
                  </span>
                  <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-tiki-brown/10 text-tiki-brown/50">
                    Coming Soon
                  </span>
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <h3 className="text-lg font-black text-tiki-brown/60 leading-tight">
                    {card.title}
                  </h3>
                  <p className="text-sm text-tiki-brown/40 leading-relaxed">
                    This story is being crafted in the Fruit Baby Story Studio.
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-tiki-brown/10 mt-auto">
                    <span className="text-xs text-tiki-brown/30 font-semibold">
                      🎬 In progress
                    </span>
                    <span className="text-xs font-bold text-tiki-brown/25">
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

      {/* Story Studio note */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14">
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6 sm:px-10 py-10 text-center flex flex-col items-center gap-4">
          <div className="text-4xl" role="img" aria-label="studio">🎬✨</div>
          <h2 className="text-xl font-black text-tiki-brown">
            Story Studio Coming Soon
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-md">
            The Fruit Baby Story Studio is actively building episode packages.
            Episodes move from concept to storyboard, script, scene prompts,
            and a full review pipeline before they appear here publicly.
          </p>
        </div>
      </section>

    </div>
  );
}
