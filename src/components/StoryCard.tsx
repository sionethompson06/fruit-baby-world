import { Episode, Character } from "@/lib/content";

type Props = {
  episode: Episode;
  characterMap: Record<string, Character>;
};

const statusStyles: Record<string, { label: string; className: string }> = {
  published: {
    label: "Published",
    className: "bg-tropical-green/20 text-tiki-brown",
  },
  draft: {
    label: "Draft",
    className: "bg-pineapple-yellow/40 text-tiki-brown",
  },
  archived: {
    label: "Archived",
    className: "bg-tiki-brown/10 text-tiki-brown/50",
  },
};

export default function StoryCard({ episode, characterMap }: Props) {
  const status = statusStyles[episode.status] ?? statusStyles.draft;
  const featuredChars = episode.featuredCharacters
    .map((id) => characterMap[id])
    .filter((c): c is Character => Boolean(c));

  const gradientFrom =
    featuredChars[0]?.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const gradientTo =
    featuredChars[1]?.visualIdentity.primaryColors[0] ?? "#FFB347";

  return (
    <div className="rounded-3xl overflow-hidden flex flex-col bg-white border-2 border-white shadow-md hover:shadow-lg hover:scale-[1.01] transition-all">
      {/* Thumbnail area */}
      <div
        className="relative flex items-center justify-center h-44 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}55 0%, ${gradientTo}33 100%)`,
        }}
      >
        <span className="text-6xl select-none" role="img" aria-label="story">
          🎬
        </span>

        {episode.episodeNumber != null && (
          <span className="absolute top-3 left-3 bg-white/70 backdrop-blur-sm text-tiki-brown text-xs font-black px-2.5 py-1 rounded-full">
            Ep. {String(episode.episodeNumber).padStart(2, "0")}
          </span>
        )}

        <span
          className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Title */}
        <h3 className="text-lg font-black text-tiki-brown leading-tight">
          {episode.title}
        </h3>

        {/* Setting */}
        {episode.setting && (
          <p className="text-xs font-semibold text-tiki-brown/45 flex items-center gap-1.5">
            <span>📍</span>
            <span>{episode.setting}</span>
          </p>
        )}

        {/* Short description */}
        {episode.shortDescription && (
          <p className="text-sm text-tiki-brown/70 leading-relaxed line-clamp-2">
            {episode.shortDescription}
          </p>
        )}

        {/* Lesson */}
        {episode.lesson && (
          <div className="bg-pineapple-yellow/20 rounded-2xl px-3 py-2.5">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-0.5">
              Lesson
            </p>
            <p className="text-sm text-tiki-brown/80 leading-snug line-clamp-2">
              {episode.lesson}
            </p>
          </div>
        )}

        {/* Featured character badges */}
        {featuredChars.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            {featuredChars.map((char) => (
              <span
                key={char.id}
                className="text-xs font-semibold px-2.5 py-1 rounded-full text-tiki-brown border border-tiki-brown/15"
                style={{
                  backgroundColor: `${char.visualIdentity.primaryColors[0]}22`,
                }}
              >
                {char.shortName}
              </span>
            ))}
          </div>
        )}

        {/* Footer stats */}
        <div className="flex gap-4 pt-2 border-t border-tiki-brown/10 mt-auto">
          <span className="text-xs text-tiki-brown/45 font-semibold">
            🎬 {episode.scenes.length}{" "}
            {episode.scenes.length === 1 ? "scene" : "scenes"}
          </span>
          {episode.merchTieIns.length > 0 && (
            <span className="text-xs text-tiki-brown/45 font-semibold">
              🎁 {episode.merchTieIns.length} merch tie-in
              {episode.merchTieIns.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
