"use client";

import { useState } from "react";
import Image from "next/image";
import type {
  CharacterSeedData,
  ProductConceptCategory,
} from "@/lib/productConceptTypes";
import type { ProductMockupStyle, ProductMockupDraftResult } from "@/lib/productMockupTypes";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/productPromptBuilder";

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCKUP_STYLES: { value: ProductMockupStyle; label: string; desc: string }[] = [
  {
    value: "clean-product-mockup",
    label: "Clean Product Mockup",
    desc: "White/light studio background — product-forward",
  },
  {
    value: "storybook-product",
    label: "Storybook Product",
    desc: "Warm illustrated scene — brand-consistent setting",
  },
  {
    value: "collector-display",
    label: "Collector Display",
    desc: "Dark gradient / premium shelf — collector aesthetic",
  },
  {
    value: "classroom-display",
    label: "Classroom Display",
    desc: "Bright educational setting — teacher/student friendly",
  },
];

const CATEGORIES = Object.keys(PRODUCT_CATEGORY_LABELS) as ProductConceptCategory[];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  characters: CharacterSeedData[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductMockupDraftSection({ characters }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(characters[0]?.slug ?? "");
  const [category, setCategory] = useState<ProductConceptCategory>("plush");
  const [productTitle, setProductTitle] = useState("");
  const [promptText, setPromptText] = useState("");
  const [mockupStyle, setMockupStyle] = useState<ProductMockupStyle>("clean-product-mockup");

  const [phase, setPhase] = useState<"idle" | "generating" | "done" | "error">("idle");
  const [draft, setDraft] = useState<ProductMockupDraftResult | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedChar = characters.find((c) => c.slug === selectedSlug) ?? null;
  const canGenerate =
    phase !== "generating" &&
    !!selectedSlug &&
    !!productTitle.trim() &&
    !!promptText.trim();

  async function handleGenerate() {
    if (!canGenerate) return;
    setPhase("generating");
    setDraft(null);
    setWarnings([]);
    setNotes([]);
    setErrorMessage("");

    try {
      const res = await fetch("/api/products/generate-mockup-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          characterSlug: selectedSlug,
          category,
          productTitle: productTitle.trim(),
          promptText: promptText.trim(),
          mockupStyle,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        status?: string;
        message?: string;
        draft?: ProductMockupDraftResult;
        warnings?: string[];
        notes?: string[];
      };

      if (!data.ok || !data.draft) {
        setErrorMessage(data.message ?? "Generation failed. Please try again.");
        setPhase("error");
        return;
      }

      setDraft(data.draft);
      setWarnings(data.warnings ?? []);
      setNotes(data.notes ?? []);
      setPhase("done");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setPhase("error");
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🎨</span>
          <h2 className="text-base font-black text-tiki-brown">
            Product Mockup Draft Generator
          </h2>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Generate a temporary product mockup image draft from an
          official character-safe prompt. Drafts are not saved, not
          attached, and not public. Review in future phase.
        </p>
      </div>

      {/* Planning-only notice */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-2xl px-4 py-3">
        <span className="text-base flex-shrink-0">📌</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <span className="font-bold text-tiki-brown">Temporary draft only.</span>{" "}
          Generated images are not saved, not uploaded, and not public. Saving to a product
          concept is a separate future step.
        </p>
      </div>

      {/* ── Character selector ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="mockup-character" className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
          Character
        </label>
        {characters.length === 0 ? (
          <p className="text-sm text-tiki-brown/40 italic">No approved characters available.</p>
        ) : (
          <select
            id="mockup-character"
            value={selectedSlug}
            onChange={(e) => {
              setSelectedSlug(e.target.value);
              setDraft(null);
            }}
            className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
          >
            <option value="">— Select a character —</option>
            {characters.map((c) => {
              const dot = c.colorPalette[0]?.name ?? "";
              return (
                <option key={c.slug} value={c.slug}>
                  {c.displayName}{c.role ? ` — ${c.role}` : ""}{dot ? ` (${dot})` : ""}
                </option>
              );
            })}
          </select>
        )}
      </div>

      {/* ── Category + Style row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="mockup-category" className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
            Product Category
          </label>
          <select
            id="mockup-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as ProductConceptCategory);
              setDraft(null);
            }}
            className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{PRODUCT_CATEGORY_LABELS[cat]}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="mockup-style" className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
            Mockup Style
          </label>
          <select
            id="mockup-style"
            value={mockupStyle}
            onChange={(e) => {
              setMockupStyle(e.target.value as ProductMockupStyle);
              setDraft(null);
            }}
            className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
          >
            {MOCKUP_STYLES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <p className="text-xs text-tiki-brown/40 leading-tight">
            {MOCKUP_STYLES.find((s) => s.value === mockupStyle)?.desc}
          </p>
        </div>
      </div>

      {/* ── Product title ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <label htmlFor="mockup-title" className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
          Product Title <span className="text-warm-coral normal-case font-normal tracking-normal">*</span>
        </label>
        <input
          id="mockup-title"
          type="text"
          maxLength={120}
          value={productTitle}
          onChange={(e) => {
            setProductTitle(e.target.value);
            setDraft(null);
          }}
          placeholder={
            selectedChar
              ? `${selectedChar.displayName} ${PRODUCT_CATEGORY_LABELS[category]}`
              : "e.g. Pineapple Baby Plush Toy"
          }
          className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
        />
      </div>

      {/* ── Prompt text ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label htmlFor="mockup-prompt" className="text-xs font-black text-tiki-brown/45 uppercase tracking-widest">
            Product Prompt <span className="text-warm-coral normal-case font-normal tracking-normal">*</span>
          </label>
          <p className="text-xs text-tiki-brown/35">
            Generate above with the Prompt Builder, then paste here
          </p>
        </div>
        <textarea
          id="mockup-prompt"
          rows={8}
          maxLength={5000}
          value={promptText}
          onChange={(e) => {
            setPromptText(e.target.value);
            setDraft(null);
          }}
          placeholder="Paste the generated product prompt from the Product Prompt Builder above…"
          className="w-full rounded-2xl border border-tiki-brown/20 bg-tiki-brown/3 px-4 py-3 text-xs text-tiki-brown/80 font-mono placeholder:text-tiki-brown/25 placeholder:font-sans focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-y leading-relaxed"
        />
        <p className="text-xs text-tiki-brown/30">
          {promptText.length}/5000 characters
        </p>
      </div>

      {/* ── Generate button ──────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full py-3 px-6 rounded-2xl font-black text-sm bg-tropical-green text-white shadow-sm hover:bg-tropical-green/85 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {phase === "generating"
          ? "Generating Mockup Draft…"
          : "Generate Temporary Product Mockup Draft"}
      </button>

      {/* ── Disabled hint ────────────────────────────────────────────────────── */}
      {!canGenerate && phase !== "generating" && (
        <p className="text-xs text-tiki-brown/35 text-center -mt-3">
          {!selectedSlug
            ? "Select a character to continue."
            : !productTitle.trim()
            ? "Enter a product title to continue."
            : !promptText.trim()
            ? "Paste a product prompt to continue."
            : ""}
        </p>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {phase === "error" && errorMessage && (
        <div className="flex items-start gap-2.5 bg-warm-coral/8 border border-warm-coral/20 rounded-2xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚠️</span>
          <div>
            <p className="text-sm font-bold text-warm-coral">Generation failed</p>
            <p className="text-xs text-tiki-brown/60 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── Warnings ─────────────────────────────────────────────────────────── */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-2 bg-pineapple-yellow/15 border border-pineapple-yellow/35 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown">Generation warnings</p>
          <ul className="flex flex-col gap-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-xs text-tiki-brown/65 leading-relaxed">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Draft preview ────────────────────────────────────────────────────── */}
      {phase === "done" && draft && (
        <div className="flex flex-col gap-4 border border-tropical-green/20 bg-tropical-green/5 rounded-3xl p-5">
          {/* Preview header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-black text-tiki-brown">{draft.productTitle}</p>
              <p className="text-xs text-tiki-brown/50">
                {PRODUCT_CATEGORY_LABELS[draft.category]}
                {" · "}{draft.characterSlug}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/35 text-tiki-brown uppercase tracking-wide">
              Temporary Draft
            </span>
          </div>

          {/* Image */}
          {draft.imageBase64 && (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-tiki-brown/10 shadow-sm bg-white">
              <Image
                src={`data:${draft.mimeType};base64,${draft.imageBase64}`}
                alt={`Product mockup draft: ${draft.productTitle}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}

          {/* Metadata */}
          <div className="flex flex-col gap-1.5 text-xs text-tiki-brown/55">
            <p>
              <span className="font-semibold text-tiki-brown/70">Character:</span>{" "}
              {selectedChar?.displayName ?? draft.characterSlug}
            </p>
            <p>
              <span className="font-semibold text-tiki-brown/70">Category:</span>{" "}
              {PRODUCT_CATEGORY_LABELS[draft.category]}
            </p>
            <p>
              <span className="font-semibold text-tiki-brown/70">Reference mode:</span>{" "}
              prompt-only-reference-summary
            </p>
            <p>
              <span className="font-semibold text-tiki-brown/70">Generated:</span>{" "}
              {new Date(draft.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Notes */}
          {notes.length > 0 && (
            <div className="flex flex-col gap-1">
              {notes.map((n, i) => (
                <p key={i} className="text-xs text-tiki-brown/50 leading-relaxed">
                  • {n}
                </p>
              ))}
            </div>
          )}

          {/* Not-saved callout */}
          <div className="flex items-start gap-2 bg-white border border-tiki-brown/10 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">🔒</span>
            <p className="text-xs text-tiki-brown/60 leading-relaxed">
              <span className="font-bold text-tiki-brown">Temporary Draft — not saved or public.</span>{" "}
              Saving to a product concept will be available in a future phase.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
