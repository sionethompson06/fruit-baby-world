import type { Metadata } from "next";
import Link from "next/link";
import { getAllEpisodes, getAllProducts } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";

export const metadata: Metadata = {
  title: "Production Studio | Fruit Baby World Admin",
  description: "Private admin workspace for Fruit Baby World story creation.",
};

// ─── Primary production studios ───────────────────────────────────────────────

const primaryStudios = [
  {
    emoji: "🍍",
    title: "Character Studio",
    description:
      "Manage official characters, references, profiles, and character integrity.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/characters",
  },
  {
    emoji: "🎬",
    title: "Story Studio",
    description:
      "Build episodes, upload storybook pages, add audio narration, and publish finished stories.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/episodes",
  },
  {
    emoji: "🎞️",
    title: "Media Studio",
    description:
      "Browse all production media in one place — panels, audio, clips, videos, and mockups.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/media",
  },
  {
    emoji: "🩺",
    title: "Media Health",
    description:
      "Find missing media, hidden assets, readiness issues, and public display problems.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/media-health",
  },
  {
    emoji: "📤",
    title: "Publishing",
    description:
      "Review public readiness and publishing status.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/publishing",
  },
  {
    emoji: "🛍️",
    title: "Product Studio",
    description:
      "Plan products, generate mockups, and prepare collector previews.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/products",
  },
];

// ─── Advanced / system tools ──────────────────────────────────────────────────

const advancedTools = [
  {
    emoji: "📝",
    title: "Storyboard Builder",
    description:
      "Lay out episode concepts, scenes, characters, settings, and lessons before building in Story Studio.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/storyboards",
  },
  {
    emoji: "🎨",
    title: "Variation Tools",
    description:
      "Generate reference-anchored poses and artwork using official character references. All output requires human approval before use.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/variations",
  },
  {
    emoji: "🔒",
    title: "Canon Center",
    description:
      "Review character canon rules, must-preserve features, AI generation guidelines, and official brand integrity standards.",
    status: "Active",
    statusColor: "bg-tropical-green/20 text-tropical-green",
    href: "/admin/canon",
  },
];

// ─── Recommended production workflow ─────────────────────────────────────────

const workflowSteps = [
  { step: 1, label: "Build Character Profiles",  emoji: "🍍", note: "Character Studio" },
  { step: 2, label: "Create / Edit Story",        emoji: "✍️", note: "Story Studio" },
  { step: 3, label: "Upload Storybook Pages",     emoji: "📚", note: "Story Studio" },
  { step: 4, label: "Add Audio Narration",        emoji: "🎧", note: "Story Studio" },
  { step: 5, label: "Upload Cartoon Video",       emoji: "🎬", note: "Story Studio" },
  { step: 6, label: "Preview & Publish",          emoji: "🚀", note: "Publishing" },
];

// ─── Today's production guidance ─────────────────────────────────────────────

const todayGuidance = [
  {
    icon: "🍍",
    text: "Start with Character Studio if a character is missing references or profile details.",
    href: "/admin/characters",
    label: "Character Studio",
  },
  {
    icon: "🎬",
    text: "Open Story Studio to upload storybook pages, audio narration, and video for an episode.",
    href: "/admin/episodes",
    label: "Story Studio",
  },
  {
    icon: "🎞️",
    text: "Open Media Studio to browse all production media in one central place.",
    href: "/admin/media",
    label: "Media Studio",
  },
  {
    icon: "🩺",
    text: "Open Media Health before publishing to catch missing or broken media.",
    href: "/admin/media-health",
    label: "Media Health",
  },
  {
    icon: "📤",
    text: "Use Publishing when a story is approved and ready for public release.",
    href: "/admin/publishing",
    label: "Publishing",
  },
  {
    icon: "🛍️",
    text: "Open Product Studio to plan mockups and manage the /shop collector preview.",
    href: "/admin/products",
    label: "Product Studio",
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
            <span className="text-ube-purple">Production Studio</span>
          </h1>
          <p className="text-tiki-brown/70 text-lg leading-relaxed max-w-2xl">
            Create, review, and publish character-safe Fruit Baby stories, media, and products.
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

      {/* ── Primary Production Studios ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🎬 Production Studios
          </h2>
          <p className="text-sm text-tiki-brown/60">
            The core tools for building and publishing Fruit Baby stories.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {primaryStudios.map((s) => (
            <StudioCard key={s.title} {...s} size="large" />
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Today's Production Flow ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-6">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            ⚡ Today's Production Flow
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Quick guidance on where to start.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {todayGuidance.map(({ icon, text, href, label }) => (
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

      {/* ── Recommended Workflow ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🔄 Recommended Workflow
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Full production sequence from character setup to published story.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          {workflowSteps.map((s, i) => (
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
              {i < workflowSteps.length - 1 && (
                <span className="text-tiki-brown/30 font-bold text-lg hidden sm:block">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6">
        <div className="border-t border-dashed border-tiki-brown/15" />
      </div>

      {/* ── Advanced Tools ── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-10">
        <div className="mb-7">
          <h2 className="text-2xl font-black text-tiki-brown mb-1">
            🧩 Advanced Tools
          </h2>
          <p className="text-sm text-tiki-brown/60">
            Planning, canon management, and developer tools.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {advancedTools.map((t) => (
            <StudioCard key={t.title} {...t} />
          ))}
        </div>
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
