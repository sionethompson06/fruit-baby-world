import Link from "next/link";

const sections = [
  {
    emoji: "🍍",
    title: "Meet the Characters",
    description:
      "Discover Pineapple Baby, Ube Baby, Mango Baby, Kiwi Baby, Coconut Baby, and more fruit friends from the Fruit Baby Universe!",
    href: "/characters",
    label: "Meet Them All",
    bg: "bg-pineapple-yellow/20",
    border: "border-pineapple-yellow",
    btn: "bg-pineapple-yellow text-tiki-brown hover:bg-pineapple-yellow/80",
  },
  {
    emoji: "🎬",
    title: "Watch the Stories",
    description:
      "Follow the Fruit Baby friends through sweet adventures, silly moments, and heartwarming tales in every episode.",
    href: "/stories",
    label: "Watch Now",
    bg: "bg-sky-blue/30",
    border: "border-sky-blue",
    btn: "bg-sky-blue text-tiki-brown hover:bg-sky-blue/70",
  },
  {
    emoji: "🛍️",
    title: "Explore the Shop",
    description:
      "Plushies, squishes, stickers, collectibles, and more. Bring your favorite Fruit Baby characters home!",
    href: "/shop",
    label: "Shop Now",
    bg: "bg-kiwi-green/20",
    border: "border-kiwi-green",
    btn: "bg-tropical-green text-white hover:bg-tropical-green/80",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-pineapple-yellow/30 via-bg-cream to-bg-cream py-20 px-4 text-center">
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
          <span className="absolute top-6 left-8 text-5xl opacity-20 rotate-[-12deg]">🍍</span>
          <span className="absolute top-10 right-10 text-4xl opacity-20 rotate-[8deg]">🥭</span>
          <span className="absolute bottom-8 left-16 text-4xl opacity-20 rotate-[6deg]">🥝</span>
          <span className="absolute bottom-10 right-20 text-5xl opacity-20 rotate-[-6deg]">🫐</span>
          <span className="absolute top-1/2 left-4 text-3xl opacity-10">🥥</span>
          <span className="absolute top-1/3 right-4 text-3xl opacity-10">⭐</span>
        </div>

        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-pineapple-yellow/40 text-tiki-brown text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-pineapple-yellow/60">
            ✨ Welcome to Fruit Baby World™
          </div>

          <h1 className="text-5xl sm:text-7xl font-black tracking-tight text-tiki-brown leading-none mb-4">
            Fruit Baby{" "}
            <span className="text-ube-purple drop-shadow-sm">World</span>
          </h1>

          <p className="text-lg sm:text-xl text-tiki-brown/75 max-w-xl mx-auto leading-relaxed mb-10">
            A playful world of fruit friends, animated stories, and collectible
            character adventures.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/characters"
              className="inline-flex items-center justify-center gap-2 bg-pineapple-yellow text-tiki-brown font-bold px-7 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              🍍 Meet the Characters
            </Link>
            <Link
              href="/stories"
              className="inline-flex items-center justify-center gap-2 bg-ube-purple text-white font-bold px-7 py-3 rounded-full shadow-md hover:shadow-lg hover:scale-105 transition-all"
            >
              🎬 Watch the Stories
            </Link>
          </div>
        </div>
      </section>

      {/* Section Cards */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-16">
        <h2 className="text-3xl font-black text-tiki-brown text-center mb-10">
          Everything in Fruit Baby World
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {sections.map(({ emoji, title, description, href, label, bg, border, btn }) => (
            <div
              key={href}
              className={`${bg} border-2 ${border} rounded-3xl p-6 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow`}
            >
              <div className="text-5xl">{emoji}</div>
              <h3 className="text-xl font-black text-tiki-brown">{title}</h3>
              <p className="text-sm text-tiki-brown/70 leading-relaxed flex-1">
                {description}
              </p>
              <Link
                href={href}
                className={`${btn} inline-flex items-center justify-center font-bold text-sm px-5 py-2.5 rounded-full transition-all hover:scale-105 shadow-sm w-fit`}
              >
                {label}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Coming Soon Banner */}
      <section className="bg-ube-purple/10 border-y border-ube-purple/20 py-12 px-4 text-center">
        <div className="max-w-xl mx-auto">
          <div className="text-4xl mb-3">🎨</div>
          <h3 className="text-2xl font-black text-ube-purple mb-2">
            Story Studio — Coming Soon
          </h3>
          <p className="text-tiki-brown/70 text-sm leading-relaxed">
            A private creative studio for generating Fruit Baby episode scripts,
            scene illustrations, and storyboard packages.
          </p>
        </div>
      </section>
    </div>
  );
}
