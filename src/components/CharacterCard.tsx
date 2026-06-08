import type React from "react";
import Link from "next/link";
import type { Character } from "@/lib/content";
import CharacterImage from "./CharacterImage";
import { getCharacterPowerData } from "@/lib/characterPowerData";

const GLOW_COLORS: Record<string, string> = {
  "pineapple-baby":    "rgba(255, 216, 77,  0.52)",
  "ube-baby":          "rgba(142, 92,  247, 0.42)",
  "mango-baby":        "rgba(255, 155, 50,  0.46)",
  "kiwi-baby":         "rgba(80,  190, 80,  0.44)",
  "coconut-baby":      "rgba(110, 210, 190, 0.46)",
  "strawberry-baby":   "rgba(255, 90,  120, 0.44)",
  "dragon-fruit-baby": "rgba(255, 40,  170, 0.40)",
  "tiki":              "rgba(220, 110, 40,  0.44)",
  "tiki-trouble":      "rgba(220, 110, 40,  0.44)",
};
const DEFAULT_GLOW = "rgba(255, 216, 77, 0.36)";

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

export default function CharacterCard({ character }: { character: Character }) {
  const emoji = emojiMap[character.slug] ?? "✨";
  const glowColor = GLOW_COLORS[character.slug] ?? DEFAULT_GLOW;
  const isVillain = character.type === "villain";
  const isNew = character.approvalMode === "draft" && !isVillain;
  const palette = character.visualIdentity.palette ?? [];
  const headerColor = palette[0]?.hex ?? character.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const colorChips = palette.filter((c) => c.hex).slice(0, 6);

  const cleanTraits = (character.personality ?? [])
    .filter((t) => !t.includes("\t"))
    .slice(0, 3);

  const powerData = getCharacterPowerData(character.slug);

  return (
    <Link
      href={`/characters/${character.slug}`}
      style={{ "--character-glow": glowColor } as React.CSSProperties}
      className="block group focus:outline-none focus-visible:ring-2 focus-visible:ring-pineapple-yellow rounded-3xl"
    >
      <div
        className={`character-card rounded-3xl overflow-hidden flex flex-col shadow-md transition-all group-hover:scale-[1.02] ${
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
            src={character.image.main}
            alt={character.image.alt}
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

          {powerData && (
            <div
              className="rounded-xl px-3 py-2.5 border"
              style={{
                background: `${headerColor}20`,
                borderColor: `${headerColor}66`,
              }}
            >
              <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-widest mb-0.5">
                ⚡ Power
              </p>
              <p className="font-black text-tiki-brown text-sm leading-tight">
                {powerData.powerName}
              </p>
              <p className="text-xs text-tiki-brown/65 leading-snug mt-0.5">
                {powerData.powerDescription}
              </p>
            </div>
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
