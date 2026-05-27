import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { buildPublicProductCards } from "@/lib/publicProductConcepts";
import { getProductConceptCategoryLabel } from "@/lib/productConcepts";

export const metadata: Metadata = {
  title: "Pineapple Baby Collectibles & Story Goods | Pineapple Baby",
  description:
    "Plush friends, storybooks, classroom materials, and collectibles are being planned for the Pineapple Baby universe. Coming soon — no checkout yet.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Category overview cards ──────────────────────────────────────────────────

const CATEGORY_OVERVIEW = [
  {
    emoji: "🧸",
    title: "Plush & Squish Toys",
    desc: "Soft plush companions and squishy friends featuring official Fruit Baby characters.",
  },
  {
    emoji: "📚",
    title: "Books & Story Bundles",
    desc: "Board books, picture books, and story collections tied to Fruit Baby episodes.",
  },
  {
    emoji: "✨",
    title: "Stickers & Cards",
    desc: "Character sticker sheets and collectible trading cards for fans of all ages.",
  },
  {
    emoji: "🏫",
    title: "Classroom Materials",
    desc: "Educational posters, activity sheets, and lesson-linked character materials.",
  },
  {
    emoji: "🏆",
    title: "Collectibles & Playsets",
    desc: "Premium mini figures, playsets, and collectible character sets for fans and collectors.",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const cards = buildPublicProductCards();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── A. Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-ube-purple/15 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4" role="img" aria-label="collectibles">🛍️</div>
          <h1 className="brand-title-universe text-4xl sm:text-5xl text-tiki-brown mb-4 leading-tight">
            Pineapple Baby Collectibles &amp; Story Goods
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed mb-6">
            Plush friends, storybooks, classroom materials, and collectibles are
            being planned for the Pineapple Baby universe.
          </p>
          <div className="inline-flex items-center gap-2 bg-pineapple-yellow/30 border border-pineapple-yellow/50 rounded-full px-5 py-2.5">
            <span className="text-base">🎨</span>
            <p className="text-sm font-bold text-tiki-brown">
              Coming soon — product previews only. Checkout is not available yet.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col gap-16 pb-20">

        {/* ── B. Featured Product Concepts ─────────────────────────────────── */}
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-black text-tiki-brown mb-1">
              Product Previews
            </h2>
            {cards.length > 0 ? (
              <p className="text-sm text-tiki-brown/55">
                {cards.length} preview{cards.length !== 1 ? "s" : ""} — more on the way
              </p>
            ) : (
              <p className="text-sm text-tiki-brown/55">
                Product concepts are in development — check back soon.
              </p>
            )}
          </div>

          {cards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Image area */}
                  <div className="relative aspect-square bg-tiki-brown/5 flex items-center justify-center">
                    {card.mockupImageUrl ? (
                      <Image
                        src={card.mockupImageUrl}
                        alt={card.mockupImageAlt ?? card.title}
                        fill
                        className="object-contain"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : card.characterFallbackImageUrl ? (
                      <Image
                        src={card.characterFallbackImageUrl}
                        alt={card.characterName ?? card.title}
                        fill
                        className="object-contain p-4"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 py-8">
                        <span className="text-5xl opacity-30">🛍️</span>
                        <p className="text-xs text-tiki-brown/30 font-semibold">Preview Coming Soon</p>
                      </div>
                    )}
                    {/* Coming Soon badge */}
                    <div className="absolute top-3 left-3">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pineapple-yellow/80 text-tiki-brown uppercase tracking-wide shadow-sm">
                        Coming Soon
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-4 flex flex-col gap-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-black text-tiki-brown leading-tight">{card.title}</p>
                    </div>
                    <p className="text-xs text-tiki-brown/50">
                      {getProductConceptCategoryLabel(card.category)}
                      {card.characterName && (
                        <>
                          {" · "}
                          {card.characterIsPublic && card.characterSlug ? (
                            <Link
                              href={`/characters/${card.characterSlug}`}
                              className="text-ube-purple/80 hover:text-ube-purple transition-colors font-semibold"
                            >
                              {card.characterName}
                            </Link>
                          ) : (
                            <span>{card.characterName}</span>
                          )}
                        </>
                      )}
                    </p>
                    {card.description && (
                      <p className="text-xs text-tiki-brown/60 leading-relaxed flex-1">
                        {card.description.length > 120
                          ? card.description.slice(0, 120) + "…"
                          : card.description}
                      </p>
                    )}
                    <p className="text-xs text-tiki-brown/35 font-semibold mt-auto pt-1">
                      Preview only — no checkout
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-dashed border-tiki-brown/15 px-8 py-14 text-center flex flex-col items-center gap-4">
              <span className="text-4xl opacity-40">🛍️</span>
              <p className="text-sm font-semibold text-tiki-brown/45 leading-relaxed max-w-xs">
                Product previews are being prepared. Check back soon for plush
                toys, books, collectibles, and more.
              </p>
            </div>
          )}
        </section>

        {/* ── C. Product Categories ──────────────────────────────────────────── */}
        <section className="flex flex-col gap-5">
          <h2 className="text-xl font-black text-tiki-brown">
            What&apos;s Being Planned
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {CATEGORY_OVERVIEW.map(({ emoji, title, desc }) => (
              <div
                key={title}
                className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-4 py-4 flex flex-col gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{emoji}</span>
                  <p className="text-sm font-black text-tiki-brown">{title}</p>
                </div>
                <p className="text-xs text-tiki-brown/55 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── D. Brand Integrity Note ────────────────────────────────────────── */}
        <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-6 sm:px-8 py-8 flex flex-col gap-3 text-center max-w-2xl mx-auto w-full">
          <span className="text-3xl">🔒</span>
          <h2 className="text-base font-black text-tiki-brown">
            Official Character Integrity
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            Every product concept is designed to preserve the official Fruit
            Baby character look, colors, personality, and storybook charm. All
            products are planned to reflect the exact visual identity of each
            character.
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <Link
              href="/characters"
              className="text-sm font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              Meet the Characters →
            </Link>
          </div>
        </section>

      </div>
    </div>
  );
}
