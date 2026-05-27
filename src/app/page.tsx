import type { Metadata } from "next";
import Link from "next/link";
import {
  getPineappleBabyHeroAsset,
  getSupportingFruitFriendAssets,
  getTikiTroubleAsset,
  getHomepageEnvironmentAssets,
  getFeaturedPublicStorybooks,
} from "@/lib/publicHomepageAssets";
import {
  getHomepageShowcaseConfig,
  resolveShowcaseImage,
  getEnabledSupportingCast,
} from "@/lib/homepageShowcase";
import PineappleBabyHeroModelLoader from "@/components/PineappleBabyHeroModelLoader";

export const metadata: Metadata = {
  title: "Pineapple Baby and the Fruit Baby Universe",
  description:
    "Meet Pineapple Baby and friends! Read colorful storybooks, listen along with narration, and watch playful Pineapple Baby adventures — sweet stories with big heart.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-character accent palette used in art tiles and friend cards
const FRIEND_PALETTE: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  "ube-baby":         { bg: "bg-ube-purple/10",      border: "border-ube-purple/25",      text: "text-ube-purple",       badge: "bg-ube-purple/15 text-ube-purple" },
  "mango-baby":       { bg: "bg-warm-coral/10",       border: "border-warm-coral/25",      text: "text-warm-coral/90",    badge: "bg-warm-coral/15 text-warm-coral/90" },
  "kiwi-baby":        { bg: "bg-tropical-green/10",   border: "border-tropical-green/25",  text: "text-tropical-green",   badge: "bg-tropical-green/12 text-tropical-green" },
  "coconut-baby":     { bg: "bg-tiki-brown/6",        border: "border-tiki-brown/18",      text: "text-tiki-brown/65",    badge: "bg-tiki-brown/10 text-tiki-brown/70" },
  "strawberry-baby":  { bg: "bg-blush-pink/18",       border: "border-blush-pink/35",      text: "text-warm-coral/80",    badge: "bg-blush-pink/22 text-warm-coral/80" },
  "dragonfruit-baby": { bg: "bg-deep-purple/8",       border: "border-deep-purple/20",     text: "text-deep-purple/75",   badge: "bg-deep-purple/10 text-deep-purple/75" },
};
const DEFAULT_FRIEND_PALETTE = {
  bg: "bg-tiki-brown/5", border: "border-tiki-brown/15", text: "text-tiki-brown/65", badge: "bg-tiki-brown/10 text-tiki-brown/65",
};

