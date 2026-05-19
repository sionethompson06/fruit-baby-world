import type { Metadata } from "next";
import Link from "next/link";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { isCharacterApprovedForAdminUse } from "@/lib/characterEligibility";
import { normalizeCharacterProfile } from "@/lib/characterProfileNormalizer";
import {
  getAllProductConcepts,
  getProductConceptCategoryLabel,
  getProductConceptStatusLabel,
} from "@/lib/productConcepts";
import type { CharacterSeedData } from "@/lib/productConceptTypes";
import ProductPromptBuilderSection from "./ProductPromptBuilderSection";

export const metadata: Metadata = {
  title: "Product Concept Studio | Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Product category groups ──────────────────────────────────────────────────

const CATEGORY_GROUPS = [
  {
    emoji: "🧸",
    title: "Plush & Squish Toys",
    description:
      "Soft plush figures, squishy companions, and huggable characters for kids and collectors.",
    colorClass: "bg-pineapple-yellow/15 border-pineapple-yellow/30",
  },
  {
    emoji: "📚",
    title: "Books & Story Bundles",
    description:
      "Board books, picture books, and story collections tied to episodes and lessons.",
    colorClass: "bg-sky-blue/15 border-sky-blue/30",
  },
  {
    emoji: "🃏",
    title: "Cards & Stickers",
    description:
      "Character trading cards, collectible sticker sheets, and character packs.",
    colorClass: "bg-ube-purple/10 border-ube-purple/20",
  },
  {
    emoji: "🏫",
    title: "Classroom Materials",
    description:
      "Educational posters, activity sheets, and lesson-linked character materials.",
    colorClass: "bg-tropical-green/10 border-tropical-green/20",
  },
  {
    emoji: "🏆",
    title: "Collectibles & Playsets",
    description:
      "Mini figures, playsets, and collectible character sets for fans and collectors.",
    colorClass: "bg-warm-coral/10 border-warm-coral/20",
  },
  {
    emoji: "👕",
    title: "Apparel Concepts",
    description:
      "Character-themed clothing, accessories, and wearable designs for all ages.",
    colorClass: "bg-tiki-brown/5 border-tiki-brown/10",
  },
];

// ─── Suggested product directions by character type ───────────────────────────

function getSuggestedProducts(type: string, role: string): string[] {
  if (type === "villain") {
    return [
      "Collectible Mini Figure",
      "Villain Trading Card",
      "Mischief Sticker Pack",
      "Trouble Island Playset",
      "Antagonist Character Card",
    ];
  }
  const roleLower = role.toLowerCase();
  if (
    roleLower.includes("gentle") ||
    roleLower.includes("calm") ||
    roleLower.includes("wise")
  ) {
    return [
      "Plush Toy",
      "Squish Toy",
      "Bedtime Story Book",
      "Classroom Poster",
      "Sticker Sheet",
      "Collectible",
    ];
  }
  if (
    roleLower.includes("spark") ||
    roleLower.includes("creative") ||
    roleLower.includes("playful")
  ) {
    return [
      "Plush Toy",
      "Squish Toy",
      "Activity Book",
      "Art Sticker Pack",
      "Classroom Poster",
      "Collectible",
    ];
  }
  return [
    "Plush Toy",
    "Squish Toy",
    "Sticker Sheet",
    "Board Book",
    "Classroom Poster",
    "Collectible",
  ];
}

// ─── Status badge styling ─────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  idea: "bg-sky-blue/20 text-tiki-brown/70",
  planned: "bg-ube-purple/15 text-ube-purple",
  "in-design": "bg-pineapple-yellow/40 text-tiki-brown",
  archived: "bg-tiki-brown/8 text-tiki-brown/40",
};

// ─── Future workflow steps ────────────────────────────────────────────────────

