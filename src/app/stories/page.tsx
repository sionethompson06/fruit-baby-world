import type { Metadata } from "next";
import { getAllEpisodes, getAllCharacters } from "@/lib/content";
import StoryCard from "@/components/StoryCard";

export const metadata: Metadata = {
  title: "Fruit Baby Stories | Fruit Baby World",
  description:
    "Follow the Fruit Baby friends through playful adventures, gentle lessons, and mischievous surprises.",
};

export default function StoriesPage() {
  const episodes = getAllEpisodes();
  const characters = getAllCharacters();
  const characterMap = Object.fromEntries(characters.map((c) => [c.id, c]));

  const gridClass =
    episodes.length === 1
      ? "max-w-md w-full mx-auto"
      : episodes.length === 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6";

  return (
    <div className="flex flex-col">

      {/* Hero — warm gradient gives clear separation from the sticky nav */}
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
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14">
        {episodes.length > 0 ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-black text-tiki-brown mb-1">
                🎬 Episodes
              </h2>
              <p className="text-sm text-tiki-brown/60">
                {episodes.length}{" "}
                {episodes.length === 1 ? "episode" : "episodes"} — more on the
                way
              </p>
            </div>

            <div className={gridClass}>
              {episodes.map((episode) => (
                <StoryCard
                  key={episode.id}
                  episode={episode}
                  characterMap={characterMap}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📖</p>
            <p className="font-semibold text-tiki-brown/50">
              No episodes yet — check back soon!
            </p>
          </div>
        )}
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t-2 border-dashed border-tiki-brown/15" />
      </div>

      {/* Story Studio Coming Soon */}
      <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-14">
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6 sm:px-10 py-10 text-center flex flex-col items-center gap-4">
          <div className="text-4xl" role="img" aria-label="studio">🎬✨</div>
          <h2 className="text-xl font-black text-tiki-brown">
            Story Studio Coming Soon
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-md">
            The Fruit Baby Story Studio will let the team write episode
            concepts, generate storyboards and scene scripts, create image and
            animation prompts, and build out complete episode packages — all in
            one place.
          </p>
        </div>
      </section>

    </div>
  );
}
