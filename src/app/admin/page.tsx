import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodes, getAllProducts } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";

export const metadata: Metadata = {
  title: "Admin | Fruit Baby World",
  description: "Admin dashboard for managing Fruit Baby stories, characters, and media.",
};

// ─── Primary dashboard cards ──────────────────────────────────────────────────

const primaryCards = [
  {
    emoji: "🌟",
    title: "Homepage Showcase",
    description:
      "Upload hero art, character showcase images, Tiki Trouble, and world location visuals.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/homepage",
  },
  {
    emoji: "📚",
    title: "Stories",
    description:
      "Upload storybook pages, add audio narration, upload video, preview, and publish.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/storybooks",
  },
  {
    emoji: "🍍",
    title: "Characters",
    description:
      "Manage character profiles and reference galleries.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/characters",
  },
  {
    emoji: "🎞️",
    title: "Media",
    description:
      "View all uploaded storybook images, audio, and video assets.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/media",
  },
  {
    emoji: "📤",
    title: "Publish",
    description:
      "Review public-ready stories and manage visibility.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/publishing",
  },
  {
    emoji: "🛍️",
    title: "Products",
    description:
      "Manage product lines, collectables, product images, and shop details.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/products",
  },
  {
    emoji: "🎬",
    title: "Animated Stories",
    description:
      "Build animated story titles and upload ordered video clips.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/animated-stories",
  },
];

// ─── Recommended publishing workflow ──────────────────────────────────────────

const publishingWorkflow = [
  { step: 1, label: "Create Story",         emoji: "✍️", note: "Title & description" },
  { step: 2, label: "Upload Pages",         emoji: "📚", note: "Storybook images" },
  { step: 3, label: "Add Audio",            emoji: "🎧", note: "Narration" },
  { step: 4, label: "Upload Video",         emoji: "🎬", note: "Optional cartoon" },
  { step: 5, label: "Preview & Publish",    emoji: "🚀", note: "Make public" },
];

// ─── Quick start guidance ─────────────────────────────────────────────────────

const quickStart = [
  {
    icon: "📚",
    text: "Go to Stories to create and upload storybook pages, add audio and video, then publish.",
    href: "/admin/storybooks",
    label: "Stories",
  },
  {
    icon: "🍍",
    text: "Go to Characters to manage character profiles and reference galleries.",
    href: "/admin/characters",
    label: "Characters",
  },
  {
    icon: "🎞️",
    text: "Go to Media to browse all uploaded images, audio, and video.",
    href: "/admin/media",
    label: "Media",
  },
  {
    icon: "📤",
    text: "Go to Publish to review stories and manage which ones are public.",
    href: "/admin/publishing",
    label: "Publish",
  },
  {
    icon: "🛍️",
    text: "Go to Products to manage shop collectables, upload product images, assign image roles, and edit product details.",
    href: "/admin/products",
    label: "Products",
  },
  {
    icon: "🎬",
    text: "Go to Animated Stories to create story titles and upload ordered video clips.",
    href: "/admin/animated-stories",
    label: "Animated Stories",
  },
];

// ─── Developer / Legacy tools ────────────────────────────────────────────────

const developerTools = [
  {
    emoji: "📝",
    title: "Storyboard Builder",
    description:
      "Lay out episode concepts before building stories.",
    status: "Legacy",
    statusColor: "bg-tiki-brown/10 text-tiki-brown/60",
    href: "/admin/storyboards",
  },
  {
    emoji: "🎨",
    title: "Variation Tools",
    description:
      "Generate character variations (requires approval before use).",
    status: "Legacy",
    statusColor: "bg-tiki-brown/10 text-tiki-brown/60",
    href: "/admin/variations",
  },
  {
    emoji: "🩺",
    title: "Media Health",
    description:
      "Find missing media and readiness issues.",
    status: "Legacy",
    statusColor: "bg-tiki-brown/10 text-tiki-brown/60",
    href: "/admin/media-health",
  },
  {
    emoji: "🔒",
    title: "Canon Center",
    description:
      "Review character canon rules and brand guidelines.",
    status: "Legacy",
    statusColor: "bg-tiki-brown/10 text-tiki-brown/60",
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
            <span className="text-ube-purple">Admin</span>
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-2xl">
            Upload storybook images, add audio narration, upload video content, and publish Fruit Baby stories.
          </p>
        </div>
      </section>

      {/* ── Create New Storybook CTA ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-2 pb-6">
        <div className="bg-gradient-to-br from-ube-purple to-ube-purple/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-lg">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-3xl">📖</span>
              <h2 className="text-xl font-black text-white leading-tight">Create New Storybook</h2>
            </div>
            <p className="text-white/75 text-sm leading-relaxed">
              Start a new storybook by adding a title, about text, and uploading cover and spread images.
            </p>
          </div>
          <Link
            href="/admin/storybooks/new"
            className="flex-shrink-0 flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-2xl bg-white text-ube-purple hover:bg-white/90 transition-colors shadow-sm"
          >
            <span>+</span>
            Create Storybook
          </Link>
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

      {/* ── Primary Dashboard Cards ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            📖 Publishing Dashboard
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Upload, edit, and publish Fruit Baby stories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {primaryCards.map((s) => (
            <StudioCard key={s.title} {...s} size="large" />
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Quick Start ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            ⚡ Quick Start
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Where to go next.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {quickStart.map(({ icon, text, href, label }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-5 py-4 flex items-center gap-4"
            >
              <span className="text-2xl flex-shrink-0">{icon}</span>
              <p className="text-sm text-tiki-brown/70 leading-relaxed flex-1">{text}</p>
              <Link
                href={href}
                className="text-xs font-bold px-3 py-1.5 rounded-xl bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/18 transition-colors whitespace-nowrap flex-shrink-0"
              >
                {label} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Publishing Workflow ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🔄 Publishing Workflow
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Steps to create and publish a story.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {publishingWorkflow.map((s, i) => (
            <div key={s.step} className="flex items-center gap-3">
              <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-4 py-3 flex items-center gap-3 flex-shrink-0">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-ube-purple/15 text-ube-purple text-xs font-black flex items-center justify-center">
                  {s.step}
                </span>
                <span className="text-base">{s.emoji}</span>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-tiki-brown whitespace-nowrap leading-tight">
                    {s.label}
                  </span>
                  <span className="text-xs text-tiki-brown/40 whitespace-nowrap leading-tight">
                    {s.note}
                  </span>
                </div>
              </div>
              {i < publishingWorkflow.length - 1 && (
                <span className="text-tiki-brown/30 font-bold text-lg hidden sm:block">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Developer / Legacy Tools ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown/60 mb-1">
            🧩 Developer / Legacy Tools
          </h2>
          <p className="text-sm text-tiki-brown/50">
            Advanced and experimental tools retained while the app transitions to upload-first publishing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {developerTools.map((t) => (
            <StudioCard key={t.title} {...t} />
          ))}
        </div>
      </section>
    </div>
  );
}
