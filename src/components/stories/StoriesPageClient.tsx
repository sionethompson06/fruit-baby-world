"use client";

import { useState, useMemo } from "react";
import type { Episode, Character } from "@/lib/content";
import StoryCard from "@/components/StoryCard";
import {
  storyFeaturesCharacter,
  getCharacterStoryCounts,
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
};

export default function StoriesPageClient({
  episodes,
  characterMap,
  mediaMap,
  publicChars,
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
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 pt-10 pb-2">
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
    </>
  );
}
