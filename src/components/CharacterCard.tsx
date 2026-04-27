import { Character } from "@/lib/content";

const emojiMap: Record<string, string> = {
  "pineapple-baby": "🍍",
  "ube-baby": "🫐",
  "mango-baby": "🥭",
  "kiwi-baby": "🥝",
  "coconut-baby": "🥥",
  tiki: "🗿",
};

function getTraitName(trait: string): string {
  // Traits are formatted as "Name — description" or "Name & Name — description"
  return trait.split(" — ")[0].trim();
}

export default function CharacterCard({ character }: { character: Character }) {
  const emoji = emojiMap[character.id] ?? "✨";
  const isVillain = character.type === "villain";
  const headerColor = character.visualIdentity.primaryColors[0];
  const allColors = [
    ...character.visualIdentity.primaryColors,
    ...character.visualIdentity.accentColors,
  ].slice(0, 6);

  return (
    <div
      className={`rounded-3xl overflow-hidden flex flex-col shadow-md transition-shadow hover:shadow-lg ${
        isVillain
          ? "border-2 border-tiki-brown/50 bg-coconut-cream"
          : "border-2 border-white bg-white"
      }`}
    >
      {/* Card header — character color + emoji */}
      <div
        className="relative flex flex-col items-center justify-center pt-8 pb-6"
        style={{ backgroundColor: headerColor }}
      >
        {/* Type badge */}
        <div className="absolute top-3 left-3">
          {isVillain ? (
            <span className="bg-tiki-brown text-coconut-cream text-xs font-bold px-2.5 py-1 rounded-full">
              ⚡ Rival
            </span>
          ) : (
            <span className="bg-white/60 text-tiki-brown text-xs font-bold px-2.5 py-1 rounded-full">
              🌟 Fruit Baby
            </span>
          )}
        </div>

        {/* Emoji avatar */}
        <div
          className={`w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-md ${
            isVillain ? "bg-tiki-brown/20" : "bg-white/30"
          }`}
        >
          {emoji}
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Name + role */}
        <div>
          <h3 className="text-xl font-black text-tiki-brown leading-tight">
            {character.name}
          </h3>
          <p className="text-sm font-semibold text-tiki-brown/55 mt-0.5">
            {character.role}
          </p>
        </div>

        {/* Tagline */}
        <p
          className={`text-sm italic leading-snug ${
            isVillain ? "text-tiki-brown/80" : "text-ube-purple/80"
          }`}
        >
          &ldquo;{character.tagline}&rdquo;
        </p>

        {/* Short description */}
        <p className="text-sm text-tiki-brown/70 leading-relaxed line-clamp-3">
          {character.shortDescription}
        </p>

        {/* Personality trait pills */}
        <div className="flex flex-wrap gap-1.5 mt-1">
          {character.personality.slice(0, 3).map((trait, i) => (
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

        {/* Color palette dots */}
        <div className="flex items-center gap-1.5 pt-2 mt-auto">
          {allColors.map((color, i) => (
            <div
              key={i}
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
