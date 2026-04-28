import type { Metadata } from "next";
import Link from "next/link";
import { getAllCharacters, getAllEpisodes, getAllProducts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Story Studio | Fruit Baby World Admin",
  description: "Private admin workspace for Fruit Baby World story creation.",
};

const modules = [
  {
    title: "Storyboard Builder",
    description:
      "Write episode concepts and storyboard ideas using structured prompts. Lay out scenes, characters, settings, and lessons before generating.",
    status: "Coming Soon",
    statusColor: "bg-pineapple-yellow/40 text-tiki-brown",
    emoji: "📝",
    href: "/admin/storyboards",
  },
  {
    title: "Episode Package Generator",
    description:
      "Generate complete episode packages — scripts, scene descriptions, dialogue, image prompts, and animation prompts — from a storyboard input.",
    status: "Coming Soon",
    statusColor: "bg-pineapple-yellow/40 text-tiki-brown",
    emoji: "🎬",
    href: "/admin/episodes",
  },
  {
    title: "Character Canon Library",
    description:
      "Browse official character profiles, visual references, approved color palettes, personality notes, and canonical JSON data in one place.",
    status: "Planned",
    statusColor: "bg-sky-blue/60 text-tiki-brown",
    emoji: "📚",
    href: "/admin/characters",
  },
  {
    title: "Reference-Anchored Variation Generator",
    description:
      "Generate new poses, expressions, and scene artwork using official character references as anchors. All output requires human approval before use.",
    status: "Future Phase",
    statusColor: "bg-blush-pink/40 text-tiki-brown",
    emoji: "🎨",
    href: "/admin/variations",
  },
  {
    title: "Product & Merch Planner",
    description:
      "Plan merchandise concepts, link them to characters and episodes, track design status, and prepare product listings for the public shop.",
    status: "Planned",
    statusColor: "bg-sky-blue/60 text-tiki-brown",
    emoji: "🛍️",
    href: "/admin/products",
  },
  {
    title: "Publishing Queue",
    description:
      "Review approved episodes and assets, manage draft/approved/published workflow, and control what content appears on public-facing pages.",
    status: "Future Phase",
    statusColor: "bg-blush-pink/40 text-tiki-brown",
    emoji: "📤",
    href: "/admin/publishing",
  },
  {
    title: "GitHub Content Saver",
    description:
      "Commit approved episode packages, character variation assets, and product content directly to the repository as canonical JSON and media files.",
    status: "Future Phase",
    statusColor: "bg-blush-pink/40 text-tiki-brown",
    emoji: "💾",
    href: null,
  },
];

const pipelineSteps = [
  { step: 1, label: "Write storyboard idea", emoji: "✍️" },
  { step: 2, label: "Generate episode package", emoji: "⚙️" },
  { step: 3, label: "Review character fidelity", emoji: "🔍" },
  { step: 4, label: "Approve scenes & assets", emoji: "✅" },
  { step: 5, label: "Save approved content", emoji: "💾" },
  { step: 6, label: "Publish to website", emoji: "🚀" },
];

const canonRules = {
  must: [
    "Body shape, silhouette, and proportions",
    "Eye style, mouth style, and blush/cheek details",
    "Fruit body texture and natural color palette",
    "Leaf, crown, and signature accessory shapes",
    "Cute baby-like design language and scale",
    "Brand color palettes as defined in canonical JSON",
  ],
  may: [
    "New poses and expressive character moments",
    "New scene compositions for episodes and stories",
    "Promotional and episode artwork in varied settings",
    "Animation and story frame variations",
    "Seasonal or thematic costume additions (non-destructive)",
  ],
  never: [
    "Redesign characters or alter their fruit identity",
    "Change defining colors or remove signature features",
    "Make characters older, realistic, sharper, or off-brand",
    'Create loose "inspired by" versions that drift from the official references',
    "Publish any generated variation without human approval",
    "Allow public users to freely generate character variations",
  ],
};