const FUTURE_WORKFLOW = [
  {
    label: "Plan product concept",
    note: "Connected to official character profile",
  },
  {
    label: "Build product prompt from official character profile",
    note: "Character-anchored — uses canon identity",
  },
  {
    label: "Generate mockup draft",
    note: "Requires human review and approval before use",
  },
  {
    label: "Review character & product fidelity",
    note: "Must match official canon — body, colors, face, tone",
  },
  {
    label: "Save approved product media",
    note: "Stored to media storage after approval",
  },
  {
    label: "Create public product preview",
    note: "For fan and collector preview pages",
  },
  {
    label: "Add commerce later",
    note: "Checkout, pricing, fulfillment — separate future phase",
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const allChars = loadAllCharactersFromDisk();
  const adminChars = allChars.filter(isCharacterApprovedForAdminUse);
  const normalizedChars = adminChars.map((c) => normalizeCharacterProfile(c));

  const characterSeeds: CharacterSeedData[] = normalizedChars.map((char) => ({
    slug: char.slug,
    displayName: char.displayName,
    shortName: char.shortName,
    tagline: char.tagline,
    shortDescription: char.shortDescription,
    fruitType: char.fruitType,
    role: char.role,
    type: char.type,
    home: char.home,
    visualIdentitySummary: char.visualIdentitySummary,
    colorPalette: char.colorPalette.map((c) => ({
      name: c.name,
      hex: c.hex,
      usage: c.usage,
    })),
    alwaysRules: char.alwaysRules,
    neverRules: char.neverRules,
    doNotChangeRules: char.doNotChangeRules,
    personalityTraits: char.personalityTraits,
    profileImageUrl: char.profileImageUrl,
    hasProfileImage: char.hasProfileImage,
    hasVisualIdentity: char.hasVisualIdentity,
    hasColorPalette: char.hasColorPalette,
    hasCharacterRules: char.hasCharacterRules,
  }));

  const concepts = getAllProductConcepts();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-b from-tropical-green/15 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Production Studio
          </Link>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/40 text-tiki-brown uppercase tracking-widest">
              Planning
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">🛍️</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Product Concept Studio
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Plan future plush, books, collectibles, classroom materials, and
            character products before commerce is added.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-8">

        {/* Planning-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">🏗️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Planning only — no checkout or commerce yet
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              This studio organizes product ideas before commerce is built. No
              Stripe, Shopify, inventory, pricing, or product image generation
              is added in this phase. All product concepts must be tied to
              official characters and preserve brand integrity.
            </p>
          </div>
        </div>

        {/* ── A. Product Strategy Overview ──────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
          <h2 className="text-base font-black text-tiki-brown">
            Product Strategy Overview
          </h2>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Fruit Baby World products tie directly to official characters and
            story moments. Every product concept must preserve official character
            identity — body shape, colors, face style, fruit identity, and
            kid-friendly tone are non-negotiable constraints for any product
            bearing a character&apos;s likeness.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: "📋",
                label: "Planning Phase",
                desc: "Concepts and ideas only",
              },
              {
                icon: "🚫",
                label: "No Commerce Yet",
                desc: "No checkout or pricing",
              },
              {
                icon: "🍍",
                label: "Character-Anchored",
                desc: "Tied to official profiles",
              },
            ].map(({ icon, label, desc }) => (
              <div
                key={label}
                className="bg-tiki-brown/3 rounded-2xl px-4 py-3 text-center flex flex-col items-center gap-1"
              >
                <span className="text-2xl">{icon}</span>
                <p className="text-xs font-bold text-tiki-brown">{label}</p>
                <p className="text-xs text-tiki-brown/50">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── B. Product Concept Categories ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-black text-tiki-brown">
            Product Concept Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORY_GROUPS.map(({ emoji, title, description, colorClass }) => (
              <div
                key={title}
                className={`rounded-2xl border p-4 flex flex-col gap-1.5 ${colorClass}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{emoji}</span>
                  <p className="text-sm font-black text-tiki-brown">{title}</p>
                </div>
                <p className="text-xs text-tiki-brown/65 leading-relaxed">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── C. Character Product Planning ─────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-base font-black text-tiki-brown mb-1">
              Character Product Planning
            </h2>
            <p className="text-sm text-tiki-brown/55 leading-relaxed">
              Official and admin-usable characters. All product concepts must be
              anchored to these profiles.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {normalizedChars.map((char) => {
              const swatches = char.colorPalette.slice(0, 5);
              const suggestions = getSuggestedProducts(char.type, char.role);

              return (
                <div
                  key={char.slug}
                  className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-4"
                >
                  {/* Character identity */}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-black text-tiki-brown">
                        {char.displayName}
                      </p>
                      {char.role && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55">
                          {char.role}
                        </span>
                      )}
                      {char.fruitType && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tropical-green/10 text-tropical-green">
                          {char.fruitType}
                        </span>
                      )}
                    </div>
                    {char.tagline && (
                      <p className="text-xs text-ube-purple font-semibold italic mb-1.5">
                        &ldquo;{char.tagline}&rdquo;
                      </p>
                    )}
                    {char.shortDescription && (
                      <p className="text-xs text-tiki-brown/60 leading-relaxed">
                        {char.shortDescription.length > 180
                          ? char.shortDescription.slice(0, 180) + "…"
                          : char.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Color palette */}
                  {swatches.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
                        Color Palette
                      </p>
                      <div className="flex flex-wrap gap-3">
                        {swatches.map((swatch) => (
                          <div
                            key={swatch.name}
                            className="flex items-center gap-1.5"
                          >
                            {swatch.hex ? (
                              <span
                                className="w-5 h-5 rounded-full border border-tiki-brown/15 flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: swatch.hex }}
                              />
                            ) : (
                              <span className="w-5 h-5 rounded-full border border-dashed border-tiki-brown/20 flex-shrink-0" />
                            )}
                            <span className="text-xs text-tiki-brown/55">
                              {swatch.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visual identity summary */}
                  {char.visualIdentitySummary && (
                    <div>
                      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
                        Visual Identity
                      </p>
                      <p className="text-xs text-tiki-brown/60 leading-relaxed">
                        {char.visualIdentitySummary.length > 220
                          ? char.visualIdentitySummary.slice(0, 220) + "…"
                          : char.visualIdentitySummary}
                      </p>
                    </div>
                  )}

                  {/* Suggested product directions */}
                  <div>
                    <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
                      Suggested Product Directions
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2.5 py-1 rounded-full bg-ube-purple/8 text-ube-purple/80 font-semibold"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Character integrity note */}
                  <div className="flex items-start gap-2 bg-warm-coral/6 border border-warm-coral/15 rounded-xl px-3 py-2.5">
                    <span className="text-sm flex-shrink-0">🔒</span>
                    <p className="text-xs text-tiki-brown/65 leading-relaxed">
                      <span className="font-bold text-tiki-brown">
                        Character integrity required:
                      </span>{" "}
                      Products must preserve the official body shape, colors,
                      face style, fruit identity, and kid-friendly tone. Do not
                      redesign or alter canonical character appearance.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── D. Product Prompt Builder ──────────────────────────────────────── */}
        <ProductPromptBuilderSection characters={characterSeeds} />

        {/* ── E. Product Concepts ────────────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 justify-between flex-wrap">
            <h2 className="text-base font-black text-tiki-brown">
              Product Concepts
            </h2>
            {concepts.length > 0 && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/8 text-tiki-brown/55">
                {concepts.length} concept{concepts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {concepts.length === 0 ? (
            <div className="border border-dashed border-tiki-brown/15 rounded-2xl px-6 py-8 text-center flex flex-col gap-2">
              <p className="text-sm text-tiki-brown/45 leading-relaxed">
                No product concepts yet. Use this studio to plan future products
                before adding mockups or commerce.
              </p>
              <p className="text-xs text-tiki-brown/30 font-mono">
                Concepts: src/content/products/product-concepts.json
              </p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-tiki-brown/8">
              {concepts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-start justify-between py-3 gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-tiki-brown">
                      {c.title}
                    </p>
                    <p className="text-xs text-tiki-brown/50">
                      {getProductConceptCategoryLabel(c.category)}
                      {c.characterSlug && ` · ${c.characterSlug}`}
                    </p>
                    {c.shortDescription && (
                      <p className="text-xs text-tiki-brown/45 mt-0.5 leading-relaxed">
                        {c.shortDescription}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[c.status] ?? "bg-tiki-brown/8 text-tiki-brown/55"}`}
                  >
                    {getProductConceptStatusLabel(c.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── F. Future Product Workflow ─────────────────────────────────────── */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
          <h2 className="text-base font-black text-tiki-brown">
            Future Product Workflow
          </h2>
          <div className="flex flex-col gap-3">
            {FUTURE_WORKFLOW.map(({ label, note }, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ube-purple/15 text-ube-purple text-xs font-black flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-tiki-brown leading-snug">
                    {label}
                  </p>
                  <p className="text-xs text-tiki-brown/45 leading-snug">{note}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2.5 bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-3">
            <span className="text-sm flex-shrink-0">🚫</span>
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              Checkout, Stripe, Shopify, and inventory management are not added
              in this phase. Commerce features will be planned separately after
              product concepts and mockups are established.
            </p>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-xs text-tiki-brown/30 text-center pb-2">
          Public collector and product preview pages will be added in a future
          phase.
        </p>

      </section>
    </div>
  );
}
