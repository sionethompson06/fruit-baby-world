import type { Metadata } from "next";
import Link from "next/link";
import {
  getPineappleBabyHeroAsset,
  getSupportingFruitFriendAssets,
  getTikiTroubleAsset,
  getFeaturedPublicStorybooks,
} from "@/lib/publicHomepageAssets";

export const metadata: Metadata = {
  title: "Fruit Baby World — Pineapple Baby &amp; Friends",
  description:
    "Meet Pineapple Baby and friends! Colorful storybooks, audio adventures, and cartoon videos with heart-warming lessons for kids and families.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-character accent colors used in friend chips and cards
const FRIEND_ACCENT: Record<string, { card: string; name: string }> = {
  "ube-baby":          { card: "bg-ube-purple/10 border-ube-purple/25",       name: "text-ube-purple" },
  "mango-baby":        { card: "bg-warm-coral/10 border-warm-coral/25",       name: "text-warm-coral/90" },
  "kiwi-baby":         { card: "bg-tropical-green/10 border-tropical-green/25", name: "text-tropical-green" },
  "coconut-baby":      { card: "bg-tiki-brown/6 border-tiki-brown/18",        name: "text-tiki-brown/70" },
  "strawberry-baby":   { card: "bg-blush-pink/20 border-blush-pink/35",       name: "text-warm-coral/80" },
  "dragonfruit-baby":  { card: "bg-deep-purple/8 border-deep-purple/20",      name: "text-deep-purple/80" },
};
const DEFAULT_FRIEND_ACCENT = { card: "bg-tiki-brown/6 border-tiki-brown/18", name: "text-tiki-brown/70" };

export default function HomePage() {
  const pb = getPineappleBabyHeroAsset();
  const friends = getSupportingFruitFriendAssets();
  const tiki = getTikiTroubleAsset();
  const storybooks = getFeaturedPublicStorybooks();

  return (
    <div className="flex flex-col bg-bg-cream">

      {/* ── A. HERO: PINEAPPLE BABY ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/40 via-pineapple-yellow/15 to-bg-cream py-16 sm:py-24 px-4">
        {/* Decorative floating fruits */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <span className="absolute top-8 left-6 text-6xl opacity-[0.12] rotate-[-14deg]">🍍</span>
          <span className="absolute top-12 right-8 text-5xl opacity-[0.12] rotate-[10deg]">🥭</span>
          <span className="absolute bottom-10 left-14 text-5xl opacity-[0.10] rotate-[8deg]">🥝</span>
          <span className="absolute bottom-14 right-16 text-5xl opacity-[0.09] rotate-[-8deg]">🫐</span>
          <span className="absolute top-1/2 left-3 text-4xl opacity-[0.07]">🥥</span>
          <span className="absolute top-1/3 right-3 text-3xl opacity-[0.07]">⭐</span>
        </div>

        <div className="relative max-w-5xl mx-auto flex flex-col-reverse sm:flex-row items-center gap-10 sm:gap-14">
          {/* Left: text content */}
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left gap-5 flex-1">
            <div className="inline-flex items-center gap-2 bg-white/75 text-tiki-brown text-xs font-bold px-4 py-1.5 rounded-full border border-pineapple-yellow/50 shadow-sm uppercase tracking-wide">
              ✨ Welcome to Fruit Baby World™
            </div>

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-tiki-brown leading-none">
              Welcome to{" "}
              <span className="text-ube-purple">Pineapple Baby</span>{" "}
              World
            </h1>

            {pb?.tagline && (
              <div className="inline-flex items-center gap-2 bg-pineapple-yellow/30 text-tiki-brown text-sm font-bold px-4 py-2 rounded-full border border-pineapple-yellow/50">
                🍍 &ldquo;{pb.tagline}&rdquo;
              </div>
            )}

            <p className="text-base sm:text-lg text-tiki-brown/70 leading-relaxed max-w-lg">
              {pb?.shortDescription ||
                "Sweet little characters, big feelings, and colorful storybook adventures for kids and families."}
            </p>

            {/* Friend chips */}
            {friends.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {friends.slice(0, 5).map((f) => (
                  <Link
                    key={f.slug}
                    href={`/characters/${f.slug}`}
                    className="inline-flex items-center gap-1.5 bg-white/80 border border-tiki-brown/12 text-tiki-brown text-xs font-bold px-3 py-1.5 rounded-full shadow-sm hover:shadow transition-all hover:scale-[1.04]"
                  >
                    {f.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.imageUrl}
                        alt={f.shortName}
                        className="w-5 h-5 rounded-full object-cover object-top border border-tiki-brown/10 flex-shrink-0"
                      />
                    )}
                    {f.shortName}
                  </Link>
                ))}
                <Link
                  href="/characters"
                  className="inline-flex items-center gap-1 bg-pineapple-yellow/20 border border-pineapple-yellow/40 text-tiki-brown text-xs font-bold px-3 py-1.5 rounded-full hover:bg-pineapple-yellow/35 transition-colors"
                >
                  + More →
                </Link>
              </div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mt-1">
              <Link
                href="/stories"
                className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-bold px-7 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
              >
                📖 Read Storybooks
              </Link>
              <Link
                href="/characters"
                className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-bold px-7 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
              >
                🍍 Meet the Characters
              </Link>
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-2 bg-white text-tiki-brown font-bold px-5 py-3.5 rounded-full border border-tiki-brown/15 shadow-sm hover:shadow-md transition-all text-sm"
              >
                🛍️ Collectibles
              </Link>
            </div>
          </div>

          {/* Right: Pineapple Baby portrait */}
          <div className="relative flex-shrink-0 flex items-center justify-center">
            <div className="relative w-52 h-52 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-pineapple-yellow/30 border-4 border-pineapple-yellow/60 shadow-2xl">
              {pb?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pb.imageUrl}
                  alt="Pineapple Baby — the star of Fruit Baby World"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-8xl flex items-center justify-center w-full h-full select-none" aria-hidden="true">🍍</span>
              )}
            </div>
            {/* Tiki Trouble callout bubble */}
            {tiki && (
              <Link
                href={`/characters/${tiki.slug}`}
                className="absolute -bottom-3 -right-3 sm:-bottom-4 sm:-right-4 flex items-center gap-1.5 bg-warm-coral/90 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-warm-coral hover:scale-105 transition-transform"
              >
                {tiki.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={tiki.imageUrl}
                    alt={tiki.shortName}
                    className="w-5 h-5 rounded-full object-cover object-top border border-white/40 flex-shrink-0"
                  />
                )}
                <span>⚡ {tiki.shortName}</span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── B. FEATURED STORYBOOKS ──────────────────────────────────────────── */}
      {storybooks.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">
          <div className="flex items-end justify-between mb-8 gap-4 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 bg-ube-purple/8 text-ube-purple text-xs font-bold px-4 py-1.5 rounded-full mb-3 uppercase tracking-widest">
                Available Now
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
                Featured Storybooks
              </h2>
            </div>
            <Link
              href="/stories"
              className="flex-shrink-0 text-sm font-bold text-ube-purple hover:text-ube-purple/75 transition-colors"
            >
              See All Stories →
            </Link>
          </div>

          <div className={`grid gap-6 ${storybooks.length === 1 ? "max-w-md" : "grid-cols-1 sm:grid-cols-2"}`}>
            {storybooks.slice(0, 4).map((book) => (
              <Link
                key={book.slug}
                href={`/stories/${book.slug}`}
                className="group rounded-3xl overflow-hidden bg-white border border-tiki-brown/10 shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col"
              >
                {/* Cover */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-pineapple-yellow/25 via-sky-blue/10 to-tropical-green/10 flex items-center justify-center flex-shrink-0">
                  {book.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-6xl select-none" aria-hidden="true">📖</span>
                  )}
                  {/* Media badges */}
                  <div className="absolute bottom-3 left-3 flex gap-1.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/85 text-tiki-brown/70 shadow-sm">
                      📖 Read
                    </span>
                    {book.hasAudio && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/85 text-white shadow-sm">
                        🎧 Listen
                      </span>
                    )}
                    {book.hasVideo && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-tropical-green/85 text-white shadow-sm">
                        🎬 Watch
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-5 flex flex-col gap-2 flex-1">
                  <h3 className="text-base font-black text-tiki-brown leading-tight group-hover:text-ube-purple transition-colors">
                    {book.title}
                  </h3>
                  {book.shortDescription && (
                    <p className="text-sm text-tiki-brown/65 leading-relaxed line-clamp-2">
                      {book.shortDescription}
                    </p>
                  )}
                  <span className="mt-auto text-xs font-bold text-ube-purple">
                    Read Story →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── C. PINEAPPLE BABY SPOTLIGHT ─────────────────────────────────────── */}
      {pb && (
        <section className="bg-pineapple-yellow/12 border-y border-pineapple-yellow/25 py-16 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-10 sm:gap-14">
            {/* Portrait */}
            <div className="flex-shrink-0 w-40 h-40 sm:w-56 sm:h-56 rounded-3xl overflow-hidden bg-pineapple-yellow/30 border-2 border-pineapple-yellow/50 shadow-lg">
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

            {/* Text */}
            <div className="flex flex-col gap-4 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 bg-pineapple-yellow/30 text-tiki-brown text-xs font-bold px-4 py-1.5 rounded-full self-center sm:self-start uppercase tracking-wide">
                ⭐ The Star of the Show
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
                Pineapple Baby
              </h2>
              {pb.shortDescription && (
                <p className="text-tiki-brown/70 text-base leading-relaxed max-w-lg">
                  {pb.shortDescription}
                </p>
              )}
              {pb.catchphrase && (
                <blockquote className="text-lg font-black text-ube-purple italic">
                  &ldquo;{pb.catchphrase}&rdquo;
                </blockquote>
              )}
              <Link
                href="/characters/pineapple-baby"
                className="self-center sm:self-start inline-flex items-center gap-2 bg-pineapple-yellow text-tiki-brown font-bold px-6 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all text-sm"
              >
                Meet Pineapple Baby →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── D. FRUIT FRIENDS ────────────────────────────────────────────────── */}
      {friends.length > 0 && (
        <section className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-16">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-tropical-green/10 text-tropical-green text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              The Crew
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              Pineapple Baby&apos;s Fruit Friends
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Every great hero has a crew. Meet the colorful characters who join the adventure.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5">
            {friends.map((f) => {
              const accent = FRIEND_ACCENT[f.slug] ?? DEFAULT_FRIEND_ACCENT;
              return (
                <Link
                  key={f.slug}
                  href={`/characters/${f.slug}`}
                  className={`group border ${accent.card} rounded-3xl p-5 flex flex-col items-center gap-3 hover:shadow-lg transition-all hover:scale-[1.02] text-center bg-white/60`}
                >
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-white/80 border border-white shadow-sm flex items-center justify-center flex-shrink-0">
                    {f.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={f.imageUrl}
                        alt={`${f.name} official character`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl select-none" aria-hidden="true">🍓</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-tiki-brown leading-tight mb-0.5">
                      {f.name}
                    </h3>
                    {f.tagline && (
                      <p className={`text-xs font-semibold ${accent.name} leading-snug`}>
                        {f.tagline}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-bold ${accent.name} group-hover:underline mt-auto`}>
                    Meet {f.shortName} →
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/characters"
              className="inline-flex items-center gap-2 bg-white border border-tiki-brown/15 text-tiki-brown/70 font-bold text-sm px-6 py-3 rounded-full shadow-sm hover:bg-tiki-brown/5 transition-colors"
            >
              View All Characters →
            </Link>
          </div>
        </section>
      )}

      {/* ── E. TIKI TROUBLE ─────────────────────────────────────────────────── */}
      {tiki && (
        <section className="bg-warm-coral/8 border-y border-warm-coral/20 py-16 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row-reverse items-center gap-10 sm:gap-14">
            {/* Portrait */}
            <div className="flex-shrink-0 w-36 h-36 sm:w-52 sm:h-52 rounded-3xl overflow-hidden bg-warm-coral/20 border-2 border-warm-coral/40 shadow-lg">
              {tiki.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tiki.imageUrl}
                  alt="Tiki Trouble"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <span className="text-7xl flex items-center justify-center w-full h-full select-none" aria-hidden="true">🌴</span>
              )}
            </div>

            {/* Text */}
            <div className="flex flex-col gap-4 text-center sm:text-left flex-1">
              <div className="inline-flex items-center gap-2 bg-warm-coral/15 text-warm-coral/90 text-xs font-bold px-4 py-1.5 rounded-full self-center sm:self-start uppercase tracking-wide">
                ⚡ The Mischief-Maker
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
                Tiki Trouble
              </h2>
              {tiki.shortDescription && (
                <p className="text-tiki-brown/70 text-base leading-relaxed max-w-lg">
                  {tiki.shortDescription}
                </p>
              )}
              {tiki.catchphrase && (
                <blockquote className="text-lg font-black text-warm-coral/80 italic">
                  &ldquo;{tiki.catchphrase}&rdquo;
                </blockquote>
              )}
              <Link
                href="/characters/tiki"
                className="self-center sm:self-start inline-flex items-center gap-2 bg-warm-coral/80 text-white font-bold px-6 py-3 rounded-full shadow-md hover:bg-warm-coral/95 hover:shadow-lg transition-all text-sm"
              >
                Meet Tiki Trouble →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── F. READ / LISTEN / WATCH ────────────────────────────────────────── */}
      <section className="bg-ube-purple/5 border-y border-ube-purple/12 py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-ube-purple/10 text-ube-purple text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              Story Experiences
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              Read, Listen &amp; Watch
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Every Fruit Baby storybook is crafted for multiple experiences — choose your family&apos;s favorite way to enjoy it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-pineapple-yellow/15 border border-pineapple-yellow/30 rounded-3xl p-6 flex flex-col gap-3">
              <span className="text-4xl" aria-hidden="true">📖</span>
              <p className="text-base font-black text-tiki-brown">Read the Storybook</p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                Flip through illustrated pages with official character artwork — a colorful storybook you can enjoy at your own pace.
              </p>
            </div>
            <div className="bg-ube-purple/8 border border-ube-purple/18 rounded-3xl p-6 flex flex-col gap-3">
              <span className="text-4xl" aria-hidden="true">🎧</span>
              <p className="text-base font-black text-tiki-brown">Listen &amp; Read Along</p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                Hear the story read aloud with warm narration while following along — perfect for car rides and bedtime.
              </p>
            </div>
            <div className="bg-tropical-green/10 border border-tropical-green/22 rounded-3xl p-6 flex flex-col gap-3">
              <span className="text-4xl" aria-hidden="true">🎬</span>
              <p className="text-base font-black text-tiki-brown">Watch the Cartoon</p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                Watch the full episode as a short cartoon video — characters come to life from opening scene to the big lesson.
              </p>
            </div>
          </div>

          <div className="text-center mt-8">
            <Link
              href="/stories"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold px-8 py-3.5 rounded-full shadow-md hover:bg-ube-purple/85 hover:shadow-lg transition-all"
            >
              Browse All Stories →
            </Link>
          </div>
        </div>
      </section>

      {/* ── G. WORLD ENVIRONMENTS ───────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-pineapple-yellow/25 text-tiki-brown text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              The World
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              A Colorful Little Universe
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Every story grows from a vibrant world of homes, gardens, beaches, and magical little places.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { emoji: "🌴",  place: "Pineapple Patch",  desc: "Home of Pineapple Baby — sunny, warm, and full of life.",                color: "bg-pineapple-yellow/20 border-pineapple-yellow/35" },
              { emoji: "🌸",  place: "Ube Garden",        desc: "A dreamy purple valley of wildflowers and soft breezes.",               color: "bg-ube-purple/10 border-ube-purple/22" },
              { emoji: "🏝️", place: "Trouble Island",    desc: "Tiki Trouble's sneaky volcanic lair — dramatic and unpredictable.",  color: "bg-warm-coral/15 border-warm-coral/28" },
              { emoji: "🥭",  place: "Mango Market",      desc: "Bright, busy, and buzzing with laughter and tropical treats.",          color: "bg-warm-coral/8 border-warm-coral/18" },
              { emoji: "🌿",  place: "Kiwi Meadow",       desc: "Rolling green hills where quiet adventures and tiny wonders happen.",    color: "bg-tropical-green/10 border-tropical-green/22" },
              { emoji: "🥥",  place: "Coconut Cove",      desc: "Calm, cozy, and always welcoming — a place to breathe and belong.",      color: "bg-tiki-brown/6 border-tiki-brown/15" },
            ].map(({ emoji, place, desc, color }) => (
              <div key={place} className={`${color} border rounded-2xl p-4 sm:p-5 flex flex-col gap-2`}>
                <span className="text-3xl" aria-hidden="true">{emoji}</span>
                <p className="text-sm font-black text-tiki-brown">{place}</p>
                <p className="text-xs text-tiki-brown/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── H. FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-pineapple-yellow/20 via-pineapple-yellow/8 to-bg-cream border-t border-pineapple-yellow/25 py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          {pb?.imageUrl ? (
            <div className="w-20 h-20 mx-auto mb-5 rounded-full overflow-hidden border-2 border-pineapple-yellow/60 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pb.imageUrl}
                alt="Pineapple Baby"
                className="w-full h-full object-cover object-top"
              />
            </div>
          ) : (
            <div className="text-5xl mb-5" aria-hidden="true">🍍</div>
          )}
          <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-4">
            Your Fruit Baby Adventure Starts Here
          </h2>
          <p className="text-tiki-brown/65 text-base leading-relaxed mb-8 max-w-lg mx-auto">
            Meet the characters, read the storybooks, and discover what&apos;s growing in the Fruit Baby World universe.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link
              href="/stories"
              className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              📖 Read Storybooks
            </Link>
            <Link
              href="/characters"
              className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              🍍 Meet the Characters
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-white text-tiki-brown font-bold px-6 py-3.5 rounded-full border border-tiki-brown/15 shadow-sm hover:shadow-md transition-all"
            >
              🛍️ Preview Collectibles
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
