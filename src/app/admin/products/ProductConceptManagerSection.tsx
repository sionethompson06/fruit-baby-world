"use client";

import { useState } from "react";
import type {
  ProductConcept,
  ProductConceptCategory,
  ProductConceptStatus,
  ProductConceptAudience,
  ProductMockupAsset,
  CharacterSeedData,
} from "@/lib/productConceptTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ProductConceptCategory; label: string }[] = [
  { value: "plush", label: "Plush Toy" },
  { value: "squish-toy", label: "Squish Toy" },
  { value: "book", label: "Book" },
  { value: "card", label: "Trading Card" },
  { value: "sticker", label: "Sticker Sheet" },
  { value: "poster", label: "Poster" },
  { value: "playset", label: "Playset" },
  { value: "apparel", label: "Apparel" },
  { value: "classroom-material", label: "Classroom Material" },
  { value: "collectible", label: "Collectible" },
  { value: "bundle", label: "Bundle" },
  { value: "other", label: "Other" },
];

const STATUSES: { value: ProductConceptStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "planned", label: "Planned" },
  { value: "in-design", label: "In Design" },
  { value: "archived", label: "Archived" },
];

const AUDIENCES: { value: ProductConceptAudience; label: string }[] = [
  { value: "kids", label: "Kids" },
  { value: "parents", label: "Parents" },
  { value: "teachers", label: "Teachers" },
  { value: "collectors", label: "Collectors" },
  { value: "families", label: "Families" },
];

const STATUS_COLORS: Record<ProductConceptStatus, string> = {
  idea: "bg-sky-blue/20 text-tiki-brown/70",
  planned: "bg-ube-purple/15 text-ube-purple",
  "in-design": "bg-pineapple-yellow/40 text-tiki-brown",
  archived: "bg-tiki-brown/8 text-tiki-brown/40",
};

const PREVIEW_STATUS_COLORS: Record<string, string> = {
  draft: "bg-tiki-brown/8 text-tiki-brown/55",
  "public-ready": "bg-tropical-green/15 text-tropical-green",
  hidden: "bg-warm-coral/15 text-warm-coral/80",
};

const MOCKUP_VIS_COLORS: Record<string, string> = {
  "admin-only": "bg-ube-purple/10 text-ube-purple/70",
  "public-ready": "bg-tropical-green/15 text-tropical-green",
  hidden: "bg-warm-coral/15 text-warm-coral/80",
};

function getCategoryLabel(v: ProductConceptCategory) {
  return CATEGORIES.find((c) => c.value === v)?.label ?? v;
}
function getStatusLabel(v: ProductConceptStatus) {
  return STATUSES.find((s) => s.value === v)?.label ?? v;
}
function getPreviewStatusLabel(v: string | undefined) {
  if (!v || v === "draft") return "Preview: Draft";
  if (v === "public-ready") return "Preview: Public Ready";
  if (v === "hidden") return "Preview: Hidden";
  return v;
}
function getMockupVisLabel(v: string) {
  if (v === "admin-only") return "Admin Only";
  if (v === "public-ready") return "Public Ready";
  if (v === "hidden") return "Hidden";
  return v;
}

// ─── Blank form state ─────────────────────────────────────────────────────────