export default function HomePage() {
  const showcase = getHomepageShowcaseConfig();
  const pb = getPineappleBabyHeroAsset();
  const friends = getSupportingFruitFriendAssets();
  const tiki = getTikiTroubleAsset();
  const environments = getHomepageEnvironmentAssets();
  const storybooks = getFeaturedPublicStorybooks();

  // Resolve PB hero image: showcase 3D → showcase 2D → character action art
  const pbHeroImage = resolveShowcaseImage(
    showcase.hero.pineappleBaby3dImageUrl,
    showcase.hero.pineappleBaby2dImageUrl,
    pb?.imageUrl ?? ""
  );

  // Resolve Tiki image: showcase 3D → showcase 2D → character action art
  const tikiImage = resolveShowcaseImage(
    showcase.tikiTrouble.image3dUrl,
    showcase.tikiTrouble.image2dUrl,
    tiki?.imageUrl ?? ""
  );

  // Map showcase cast items → resolved images (3D > 2D > character action art)
  const castImageMap: Record<string, string> = {};
  for (const item of getEnabledSupportingCast(showcase)) {
    const charAsset = friends.find((f) => f.slug === item.characterSlug);
    const slug = item.characterSlug ?? item.id;
    castImageMap[slug] = resolveShowcaseImage(
      item.image3dUrl,
      item.image2dUrl,
      charAsset?.imageUrl ?? ""
    );
  }
  // Also resolve PB in cast map
  castImageMap["pineapple-baby"] = pbHeroImage;

  // Friends for floating corner cards in hero
  const heroFloatFriends = friends.slice(0, 4);

  return (
    <div className="flex flex-col bg-bg-cream overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          A. HERO — Pineapple Baby hero art stage
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/50 via-pineapple-yellow/18 to-bg-cream pt-10 pb-20 sm:pb-24 px-4">

        {/* Layered ambient glow blobs */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute top-0 left-1/3 w-[700px] h-[500px] rounded-full bg-pineapple-yellow/30 blur-[80px] -translate-x-1/2 -translate-y-1/3" />
          <div className="absolute top-0 right-0 w-[500px] h-[400px] rounded-full bg-tropical-green/10 blur-[80px] translate-x-1/4 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[350px] rounded-full bg-ube-purple/8 blur-[80px] -translate-x-1/4 translate-y-1/4" />
        </div>

        {/* Floating decorative fruit accents */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <span className="absolute top-6 left-5 text-5xl opacity-[0.10] rotate-[-14deg]">🍍</span>
          <span className="absolute top-14 right-8 text-4xl opacity-[0.09] rotate-[12deg]">🥭</span>
          <span className="absolute bottom-16 left-12 text-4xl opacity-[0.08] rotate-[9deg]">🥝</span>
          <span className="absolute bottom-20 right-12 text-5xl opacity-[0.07] rotate-[-8deg]">🫐</span>
          <span className="absolute top-1/3 left-2 text-3xl opacity-[0.06]">⭐</span>
          <span className="absolute top-1/2 right-2 text-3xl opacity-[0.06] rotate-[18deg]">🌺</span>
          <span className="absolute top-3/4 left-1/5 text-2xl opacity-[0.06]">✨</span>
        </div>

        <div className="relative max-w-6xl mx-auto flex flex-col-reverse sm:flex-row items-center gap-8 sm:gap-12 lg:gap-16">

          {/* ── Left: Copy + CTAs ── */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-5 flex-1 min-w-0">

            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-tiki-brown text-xs font-black px-5 py-2 rounded-full border border-pineapple-yellow/60 shadow-md uppercase tracking-widest">
              🍍 Pineapple Baby universe
            </div>

            <div className="flex flex-col items-center sm:items-start gap-1">
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="title-charm title-charm-star" aria-hidden="true">✨</span>
                <span className="title-charm title-charm-star" aria-hidden="true">★</span>
              </div>
              <h1 className="brand-title-pineapple-logo text-4xl sm:text-5xl lg:text-6xl">
                Pineapple Baby and the Fruit Baby Universe
              </h1>
              <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
                <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
                <span className="title-charm title-charm-diamond" aria-hidden="true">◆</span>
                <span className="title-charm title-charm-star" aria-hidden="true">★</span>
              </div>
            </div>

            <p className="text-lg sm:text-xl font-bold text-tiki-brown/80 leading-snug max-w-lg">
              {showcase.hero.subheadline || "Big heart. Bright adventures. Sweet stories with Pineapple Baby and friends."}
            </p>

            <p className="text-base text-tiki-brown/62 leading-relaxed max-w-md">
              {showcase.hero.supportingCopy ||
                "Read colorful storybooks, listen along with narration, and watch playful Pineapple Baby adventures."}
            </p>

            {/* Friend chip row */}
            {friends.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {friends.slice(0, 5).map((f) => (
                  <Link
                    key={f.slug}
                    href={`/characters/${f.slug}`}
                    className="inline-flex items-center gap-1.5 bg-white/85 border border-tiki-brown/12 text-tiki-brown/80 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:shadow-md hover:scale-[1.05] transition-all"
                  >
                    {f.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.imageUrl}
                        alt=""
                        className="w-5 h-5 rounded-full object-cover object-top border border-tiki-brown/10 flex-shrink-0"
                      />
                    )}
                    {f.shortName}
                  </Link>
                ))}
                {friends.length > 5 && (
                  <Link
                    href="/characters"
                    className="inline-flex items-center gap-1 bg-pineapple-yellow/25 border border-pineapple-yellow/50 text-tiki-brown text-xs font-bold px-3 py-1.5 rounded-full hover:bg-pineapple-yellow/40 transition-colors"
                  >
                    +{friends.length - 5} more →
                  </Link>
                )}
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1 w-full sm:w-auto">
              <Link
                href={showcase.hero.primaryCtaHref || "/stories"}
                className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] hover:bg-ube-purple/90 transition-all text-base"
              >
                📖 {showcase.hero.primaryCtaLabel || "Read Storybooks"}
              </Link>
              <Link
                href={pb ? "/characters/pineapple-baby" : "/characters"}
                className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] transition-all text-base"
              >
                🍍 Meet Pineapple Baby
              </Link>
              <Link
                href="/characters"
                className="inline-flex items-center justify-center gap-2 bg-white text-tiki-brown/80 font-bold px-6 py-4 rounded-2xl border border-tiki-brown/15 shadow-sm hover:shadow-md hover:scale-[1.03] transition-all text-sm"
              >
                Explore the Fruit Friends →
              </Link>
            </div>
          </div>

          {/* ── Right: PB hero art stage ── */}
          <div className="relative flex-shrink-0 flex items-end justify-center">

            {/* Ambient glow stage */}
            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-40 sm:w-72 sm:h-52 rounded-full blur-3xl"
              style={{ background: "radial-gradient(ellipse, #FFD84D60 0%, #FFD84D00 70%)" }}
              aria-hidden="true"
            />

            {/* PB art stage — tall, rounded, character-forward */}
            <div className={`relative z-10 ${showcase.hero.enableInteractiveHeroModel ? "" : "animate-float-gentle"}`}>
              <div className="w-52 sm:w-64 lg:w-72 h-64 sm:h-80 lg:h-96 rounded-[2rem] overflow-hidden bg-gradient-to-b from-pineapple-yellow/25 via-pineapple-yellow/12 to-pineapple-yellow/5 border-2 border-pineapple-yellow/40 shadow-2xl">
                {showcase.hero.enableInteractiveHeroModel &&
                showcase.hero.pineappleBabyModelUrl?.startsWith("https://") &&
                (showcase.hero.pineappleBabyModelType === "glb" ||
                  showcase.hero.pineappleBabyModelType === "gltf") ? (
                  <PineappleBabyHeroModelLoader
                    modelUrl={showcase.hero.pineappleBabyModelUrl}
                    modelType={showcase.hero.pineappleBabyModelType}
                    posterUrl={showcase.hero.pineappleBabyModelPosterUrl}
                    fallbackImageUrl={pbHeroImage || undefined}
                    autoRotate={showcase.hero.heroModelAutoRotate !== false}
                    interactionHint={showcase.hero.heroModelInteractionHint}
                  />
                ) : pbHeroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pbHeroImage}
                    alt="Pineapple Baby — star of Pineapple Baby and the Fruit Baby Universe"
                    className="w-full h-full object-contain object-bottom"
                  />
                ) : (
                  <div className="w-full h-full flex items-end justify-center pb-6">
                    <span className="text-9xl select-none" aria-hidden="true">🍍</span>
                  </div>
                )}
              </div>

              {/* Floating friend mini-cards at corners */}
              {heroFloatFriends[0] && (
                <Link
                  href={`/characters/${heroFloatFriends[0].slug}`}
                  aria-label={heroFloatFriends[0].name}
                  className="absolute -top-4 -right-5 sm:-top-5 sm:-right-7 z-20 rotate-[9deg] hover:rotate-[4deg] hover:scale-110 transition-all duration-200 block"
                >
                  <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[0].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroFloatFriends[0].imageUrl} alt={heroFloatFriends[0].name} className="w-full h-full object-contain object-bottom" />
                    )}
                  </div>
                </Link>
              )}
              {heroFloatFriends[1] && (
                <Link
                  href={`/characters/${heroFloatFriends[1].slug}`}
                  aria-label={heroFloatFriends[1].name}
                  className="absolute -bottom-2 -right-6 sm:-bottom-3 sm:-right-9 z-20 rotate-[-7deg] hover:rotate-[-3deg] hover:scale-110 transition-all duration-200 block"
                >
                  <div className="w-13 h-15 sm:w-14 sm:h-18 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[1].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroFloatFriends[1].imageUrl} alt={heroFloatFriends[1].name} className="w-full h-full object-contain object-bottom" />
                    )}
                  </div>
                </Link>
              )}
              {heroFloatFriends[2] && (
                <Link
                  href={`/characters/${heroFloatFriends[2].slug}`}
                  aria-label={heroFloatFriends[2].name}
                  className="absolute -top-4 -left-6 sm:-top-5 sm:-left-9 z-20 rotate-[-9deg] hover:rotate-[-4deg] hover:scale-110 transition-all duration-200 block"
                >
                  <div className="w-13 h-15 sm:w-14 sm:h-18 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[2].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroFloatFriends[2].imageUrl} alt={heroFloatFriends[2].name} className="w-full h-full object-contain object-bottom" />
                    )}
                  </div>
                </Link>
              )}
              {heroFloatFriends[3] && (
                <Link
                  href={`/characters/${heroFloatFriends[3].slug}`}
                  aria-label={heroFloatFriends[3].name}
                  className="absolute -bottom-2 -left-5 sm:-bottom-3 sm:-left-7 z-20 rotate-[7deg] hover:rotate-[3deg] hover:scale-110 transition-all duration-200 block"
                >
                  <div className="w-14 h-16 sm:w-16 sm:h-20 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[3].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={heroFloatFriends[3].imageUrl} alt={heroFloatFriends[3].name} className="w-full h-full object-contain object-bottom" />
                    )}
                  </div>
                </Link>
              )}
            </div>

            {/* Tiki Trouble mischief callout */}
            {tiki && (
              <Link
                href="/characters/tiki"
                className="absolute -bottom-8 sm:-bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-warm-coral text-white text-xs font-black px-4 py-2 rounded-full shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-200 whitespace-nowrap border-2 border-warm-coral/30"
              >
                {tiki.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tiki.imageUrl} alt="" className="w-5 h-5 rounded-full object-cover object-top border border-white/40 flex-shrink-0" />
                )}
                <span>⚡ Uh oh… Tiki&apos;s nearby!</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          B. SUPPORTING CAST — art-forward character showcase
      ══════════════════════════════════════════════════════════════════════ */}
      {friends.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-tropical-green/10 text-tropical-green text-xs font-black px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest border border-tropical-green/20">
              🍓 The Crew
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
              {showcase.supportingCast.title || "Meet Pineapple Baby and Friends"}
            </h2>
            <p className="text-tiki-brown/60 text-base max-w-lg mx-auto leading-relaxed">
              {showcase.supportingCast.description || "Every adventure is sweeter with friends."}
            </p>
          </div>

          {/* Art-block character grid — portrait tiles, not circular avatars */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {friends.map((f) => {
              const pal = FRIEND_PALETTE[f.slug] ?? DEFAULT_FRIEND_PALETTE;
              const artImage = castImageMap[f.slug] || f.imageUrl;
              return (
                <Link
                  key={f.slug}
                  href={`/characters/${f.slug}`}
                  className={`group border-2 ${pal.border} rounded-3xl overflow-hidden bg-white shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-200 flex flex-col`}
                >
                  {/* Art tile */}
                  <div className={`relative h-44 sm:h-52 ${pal.bg} flex items-end justify-center overflow-hidden`}>
                    {artImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={artImage}
                        alt={`${f.name} character art`}
                        className="w-full h-full object-contain object-bottom transition-transform duration-300 group-hover:scale-[1.06]"
                      />
                    ) : (
                      <span className="text-6xl select-none pb-4" aria-hidden="true">🍓</span>
                    )}
                    {/* Subtle gradient overlay at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white/40 to-transparent pointer-events-none" aria-hidden="true" />
                  </div>

                  {/* Card label */}
                  <div className="px-4 py-3 flex flex-col gap-1 flex-1">
                    <h3 className="text-sm font-black text-tiki-brown leading-tight">
                      {f.name}
                    </h3>
                    {f.personality.length > 0 && (
                      <p className={`text-xs font-semibold ${pal.text} leading-snug`}>
                        {f.personality[0]}
                      </p>
                    )}
                    <span className={`mt-auto pt-1.5 text-xs font-bold ${pal.text} group-hover:underline`}>
                      Meet {f.shortName} →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/characters"
              className="inline-flex items-center gap-2 bg-white border-2 border-tiki-brown/12 text-tiki-brown/70 font-bold text-sm px-7 py-3.5 rounded-2xl shadow-sm hover:shadow-md hover:border-tiki-brown/25 transition-all"
            >
              View All Characters →
            </Link>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          C. FEATURED STORYBOOKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-ube-purple/4 border-y border-ube-purple/10 py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 bg-ube-purple/8 text-ube-purple text-xs font-black px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest">
                📚 Available Now
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="title-charm title-charm-star" aria-hidden="true">✦</span>
                <h2 className="brand-title-universe-logo text-3xl sm:text-4xl font-black leading-tight">
                  Featured Pineapple Baby Storybooks
                </h2>
                <span className="title-charm title-charm-star" aria-hidden="true">✦</span>
              </div>
              <p className="text-tiki-brown/58 text-sm mt-2 max-w-md leading-relaxed">
                Open colorful storybooks, listen along, and watch cartoon adventures.
              </p>
            </div>
            <Link
              href="/stories"
              className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm font-bold text-ube-purple hover:text-ube-purple/75 transition-colors"
            >
              Browse All Stories →
            </Link>
          </div>

          {storybooks.length > 0 ? (
            <div className={`grid gap-6 ${storybooks.length === 1 ? "max-w-sm" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {storybooks.slice(0, 3).map((book) => (
                <Link
                  key={book.slug}
                  href={`/stories/${book.slug}`}
                  className="group rounded-3xl overflow-hidden bg-white shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-200 flex flex-col border border-tiki-brown/8"
                >
                  <div className="relative h-56 overflow-hidden bg-gradient-to-br from-pineapple-yellow/25 via-sky-blue/10 to-tropical-green/10 flex items-center justify-center flex-shrink-0">
                    {book.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-7xl select-none" aria-hidden="true">📖</span>
                    )}
                    {book.coverUrl && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden="true" />
                    )}
                    <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 text-tiki-brown shadow-sm backdrop-blur-sm">📖 Read</span>
                      {book.hasAudio && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/90 text-white shadow-sm backdrop-blur-sm">🎧 Listen</span>}
                      {book.hasVideo && <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-tropical-green/90 text-white shadow-sm backdrop-blur-sm">🎬 Watch</span>}
                    </div>
                    {book.hasPineappleBaby && (
                      <div className="absolute top-3 left-3 text-xs font-black px-2.5 py-1 rounded-full bg-pineapple-yellow/95 text-tiki-brown shadow-sm backdrop-blur-sm">
                        🍍 Pineapple Baby
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col gap-2 flex-1">
                    <h3 className="text-base sm:text-lg font-black text-tiki-brown leading-tight group-hover:text-ube-purple transition-colors">
                      {book.title}
                    </h3>
                    {book.shortDescription && (
                      <p className="text-sm text-tiki-brown/58 leading-relaxed line-clamp-2">{book.shortDescription}</p>
                    )}
                    <div className="mt-auto pt-3 border-t border-tiki-brown/8">
                      <span className="inline-flex items-center gap-1.5 text-sm font-black text-ube-purple group-hover:gap-3 transition-all duration-200">
                        Open Storybook <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-pineapple-yellow/20 to-ube-purple/8 rounded-3xl border border-pineapple-yellow/30 p-10 sm:p-14 text-center flex flex-col items-center gap-4 shadow-sm">
              <span className="text-6xl" aria-hidden="true">📖</span>
              <h3 className="text-xl font-black text-tiki-brown">New Pineapple Baby Storybooks Coming Soon</h3>
              <p className="text-sm text-tiki-brown/58 max-w-sm leading-relaxed">Colorful storybook adventures are being prepared. Check back soon!</p>
              <Link href="/stories" className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold px-6 py-3 rounded-full shadow-md hover:bg-ube-purple/85 transition-colors text-sm">
                See Stories Page →
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          D. PINEAPPLE BABY SPOTLIGHT
      ══════════════════════════════════════════════════════════════════════ */}
      {pb && (
        <section className="relative overflow-hidden bg-gradient-to-br from-pineapple-yellow/35 via-pineapple-yellow/15 to-tropical-green/8 border-b border-pineapple-yellow/25 py-16 px-4">
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
            <span className="absolute top-4 left-10 text-4xl opacity-[0.13] rotate-[-15deg]">⭐</span>
            <span className="absolute top-10 right-14 text-3xl opacity-[0.10] rotate-[10deg]">✨</span>
            <span className="absolute bottom-6 right-1/4 text-3xl opacity-[0.09]">🌟</span>
          </div>

          <div className="relative max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-10 sm:gap-14">
            {/* PB art display — tall, portrait, object-contain */}
            <div className="flex-shrink-0 relative animate-float-slow">
              <div className="absolute inset-0 -m-6 rounded-[2rem] bg-pineapple-yellow/30 blur-3xl" aria-hidden="true" />
              <div className="relative w-44 h-56 sm:w-52 sm:h-68 rounded-[2rem] overflow-hidden bg-pineapple-yellow/20 border-2 border-pineapple-yellow/50 shadow-2xl">
                {pbHeroImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pbHeroImage} alt="Pineapple Baby" className="w-full h-full object-contain object-bottom" />
                ) : (
                  <div className="w-full h-full flex items-end justify-center pb-4">
                    <span className="text-8xl select-none" aria-hidden="true">🍍</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5 text-center sm:text-left">
              <div>
                <div className="inline-flex items-center gap-2 bg-pineapple-yellow/40 text-tiki-brown text-xs font-black px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest border border-pineapple-yellow/60">
                  ⭐ The Star of the Show
                </div>
                <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                  <span className="title-charm title-charm-star" aria-hidden="true">★</span>
                  <h2 className="brand-title-universe-logo text-3xl sm:text-4xl font-black leading-tight">Meet Pineapple Baby</h2>
                  <span className="title-charm title-charm-heart" aria-hidden="true">♥</span>
                </div>
              </div>
              <p className="text-base text-tiki-brown/72 leading-relaxed max-w-lg">
                Pineapple Baby is the bright-hearted hero of the Fruit Baby Universe — curious, kind, brave, and always ready for a sweet adventure.
              </p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {["Kind", "Brave", "Curious", "Big-Hearted"].map((trait) => (
                  <span key={trait} className="text-sm font-bold px-4 py-1.5 rounded-full bg-white/75 border border-pineapple-yellow/55 text-tiki-brown shadow-sm">
                    {trait}
                  </span>
                ))}
              </div>
              {pb.tagline && (
                <blockquote className="text-lg font-black text-tiki-brown/80 italic border-l-4 border-pineapple-yellow pl-4">
                  &ldquo;{pb.tagline}&rdquo;
                </blockquote>
              )}
              <Link
                href="/characters/pineapple-baby"
                className="self-center sm:self-start inline-flex items-center gap-2 bg-pineapple-yellow text-tiki-brown font-black px-7 py-3.5 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] transition-all text-sm"
              >
                🍍 Meet Pineapple Baby →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          E. TIKI TROUBLE — villain feature block
      ══════════════════════════════════════════════════════════════════════ */}
      {showcase.tikiTrouble.enabled && tiki && (
        <section className="relative overflow-hidden bg-gradient-to-br from-warm-coral/18 via-warm-coral/8 to-bg-cream border-y border-warm-coral/20 py-16 px-4">
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
            <span className="absolute top-5 right-6 text-5xl opacity-[0.09] rotate-[18deg]">💥</span>
            <span className="absolute bottom-5 left-8 text-4xl opacity-[0.07] rotate-[-14deg]">⚡</span>
          </div>

          <div className="relative max-w-5xl mx-auto flex flex-col sm:flex-row-reverse items-center gap-10 sm:gap-14">
            {/* Tiki art display — tall portrait */}
            <div className="flex-shrink-0 animate-float-slow" style={{ animationDelay: "1s" }}>
              <div className="relative w-40 h-52 sm:w-48 sm:h-64 rounded-[2rem] overflow-hidden bg-warm-coral/20 border-2 border-warm-coral/45 shadow-2xl">
                {tikiImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tikiImage} alt="Tiki Trouble" className="w-full h-full object-contain object-bottom" />
                ) : (
                  <div className="w-full h-full flex items-end justify-center pb-4">
                    <span className="text-7xl select-none" aria-hidden="true">🌴</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 text-center sm:text-left flex-1">
              <div>
                <div className="inline-flex items-center gap-2 bg-warm-coral/18 text-warm-coral/90 text-xs font-black px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest border border-warm-coral/30">
                  ⚡ The Mischief-Maker
                </div>
                <div className="flex items-center gap-3 justify-center sm:justify-start flex-wrap">
                  <span className="title-charm" style={{color: '#FF8A7A'}} aria-hidden="true">✦</span>
                  <h2 className="brand-title-universe-logo text-3xl sm:text-4xl font-black leading-tight">
                    {showcase.tikiTrouble.headline || "Watch out for Tiki Trouble!"}
                  </h2>
                  <span className="title-charm" style={{color: '#FF8A7A'}} aria-hidden="true">✦</span>
                </div>
              </div>
              <p className="text-base text-tiki-brown/68 leading-relaxed max-w-lg">
                {showcase.tikiTrouble.description ||
                  "Tiki Trouble brings mischief, surprises, and silly problems for Pineapple Baby and friends to solve."}
              </p>
              {tiki.catchphrase && (
                <blockquote className="text-lg font-black text-warm-coral/80 italic border-l-4 border-warm-coral/40 pl-4">
                  &ldquo;{tiki.catchphrase}&rdquo;
                </blockquote>
              )}
              <Link
                href="/characters/tiki"
                className="self-center sm:self-start inline-flex items-center gap-2 bg-warm-coral/85 text-white font-black px-7 py-3.5 rounded-2xl shadow-lg hover:bg-warm-coral hover:shadow-xl hover:scale-[1.04] transition-all text-sm"
              >
                Meet Tiki Trouble →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          F. EXPLORE THE WORLD
      ══════════════════════════════════════════════════════════════════════ */}
      {environments.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-pineapple-yellow/25 text-tiki-brown text-xs font-black px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest border border-pineapple-yellow/40">
              🌍 The Universe
            </div>
            <div className="flex items-center gap-3 justify-center flex-wrap mb-3">
              <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
              <h2 className="brand-title-universe-logo text-3xl sm:text-4xl font-black leading-tight">
                Explore Pineapple Baby&apos;s World
              </h2>
              <span className="title-charm title-charm-sparkle" aria-hidden="true">✨</span>
            </div>
            <p className="text-tiki-brown/58 text-base max-w-lg mx-auto leading-relaxed">
              Every story grows from a colorful world of homes, gardens, beaches, and magical little places.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {environments.slice(0, 8).map((env) => (
              <div
                key={env.characterSlug}
                className={`${env.colorClass} border-2 ${env.borderClass} rounded-3xl p-5 flex flex-col gap-2.5 hover:shadow-lg hover:scale-[1.02] transition-all duration-200`}
              >
                <span className="text-4xl" aria-hidden="true">{env.emoji}</span>
                <div>
                  <p className="text-sm font-black text-tiki-brown leading-tight">{env.place}</p>
                  <p className="text-xs text-tiki-brown/55 leading-relaxed mt-1">{env.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          G. READ / LISTEN / WATCH
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="bg-ube-purple/6 border-y border-ube-purple/12 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-ube-purple/10 text-ube-purple text-xs font-black px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              🌈 Three Ways to Enjoy
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              Read, Listen &amp; Watch
            </h2>
            <p className="text-tiki-brown/58 text-base max-w-lg mx-auto leading-relaxed">
              Every Fruit Baby storybook is crafted for multiple experiences. Choose your family&apos;s favorite.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-pineapple-yellow/15 border-2 border-pineapple-yellow/35 rounded-3xl p-7 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <span className="text-5xl" aria-hidden="true">📖</span>
              <div>
                <p className="text-lg font-black text-tiki-brown mb-1">Read</p>
                <p className="text-xs font-bold text-tiki-brown/48 uppercase tracking-wide">Digital Storybook</p>
              </div>
              <p className="text-sm text-tiki-brown/68 leading-relaxed flex-1">
                Open colorful digital storybooks with official character artwork — a beautiful illustrated adventure at your own pace.
              </p>
            </div>
            <div className="bg-ube-purple/8 border-2 border-ube-purple/20 rounded-3xl p-7 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <span className="text-5xl" aria-hidden="true">🎧</span>
              <div>
                <p className="text-lg font-black text-tiki-brown mb-1">Listen</p>
                <p className="text-xs font-bold text-tiki-brown/48 uppercase tracking-wide">Story Narration</p>
              </div>
              <p className="text-sm text-tiki-brown/68 leading-relaxed flex-1">
                Enjoy warm read-aloud narration while following along — perfect for car rides, bedtime, or little readers just starting out.
              </p>
            </div>
            <div className="bg-tropical-green/8 border-2 border-tropical-green/22 rounded-3xl p-7 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <span className="text-5xl" aria-hidden="true">🎬</span>
              <div>
                <p className="text-lg font-black text-tiki-brown mb-1">Watch</p>
                <p className="text-xs font-bold text-tiki-brown/48 uppercase tracking-wide">Cartoon Video</p>
              </div>
              <p className="text-sm text-tiki-brown/68 leading-relaxed flex-1">
                Play Fruit Baby cartoons when available — characters come to life from the first scene to the big lesson moment.
              </p>
            </div>
          </div>
          <div className="text-center mt-10">
            <Link href="/stories" className="inline-flex items-center gap-2 bg-ube-purple text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-ube-purple/85 hover:shadow-xl hover:scale-[1.03] transition-all">
              Open the Storybook Library →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          H. FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/22 via-pineapple-yellow/8 to-bg-cream border-t border-pineapple-yellow/22 py-24 px-4 text-center">
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full bg-pineapple-yellow/18 blur-3xl -translate-y-1/2" />
        </div>
        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-6">
          {pbHeroImage ? (
            <div className="w-20 h-24 rounded-2xl overflow-hidden border-2 border-pineapple-yellow/60 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pbHeroImage} alt="Pineapple Baby" className="w-full h-full object-contain object-bottom" />
            </div>
          ) : (
            <span className="text-6xl" aria-hidden="true">🍍</span>
          )}
          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
              Your Fruit Baby Adventure Starts Here
            </h2>
            <p className="text-tiki-brown/60 text-base leading-relaxed max-w-lg mx-auto">
              Meet the characters, read the storybooks, and discover what&apos;s growing in the Pineapple Baby and the Fruit Baby Universe.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap justify-center">
            <Link href="/stories" className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] hover:bg-ube-purple/90 transition-all text-base">
              📖 Read Storybooks
            </Link>
            <Link href="/characters" className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] transition-all text-base">
              🍍 Meet the Characters
            </Link>
            <Link href="/shop" className="inline-flex items-center justify-center gap-2 bg-white text-tiki-brown font-bold px-6 py-4 rounded-2xl border-2 border-tiki-brown/12 shadow-sm hover:shadow-md hover:border-tiki-brown/25 transition-all text-sm">
              🛍️ Preview Collectibles
            </Link>
          </div>
          <p className="text-xs text-tiki-brown/32 font-semibold">
            Storybooks, audio, and cartoons — new adventures coming soon.
          </p>
        </div>
      </section>

    </div>
  );
}
