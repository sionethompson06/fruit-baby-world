import Link from "next/link";
import type { NormalizedCharacterProfile } from "@/lib/characterProfileNormalizer";
import CharacterImage from "./CharacterImage";

const emojiMap: Record<string, string> = {
  "pineapple-baby": "🍍",
  "ube-baby": "🫐",
  "mango-baby": "🥭",
  "kiwi-baby": "🥝",
  "coconut-baby": "🥥",
  tiki: "🗿",
};

function getTraitName(trait: string): string {
  return trait.split(" — ")[0].trim();
}

export default function CharacterCard({ character }: { character: NormalizedCharacterProfile }) {
  const emoji = emojiMap[character.slug] ?? "✨";
  const isVillain = character.type === "villain";
  const isNew = !character.isOriginalCanonical && !isVillain;
  const headerColor = character.colorPalette[0]?.hex ?? "#FFD84D";
  const colorChips = character.colorPalette.filter((c) => c.hex).slice(0, 6);

  // Filter garbled traits — garbled data from table imports contains tab characters
  const cleanTraits = character.personalityTraits
    .filter((t) => !t.includes("\t"))
    .slice(0, 3);

  return (
    <Link
      href={`/characters/${character.slug}`}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-pineapple-yellow rounded-3xl"
    >
      <div
        className={`rounded-3xl overflow-hidden flex flex-col shadow-md transition-all group-hover:shadow-lg group-hover:scale-[1.02] ${
          isVillain
            ? "border-2 border-tiki-brown/50 bg-coconut-cream"
            : "border-2 border-white bg-white"
        }`}
      >
        {/* Card header */}
        <div className="relative" style={{ backgroundColor: headerColor }}>
          <div className="absolute top-3 left-3 z-10">
            {isVillain ? (
              <span className="bg-tiki-brown text-coconut-cream text-xs font-bold px-2.5 py-1 rounded-full">
                ⚡ Rival
              </span>
            ) : isNew ? (
              <span className="bg-white/90 text-tiki-brown text-xs font-bold px-2.5 py-1 rounded-full">
                ✨ New Friend
              </span>
            ) : (
              <span className="bg-white/60 text-tiki-brown text-xs font-bold px-2.5 py-1 rounded-full">
                🌟 Fruit Baby
              </span>
            )}
          </div>

          <CharacterImage
            src={character.characterCardImageUrl}
            alt={character.imageAlt}
            emoji={emoji}
            bgColor={headerColor}
            className="w-full aspect-square"
          />
        </div>

        {/* Card body */}
        <div className="p-5 flex flex-col gap-3 flex-1">
          <div>
            <h3 className="text-xl font-black text-tiki-brown leading-tight">
              {character.name}
            </h3>
            <p className="text-sm font-semibold text-tiki-brown/55 mt-0.5">
              {character.role}
            </p>
          </div>

          {character.tagline && (
            <p
              className={`text-sm italic leading-snug ${
                isVillain ? "text-tiki-brown/80" : "text-ube-purple/80"
              }`}
            >
              &ldquo;{character.tagline}&rdquo;
            </p>
          )}

          {character.shortDescription && (
            <p className="text-sm text-tiki-brown/70 leading-relaxed line-clamp-3">
              {character.shortDescription}
            </p>
          )}

          {cleanTraits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {cleanTraits.map((trait, i) => (
                <span
                  key={i}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isVillain
                      ? "bg-tiki-brown/10 text-tiki-brown border border-tiki-brown/20"
                      : "bg-bg-cream text-tiki-brown border border-pineapple-yellow/40"
                  }`}
                >
                  {getTraitName(trait)}
                </span>
              ))}
            </div>
          )}

          {colorChips.length > 0 && (
            <div className="flex items-center gap-1.5 pt-2 mt-auto">
              {colorChips.map((color, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                  title={color.name}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
