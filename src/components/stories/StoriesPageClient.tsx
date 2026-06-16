"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Episode, Character } from "@/lib/content";
import type { AnimatedStory } from "@/lib/animatedStoriesTypes";
import StoryCard from "@/components/StoryCard";
import {
  storyFeaturesCharacter,
  getCharacterStoryCounts,
  normalizeCharacterSlug,
} from "@/lib/storyCharacterFilters";

// Individual character pose images — not profile sheets.
// Add new slug → path entries here when new characters get individual image files.
const CHAR_IMAGES: Record<string, string> = {
  "pineapple-baby": "/characters/pineapple-baby/pineapple%20happy_smile_fun_playing.png",
  "mango-baby": "/characters/mango-baby/mango%20happy_fun_enjoy_playing.png",
  "kiwi-baby": "/characters/kiwi-baby/Kiwi%20playful_joyful_running_fun.png",
  "coconut-baby": "/characters/coconut-baby/Coconut%20smile_happy_welcoming_cute.png",
  "ube-baby": "/characters/ube-baby/ube%20happy_fun_listening.png",
  "strawberry-baby": "/characters/strawberry-baby/strawberry%20waiving_hello_goodbye_happy.png",
  "dragon-fruit-baby":
    "/characters/dragon-fruit-baby/Dragon%20Fruit%20happy_welcome_joy_fun_.png",
  // dragonfruit-baby is the actual slug in the character JSON; aliases to same image
  "dragonfruit-baby":
    "/characters/dragon-fruit-baby/Dragon%20Fruit%20happy_welcome_joy_fun_.png",
  tiki: "/characters/tiki/tiki%20laughing_funny_teasing_.png",
  "tiki-trouble": "/characters/tiki/tiki%20laughing_funny_teasing_.png",
};

export type EpisodeMediaInfo = {
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  hasAudio: boolean;
  hasVideoClips: boolean;
  hasFinalVideo: boolean;
  hasStorybookPages: boolean;
  hasStorybookAudio: boolean;
  hasStorybookVideo: boolean;
};

type Props = {
  episodes: Episode[];
  characterMap: Record<string, Character>;
  mediaMap: Record<string, EpisodeMediaInfo>;
  publicChars: Character[];
  publicAnimatedStories: AnimatedStory[];
};

