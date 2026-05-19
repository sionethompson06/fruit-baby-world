import type { Metadata } from "next";
import Link from "next/link";
import { getPublicCharacterProfiles } from "@/lib/characterRegistry";
import { getOfficialProfileSheetUrl } from "@/lib/characterProfileAssets";

export const metadata: Metadata = {
  title: "Fruit Baby World",
  description:
    "Meet the Fruit Baby characters and explore colorful picture, audio, animated, and video stories for kids and families.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-character accent colors for the character grid cards
const CHARACTER_ACCENT: Record<string, { card: string; badge: string; link: string }> = {
  "pineapple-baby": {
    card: "bg-pineapple-yellow/18 border-pineapple-yellow/40 hover:border-pineapple-yellow/60",
    badge: "bg-pineapple-yellow/30 text-tiki-brown",
    link: "text-tiki-brown/70",
  },
  "ube-baby": {
    card: "bg-ube-purple/10 border-ube-purple/25 hover:border-ube-purple/45",
    badge: "bg-ube-purple/15 text-ube-purple",
    link: "text-ube-purple",
  },
  "mango-baby": {
    card: "bg-warm-coral/10 border-warm-coral/25 hover:border-warm-coral/45",
    badge: "bg-warm-coral/15 text-warm-coral/90",
    link: "text-warm-coral/80",
  },
  "kiwi-baby": {
    card: "bg-tropical-green/10 border-tropical-green/25 hover:border-tropical-green/45",
    badge: "bg-tropical-green/15 text-tropical-green",
    link: "text-tropical-green",
  },
  "coconut-baby": {
    card: "bg-tiki-brown/6 border-tiki-brown/18 hover:border-tiki-brown/35",
    badge: "bg-tiki-brown/12 text-tiki-brown/75",
    link: "text-tiki-brown/60",
  },
  tiki: {
    card: "bg-warm-coral/12 border-warm-coral/30 hover:border-warm-coral/50",
    badge: "bg-warm-coral/20 text-warm-coral/90",
    link: "text-warm-coral/80",
  },
};

const DEFAULT_ACCENT = {
  card: "bg-tiki-brown/6 border-tiki-brown/18 hover:border-tiki-brown/30",
  badge: "bg-tiki-brown/10 text-tiki-brown/60",
  link: "text-tiki-brown/60",
};

export default function HomePage() {
  const publicCharacters = getPublicCharacterProfiles();
  const fruitBabies = publicCharacters.filter((c) => c.type === "fruit-baby");
  const rivals = publicCharacters.filter((c) => c.type === "villain");
  const featuredCharacters = [...fruitBabies, ...rivals].slice(0, 6);

  return (
    <div className="flex flex-col bg-bg-cream">

      {/* ── A. HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/40 via-pineapple-yellow/10 to-bg-cream py-24 px-4 text-center">
        {/* Decorative floating fruit emojis */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          <span className="absolute top-8 left-6 text-6xl opacity-[0.13] rotate-[-14deg]">🍍</span>
          <span className="absolute top-12 right-8 text-5xl opacity-[0.13] rotate-[10deg]">🥭</span>
          <span className="absolute bottom-10 left-14 text-5xl opacity-[0.12] rotate-[8deg]">🥝</span>
          <span className="absolute bottom-14 right-16 text-6xl opacity-[0.10] rotate-[-8deg]">🫐</span>
          <span className="absolute top-1/2 left-3 text-4xl opacity-[0.07]">🥥</span>
          <span className="absolute top-1/3 right-3 text-3xl opacity-[0.07]">⭐</span>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/75 text-tiki-brown text-sm font-bold px-4 py-1.5 rounded-full mb-6 border border-pineapple-yellow/50 shadow-sm">
            ✨ Welcome to Fruit Baby World™
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-tiki-brown leading-none mb-5">
            Fruit Baby{" "}
            <span className="text-ube-purple">World</span>
          </h1>

          <p className="text-lg sm:text-xl text-tiki-brown/75 max-w-2xl mx-auto leading-relaxed mb-10">
            Sweet little characters, big feelings, and colorful story adventures
            for kids, families, teachers, and collectors.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link
              href="/characters"
              className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all text-base"
            >
              🍍 Meet the Characters
            </Link>
            <Link
              href="/stories"
              className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all text-base"
            >
              🎬 Explore Stories
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center justify-center gap-2 bg-white text-tiki-brown font-bold px-6 py-3.5 rounded-full border border-tiki-brown/15 shadow-sm hover:shadow-md hover:scale-105 transition-all text-sm"
            >
              🛍️ Preview Collectibles
            </Link>
          </div>
        </div>
      </section>

      {/* ── B. CHARACTER UNIVERSE ────────────────────────────────────────────── */}
      {featuredCharacters.length > 0 && (
        <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-ube-purple/8 text-ube-purple text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              Official Characters
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              Meet the Fruit Babies
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Each character has a unique personality, story role, and visual identity —
              hand-crafted and trademark-consistent.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
            {featuredCharacters.map((char) => {
              const accent = CHARACTER_ACCENT[char.slug] ?? DEFAULT_ACCENT;
              const profileUrl = getOfficialProfileSheetUrl(char);
              const personalityList: unknown = char.personality;
              const firstTrait =
                Array.isArray(personalityList) && personalityList.length > 0
                  ? String(personalityList[0])
                  : "";
              const traitLabel = firstTrait.includes("—")
                ? firstTrait.split("—")[0].trim()
                : firstTrait;
              const firstName = char.name.split(" ")[0];

              return (
                <Link
                  key={char.slug}
                  href={`/characters/${char.slug}`}
                  className={`group border ${accent.card} rounded-3xl p-5 flex flex-col items-center gap-3 hover:shadow-lg transition-all hover:scale-[1.02] text-center`}
                >
                  {/* Official profile image */}
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden bg-white/70 border border-white/80 shadow-sm flex items-center justify-center flex-shrink-0">
                    {profileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profileUrl}
                        alt={`${char.name} official character profile`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-4xl select-none" aria-hidden="true">🍍</span>
                    )}
                  </div>

                  {/* Name, role, first trait */}
                  <div>
                    <h3 className="text-base font-black text-tiki-brown leading-tight mb-0.5">
                      {char.name}
                    </h3>
                    {(char as { role?: string }).role && (
                      <p className={`text-xs font-semibold ${accent.link} mb-1`}>
                        {(char as { role?: string }).role}
                      </p>
                    )}
                    {traitLabel && (
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${accent.badge}`}>
                        {traitLabel}
                      </span>
                    )}
                  </div>

                  <span className={`text-xs font-bold ${accent.link} group-hover:underline mt-auto`}>
                    Meet {firstName} →
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

      {/* ── C. STORY EXPERIENCE ─────────────────────────────────────────────── */}
      <section className="bg-ube-purple/5 border-y border-ube-purple/12 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-ube-purple/10 text-ube-purple text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              Story Experience
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              4 Ways to Enjoy Each Story
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Every Fruit Baby episode is designed for multiple experiences — choose how
              your family wants to enjoy it.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                emoji: "📖",
                title: "Read",
                subtitle: "Picture Story",
                description:
                  "Follow scenes illustrated with official character artwork — a colorful storybook experience for all ages.",
                color: "bg-pineapple-yellow/15 border-pineapple-yellow/30",
              },
              {
                emoji: "🎧",
                title: "Listen",
                subtitle: "Audio Story",
                description:
                  "Hear the story brought to life with warm read-aloud narration — great for car rides and bedtime.",
                color: "bg-sky-blue/15 border-sky-blue/25",
              },
              {
                emoji: "🎞️",
                title: "Watch",
                subtitle: "Animated Clips",
                description:
                  "Short animated moments bring key scenes to life — kids get to see the characters move and react.",
                color: "bg-tropical-green/12 border-tropical-green/25",
              },
              {
                emoji: "🎬",
                title: "Full Video",
                subtitle: "Complete Story",
                description:
                  "Experience the whole episode as a fully produced short video — from opening to the big lesson.",
                color: "bg-ube-purple/10 border-ube-purple/20",
              },
            ].map(({ emoji, title, subtitle, description, color }) => (
              <div
                key={title}
                className={`${color} border rounded-3xl p-6 flex flex-col gap-3`}
              >
                <span className="text-4xl" aria-hidden="true">{emoji}</span>
                <div>
                  <p className="text-base font-black text-tiki-brown">{title}</p>
                  <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
                    {subtitle}
                  </p>
                </div>
                <p className="text-sm text-tiki-brown/70 leading-relaxed flex-1">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              href="/stories"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold px-8 py-3.5 rounded-full shadow-md hover:bg-ube-purple/85 hover:shadow-lg transition-all"
            >
              Browse Stories →
            </Link>
          </div>
        </div>
      </section>

      {/* ── D. EDUCATIONAL / FAMILY VALUE ───────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-tropical-green/12 text-tropical-green text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
                For Families &amp; Classrooms
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-5 leading-tight">
                Stories That Teach Kindness
              </h2>
              <p className="text-tiki-brown/70 text-base leading-relaxed mb-6">
                Every Fruit Baby adventure explores something real — friendship, sharing,
                big feelings, tough choices, and the quiet power of kindness. Stories are
                designed to spark conversations and leave little ones with something to
                think about long after the story ends.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  { emoji: "💛", text: "Kindness and empathy in everyday moments" },
                  { emoji: "🌱", text: "Lessons about friendship, sharing, and feelings" },
                  { emoji: "📚", text: "Great for family read-alouds and classroom time" },
                  { emoji: "🎨", text: "Vibrant visuals designed to spark curiosity" },
                ].map(({ emoji, text }) => (
                  <li
                    key={text}
                    className="flex items-start gap-3 text-sm text-tiki-brown/75 leading-relaxed"
                  >
                    <span className="text-lg flex-shrink-0" aria-hidden="true">{emoji}</span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-4">
              {[
                {
                  emoji: "👨‍👩‍👧",
                  title: "For Families",
                  desc: "Warm stories built for shared reading moments, rainy-day watching, and bedtime routines.",
                  bg: "bg-pineapple-yellow/15 border-pineapple-yellow/30",
                },
                {
                  emoji: "🏫",
                  title: "For Teachers",
                  desc: "Short stories with clear, age-appropriate lessons — ready for classroom conversations.",
                  bg: "bg-sky-blue/15 border-sky-blue/25",
                },
                {
                  emoji: "🧸",
                  title: "For Kids",
                  desc: "Characters with big hearts, relatable feelings, and silly adventures that feel like real life.",
                  bg: "bg-tropical-green/12 border-tropical-green/25",
                },
              ].map(({ emoji, title, desc, bg }) => (
                <div key={title} className={`${bg} border rounded-2xl p-4 flex gap-3 items-start`}>
                  <span className="text-2xl flex-shrink-0" aria-hidden="true">{emoji}</span>
                  <div>
                    <p className="text-sm font-black text-tiki-brown mb-0.5">{title}</p>
                    <p className="text-xs text-tiki-brown/65 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── E. FRUIT BABY WORLD / ENVIRONMENTS ──────────────────────────────── */}
      <section className="bg-pineapple-yellow/8 border-y border-pineapple-yellow/20 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-pineapple-yellow/25 text-tiki-brown text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              The World
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              A Colorful Little Universe
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Every Fruit Baby story grows from a colorful world of homes, gardens, beaches,
              classrooms, markets, and magical little places.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              {
                emoji: "🌴",
                place: "Pineapple Patch",
                desc: "Home of Pineapple Baby — sunny, warm, and full of life.",
                color: "bg-pineapple-yellow/20 border-pineapple-yellow/35",
              },
              {
                emoji: "🌸",
                place: "Ube Garden",
                desc: "A dreamy purple valley of wildflowers and soft breezes.",
                color: "bg-ube-purple/12 border-ube-purple/25",
              },
              {
                emoji: "🏝️",
                place: "Trouble Island",
                desc: "Tiki Trouble's sneaky volcanic lair — dramatic and unpredictable.",
                color: "bg-warm-coral/15 border-warm-coral/30",
              },
              {
                emoji: "🥭",
                place: "Mango Market",
                desc: "Bright, busy, and buzzing with laughter and tropical treats.",
                color: "bg-warm-coral/10 border-warm-coral/22",
              },
              {
                emoji: "🌿",
                place: "Kiwi Meadow",
                desc: "Rolling green hills where quiet adventures and tiny wonders happen.",
                color: "bg-tropical-green/12 border-tropical-green/25",
              },
              {
                emoji: "🥥",
                place: "Coconut Cove",
                desc: "Calm, cozy, and always welcoming — a place to breathe and belong.",
                color: "bg-tiki-brown/8 border-tiki-brown/15",
              },
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

      {/* ── F. COLLECTOR PREVIEW ────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-warm-coral/12 text-warm-coral/90 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-widest">
              Coming Soon
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3">
              Fruit Baby Collectibles
            </h2>
            <p className="text-tiki-brown/65 text-base max-w-xl mx-auto leading-relaxed">
              Bring your favorite Fruit Baby characters home. Plush friends, storybooks,
              stickers, collector cards, and classroom kits — arriving soon.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
            {[
              { emoji: "🧸", label: "Plush Friends" },
              { emoji: "📚", label: "Storybooks" },
              { emoji: "✨", label: "Sticker Sets" },
              { emoji: "🃏", label: "Collector Cards" },
              { emoji: "🎒", label: "Classroom Kits" },
            ].map(({ emoji, label }) => (
              <div
                key={label}
                className="bg-white border border-tiki-brown/10 rounded-2xl p-5 flex flex-col items-center gap-2 text-center shadow-sm"
              >
                <span className="text-3xl" aria-hidden="true">{emoji}</span>
                <p className="text-xs font-bold text-tiki-brown/70 uppercase tracking-wide">
                  {label}
                </p>
                <span className="text-xs text-tiki-brown/35 font-semibold">Coming Soon</span>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-tiki-brown text-white font-bold px-8 py-3.5 rounded-full shadow-md hover:bg-tiki-brown/85 hover:shadow-lg transition-all"
            >
              See Product Previews →
            </Link>
            <p className="text-xs text-tiki-brown/40 mt-3 font-semibold">
              Previews only — no purchase available yet.
            </p>
          </div>
        </div>
      </section>

      {/* ── G. FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-ube-purple/8 to-bg-cream border-t border-ube-purple/12 py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="text-5xl mb-5" aria-hidden="true">🍍</div>
          <h2 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-4">
            Your Fruit Baby Adventure Starts Here
          </h2>
          <p className="text-tiki-brown/65 text-base leading-relaxed mb-8 max-w-lg mx-auto">
            Meet the characters, explore the stories, and discover what's coming to the
            Fruit Baby World universe next.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link
              href="/characters"
              className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              🍍 Meet the Characters
            </Link>
            <Link
              href="/stories"
              className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-bold px-8 py-3.5 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              🎬 Explore Stories
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
