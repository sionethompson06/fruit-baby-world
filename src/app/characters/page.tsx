import { getAllCharacters } from "@/lib/content";
import CharacterCard from "@/components/CharacterCard";

export default function CharactersPage() {
  const allCharacters = getAllCharacters();
  const fruitBabies = allCharacters.filter((c) => c.type === "fruit-baby");
  const rivals = allCharacters.filter((c) => c.type === "villain");

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-b from-pineapple-yellow/25 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4">🍍🥭🥝🫐🥥</div>
          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown mb-4 leading-tight">
            Meet the Fruit Baby World Characters
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed">
            Discover the sweet friends, playful personalities, and mischievous
            rivals who bring Fruit Baby World to life.
          </p>
        </div>
      </section>

      {/* Info banner */}
      <section className="bg-coconut-cream border-y border-pineapple-yellow/30 py-4 px-4 text-center">
        <p className="text-sm font-semibold text-tiki-brown/70 max-w-xl mx-auto">
          ✨ Each character is designed for stories, plushies, collectibles, and
          animated adventures.
        </p>
      </section>

      {/* Fruit Baby Friends */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🌟 The Fruit Baby Friends
          </h2>
          <p className="text-sm text-tiki-brown/60">
            {fruitBabies.length} characters — sweet, playful, and full of heart
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fruitBabies.map((character) => (
            <CharacterCard key={character.id} character={character} />
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-6xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t-2 border-dashed border-tiki-brown/15" />
      </div>

      {/* Rivals & Troublemakers */}
      {rivals.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-14">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-tiki-brown mb-1">
              ⚡ Rivals &amp; Troublemakers
            </h2>
            <p className="text-sm text-tiki-brown/60">
              Not all characters play nice — but they keep every story
              exciting!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            {rivals.map((character) => (
              <CharacterCard key={character.id} character={character} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
