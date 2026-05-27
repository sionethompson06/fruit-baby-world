import type { Metadata } from "next";
import Link from "next/link";
import {
  getPineappleBabyHeroAsset,
  getSupportingFruitFriendAssets,
  getTikiTroubleAsset,
  getHomepageEnvironmentAssets,
  getFeaturedPublicStorybooks,
} from "@/lib/publicHomepageAssets";

export const metadata: Metadata = {
  title: "Fruit Baby World — Pineapple Baby &amp; Friends",
  description:
    "Meet Pineapple Baby and friends! Read colorful storybooks, listen along with narration, and watch playful Fruit Baby cartoons — sweet stories with big heart.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-character accent palette for friend cards
const FRIEND_PALETTE: Record<string, { card: string; text: string; badge: string }> = {
  "ube-baby": {
    card: "bg-ube-purple/8 border-ube-purple/22 hover:border-ube-purple/40",
    text: "text-ube-purple",
    badge: "bg-ube-purple/12 text-ube-purple",
  },
  "mango-baby": {
    card: "bg-warm-coral/8 border-warm-coral/22 hover:border-warm-coral/40",
    text: "text-warm-coral/90",
    badge: "bg-warm-coral/15 text-warm-coral/90",
  },
  "kiwi-baby": {
    card: "bg-tropical-green/8 border-tropical-green/22 hover:border-tropical-green/40",
    text: "text-tropical-green",
    badge: "bg-tropical-green/12 text-tropical-green",
  },
  "coconut-baby": {
    card: "bg-tiki-brown/5 border-tiki-brown/15 hover:border-tiki-brown/30",
    text: "text-tiki-brown/65",
    badge: "bg-tiki-brown/10 text-tiki-brown/70",
  },
  "strawberry-baby": {
    card: "bg-blush-pink/15 border-blush-pink/30 hover:border-blush-pink/50",
    text: "text-warm-coral/80",
    badge: "bg-blush-pink/20 text-warm-coral/80",
  },
  "dragonfruit-baby": {
    card: "bg-deep-purple/6 border-deep-purple/18 hover:border-deep-purple/35",
    text: "text-deep-purple/75",
    badge: "bg-deep-purple/8 text-deep-purple/75",
  },
};
const DEFAULT_FRIEND_PALETTE = {
  card: "bg-tiki-brown/5 border-tiki-brown/15 hover:border-tiki-brown/28",
  text: "text-tiki-brown/65",
  badge: "bg-tiki-brown/10 text-tiki-brown/65",
};

export default function HomePage() {
  const pb = getPineappleBabyHeroAsset();
  const friends = getSupportingFruitFriendAssets();
  const tiki = getTikiTroubleAsset();
  const environments = getHomepageEnvironmentAssets();
  const storybooks = getFeaturedPublicStorybooks();

  // Friends to float around PB in the hero (corners)
  const heroFloatFriends = friends.slice(0, 4);

  return (
    <div className="flex flex-col bg-bg-cream overflow-x-hidden">

      {/* ══════════════════════════════════════════════════════════════════════
          A. HERO — Pineapple Baby takes center stage
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/50 via-pineapple-yellow/20 to-bg-cream pt-12 pb-24 sm:pb-28 px-4">

        {/* Layered background blobs */}
        <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
          <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full bg-pineapple-yellow/25 blur-3xl -translate-x-1/2 -translate-y-1/4" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-tropical-green/10 blur-3xl translate-x-1/4 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] rounded-full bg-ube-purple/8 blur-3xl -translate-x-1/4 translate-y-1/4" />
        </div>

        {/* Floating decorative fruits */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <span className="absolute top-6 left-4 text-5xl opacity-[0.12] rotate-[-16deg] animate-[spin_40s_linear_infinite]">🍍</span>
          <span className="absolute top-10 right-6 text-4xl opacity-[0.10] rotate-[12deg]">🥭</span>
          <span className="absolute bottom-16 left-10 text-4xl opacity-[0.09] rotate-[10deg]">🥝</span>
          <span className="absolute bottom-20 right-10 text-5xl opacity-[0.08] rotate-[-8deg]">🫐</span>
          <span className="absolute top-1/3 left-2 text-3xl opacity-[0.07]">⭐</span>
          <span className="absolute top-1/2 right-2 text-3xl opacity-[0.07] rotate-[20deg]">🌺</span>
          <span className="absolute top-3/4 left-1/4 text-2xl opacity-[0.07]">✨</span>
        </div>

        <div className="relative max-w-6xl mx-auto flex flex-col-reverse sm:flex-row items-center gap-10 sm:gap-12 lg:gap-20">

          {/* Left: Text content */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-5 flex-1 min-w-0">

            {/* Welcome badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-tiki-brown text-xs font-black px-5 py-2 rounded-full border border-pineapple-yellow/60 shadow-md uppercase tracking-widest">
              ✨ Welcome to Fruit Baby World™
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
              <span className="text-tiki-brown">Welcome to</span>{" "}
              <br className="hidden sm:block" />
              <span className="text-ube-purple">Pineapple Baby</span>{" "}
              <span className="text-tiki-brown">World</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl font-bold text-tiki-brown/80 leading-snug max-w-lg">
              Big heart. Bright adventures. Sweet stories with Pineapple Baby and friends.
            </p>

            {/* Body copy */}
            <p className="text-base text-tiki-brown/65 leading-relaxed max-w-md">
              Read colorful storybooks, listen along with narration, and watch playful Fruit Baby cartoons.
            </p>

            {/* Friend chips row */}
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
                href="/stories"
                className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] hover:bg-ube-purple/90 transition-all text-base"
              >
                📖 Read Storybooks
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

          {/* Right: Pineapple Baby portrait + floating friends */}
          <div className="relative flex-shrink-0 flex items-center justify-center">

            {/* Glow halo behind PB */}
            <div
              className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full blur-3xl opacity-60"
              style={{ background: "radial-gradient(circle, #FFD84D55 0%, #FFD84D00 70%)" }}
              aria-hidden="true"
            />

            {/* Main PB circle */}
            <div className="relative z-10 w-52 h-52 sm:w-64 sm:h-64 lg:w-72 lg:h-72 rounded-full overflow-hidden bg-pineapple-yellow/30 border-[5px] border-pineapple-yellow/70 shadow-2xl">
              {pb?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pb.imageUrl}
                  alt="Pineapple Baby — star of Fruit Baby World"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-8xl flex items-center justify-center w-full h-full select-none" aria-hidden="true">🍍</span>
              )}
            </div>

            {/* Floating friend — top-right: Ube Baby */}
            {heroFloatFriends[0] && (
              <div className="absolute -top-3 -right-3 sm:-top-5 sm:-right-5 z-20 rotate-[9deg] hover:rotate-[5deg] hover:scale-110 transition-all duration-200 cursor-pointer">
                <Link href={`/characters/${heroFloatFriends[0].slug}`} aria-label={heroFloatFriends[0].name}>
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[0].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroFloatFriends[0].imageUrl}
                        alt={heroFloatFriends[0].name}
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Floating friend — bottom-right: Mango Baby */}
            {heroFloatFriends[1] && (
              <div className="absolute -bottom-1 -right-6 sm:-bottom-3 sm:-right-10 z-20 rotate-[-7deg] hover:rotate-[-3deg] hover:scale-110 transition-all duration-200 cursor-pointer">
                <Link href={`/characters/${heroFloatFriends[1].slug}`} aria-label={heroFloatFriends[1].name}>
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[1].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroFloatFriends[1].imageUrl}
                        alt={heroFloatFriends[1].name}
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Floating friend — top-left: Kiwi Baby */}
            {heroFloatFriends[2] && (
              <div className="absolute -top-3 -left-6 sm:-top-5 sm:-left-10 z-20 rotate-[-9deg] hover:rotate-[-5deg] hover:scale-110 transition-all duration-200 cursor-pointer">
                <Link href={`/characters/${heroFloatFriends[2].slug}`} aria-label={heroFloatFriends[2].name}>
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[2].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroFloatFriends[2].imageUrl}
                        alt={heroFloatFriends[2].name}
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Floating friend — bottom-left: Coconut Baby */}
            {heroFloatFriends[3] && (
              <div className="absolute -bottom-1 -left-3 sm:-bottom-3 sm:-left-5 z-20 rotate-[7deg] hover:rotate-[3deg] hover:scale-110 transition-all duration-200 cursor-pointer">
                <Link href={`/characters/${heroFloatFriends[3].slug}`} aria-label={heroFloatFriends[3].name}>
                  <div className="w-12 h-12 sm:w-15 sm:h-15 rounded-2xl overflow-hidden bg-white shadow-xl border-[3px] border-white">
                    {heroFloatFriends[3].imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroFloatFriends[3].imageUrl}
                        alt={heroFloatFriends[3].name}
                        className="w-full h-full object-cover object-top"
                      />
                    )}
                  </div>
                </Link>
              </div>
            )}

            {/* Tiki Trouble "mischief nearby" callout */}
            {tiki && (
              <Link
                href="/characters/tiki"
                className="absolute -bottom-10 sm:-bottom-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-warm-coral text-white text-xs font-black px-4 py-2 rounded-full shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-200 whitespace-nowrap border-2 border-warm-coral/40"
              >
                {tiki.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tiki.imageUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-cover object-top border border-white/50 flex-shrink-0"
                  />
                )}
                <span>⚡ Uh oh… Tiki&apos;s nearby!</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          B. FEATURED STORYBOOKS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20">
        <div className="flex items-end justify-between mb-10 gap-4 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 bg-ube-purple/8 text-ube-purple text-xs font-black px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest">
              📚 Available Now
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
              Featured Pineapple Baby Storybooks
            </h2>
            <p className="text-tiki-brown/60 text-sm mt-2 max-w-md leading-relaxed">
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
                {/* Cover image area */}
                <div className="relative h-56 overflow-hidden bg-gradient-to-br from-pineapple-yellow/25 via-sky-blue/10 to-tropical-green/10 flex items-center justify-center flex-shrink-0">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-7xl select-none" aria-hidden="true">📖</span>
                  )}
                  {/* Gradient overlay for legibility */}
                  {book.coverUrl && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" aria-hidden="true" />
                  )}
                  {/* Media badges */}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/90 text-tiki-brown shadow-sm backdrop-blur-sm">
                      📖 Read
                    </span>
                    {book.hasAudio && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/90 text-white shadow-sm backdrop-blur-sm">
                        🎧 Listen
                      </span>
                    )}
                    {book.hasVideo && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-tropical-green/90 text-white shadow-sm backdrop-blur-sm">
                        🎬 Watch
                      </span>
                    )}
                  </div>
                  {/* PB badge */}
                  {book.hasPineappleBaby && (
                    <div className="absolute top-3 left-3 text-xs font-black px-2.5 py-1 rounded-full bg-pineapple-yellow/95 text-tiki-brown shadow-sm backdrop-blur-sm">
                      🍍 Pineapple Baby
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-5 flex flex-col gap-2.5 flex-1">
                  <h3 className="text-base sm:text-lg font-black text-tiki-brown leading-tight group-hover:text-ube-purple transition-colors">
                    {book.title}
                  </h3>
                  {book.shortDescription && (
                    <p className="text-sm text-tiki-brown/60 leading-relaxed line-clamp-2">
                      {book.shortDescription}
                    </p>
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
          /* Coming-soon fallback */
          <div className="bg-gradient-to-br from-pineapple-yellow/20 to-ube-purple/8 rounded-3xl border border-pineapple-yellow/30 p-10 sm:p-14 text-center flex flex-col items-center gap-4 shadow-sm">
            <span className="text-6xl" aria-hidden="true">📖</span>
            <h3 className="text-xl font-black text-tiki-brown">
              New Pineapple Baby Storybooks Coming Soon
            </h3>
            <p className="text-sm text-tiki-brown/60 max-w-sm leading-relaxed">
              Colorful storybook adventures are being prepared. Check back soon!
            </p>
            <Link
              href="/stories"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold px-6 py-3 rounded-full shadow-md hover:bg-ube-purple/85 transition-colors text-sm"
            >
              See Stories Page →
            </Link>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          C. PINEAPPLE BABY SPOTLIGHT
      ══════════════════════════════════════════════════════════════════════ */}
      {pb && (
        <section className="relative overflow-hidden bg-gradient-to-br from-pineapple-yellow/35 via-pineapple-yellow/15 to-tropical-green/8 border-y border-pineapple-yellow/30 py-16 px-4">
          {/* Decorative sparkles */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
            <span className="absolute top-4 left-8 text-4xl opacity-[0.15] rotate-[-15deg]">⭐</span>
            <span className="absolute top-8 right-12 text-3xl opacity-[0.12] rotate-[10deg]">✨</span>
            <span className="absolute bottom-6 left-1/3 text-3xl opacity-[0.10]">🌟</span>
            <span className="absolute bottom-8 right-8 text-4xl opacity-[0.12] rotate-[-5deg]">⭐</span>
          </div>

          <div className="relative max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-10 sm:gap-14">
            {/* PB portrait */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 -m-4 rounded-3xl bg-pineapple-yellow/30 blur-2xl" aria-hidden="true" />
              <div className="relative w-44 h-44 sm:w-60 sm:h-60 rounded-3xl overflow-hidden bg-pineapple-yellow/30 border-4 border-pineapple-yellow/60 shadow-2xl">
                {pb.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pb.imageUrl}
                    alt="Pineapple Baby"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-7xl flex items-center justify-center w-full h-full select-none" aria-hidden="true">🍍</span>
                )}
              </div>
            </div>

            {/* Text */}
            <div className="flex flex-col gap-5 text-center sm:text-left">
              <div>
                <div className="inline-flex items-center gap-2 bg-pineapple-yellow/40 text-tiki-brown text-xs font-black px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest border border-pineapple-yellow/60">
                  ⭐ The Star of the Show
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
                  Meet Pineapple Baby
                </h2>
              </div>

              <p className="text-base text-tiki-brown/75 leading-relaxed max-w-lg">
                Pineapple Baby is the bright-hearted hero of Fruit Baby World — curious, kind, brave, and always ready for a sweet adventure.
              </p>

              {/* Personality badges */}
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {["Kind", "Brave", "Curious", "Big-Hearted"].map((trait) => (
                  <span
                    key={trait}
                    className="text-sm font-bold px-4 py-1.5 rounded-full bg-white/70 border border-pineapple-yellow/60 text-tiki-brown shadow-sm"
                  >
                    {trait}
                  </span>
                ))}
              </div>

              {/* Tagline quote */}
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
          D. FRUIT FRIENDS SUPPORTING CAST
      ══════════════════════════════════════════════════════════════════════ */}
      {friends.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-tropical-green/10 text-tropical-green text-xs font-black px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              🍓 The Crew
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
              Pineapple Baby&apos;s Fruit Friends
            </h2>
            <p className="text-tiki-brown/60 text-base max-w-lg mx-auto leading-relaxed">
              Every adventure is sweeter with friends. Meet the colorful characters who join the fun.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {friends.map((f) => {
              const pal = FRIEND_PALETTE[f.slug] ?? DEFAULT_FRIEND_PALETTE;
              return (
                <Link
                  key={f.slug}
                  href={`/characters/${f.slug}`}
                  className={`group border-2 ${pal.card} bg-white/60 rounded-3xl p-5 flex flex-col items-center gap-3 hover:shadow-xl transition-all duration-200 hover:scale-[1.03] text-center`}
                >
                  {/* Portrait */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-white shadow-md border border-white/80 flex items-center justify-center flex-shrink-0">
                    {f.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.imageUrl}
                        alt={`${f.name} character`}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <span className="text-4xl select-none" aria-hidden="true">🍓</span>
                    )}
                  </div>

                  {/* Name + personality */}
                  <div>
                    <h3 className="text-sm font-black text-tiki-brown leading-tight mb-1">
                      {f.name}
                    </h3>
                    {f.personality.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {f.personality.slice(0, 2).map((trait) => (
                          <span
                            key={trait}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pal.badge}`}
                          >
                            {trait}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className={`text-xs font-bold ${pal.text} group-hover:underline mt-auto`}>
                    Meet {f.shortName} →
                  </span>
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
          E. TIKI TROUBLE
      ══════════════════════════════════════════════════════════════════════ */}
      {tiki && (
        <section className="relative overflow-hidden bg-gradient-to-br from-warm-coral/15 via-warm-coral/8 to-bg-cream border-y border-warm-coral/22 py-16 px-4">
          {/* Decorative chaos elements */}
          <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
            <span className="absolute top-4 right-4 text-5xl opacity-[0.10] rotate-[20deg]">💥</span>
            <span className="absolute bottom-4 left-6 text-4xl opacity-[0.08] rotate-[-15deg]">⚡</span>
            <span className="absolute top-1/2 right-1/4 text-3xl opacity-[0.07]">🌋</span>
          </div>

          <div className="relative max-w-5xl mx-auto flex flex-col sm:flex-row-reverse items-center gap-10 sm:gap-14">
            {/* Tiki portrait */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 -m-4 rounded-3xl bg-warm-coral/20 blur-2xl" aria-hidden="true" />
              <div className="relative w-40 h-40 sm:w-52 sm:h-52 rounded-3xl overflow-hidden bg-warm-coral/20 border-4 border-warm-coral/50 shadow-2xl">
                {tiki.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tiki.imageUrl}
                    alt="Tiki Trouble"
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <span className="text-6xl flex items-center justify-center w-full h-full select-none" aria-hidden="true">🌴</span>
                )}
              </div>
            </div>

            {/* Text */}
            <div className="flex flex-col gap-4 text-center sm:text-left flex-1">
              <div>
                <div className="inline-flex items-center gap-2 bg-warm-coral/18 text-warm-coral/90 text-xs font-black px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest border border-warm-coral/30">
                  ⚡ The Mischief-Maker
                </div>
                <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
                  Uh oh… Tiki Trouble!
                </h2>
              </div>

              <p className="text-base text-tiki-brown/70 leading-relaxed max-w-lg">
                Tiki Trouble brings mischief, surprises, and silly problems for Pineapple Baby and friends to solve.
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
          F. EXPLORE PINEAPPLE BABY'S WORLD
      ══════════════════════════════════════════════════════════════════════ */}
      {environments.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-pineapple-yellow/25 text-tiki-brown text-xs font-black px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest border border-pineapple-yellow/40">
              🌍 The Universe
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
              Explore Pineapple Baby&apos;s World
            </h2>
            <p className="text-tiki-brown/60 text-base max-w-lg mx-auto leading-relaxed">
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
          G. READ / LISTEN / WATCH FEATURE BAND
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
            <p className="text-tiki-brown/60 text-base max-w-lg mx-auto leading-relaxed">
              Every Fruit Baby storybook is crafted for multiple experiences. Choose your family&apos;s favorite.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Read */}
            <div className="bg-pineapple-yellow/15 border-2 border-pineapple-yellow/35 rounded-3xl p-7 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <span className="text-5xl" aria-hidden="true">📖</span>
              <div>
                <p className="text-lg font-black text-tiki-brown mb-1">Read</p>
                <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">Digital Storybook</p>
              </div>
              <p className="text-sm text-tiki-brown/70 leading-relaxed flex-1">
                Open colorful digital storybooks with official character artwork — a beautiful illustrated adventure at your own pace.
              </p>
            </div>

            {/* Listen */}
            <div className="bg-ube-purple/8 border-2 border-ube-purple/20 rounded-3xl p-7 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <span className="text-5xl" aria-hidden="true">🎧</span>
              <div>
                <p className="text-lg font-black text-tiki-brown mb-1">Listen</p>
                <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">Story Narration</p>
              </div>
              <p className="text-sm text-tiki-brown/70 leading-relaxed flex-1">
                Enjoy warm read-aloud narration while following along — perfect for car rides, bedtime, or little readers just starting out.
              </p>
            </div>

            {/* Watch */}
            <div className="bg-tropical-green/8 border-2 border-tropical-green/22 rounded-3xl p-7 flex flex-col gap-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
              <span className="text-5xl" aria-hidden="true">🎬</span>
              <div>
                <p className="text-lg font-black text-tiki-brown mb-1">Watch</p>
                <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">Cartoon Video</p>
              </div>
              <p className="text-sm text-tiki-brown/70 leading-relaxed flex-1">
                Play Fruit Baby cartoons when available — characters come to life from the first scene to the big lesson moment.
              </p>
            </div>
          </div>

          <div className="text-center mt-10">
            <Link
              href="/stories"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:bg-ube-purple/85 hover:shadow-xl hover:scale-[1.03] transition-all"
            >
              Open the Storybook Library →
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          H. FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/25 via-pineapple-yellow/10 to-bg-cream border-t border-pineapple-yellow/25 py-24 px-4 text-center">
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[200px] rounded-full bg-pineapple-yellow/20 blur-3xl -translate-y-1/2" />
        </div>

        <div className="relative max-w-2xl mx-auto flex flex-col items-center gap-6">
          {pb?.imageUrl ? (
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-pineapple-yellow/70 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pb.imageUrl}
                alt="Pineapple Baby"
                className="w-full h-full object-cover object-top"
              />
            </div>
          ) : (
            <span className="text-6xl" aria-hidden="true">🍍</span>
          )}

          <div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
              Your Fruit Baby Adventure Starts Here
            </h2>
            <p className="text-tiki-brown/60 text-base leading-relaxed max-w-lg mx-auto">
              Meet the characters, read the storybooks, and discover what&apos;s growing in the Fruit Baby World universe.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-wrap justify-center">
            <Link
              href="/stories"
              className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] hover:bg-ube-purple/90 transition-all text-base"
            >
              📖 Read Storybooks
            </Link>
            <Link
              href="/characters"
              className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-black px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.04] transition-all text-base"
            >
              🍍 Meet the Characters
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-white text-tiki-brown font-bold px-6 py-4 rounded-2xl border-2 border-tiki-brown/12 shadow-sm hover:shadow-md hover:border-tiki-brown/25 transition-all text-sm"
            >
              🛍️ Preview Collectibles
            </Link>
          </div>

          <p className="text-xs text-tiki-brown/35 font-semibold">
            Storybooks, audio, and cartoons — new adventures coming soon.
          </p>
        </div>
      </section>

    </div>
  );
}
