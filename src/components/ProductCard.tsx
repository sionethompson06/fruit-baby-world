import { Product, Character } from "@/lib/content";

type Props = {
  product: Product;
  characterMap: Record<string, Character>;
};

const categoryEmoji: Record<string, string> = {
  plush: "🧸",
  squish: "🪀",
  collectible: "🏆",
  stickers: "✨",
};

const statusStyles: Record<string, { label: string; className: string }> = {
  concept: {
    label: "Coming Soon",
    className: "bg-pineapple-yellow/40 text-tiki-brown",
  },
  available: {
    label: "Available",
    className: "bg-tropical-green/20 text-tiki-brown",
  },
  soldout: {
    label: "Sold Out",
    className: "bg-warm-coral/20 text-tiki-brown",
  },
  archived: {
    label: "Archived",
    className: "bg-tiki-brown/10 text-tiki-brown/50",
  },
};

export default function ProductCard({ product, characterMap }: Props) {
  const status = statusStyles[product.status] ?? statusStyles.concept;
  const emoji = categoryEmoji[product.category] ?? "🎁";

  const relatedChars = product.relatedCharacters
    .map((id) => characterMap[id])
    .filter((c): c is Character => Boolean(c));

  const gradientFrom =
    relatedChars[0]?.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const gradientTo =
    relatedChars[1]?.visualIdentity.primaryColors[0] ??
    relatedChars[0]?.visualIdentity.primaryColors[1] ??
    "#FFB347";

  return (
    <div className="rounded-3xl overflow-hidden flex flex-col bg-white border border-tiki-brown/10 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all">
      {/* Thumbnail */}
      <div
        className="relative flex items-center justify-center h-44 flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}55 0%, ${gradientTo}33 100%)`,
        }}
      >
        <span className="text-6xl select-none" role="img" aria-label={product.category}>
          {emoji}
        </span>

        <span
          className={`absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div>
          <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">
            {product.category}
          </p>
          <h3 className="text-lg font-black text-tiki-brown leading-tight">
            {product.name}
          </h3>
        </div>

        <p className="text-sm text-tiki-brown/70 leading-relaxed line-clamp-3 flex-1">
          {product.shortDescription}
        </p>

        {/* Character badges */}
        {relatedChars.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto pt-1">
            {relatedChars.map((char) => (
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

        {/* Price row */}
        <div className="pt-2 border-t border-tiki-brown/10">
          {product.price != null ? (
            <span className="text-base font-black text-tiki-brown">
              ${product.price.toFixed(2)}
            </span>
          ) : (
            <span className="text-xs font-semibold text-tiki-brown/45">
              Price TBD
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
