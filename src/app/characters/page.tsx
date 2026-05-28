import { getPublicNormalizedCharacterProfiles } from "@/lib/characterRegistry";
import CharacterCard from "@/components/CharacterCard";

export const dynamic = "force-dynamic";

export default function CharactersPage() {
  const allCharacters = getPublicNormalizedCharacterProfiles();
  const fruitBabies = allCharacters.filter((c) => c.type === "fruit-baby");
  const rivals = allCharacters.filter((c) => c.type === "villain");

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="characters-coconut-grove-hero py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
            <span className="title-charm title-charm-star" aria-hidden="true">★</span>
            <h1 className="brand-bubblegum-title brand-bubblegum-title--hero text-4xl sm:text-5xl">
              <span className="brand-word-cream">Meet the </span>
              <span className="brand-word-pineapple">Pineapple </span>
              <span className="brand-word-baby">Baby </span>
              <span className="brand-word-peach">Characters</span>
            </h1>
            <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
          </div>
          <p className="text-tiki-brown/70 text-lg leading-relaxed">
            Discover the sweet friends, playful personalities, and mischievous
            rivals who bring Pineapple Baby&apos;s universe to life.
          </p>
        </div>
      </section>

      {/* Pineapple Baby Friends */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-14">
        <div className="mb-8">
          <h2 className="brand-title-section-logo text-2xl font-black mb-1">
            🌟 The Pineapple Baby Friends
          </h2>
          <p className="text-sm text-tiki-brown/60">
            {fruitBabies.length} characters — sweet, playful, and full of heart
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {fruitBabies.map((character) => (
            <CharacterCard key={character.slug} character={character} />
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
              Not all characters play nice — but they keep every story exciting!
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
            {rivals.map((character) => (
              <CharacterCard key={character.slug} character={character} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
