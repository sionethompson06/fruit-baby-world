import type { Metadata } from "next";
import { getPublicShopCollectableSections } from "@/lib/shopCollectables";
import type { ShopCollectableItem } from "@/lib/shopCollectablesTypes";

export const metadata: Metadata = {
  title: "Pineapple Baby Collectibles & Story Goods | Pineapple Baby",
  description:
    "Plush friends, storybooks, classroom materials, and collectibles are being planned for the Pineapple Baby universe. Coming soon — no checkout yet.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Collectable product card ─────────────────────────────────────────────────

function CollectableCard({ item }: { item: ShopCollectableItem }) {
  const productLabel = item.productType === "plushy" ? "Plushy Collectable" : "Squishy Collectable";
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden flex flex-col">
      {/* Image area */}
      <div className="relative aspect-square bg-gradient-to-br from-pineapple-yellow/10 via-bg-cream to-ube-purple/8 flex items-center justify-center overflow-hidden">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={`${item.characterName} ${productLabel}`}
            className="absolute inset-0 w-full h-full object-contain p-3"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 py-8">
            <span className="text-4xl opacity-20">🛍️</span>
            <p className="text-xs text-tiki-brown/30 font-semibold text-center px-2">Image coming soon</p>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-pineapple-yellow/85 text-tiki-brown shadow-sm">
            Coming Soon
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <p className="text-sm font-black text-tiki-brown leading-tight">{item.characterName}</p>
        <p className="text-xs font-semibold text-tiki-brown/50">{productLabel}</p>
        <p className="text-xs font-bold text-ube-purple/70 mt-auto pt-2">{item.statusLabel}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShopPage() {
  const collectableSections = getPublicShopCollectableSections();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-ube-purple/15 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4" role="img" aria-label="collectibles">🛍️</div>
          <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
            <span className="title-charm title-charm-star" aria-hidden="true">★</span>
            <h1 className="brand-title-universe-logo text-4xl sm:text-5xl text-tiki-brown leading-tight">
              Pineapple Baby Collectibles &amp; Story Goods
            </h1>
            <span className="title-charm title-charm-diamond" aria-hidden="true">◆</span>
          </div>
          <div className="inline-flex items-center gap-2 bg-pineapple-yellow/30 border border-pineapple-yellow/50 rounded-full px-5 py-2.5">
            <span className="text-base">🎨</span>
            <p className="text-sm font-bold text-tiki-brown">
              Coming soon — no checkout yet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Collectable sections ──────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 flex flex-col gap-10 py-12 pb-20">
        {collectableSections.map((section) => (
          <section
            key={section.id}
            className={
              section.productType === "plushy"
                ? "rounded-3xl shadow-sm border border-pineapple-yellow/25 p-8 sm:p-10 bg-gradient-to-br from-pineapple-yellow/15 via-warm-coral/8 to-bg-cream flex flex-col gap-6"
                : "rounded-3xl shadow-sm border border-sky-blue/25 p-8 sm:p-10 bg-gradient-to-br from-sky-blue/15 via-ube-purple/8 to-bg-cream flex flex-col gap-6"
            }
          >
            <div>
              <h2 className="brand-title-section-logo text-2xl font-black mb-1">
                {section.productType === "plushy" ? "🧸" : "🫶"} {section.title}
              </h2>
              <p className="text-sm text-tiki-brown/55">{section.description}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {section.items.map((item) => (
                <CollectableCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}
