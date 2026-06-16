import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { getPublicEpisodes } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { loadPublicSavedEpisodes, loadComingSoonSavedEpisodes } from "@/lib/savedEpisodes";
import { getPublicCharacterProfiles } from "@/lib/characterRegistry";
import StoriesPageClient, {
  type EpisodeMediaInfo,
} from "@/components/stories/StoriesPageClient";
import { getCoverPageSettings, isCoverPageEnabled } from "@/lib/coverPage";
import CoverPage from "@/components/cover/CoverPage";
import { getPublicAnimatedStories } from "@/lib/animatedStories";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pineapple Baby Stories | Pineapple Baby",
  description:
    "Browse illustrated picture stories, audio adventures, and videos — all with heart-warming lessons from Pineapple Baby and friends.",
};

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
      const hasStorybookAudio = (() => {
        if (typeof sn !== "object" || sn === null || Array.isArray(sn)) return false;
        const n = sn as Record<string, unknown>;
        if (n.visibility !== "public") return false;
        if (n.status === "archived") return false;
        // Sequence mode: has at least one block
        if (n.mode === "sequence") {
          const seq = n.sequence;
          return (
            typeof seq === "object" &&
            seq !== null &&
            !Array.isArray(seq) &&
            Array.isArray((seq as Record<string, unknown>).blocks) &&
            ((seq as Record<string, unknown>).blocks as unknown[]).length > 0
          );
        }
        // Single-file mode (or no mode): has audioUrl
        return typeof n.audioUrl === "string";
      })();
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
  const coverSettings = getCoverPageSettings();
  if (isCoverPageEnabled(coverSettings)) return <CoverPage settings={coverSettings} />;

  const staticEpisodes = getPublicEpisodes();
  const savedEpisodes = loadPublicSavedEpisodes();
  const staticSlugs = new Set(staticEpisodes.map((e) => e.slug));
  const episodes = [
    ...staticEpisodes,
    ...savedEpisodes.filter((e) => !staticSlugs.has(e.slug)),
  ];

  // Real coming-soon storybooks from the CMS only
  const realComingSoon = loadComingSoonSavedEpisodes();
  const comingSoonCards = realComingSoon.map((e) => ({
    slug: e.slug,
    title: e.title,
    emoji: null as string | null,
    coverImageUrl: e.coverImageUrl,
    description: e.shortDescription,
    characters: e.featuredCharacters,
    lesson: e.lesson,
    isReal: true,
  }));

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
  const publicAnimatedStories = getPublicAnimatedStories();

  return (
    <div className="flex flex-col">

      {/* Hero */}
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream pt-6 pb-4 px-4 text-center">
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
            <h1 className="brand-bubblegum-title brand-bubblegum-title--hero text-4xl sm:text-5xl leading-tight">
              <span className="brand-word-pineapple">Pineapple</span>{" "}
              <span className="brand-word-baby">Baby</span>{" "}
              <span className="brand-word-pink">Stories</span>
            </h1>
            <span className="title-charm title-charm-heart" aria-hidden="true">♥</span>
          </div>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-xl">
            Illustrated adventures with heart-warming lessons. Read, listen, and
            watch your favorite Pineapple Baby characters come to life.
          </p>
        </div>
      </section>

      {/* Browse by Character + Available Stories + Animated Stories (interactive, client component) */}
      <StoriesPageClient
        episodes={episodes}
        characterMap={characterMap}
        mediaMap={mediaMap}
        publicChars={publicChars}
        publicAnimatedStories={publicAnimatedStories}
      />

      {/* Coming Soon */}
      {comingSoonCards.length > 0 && (
        <section
          className="w-full py-12"
          style={{
            backgroundImage: `linear-gradient(rgba(255, 248, 230, 0.80), rgba(255, 244, 215, 0.88)), url("/backgrounds/mango-grove.webp")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        >
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col gap-6">
            <h2 className="text-2xl font-black text-tiki-brown">🌟 Coming Soon</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {comingSoonCards.map((card) => {
                const charDisplay =
                  card.characters.length > 0
                    ? card.characters.join(" • ")
                    : "Pineapple Baby Friends";

                const cardInner = (
                  <>
                    {/* Cover — book-cover aspect ratio, matching Available Stories cards */}
                    <div className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0 bg-gradient-to-br from-pineapple-yellow/20 via-sky-blue/10 to-tropical-green/10">
                      {card.coverImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={card.coverImageUrl}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                      ) : card.emoji ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-7xl select-none">{card.emoji}</span>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-7xl select-none opacity-30">📖</span>
                        </div>
                      )}
                      <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-pineapple-yellow/80 text-tiki-brown/80 shadow-sm">
                        🌟 Coming Soon
                      </span>
                    </div>
                    {/* Footer: title + characters only */}
                    <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                      <h3 className="text-sm font-black text-tiki-brown leading-tight line-clamp-2">
                        {card.title}
                      </h3>
                      <p className="text-xs text-tiki-brown/55 font-semibold truncate">
                        {charDisplay}
                      </p>
                    </div>
                  </>
                );

                if (card.isReal) {
                  return (
                    <Link
                      key={card.slug}
                      href={`/stories/${card.slug}`}
                      className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      {cardInner}
                    </Link>
                  );
                }

                return (
                  <div
                    key={card.slug}
                    className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-md"
                  >
                    {cardInner}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
