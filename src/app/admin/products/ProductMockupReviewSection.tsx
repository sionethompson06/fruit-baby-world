"use client";

import { useState } from "react";
import Image from "next/image";
import type { CharacterSeedData, ProductConcept, ProductMockupAsset } from "@/lib/productConceptTypes";
import type { ProductMockupDraftResult } from "@/lib/productMockupTypes";
import { PRODUCT_CATEGORY_LABELS } from "@/lib/productPromptBuilder";
import {
  buildProductMockupFidelityChecklist,
  getProductMockupReferenceThumbnails,
  buildProductMockupReviewWarnings,
  getProductMockupReviewSummary,
} from "@/lib/productMockupReview";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  draft: ProductMockupDraftResult;
  character: CharacterSeedData;
  concepts: ProductConcept[];
}

// ─── Save phase type ──────────────────────────────────────────────────────────

type SavePhase = "idle" | "saving" | "done" | "error";

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductMockupReviewSection({ draft, character, concepts }: Props) {
  const checklistTemplate = buildProductMockupFidelityChecklist(character, draft.category);
  const thumbnails = getProductMockupReferenceThumbnails(character);
  const reviewWarnings = buildProductMockupReviewWarnings(character, draft);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [looksGood, setLooksGood] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [selectedConceptId, setSelectedConceptId] = useState<string>(
    concepts.length === 1 ? concepts[0].id : ""
  );
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const [savedMockup, setSavedMockup] = useState<ProductMockupAsset | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const reviewSummary = getProductMockupReviewSummary({
    checkedIds,
    totalItems: checklistTemplate.length,
    looksGood,
  });

  const canSave =
    savePhase === "idle" &&
    !!selectedConceptId &&
    reviewSummary.isReady &&
    !!draft.imageBase64;

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (!canSave) return;
    setSavePhase("saving");
    setErrorMessage("");

    try {
      const res = await fetch("/api/products/save-approved-mockup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productConceptId: selectedConceptId,
          characterSlug: draft.characterSlug,
          category: draft.category,
          productTitle: draft.productTitle,
          imageBase64: draft.imageBase64,
          mimeType: draft.mimeType,
          promptText: draft.promptText,
          mockupStyle: undefined,
          reviewNotes: reviewNotes.trim() || undefined,
          approvedBy: "admin",
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        status?: string;
        message?: string;
        mockup?: ProductMockupAsset;
      };

      if (!data.ok || !data.mockup) {
        setErrorMessage(data.message ?? "Save failed. Please try again.");
        setSavePhase("error");
        return;
      }

      setSavedMockup(data.mockup);
      setSavePhase("done");
    } catch {
      setErrorMessage("Network error. Please try again.");
      setSavePhase("error");
    }
  }

  // ── Saved success state ───────────────────────────────────────────────────────
  if (savePhase === "done" && savedMockup) {
    return (
      <div className="flex flex-col gap-4 border border-tropical-green/25 bg-tropical-green/6 rounded-3xl p-6">
        <div className="flex items-center gap-2">
          <span className="text-xl">✓</span>
          <h3 className="text-sm font-black text-tropical-green">Mockup Saved to Product Concept</h3>
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-tiki-brown/65">
          <p><span className="font-semibold text-tiki-brown/80">Product:</span> {savedMockup.productTitle}</p>
          <p><span className="font-semibold text-tiki-brown/80">Character:</span> {character.displayName}</p>
          <p><span className="font-semibold text-tiki-brown/80">Category:</span> {savedMockup.category != null ? ((PRODUCT_CATEGORY_LABELS as Record<string, string>)[savedMockup.category] ?? savedMockup.category) : ""}</p>
          <p><span className="font-semibold text-tiki-brown/80">Visibility:</span> Admin Only</p>
          <p><span className="font-semibold text-tiki-brown/80">Saved:</span> {new Date(savedMockup.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex items-start gap-2 bg-white border border-tiki-brown/10 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">🔒</span>
          <p className="text-xs text-tiki-brown/60 leading-relaxed">
            <span className="font-bold text-tiki-brown">Admin Only — not public yet.</span>{" "}
            Public product preview will be available in a future phase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🔍</span>
        <h3 className="text-sm font-black text-tiki-brown">Review Generated Mockup</h3>
      </div>

      {/* Review warnings */}
      {reviewWarnings.length > 0 && (
        <div className="flex flex-col gap-2 bg-pineapple-yellow/15 border border-pineapple-yellow/35 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown">Review warnings</p>
          <ul className="flex flex-col gap-1">
            {reviewWarnings.map((w, i) => (
              <li key={i} className="text-xs text-tiki-brown/65 leading-relaxed">• {w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Two-column layout: left=mockup, right=reference+checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── Left: Generated mockup ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest">Generated Mockup</p>

          {draft.imageBase64 && (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-tiki-brown/10 shadow-sm bg-white">
              <Image
                src={`data:${draft.mimeType};base64,${draft.imageBase64}`}
                alt={`Generated product mockup: ${draft.productTitle}`}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          )}

          <div className="bg-tiki-brown/3 rounded-xl px-3 py-2.5 flex flex-col gap-1">
            <p className="text-xs font-bold text-tiki-brown">{draft.productTitle}</p>
            <p className="text-xs text-tiki-brown/55">
              {PRODUCT_CATEGORY_LABELS[draft.category]} · {character.displayName}
            </p>
          </div>

          {/* Prompt preview */}
          {draft.promptText && (
            <details className="group">
              <summary className="text-xs font-semibold text-tiki-brown/45 cursor-pointer hover:text-tiki-brown/65 select-none">
                View prompt ▾
              </summary>
              <div className="mt-2 rounded-xl border border-tiki-brown/10 bg-tiki-brown/3 px-3 py-2.5">
                <p className="text-[10px] text-tiki-brown/55 font-mono leading-relaxed whitespace-pre-wrap">
                  {draft.promptText.slice(0, 800)}{draft.promptText.length > 800 ? "…" : ""}
                </p>
              </div>
            </details>
          )}
        </div>

        {/* ── Right: Reference + checklist + save ────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Official reference thumbnail */}
          <div>
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest mb-2">
              Official Character Reference
            </p>
            {thumbnails.length > 0 ? (
              <div className="flex flex-col gap-2">
                {thumbnails.map((t) => (
                  <div key={t.url} className="flex flex-col gap-1">
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-tiki-brown/10 shadow-sm bg-white max-w-[180px]">
                      <Image
                        src={t.url}
                        alt={`${character.displayName} — ${t.title}`}
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <p className="text-[10px] text-tiki-brown/40">{t.title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 border border-dashed border-tiki-brown/15 rounded-xl px-3 py-3">
                <span className="text-base">🖼️</span>
                <p className="text-xs text-tiki-brown/40">No official profile sheet available.</p>
              </div>
            )}
          </div>

          {/* Fidelity checklist */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest">
                Fidelity Checklist
              </p>
              <button
                type="button"
                onClick={() => {
                  if (looksGood) {
                    setLooksGood(false);
                  } else {
                    setLooksGood(true);
                    setCheckedIds(new Set(checklistTemplate.map((i) => i.id)));
                  }
                }}
                className={[
                  "text-xs font-bold px-3 py-1 rounded-full border transition-all",
                  looksGood
                    ? "border-tropical-green bg-tropical-green/15 text-tropical-green"
                    : "border-tiki-brown/15 bg-tiki-brown/4 text-tiki-brown/55 hover:border-tiki-brown/30",
                ].join(" ")}
              >
                {looksGood ? "✓ Looks Good" : "Mark All ✓"}
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {checklistTemplate.map((item) => {
                const checked = checkedIds.has(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-start gap-2.5 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCheck(item.id)}
                      className="mt-0.5 flex-shrink-0 w-4 h-4 rounded accent-tropical-green cursor-pointer"
                    />
                    <span
                      className={[
                        "text-xs leading-relaxed transition-colors",
                        checked ? "text-tiki-brown/70 line-through" : "text-tiki-brown/75",
                      ].join(" ")}
                    >
                      {item.label}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-tiki-brown/35 mt-2">{reviewSummary.label}</p>
          </div>

          {/* Review notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-notes" className="text-xs font-semibold text-tiki-brown/55">
              Review Notes{" "}
              <span className="text-tiki-brown/30 font-normal">— optional</span>
            </label>
            <textarea
              id="review-notes"
              rows={2}
              maxLength={1000}
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Any observations about character fidelity, product clarity, or style…"
              className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2 text-xs text-tiki-brown placeholder:text-tiki-brown/25 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-none"
            />
          </div>

          {/* Concept selector */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="review-concept" className="text-xs font-semibold text-tiki-brown/55">
              Save to Product Concept <span className="text-warm-coral">*</span>
            </label>
            {concepts.length === 0 ? (
              <div className="flex items-start gap-2 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
                <span className="text-sm flex-shrink-0">⚠️</span>
                <p className="text-xs text-tiki-brown/65 leading-relaxed">
                  No product concepts exist yet. Create one using the Product Concept Manager above before saving this mockup.
                </p>
              </div>
            ) : (
              <select
                id="review-concept"
                value={selectedConceptId}
                onChange={(e) => setSelectedConceptId(e.target.value)}
                className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
              >
                <option value="">— Choose a product concept —</option>
                {concepts
                  .filter((c) => c.status !== "archived")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.category}
                      {c.status !== "idea" ? ` · ${c.status}` : ""})
                    </option>
                  ))}
              </select>
            )}
            {!selectedConceptId && (
              <p className="text-xs text-tiki-brown/35">
                Choose or create a product concept before saving this mockup.
              </p>
            )}
          </div>

          {/* Error */}
          {savePhase === "error" && errorMessage && (
            <p className="text-sm font-semibold text-warm-coral">{errorMessage}</p>
          )}

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="w-full py-3 px-6 rounded-2xl font-black text-sm bg-ube-purple text-white shadow-sm hover:bg-ube-purple/85 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savePhase === "saving"
              ? "Saving to product concept…"
              : "Approve & Save to Product Concept"}
          </button>

          {/* Save disabled hint */}
          {!canSave && savePhase === "idle" && (
            <p className="text-xs text-tiki-brown/35 text-center -mt-2">
              {!selectedConceptId
                ? "Select a product concept above."
                : !reviewSummary.isReady
                ? "Complete the checklist or mark as Looks Good."
                : ""}
            </p>
          )}

          <div className="flex items-start gap-2 bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">🔒</span>
            <p className="text-xs text-tiki-brown/50 leading-relaxed">
              Saved mockup will be{" "}
              <span className="font-semibold text-tiki-brown/70">admin-only</span>.
              Public product preview is a future phase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
