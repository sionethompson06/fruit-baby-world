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

  return (
    <div className="min-h-screen bg-bg-cream">

      {/* Hero */}
      <section className="bg-white border-b border-pineapple-yellow/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14 text-center">
          <div className="text-5xl mb-4" role="img" aria-label="stories">🎬</div>
          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown mb-4">
            Fruit Baby Stories
          </h1>
          <p className="text-lg text-tiki-brown/65 max-w-xl mx-auto leading-relaxed">
            Follow the Fruit Baby friends through playful adventures, gentle lessons, and mischievous surprises.
          </p>
        </div>
      </section>

      {/* About stories */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6 sm:px-10 py-6 text-center">
          <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-2xl mx-auto">
            Stories begin as simple episode concepts and will later grow into storyboards, scripts, scene prompts, animation clips, and merchandise ideas.
          </p>
        </div>
      </section>

      {/* Episode grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {episodes.length > 0 ? (
          <>
            <h2 className="text-xs font-black text-tiki-brown/40 uppercase tracking-widest mb-6">
              Episodes — {episodes.length} total
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* Episode Studio Coming Soon */}
      <section className="bg-coconut-cream border-t border-pineapple-yellow/30 py-14 px-4">
        <div className="max-w-xl mx-auto text-center flex flex-col items-center gap-4">
          <div className="text-4xl" role="img" aria-label="studio">🎬✨</div>
          <h2 className="text-xl font-black text-tiki-brown">
            Episode Studio Coming Soon
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            The Fruit Baby Story Studio will let the team write episode concepts, generate storyboards and scene scripts, create image and animation prompts, and build out complete episode packages — all in one place.
          </p>
        </div>
      </section>

    </div>
  );
}
