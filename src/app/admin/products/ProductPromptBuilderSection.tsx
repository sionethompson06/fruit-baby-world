"use client";

import { useState } from "react";
import type {
  CharacterSeedData,
  ProductConceptCategory,
  ProductConceptAudience,
  ProductPromptPackage,
} from "@/lib/productConceptTypes";
import {
  buildProductPromptPackage,
  PRODUCT_CATEGORY_LABELS,
} from "@/lib/productPromptBuilder";

// ─── Category emoji map ───────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<ProductConceptCategory, string> = {
  plush: "🧸",
  "squish-toy": "🫧",
  book: "📚",
  card: "🃏",
  sticker: "✨",
  poster: "🖼️",
  playset: "🏝️",
  apparel: "👕",
  "classroom-material": "🏫",
  collectible: "🏆",
  bundle: "🎁",
  other: "📦",
};

const AUDIENCE_OPTIONS: { value: ProductConceptAudience; label: string }[] = [
  { value: "kids", label: "Kids" },
  { value: "parents", label: "Parents" },
  { value: "teachers", label: "Teachers" },
  { value: "collectors", label: "Collectors" },
  { value: "families", label: "Families" },
];

const CATEGORIES = Object.keys(PRODUCT_CATEGORY_LABELS) as ProductConceptCategory[];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  characters: CharacterSeedData[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductPromptBuilderSection({ characters }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(
    characters[0]?.slug ?? ""
  );
  const [category, setCategory] = useState<ProductConceptCategory>("plush");
  const [productTitle, setProductTitle] = useState("");
  const [audience, setAudience] = useState<ProductConceptAudience | "">("");
  const [productGoal, setProductGoal] = useState("");
  const [generatedPkg, setGeneratedPkg] = useState<ProductPromptPackage | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedChar = characters.find((c) => c.slug === selectedSlug) ?? null;

  function handleGenerate() {
    if (!selectedChar) return;
    const pkg = buildProductPromptPackage({
      char: selectedChar,
      category,
      productTitle,
      audience: audience || undefined,
      productGoal: productGoal || undefined,
    });
    setGeneratedPkg(pkg);
    setCopied(false);
  }

  async function handleCopy() {
    if (!generatedPkg) return;
    try {
      await navigator.clipboard.writeText(generatedPkg.finalPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — silently ignore
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🪄</span>
          <h2 className="text-base font-black text-tiki-brown">
            Product Prompt Builder
          </h2>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Generate a character-safe product mockup brief from an official
          character profile. Paste the output into an image generator or
          share with a designer. No AI calls are made here.
        </p>
      </div>

      {/* ── Step 1: Character selector ──────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
          1 · Select Character
        </p>
        {characters.length === 0 ? (
          <p className="text-sm text-tiki-brown/40 italic">
            No approved characters available.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {characters.map((char) => {
              const isSelected = char.slug === selectedSlug;
              const primaryColor = char.colorPalette[0]?.hex;
              return (
                <button
                  key={char.slug}
                  type="button"
                  onClick={() => {
                    setSelectedSlug(char.slug);
                    setGeneratedPkg(null);
                  }}
                  className={[
                    "flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition-all",
                    isSelected
                      ? "border-ube-purple bg-ube-purple/10 shadow-sm"
                      : "border-tiki-brown/12 bg-tiki-brown/3 hover:border-tiki-brown/25 hover:bg-tiki-brown/6",
                  ].join(" ")}
                >
                  {/* Color dot */}
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 border border-tiki-brown/15"
                    style={{
                      backgroundColor: primaryColor ?? "#c0bdb5",
                    }}
                  />
                  <div className="min-w-0">
                    <p
                      className={[
                        "text-xs font-bold leading-tight truncate",
                        isSelected ? "text-ube-purple" : "text-tiki-brown",
                      ].join(" ")}
                    >
                      {char.displayName}
                    </p>
                    {char.role && (
                      <p className="text-[10px] text-tiki-brown/45 truncate leading-tight">
                        {char.role}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Step 2: Category selector ────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
          2 · Product Category
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = cat === category;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setCategory(cat);
                  setGeneratedPkg(null);
                }}
                className={[
                  "flex items-center gap-2 px-3 py-2.5 rounded-2xl border text-left transition-all",
                  isSelected
                    ? "border-tropical-green bg-tropical-green/10 shadow-sm"
                    : "border-tiki-brown/12 bg-tiki-brown/3 hover:border-tiki-brown/25 hover:bg-tiki-brown/6",
                ].join(" ")}
              >
                <span className="text-base flex-shrink-0">
                  {CATEGORY_EMOJI[cat]}
                </span>
                <p
                  className={[
                    "text-xs font-semibold leading-tight",
                    isSelected ? "text-tropical-green font-bold" : "text-tiki-brown",
                  ].join(" ")}
                >
                  {PRODUCT_CATEGORY_LABELS[cat]}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Step 3: Details form ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <p className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
          3 · Product Details (Optional)
        </p>

        {/* Product title */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prompt-product-title"
            className="text-xs font-semibold text-tiki-brown/65"
          >
            Product Title
          </label>
          <input
            id="prompt-product-title"
            type="text"
            value={productTitle}
            onChange={(e) => {
              setProductTitle(e.target.value);
              setGeneratedPkg(null);
            }}
            placeholder={
              selectedChar
                ? `${selectedChar.displayName} ${PRODUCT_CATEGORY_LABELS[category]}`
                : "e.g. Pinny the Pineapple Plush Toy"
            }
            className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
          />
        </div>

        {/* Audience */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-tiki-brown/65">
            Target Audience
          </label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCE_OPTIONS.map(({ value, label }) => {
              const isSelected = audience === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAudience(isSelected ? "" : value);
                    setGeneratedPkg(null);
                  }}
                  className={[
                    "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all",
                    isSelected
                      ? "border-ube-purple bg-ube-purple/12 text-ube-purple"
                      : "border-tiki-brown/15 bg-tiki-brown/4 text-tiki-brown/60 hover:border-tiki-brown/30",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product goal */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="prompt-product-goal"
            className="text-xs font-semibold text-tiki-brown/65"
          >
            Product Goal{" "}
            <span className="text-tiki-brown/35 font-normal">— optional</span>
          </label>
          <textarea
            id="prompt-product-goal"
            value={productGoal}
            onChange={(e) => {
              setProductGoal(e.target.value);
              setGeneratedPkg(null);
            }}
            rows={2}
            placeholder="e.g. Birthday gift set for ages 3–6, classroom reading companion…"
            className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-none"
          />
        </div>
      </div>

      {/* ── Generate button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!selectedChar}
        className="w-full py-3 px-6 rounded-2xl font-black text-sm bg-ube-purple text-white shadow-sm hover:bg-ube-purple/85 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Generate Product Prompt
      </button>

      {/* ── Warnings ─────────────────────────────────────────────────────────── */}
      {generatedPkg && generatedPkg.warnings.length > 0 && (
        <div className="flex flex-col gap-2 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown">
            ⚠️ Prompt warnings
          </p>
          <ul className="flex flex-col gap-1">
            {generatedPkg.warnings.map((w, i) => (
              <li key={i} className="text-xs text-tiki-brown/70 leading-relaxed">
                • {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Generated prompt output ──────────────────────────────────────────── */}
      {generatedPkg && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
              Generated Prompt
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className={[
                "text-xs font-bold px-4 py-1.5 rounded-full border transition-all",
                copied
                  ? "border-tropical-green bg-tropical-green/15 text-tropical-green"
                  : "border-tiki-brown/20 bg-tiki-brown/5 text-tiki-brown/65 hover:border-tiki-brown/35 hover:bg-tiki-brown/10",
              ].join(" ")}
            >
              {copied ? "✓ Copied!" : "Copy Prompt"}
            </button>
          </div>
          <textarea
            readOnly
            value={generatedPkg.finalPrompt}
            rows={20}
            className="w-full rounded-2xl border border-tiki-brown/15 bg-tiki-brown/3 px-4 py-3 text-xs text-tiki-brown/80 font-mono leading-relaxed focus:outline-none resize-y"
          />
          <p className="text-xs text-tiki-brown/35 leading-relaxed">
            Paste this prompt into an image generator or share with a designer.
            Include official character reference images alongside this prompt for
            best results.
          </p>
        </div>
      )}
    </div>
  );
}
