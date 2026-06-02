import type { Metadata } from "next";
import { getPublicShopCollectableSections } from "@/lib/shopCollectables";
import ShopCollectablesClient from "@/components/shop/ShopCollectablesClient";
import { getCoverPageSettings, isCoverPageEnabled } from "@/lib/coverPage";
import CoverPage from "@/components/cover/CoverPage";

export const metadata: Metadata = {
  title: "Pineapple Baby Collectibles & Story Goods | Pineapple Baby",
  description:
    "Plush friends, storybooks, classroom materials, and collectibles are being planned for the Pineapple Baby universe. Coming soon — no checkout yet.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function ShopPage() {
  const coverSettings = getCoverPageSettings();
  if (isCoverPageEnabled(coverSettings)) return <CoverPage settings={coverSettings} />;

  const sections = getPublicShopCollectableSections();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-ube-purple/15 via-bg-cream to-bg-cream py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-4" role="img" aria-label="collectibles">🛍️</div>
          <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
            <span className="title-charm title-charm-star" aria-hidden="true">★</span>
            <h1 className="brand-bubblegum-title brand-bubblegum-title--hero text-4xl sm:text-5xl leading-tight">
              <span className="brand-word-pineapple">Pineapple</span>{" "}
              <span className="brand-word-baby">Baby</span>{" "}
              <span className="brand-word-blue">Collectibles</span>{" "}
              <span className="brand-word-soft">&amp;</span>{" "}
              <span className="brand-word-pink">Story</span>{" "}
              <span className="brand-word-peach">Goods</span>
            </h1>
            <span className="title-charm title-charm-diamond" aria-hidden="true">◆</span>
          </div>
          <p className="text-sm font-semibold text-tiki-brown/70 max-w-lg mx-auto leading-relaxed mb-5">
            Fruit Babies are only harvested during their special season — once they&apos;re gone, they may not return for a while! Don&apos;t miss your chance to collect your favorite Fruit Baby before this limited harvest sells out.
          </p>
          <div className="inline-flex items-center gap-2 bg-pineapple-yellow/30 border border-pineapple-yellow/50 rounded-full px-5 py-2.5">
            <span className="text-base">🎨</span>
            <p className="text-sm font-bold text-tiki-brown">
              Coming soon — no checkout yet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Collectable sections (interactive) ───────────────────────────────── */}
      <ShopCollectablesClient sections={sections} />

    </div>
  );
}