function blankForm() {
  return {
    id: "",
    title: "",
    characterSlug: "",
    category: "plush" as ProductConceptCategory,
    status: "idea" as ProductConceptStatus,
    shortDescription: "",
    audience: "" as ProductConceptAudience | "",
    productNotes: "",
    characterIntegrityNotes: "",
    publicTitle: "",
    publicDescription: "",
  };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  characters: CharacterSeedData[];
  initialConcepts: ProductConcept[];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProductConceptManagerSection({
  characters,
  initialConcepts,
}: Props) {
  const [concepts, setConcepts] = useState<ProductConcept[]>(initialConcepts);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [visUpdating, setVisUpdating] = useState<string | null>(null);
  const [mockupVisUpdating, setMockupVisUpdating] = useState<string | null>(null);
  const [visError, setVisError] = useState("");

  const activeConcepts = concepts.filter((c) => c.status !== "archived");
  const archivedConcepts = concepts.filter((c) => c.status === "archived");
  const isEditing = !!form.id;

  function fillForm(concept: ProductConcept) {
    setForm({
      id: concept.id,
      title: concept.title,
      characterSlug: concept.characterSlug ?? "",
      category: concept.category,
      status: concept.status,
      shortDescription: concept.shortDescription,
      audience: concept.audience ?? "",
      productNotes: concept.productNotes ?? "",
      characterIntegrityNotes: concept.characterIntegrityNotes ?? "",
      publicTitle: concept.publicTitle ?? "",
      publicDescription: concept.publicDescription ?? "",
    });
    setSaveError("");
    setSaveSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearForm() {
    setForm(blankForm());
    setSaveError("");
    setSaveSuccess("");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const res = await fetch("/api/github/save-product-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: {
            ...(form.id ? { id: form.id } : {}),
            title: form.title,
            characterSlug: form.characterSlug || undefined,
            category: form.category,
            status: form.status,
            shortDescription: form.shortDescription,
            audience: form.audience || undefined,
            productNotes: form.productNotes || undefined,
            characterIntegrityNotes: form.characterIntegrityNotes || undefined,
            publicTitle: form.publicTitle || undefined,
            publicDescription: form.publicDescription || undefined,
          },
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        status?: string;
        message?: string;
        concept?: ProductConcept;
      };

      if (!res.ok || !data.ok) {
        setSaveError(data.message ?? "Save failed. Please try again.");
        return;
      }

      if (data.concept) {
        setConcepts((prev) =>
          prev.some((c) => c.id === data.concept!.id)
            ? prev.map((c) => (c.id === data.concept!.id ? data.concept! : c))
            : [...prev, data.concept!]
        );
      }
      setSaveSuccess(isEditing ? "Concept updated." : "Concept created.");
      clearForm();
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive(concept: ProductConcept) {
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await fetch("/api/github/save-product-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: { ...concept, status: "archived" },
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; concept?: ProductConcept };
      if (!res.ok || !data.ok) {
        setSaveError(data.message ?? "Archive failed.");
        return;
      }
      if (data.concept) {
        setConcepts((prev) => prev.map((c) => (c.id === data.concept!.id ? data.concept! : c)));
      }
    } catch {
      setSaveError("Network error during archive.");
    }
  }

  async function handleRestore(concept: ProductConcept) {
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await fetch("/api/github/save-product-concept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: { ...concept, status: "idea" },
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string; concept?: ProductConcept };
      if (!res.ok || !data.ok) {
        setSaveError(data.message ?? "Restore failed.");
        return;
      }
      if (data.concept) {
        setConcepts((prev) => prev.map((c) => (c.id === data.concept!.id ? data.concept! : c)));
      }
    } catch {
      setSaveError("Network error during restore.");
    }
  }

  async function handleConceptVisibility(
    concept: ProductConcept,
    publicPreviewStatus: "draft" | "public-ready" | "hidden"
  ) {
    setVisUpdating(concept.id);
    setVisError("");
    try {
      const res = await fetch("/api/github/update-product-concept-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productConceptId: concept.id, publicPreviewStatus }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setVisError(data.message ?? "Visibility update failed.");
        return;
      }
      setConcepts((prev) =>
        prev.map((c) =>
          c.id === concept.id
            ? { ...c, publicPreviewStatus, publicPreviewUpdatedAt: new Date().toISOString() }
            : c
        )
      );
    } catch {
      setVisError("Network error during visibility update.");
    } finally {
      setVisUpdating(null);
    }
  }

  async function handleMockupVisibility(
    concept: ProductConcept,
    mockup: ProductMockupAsset,
    visibility: "admin-only" | "public-ready" | "hidden"
  ) {
    setMockupVisUpdating(mockup.id);
    setVisError("");
    try {
      const res = await fetch("/api/github/update-product-mockup-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productConceptId: concept.id,
          mockupId: mockup.id,
          visibility,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) {
        setVisError(data.message ?? "Mockup visibility update failed.");
        return;
      }
      setConcepts((prev) =>
        prev.map((c) =>
          c.id === concept.id
            ? {
                ...c,
                mockups: (c.mockups ?? []).map((m) =>
                  m.id === mockup.id
                    ? { ...m, visibility, visibilityUpdatedAt: new Date().toISOString() }
                    : m
                ),
              }
            : c
        )
      );
    } catch {
      setVisError("Network error during mockup visibility update.");
    } finally {
      setMockupVisUpdating(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Section header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">📋</span>
          <h2 className="text-base font-black text-tiki-brown">
            Product Concept Manager
          </h2>
        </div>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          Product concepts are planning records only. They do not create public
          products, checkout, inventory, or mockups.
        </p>
      </div>

      {/* ── Create / Edit form ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-black text-tiki-brown">
            {isEditing ? "Edit Product Concept" : "Create New Product Concept"}
          </h3>
          {isEditing && (
            <button
              type="button"
              onClick={clearForm}
              className="text-xs font-semibold text-tiki-brown/50 hover:text-tiki-brown transition-colors"
            >
              ✕ Cancel Edit
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="concept-title" className="text-xs font-semibold text-tiki-brown/65">
              Product Title <span className="text-warm-coral">*</span>
            </label>
            <input
              id="concept-title"
              type="text"
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Pineapple Baby Plush Toy"
              className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
            />
          </div>

          {/* Character + Category row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Character */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="concept-character" className="text-xs font-semibold text-tiki-brown/65">
                Character
              </label>
              <select
                id="concept-character"
                value={form.characterSlug}
                onChange={(e) => setForm((f) => ({ ...f, characterSlug: e.target.value }))}
                className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
              >
                <option value="">— No character —</option>
                {characters.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.displayName} ({c.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="concept-category" className="text-xs font-semibold text-tiki-brown/65">
                Category <span className="text-warm-coral">*</span>
              </label>
              <select
                id="concept-category"
                required
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as ProductConceptCategory }))}
                className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
              >
                {CATEGORIES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status + Audience row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="concept-status" className="text-xs font-semibold text-tiki-brown/65">
                Status <span className="text-warm-coral">*</span>
              </label>
              <select
                id="concept-status"
                required
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductConceptStatus }))}
                className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
              >
                {STATUSES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="concept-audience" className="text-xs font-semibold text-tiki-brown/65">
                Audience
              </label>
              <select
                id="concept-audience"
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value as ProductConceptAudience | "" }))}
                className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
              >
                <option value="">— Any —</option>
                {AUDIENCES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Short description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="concept-short-desc" className="text-xs font-semibold text-tiki-brown/65">
              Short Description <span className="text-warm-coral">*</span>
            </label>
            <textarea
              id="concept-short-desc"
              required
              maxLength={500}
              rows={2}
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              placeholder="Brief description of this product concept…"
              className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-none"
            />
          </div>

          {/* Public title + description */}
          <div className="flex flex-col gap-3 rounded-2xl border border-tiki-brown/10 bg-tiki-brown/2 px-4 py-4">
            <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
              Public Preview Fields — shown on /shop when Public Ready
            </p>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="concept-public-title" className="text-xs font-semibold text-tiki-brown/65">
                Public Title <span className="text-tiki-brown/35 font-normal">— optional, overrides title on /shop</span>
              </label>
              <input
                id="concept-public-title"
                type="text"
                maxLength={120}
                value={form.publicTitle}
                onChange={(e) => setForm((f) => ({ ...f, publicTitle: e.target.value }))}
                placeholder="e.g. Pineapple Baby Soft Plush (collector edition)"
                className="w-full rounded-xl border border-tiki-brown/20 bg-white px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="concept-public-desc" className="text-xs font-semibold text-tiki-brown/65">
                Public Description <span className="text-tiki-brown/35 font-normal">— optional, overrides short description on /shop</span>
              </label>
              <textarea
                id="concept-public-desc"
                maxLength={500}
                rows={2}
                value={form.publicDescription}
                onChange={(e) => setForm((f) => ({ ...f, publicDescription: e.target.value }))}
                placeholder="Collector-facing description shown on the /shop page…"
                className="w-full rounded-xl border border-tiki-brown/20 bg-white px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-none"
              />
            </div>
          </div>

          {/* Product notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="concept-product-notes" className="text-xs font-semibold text-tiki-brown/65">
              Product Notes <span className="text-tiki-brown/35 font-normal">— optional</span>
            </label>
            <textarea
              id="concept-product-notes"
              maxLength={1500}
              rows={3}
              value={form.productNotes}
              onChange={(e) => setForm((f) => ({ ...f, productNotes: e.target.value }))}
              placeholder="Size, materials, target retailer, production notes…"
              className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-none"
            />
          </div>

          {/* Character integrity notes */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="concept-integrity-notes" className="text-xs font-semibold text-tiki-brown/65">
              Character Integrity Notes <span className="text-tiki-brown/35 font-normal">— optional</span>
            </label>
            <textarea
              id="concept-integrity-notes"
              maxLength={1500}
              rows={2}
              value={form.characterIntegrityNotes}
              onChange={(e) => setForm((f) => ({ ...f, characterIntegrityNotes: e.target.value }))}
              placeholder="Specific character fidelity requirements for this product…"
              className="w-full rounded-xl border border-tiki-brown/20 bg-tiki-brown/3 px-3 py-2.5 text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 focus:border-ube-purple/40 resize-none"
            />
          </div>

          {/* Feedback */}
          {saveError && (
            <p className="text-sm text-warm-coral font-semibold">{saveError}</p>
          )}
          {saveSuccess && (
            <p className="text-sm text-tropical-green font-semibold">✓ {saveSuccess}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving || !form.title.trim() || !form.shortDescription.trim()}
            className="w-full py-3 px-6 rounded-2xl font-black text-sm bg-ube-purple text-white shadow-sm hover:bg-ube-purple/85 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : isEditing ? "Update Concept" : "Create Product Concept"}
          </button>
        </form>
      </div>

      {/* ── Visibility error ──────────────────────────────────────────────────── */}
      {visError && (
        <p className="text-sm text-warm-coral font-semibold px-1">{visError}</p>
      )}

      {/* ── Active concepts list ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-black text-tiki-brown">
            Active Product Concepts
          </h3>
          {activeConcepts.length > 0 && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/8 text-tiki-brown/55">
              {activeConcepts.length} concept{activeConcepts.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {activeConcepts.length === 0 ? (
          <div className="border border-dashed border-tiki-brown/15 rounded-2xl px-6 py-8 text-center">
            <p className="text-sm text-tiki-brown/45 leading-relaxed">
              No active product concepts yet. Use the form above to create one.
            </p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-tiki-brown/8">
            {activeConcepts.map((concept) => {
              const previewStatus = concept.publicPreviewStatus ?? "draft";
              const isVisUpdating = visUpdating === concept.id;
              const mockups = concept.mockups ?? [];

              return (
                <div key={concept.id} className="py-4 flex flex-col gap-3">

                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-sm font-bold text-tiki-brown">{concept.title}</p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[concept.status]}`}>
                          {getStatusLabel(concept.status)}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PREVIEW_STATUS_COLORS[previewStatus] ?? "bg-tiki-brown/8 text-tiki-brown/55"}`}>
                          {getPreviewStatusLabel(previewStatus)}
                        </span>
                      </div>
                      <p className="text-xs text-tiki-brown/50">
                        {getCategoryLabel(concept.category)}
                        {concept.characterSlug && ` · ${concept.characterSlug}`}
                        {concept.audience && ` · ${concept.audience}`}
                      </p>
                      {concept.shortDescription && (
                        <p className="text-xs text-tiki-brown/55 mt-1 leading-relaxed">
                          {concept.shortDescription}
                        </p>
                      )}
                      {concept.updatedAt && (
                        <p className="text-[10px] text-tiki-brown/30 mt-1">
                          Updated {new Date(concept.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => fillForm(concept)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-ube-purple/25 bg-ube-purple/8 text-ube-purple hover:bg-ube-purple/15 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleArchive(concept)}
                        className="text-xs font-bold px-3 py-1.5 rounded-full border border-tiki-brown/15 bg-tiki-brown/5 text-tiki-brown/55 hover:bg-tiki-brown/10 transition-colors"
                      >
                        Archive
                      </button>
                    </div>
                  </div>

                  {/* Concept visibility controls */}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-tiki-brown/8 bg-tiki-brown/2 px-3 py-2.5">
                    <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">
                      Public Preview Visibility
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["public-ready", "draft", "hidden"] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          disabled={isVisUpdating || previewStatus === s}
                          onClick={() => handleConceptVisibility(concept, s)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors disabled:cursor-not-allowed ${
                            previewStatus === s
                              ? "bg-tiki-brown/10 border-tiki-brown/20 text-tiki-brown/40 cursor-default"
                              : s === "public-ready"
                              ? "border-tropical-green/30 bg-tropical-green/8 text-tropical-green hover:bg-tropical-green/18"
                              : s === "hidden"
                              ? "border-warm-coral/30 bg-warm-coral/8 text-warm-coral/80 hover:bg-warm-coral/15"
                              : "border-tiki-brown/20 bg-tiki-brown/5 text-tiki-brown/60 hover:bg-tiki-brown/10"
                          }`}
                        >
                          {isVisUpdating ? "Saving…" : s === "public-ready" ? "Mark Public Ready" : s === "draft" ? "Set Draft" : "Hide"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mockups */}
                  {mockups.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">
                        Saved Mockups ({mockups.length})
                      </p>
                      <div className="flex flex-col gap-2">
                        {mockups.map((mockup) => {
                          const isMockupUpdating = mockupVisUpdating === mockup.id;
                          return (
                            <div
                              key={mockup.id}
                              className="rounded-xl border border-tiki-brown/8 bg-tiki-brown/2 px-3 py-2.5 flex flex-col gap-1.5"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${MOCKUP_VIS_COLORS[mockup.visibility] ?? "bg-tiki-brown/8 text-tiki-brown/55"}`}>
                                  {getMockupVisLabel(mockup.visibility)}
                                </span>
                                <span className="text-xs text-tiki-brown/45">
                                  {mockup.productTitle}
                                </span>
                                <span className="text-[10px] text-tiki-brown/30">
                                  {new Date(mockup.approvedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex gap-1.5 flex-wrap">
                                {(["public-ready", "admin-only", "hidden"] as const).map((v) => (
                                  <button
                                    key={v}
                                    type="button"
                                    disabled={isMockupUpdating || mockup.visibility === v}
                                    onClick={() => handleMockupVisibility(concept, mockup, v)}
                                    className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors disabled:cursor-not-allowed ${
                                      mockup.visibility === v
                                        ? "bg-tiki-brown/10 border-tiki-brown/20 text-tiki-brown/35 cursor-default"
                                        : v === "public-ready"
                                        ? "border-tropical-green/30 bg-tropical-green/8 text-tropical-green hover:bg-tropical-green/18"
                                        : v === "hidden"
                                        ? "border-warm-coral/30 bg-warm-coral/8 text-warm-coral/80 hover:bg-warm-coral/15"
                                        : "border-ube-purple/25 bg-ube-purple/8 text-ube-purple/70 hover:bg-ube-purple/15"
                                    }`}
                                  >
                                    {isMockupUpdating
                                      ? "Saving…"
                                      : v === "public-ready"
                                      ? "Make Public"
                                      : v === "admin-only"
                                      ? "Admin Only"
                                      : "Hide"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Archived concepts ─────────────────────────────────────────────────── */}
      {archivedConcepts.length > 0 && (
        <div className="bg-white rounded-3xl border border-tiki-brown/8 shadow-sm p-6 flex flex-col gap-4 opacity-75">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-sm font-black text-tiki-brown/60">
              Archived Concepts ({archivedConcepts.length})
            </h3>
            <span className="text-xs text-tiki-brown/40">{showArchived ? "▲ Hide" : "▼ Show"}</span>
          </button>

          {showArchived && (
            <>
              <p className="text-xs text-tiki-brown/40 leading-relaxed">
                Archived concepts are hidden from active planning but can be restored.
              </p>
              <div className="flex flex-col divide-y divide-tiki-brown/6">
                {archivedConcepts.map((concept) => (
                  <div key={concept.id} className="py-3 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-tiki-brown/50">{concept.title}</p>
                      <p className="text-xs text-tiki-brown/35">
                        {getCategoryLabel(concept.category)}
                        {concept.characterSlug && ` · ${concept.characterSlug}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(concept)}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-tropical-green/25 bg-tropical-green/8 text-tropical-green hover:bg-tropical-green/15 transition-colors flex-shrink-0"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