export default function StoriesPageClient({
  episodes,
  characterMap,
  mediaMap,
  publicChars,
  publicAnimatedStories,
}: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);

  const storyCounts = useMemo(
    () => getCharacterStoryCounts(episodes, publicChars.map((c) => c.slug)),
    [episodes, publicChars]
  );

  const filteredEpisodes = useMemo(
    () =>
      selectedSlug
        ? episodes.filter((e) => storyFeaturesCharacter(e, selectedSlug))
        : episodes,
    [episodes, selectedSlug]
  );

  const filteredAnimatedStories = useMemo(
    () =>
      selectedSlug
        ? publicAnimatedStories.filter((s) =>
            (s.characterSlugs ?? []).some(
              (cs) =>
                normalizeCharacterSlug(cs) === normalizeCharacterSlug(selectedSlug)
            )
          )
        : publicAnimatedStories,
    [publicAnimatedStories, selectedSlug]
  );

  const selectedChar = selectedSlug
    ? publicChars.find((c) => c.slug === selectedSlug)
    : null;
  const selectedName =
    selectedChar?.shortName ?? selectedChar?.name ?? selectedSlug ?? "";

  const episodeGridClass =
    filteredEpisodes.length === 1
      ? "max-w-md w-full mx-auto"
      : filteredEpisodes.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <>
      {/* Browse by Character — filter buttons */}
      {publicChars.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-4 pb-2">
          <div className="mb-4 flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-black text-tiki-brown">Browse by Character</h2>
            {selectedSlug && (
              <button
                type="button"
                onClick={() => setSelectedSlug(null)}
                className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/10 text-tiki-brown/60 hover:bg-tiki-brown/20 transition-colors"
              >
                All Stories
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {publicChars.map((char) => {
              const imgUrl = CHAR_IMAGES[char.slug] ?? "";
              const count = storyCounts[char.slug] ?? 0;
              const isSelected = selectedSlug === char.slug;
              return (
                <button
                  key={char.slug}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedSlug(isSelected ? null : char.slug)}
                  className={`flex items-center gap-2 rounded-full px-3 py-2 transition-all ${
                    isSelected
                      ? "bg-pineapple-yellow/40 border-2 border-pineapple-yellow shadow-md scale-[1.04]"
                      : "bg-white border border-tiki-brown/10 shadow-sm hover:shadow hover:scale-[1.03]"
                  }`}
                >
                  {imgUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt=""
                      aria-hidden="true"
                      className="w-10 h-10 rounded-full object-cover object-top border border-tiki-brown/10 flex-shrink-0"
                    />
                  )}
                  <span className="text-sm font-bold text-tiki-brown">
                    {char.shortName ?? char.name}
                  </span>
                  <span
                    className={`text-xs font-semibold rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-none ${
                      count > 0
                        ? "bg-tropical-green/15 text-tropical-green/80"
                        : "bg-tiki-brown/8 text-tiki-brown/35"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Available Stories — filtered grid */}
      <div
        className="w-full"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 248, 236, 0.82), rgba(255, 236, 238, 0.88)), url('/backgrounds/Heartberry_Hallow.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-black text-tiki-brown mb-1">
              {selectedSlug ? `${selectedName} Stories` : "Available Stories"}
            </h2>
            <p className="text-sm text-tiki-brown/60">
              {filteredEpisodes.length > 0
                ? `${filteredEpisodes.length} ${
                    filteredEpisodes.length === 1 ? "story" : "stories"
                  } available now`
                : selectedSlug
                ? "New adventures coming soon"
                : "Stories coming soon!"}
            </p>
          </div>

          {filteredEpisodes.length > 0 ? (
            <div className={episodeGridClass}>
              {filteredEpisodes.map((episode) => {
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
            <div className="text-center py-12 flex flex-col items-center gap-4 bg-white/85 rounded-3xl border border-tiki-brown/10 shadow-sm px-6">
              {selectedSlug ? (
                <>
                  <p className="text-5xl">🌺</p>
                  <p className="text-base font-black text-tiki-brown">
                    New adventures with {selectedName} are coming soon!
                  </p>
                  <button
                    type="button"
                    onClick={() => setSelectedSlug(null)}
                    className="text-sm font-bold px-4 py-2 rounded-full bg-pineapple-yellow/40 text-tiki-brown hover:bg-pineapple-yellow/60 transition-colors"
                  >
                    View All Stories
                  </button>
                </>
              ) : (
                <>
                  <p className="text-5xl">🌺</p>
                  <p className="text-base font-black text-tiki-brown">Coming Soon</p>
                  <p className="text-sm text-tiki-brown/55 leading-relaxed max-w-md mx-auto">
                    Public Pineapple Baby stories are being prepared. Check back soon!
                  </p>
                </>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Animated Stories — filtered by selected character */}
      {filteredAnimatedStories.length > 0 && (
        <section className="w-full py-12 bg-gradient-to-b from-bg-cream via-ube-purple/5 to-bg-cream">
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-black text-tiki-brown">🎬 Animated Stories</h2>
              <p className="text-sm text-tiki-brown/60">Watch Pineapple Baby and friends in action.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnimatedStories.map((story) => {
                const cardImage = story.coverImageUrl ?? story.posterImageUrl;
                const clipCount = (story.clips ?? []).filter(
                  (c) => c.status === "approved" && c.visibility === "public" && Boolean(c.videoUrl)
                ).length;
                return (
                  <Link
                    key={story.slug}
                    href={`/stories/animated/${story.slug}`}
                    className="group rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
                  >
                    <div className="relative w-full aspect-video overflow-hidden bg-gradient-to-br from-ube-purple/20 via-sky-blue/10 to-tropical-green/10 flex items-center justify-center">
                      {cardImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cardImage}
                          alt={story.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-6xl select-none opacity-60">🎬</span>
                      )}
                      <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                        {clipCount} {clipCount === 1 ? "clip" : "clips"}
                      </span>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                          <span className="text-2xl ml-1">▶</span>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
                      <h3 className="text-sm font-black text-tiki-brown leading-tight line-clamp-2">
                        {story.title}
                      </h3>
                      {story.description && (
                        <p className="text-xs text-tiki-brown/55 leading-relaxed line-clamp-2">
                          {story.description}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