export default function AdminPage() {
  const characterCount = getAllCharacters().length;
  const episodeCount = getAllEpisodes().length;
  const productCount = getAllProducts().length;

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-b from-ube-purple/20 via-bg-cream to-bg-cream py-14 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Private Workspace
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-warm-coral/20 text-tiki-brown uppercase tracking-widest">
              Admin Only
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-tiki-brown mb-4 leading-tight">
            Fruit Baby{" "}
            <span className="text-ube-purple">Story Studio</span>
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-2xl mb-6">
            A private creative workspace for building storyboards, episode
            packages, character-safe prompts, and future Fruit Baby adventures.
          </p>

          {/* Planning shell notice */}
          <div className="inline-flex items-start gap-3 bg-white border border-pineapple-yellow/50 rounded-2xl px-5 py-4 shadow-sm max-w-2xl">
            <span className="text-xl flex-shrink-0">🏗️</span>
            <div>
              <p className="text-sm font-bold text-tiki-brown mb-0.5">
                Planning shell only
              </p>
              <p className="text-sm text-tiki-brown/65 leading-relaxed">
                Story creation, AI generation, image generation, GitHub saving,
                and publishing controls will be added in future phases.
                Admin-only tools are coming soon.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Current Content Snapshot */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <h2 className="text-lg font-black text-tiki-brown mb-4">
          📊 Current Content Snapshot
        </h2>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Characters", count: characterCount, emoji: "🍍" },
            { label: "Episodes", count: episodeCount, emoji: "🎬" },
            { label: "Products", count: productCount, emoji: "🛍️" },
          ].map(({ label, count, emoji }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-5 py-5 text-center"
            >
              <div className="text-2xl mb-1">{emoji}</div>
              <div className="text-3xl font-black text-tiki-brown">{count}</div>
              <div className="text-xs font-semibold text-tiki-brown/50 mt-1">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* Admin Modules */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🧩 Studio Modules
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Future admin tools — non-functional planning cards.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((mod) => {
            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-3xl">{mod.emoji}</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${mod.statusColor}`}
                  >
                    {mod.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-tiki-brown leading-snug">
                  {mod.title}
                </h3>
                <p className="text-sm text-tiki-brown/65 leading-relaxed flex-1">
                  {mod.description}
                </p>
              </>
            );
            const cardClass =
              "bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-3";
            return mod.href ? (
              <Link
                key={mod.title}
                href={mod.href}
                className={`${cardClass} hover:shadow-md hover:scale-[1.01] transition-all`}
              >
                {cardContent}
              </Link>
            ) : (
              <div key={mod.title} className={cardClass}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* Content Pipeline */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🔄 Content Pipeline
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Planned workflow from idea to published episode — visual only.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {pipelineSteps.map((s, i) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-ube-purple/15 text-ube-purple text-xs font-black flex items-center justify-center">
                  {s.step}
                </span>
                <span className="text-base">{s.emoji}</span>
                <span className="text-sm font-semibold text-tiki-brown whitespace-nowrap">
                  {s.label}
                </span>
              </div>
              {i < pipelineSteps.length - 1 && (
                <span className="text-tiki-brown/30 font-bold text-lg hidden sm:block">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* Canon Protection */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🔒 Canon Protection
          </h2>
          <p className="text-sm text-tiki-brown/60 max-w-2xl">
            Official character profile images and canonical JSON are the source
            of truth. Future AI generation must be reference-anchored. All
            generated assets require human approval before publishing. Public
            users should not freely generate character variations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Must Preserve */}
          <div className="bg-white rounded-3xl border border-tropical-green/30 shadow-sm p-6">
            <h3 className="text-sm font-black text-tiki-brown mb-3 flex items-center gap-2">
              <span className="text-base">✅</span> AI Must Preserve
            </h3>
            <ul className="space-y-2">
              {canonRules.must.map((rule) => (
                <li
                  key={rule}
                  className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5"
                >
                  <span className="text-tropical-green flex-shrink-0 mt-0.5">
                    •
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* May Generate */}
          <div className="bg-white rounded-3xl border border-pineapple-yellow/40 shadow-sm p-6">
            <h3 className="text-sm font-black text-tiki-brown mb-3 flex items-center gap-2">
              <span className="text-base">🎨</span> AI May Generate
            </h3>
            <ul className="space-y-2">
              {canonRules.may.map((rule) => (
                <li
                  key={rule}
                  className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5"
                >
                  <span className="text-pineapple-yellow flex-shrink-0 mt-0.5">
                    •
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          {/* Must Never */}
          <div className="bg-white rounded-3xl border border-warm-coral/30 shadow-sm p-6">
            <h3 className="text-sm font-black text-tiki-brown mb-3 flex items-center gap-2">
              <span className="text-base">🚫</span> AI Must Never
            </h3>
            <ul className="space-y-2">
              {canonRules.never.map((rule) => (
                <li
                  key={rule}
                  className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5"
                >
                  <span className="text-warm-coral flex-shrink-0 mt-0.5">
                    •
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}
