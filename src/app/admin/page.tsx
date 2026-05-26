import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodes, getAllProducts } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";

export const metadata: Metadata = {
  title: "Dashboard | Fruit Baby World Admin",
  description: "Private admin workspace for Fruit Baby World story publishing.",
};

// ─── Primary studios ──────────────────────────────────────────────────────────

const primaryStudios = [
  {
    emoji: "📖",
    title: "Stories",
    description: "Upload storybook pages, audio, and video for each story.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/episodes",
  },
  {
    emoji: "🍍",
    title: "Characters",
    description: "Manage character profiles and reference galleries.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/characters",
  },
  {
    emoji: "🎞️",
    title: "Media",
    description: "View uploaded storybook, audio, and video assets.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/media",
  },
  {
    emoji: "🚀",
    title: "Publish",
    description: "Review stories and make them public.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/publishing",
  },
];

// ─── Developer / Legacy tools ─────────────────────────────────────────────────

const developerTools = [
  {
    emoji: "🩺",
    title: "Media Health",
    description: "Find missing media, hidden assets, and readiness issues.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/media-health",
  },
  {
    emoji: "🛍️",
    title: "Product Studio",
    description: "Plan products, generate mockups, and prepare collector previews.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/products",
  },
  {
    emoji: "📝",
    title: "Storyboard Builder",
    description: "Lay out episode concepts and scenes before building in Stories.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/storyboards",
  },
  {
    emoji: "🎨",
    title: "Variation Tools",
    description: "Generate reference-anchored poses and artwork using official references.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/variations",
  },
  {
    emoji: "🔒",
    title: "Canon Center",
    description: "Review character canon rules and official brand integrity standards.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/canon",
  },
];

// ─── Canon rules (reference) ──────────────────────────────────────────────────

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
    'Create loose "inspired by" versions that drift from official references',
    "Publish any generated variation without human approval",
    "Allow public users to freely generate character variations",
  ],
};

// ─── Shared card component ────────────────────────────────────────────────────

function StudioCard({
  emoji,
  title,
  description,
  status,
  statusColor,
  href,
  size = "normal",
}: {
  emoji: string;
  title: string;
  description: string;
  status: string;
  statusColor: string;
  href: string;
  size?: "normal" | "large";
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className={size === "large" ? "text-4xl" : "text-3xl"}>{emoji}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${statusColor}`}>
          {status}
        </span>
      </div>
      <h3 className={`font-black text-tiki-brown leading-snug ${size === "large" ? "text-lg" : "text-base"}`}>
        {title}
      </h3>
      <p className="text-sm text-tiki-brown/65 leading-relaxed flex-1">{description}</p>
    </>
  );

  return (
    <Link
      href={href}
      className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-3 hover:shadow-md hover:scale-[1.01] transition-all"
    >
      {inner}
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  let characterCount = 0;
  try { characterCount = loadAllCharactersFromDisk().length; } catch { characterCount = 0; }
  const episodeCount = getAllEpisodes().length;
  const productCount = getAllProducts().length;

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── Hero ── */}
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
            <span className="text-ube-purple">Story Publishing</span>
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-2xl">
            Upload storybook pages, audio, and video. Publish finished stories for readers.
          </p>
        </div>
      </section>

      {/* ── Content Snapshot ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <h2 className="text-lg font-black text-tiki-brown mb-4">
          📊 Content Snapshot
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
              <div className="text-xs font-semibold text-tiki-brown/50 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Primary Studios ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            📖 Publishing Tools
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Everything you need to upload and publish Fruit Baby stories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
          {primaryStudios.map((s) => (
            <StudioCard key={s.title} {...s} size="large" />
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Developer / Legacy Tools (collapsed) ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-6">
        <details className="group">
          <summary className="cursor-pointer list-none flex items-center gap-2 select-none">
            <span className="text-xs font-bold text-tiki-brown/35 uppercase tracking-widest hover:text-tiki-brown/55 transition-colors">
              🔧 Developer / Legacy Tools
            </span>
            <span className="text-[10px] text-tiki-brown/30 group-open:hidden">▼</span>
            <span className="text-[10px] text-tiki-brown/30 hidden group-open:inline">▲</span>
          </summary>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {developerTools.map((t) => (
              <StudioCard key={t.title} {...t} />
            ))}
          </div>
        </details>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Canon Protection ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🔒 Canon Protection
          </h2>
          <p className="text-sm text-tiki-brown/60 max-w-2xl">
            Official character profile images and canonical JSON are the source of truth.
            All generation is reference-anchored. All generated assets require human approval before publishing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white rounded-3xl border border-tropical-green/30 shadow-sm p-6">
            <h3 className="text-sm font-black text-tiki-brown mb-3 flex items-center gap-2">
              <span className="text-base">✅</span> AI Must Preserve
            </h3>
            <ul className="space-y-2">
              {canonRules.must.map((rule) => (
                <li key={rule} className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5">
                  <span className="text-tropical-green flex-shrink-0 mt-0.5">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl border border-pineapple-yellow/40 shadow-sm p-6">
            <h3 className="text-sm font-black text-tiki-brown mb-3 flex items-center gap-2">
              <span className="text-base">🎨</span> AI May Generate
            </h3>
            <ul className="space-y-2">
              {canonRules.may.map((rule) => (
                <li key={rule} className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5">
                  <span className="text-pineapple-yellow flex-shrink-0 mt-0.5">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl border border-warm-coral/30 shadow-sm p-6">
            <h3 className="text-sm font-black text-tiki-brown mb-3 flex items-center gap-2">
              <span className="text-base">🚫</span> AI Must Never
            </h3>
            <ul className="space-y-2">
              {canonRules.never.map((rule) => (
                <li key={rule} className="text-xs text-tiki-brown/70 leading-snug flex items-start gap-1.5">
                  <span className="text-warm-coral flex-shrink-0 mt-0.5">•</span>
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
