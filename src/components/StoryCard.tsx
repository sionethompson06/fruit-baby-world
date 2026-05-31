import Link from "next/link";
import { Episode, Character } from "@/lib/content";

type Props = {
  episode: Episode;
  characterMap: Record<string, Character>;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
  mediaFlags?: {
    hasAudio?: boolean;
    hasVideoClips?: boolean;
    hasFinalVideo?: boolean;
    hasStorybookPages?: boolean;
    hasStorybookAudio?: boolean;
    hasStorybookVideo?: boolean;
  };
};

export default function StoryCard({ episode, characterMap, thumbnailUrl, thumbnailAlt }: Props) {
  // Resolve characters through map; fall back to raw names from JSON (saved episodes store names, not slugs)
  const featuredChars = episode.featuredCharacters
    .map((id) => characterMap[id])
    .filter((c): c is Character => Boolean(c));

  const charNames =
    featuredChars.length > 0
      ? featuredChars.map((c) => c.shortName ?? c.name)
      : episode.featuredCharacters.slice(0, 5);

  const charDisplay =
    charNames.length > 0 ? charNames.join(" • ") : "Featuring Pineapple Baby";

  const gradientFrom = featuredChars[0]?.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const gradientTo = featuredChars[1]?.visualIdentity.primaryColors[0] ?? "#FFB347";

  return (
    <Link
      href={`/stories/${episode.slug}`}
      className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-md hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer"
    >
      {/* Cover image — book-cover aspect, fills main card area */}
      <div
        className="relative w-full aspect-[3/4] overflow-hidden flex-shrink-0"
        style={
          thumbnailUrl
            ? undefined
            : { background: `linear-gradient(135deg, ${gradientFrom}55 0%, ${gradientTo}33 100%)` }
        }
      >
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt={thumbnailAlt ?? episode.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-7xl select-none" role="img" aria-label="story">
              📖
            </span>
          </div>
        )}
      </div>

      {/* Footer: title + characters only */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-1">
        <h3 className="text-sm font-black text-tiki-brown leading-tight line-clamp-2">
          {episode.title}
        </h3>
        <p className="text-xs text-tiki-brown/55 font-semibold truncate">
          {charDisplay}
        </p>
      </div>
    </Link>
  );
}
