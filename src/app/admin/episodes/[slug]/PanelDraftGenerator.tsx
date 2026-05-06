"use client";

import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIDELITY_ITEMS = [
  "Character body shape matches official reference.",
  "Character colors match official reference.",
  "Face, eyes, mouth, cheeks, and expression style are consistent.",
  "Leaf/crown/accessories are preserved.",
  "Fruit/body texture and identity are preserved.",
  "Character still feels baby-like, soft, and kid-friendly.",
  "Scene matches the prompt and story moment.",
  "No character has been redesigned.",
  "No generic fruit mascot replacement.",
  "No scary, realistic, harsh, or off-brand styling.",
];

type ReviewStatus = "needs-review" | "looks-close" | "needs-regeneration" | "reject-draft";

const REVIEW_STATUS_OPTIONS: { value: ReviewStatus; label: string; className: string }[] = [
  { value: "needs-review",      label: "Needs Review",      className: "bg-pineapple-yellow/30 text-tiki-brown border-pineapple-yellow/50" },
  { value: "looks-close",       label: "Looks Close",       className: "bg-tropical-green/20 text-tropical-green border-tropical-green/40" },
  { value: "needs-regeneration",label: "Needs Regeneration",className: "bg-warm-coral/15 text-warm-coral border-warm-coral/35" },
  { value: "reject-draft",      label: "Reject Draft",      className: "bg-warm-coral/25 text-warm-coral border-warm-coral/50" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type GenStatus = "idle" | "loading" | "done" | "not_configured" | "error";

type ApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  generationPrompt?: string;
  referenceCharacters?: string[];
  notes?: string[];
  image?: { mimeType: string; base64: string };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function GenerationPromptBlock({ prompt }: { prompt: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        Final Generation Prompt
      </p>
      <pre className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3 text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap break-words font-sans select-all max-h-64 overflow-y-auto">
        {prompt}
      </pre>
      <p className="text-xs text-tiki-brown/35 italic">Select text above to copy.</p>
    </div>
  );
}

function ReferenceCharactersBlock({ chars }: { chars: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
        Reference Characters Used
      </p>
      <div className="flex flex-wrap gap-1.5">
        {chars.map((c) => (
          <span
            key={c}
            className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
          >
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function FidelityChecklist({
  checked,
  onToggle,
}: {
  checked: boolean[];
  onToggle: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
        Character Fidelity Review
      </p>
      <div className="flex flex-col gap-1.5">
        {FIDELITY_ITEMS.map((item, i) => (
          <label
            key={i}
            className="flex items-start gap-2.5 cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => onToggle(i)}
              className="mt-0.5 flex-shrink-0 accent-tropical-green"
            />
            <span
              className={`text-xs leading-relaxed transition-colors ${
                checked[i] ? "text-tropical-green line-through" : "text-tiki-brown/65"
              }`}
            >
              {item}
            </span>
          </label>
        ))}
      </div>
      <p className="text-xs text-tiki-brown/35 italic mt-0.5">
        Checklist is local only — not saved, clears on refresh.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PanelDraftGenerator({
  episodeSlug,
  sceneNumber,
  panelPrompt,
  referenceCharacters,
}: {
  episodeSlug: string;
  sceneNumber: number;
  panelPrompt: string;
  referenceCharacters: string[];
}) {
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Review state — local only, not persisted
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("needs-review");
  const [checkedItems, setCheckedItems] = useState<boolean[]>(() =>
    new Array(FIDELITY_ITEMS.length).fill(false)
  );
  const [reviewNotes, setReviewNotes] = useState<string>("");

  const hasTiki = referenceCharacters.some((c) => c.toLowerCase().includes("tiki"));
  const hasDraft = genStatus === "done" || genStatus === "not_configured";
  const isLoading = genStatus === "loading";

  function resetReviewState() {
    setReviewStatus("needs-review");
    setCheckedItems(new Array(FIDELITY_ITEMS.length).fill(false));
    setReviewNotes("");
  }

  function toggleItem(i: number) {
    setCheckedItems((prev) => {
      const next = [...prev];
      next[i] = !next[i];
      return next;
    });
  }

  function handleClear() {
    setGenStatus("idle");
    setResult(null);
    setErrorMsg("");
    resetReviewState();
  }

  async function handleGenerate() {
    setGenStatus("loading");
    setResult(null);
    setErrorMsg("");
    resetReviewState();

    try {
      const res = await fetch("/api/generate-story-panel-image", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          sceneNumber,
          panelPrompt,
          referenceCharacters,
        }),
      });

      if (res.status === 401) {
        setGenStatus("error");
        setErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        return;
      }

      let data: ApiResult;
      try {
        data = (await res.json()) as ApiResult;
      } catch {
        setGenStatus("error");
        setErrorMsg("Something went wrong while generating this temporary panel draft.");
        return;
      }

      if (data.status === "not_implemented_yet") {
        setGenStatus("not_configured");
        setResult(data);
        return;
      }

      if (data.ok) {
        setGenStatus("done");
        setResult(data);
      } else {
        setGenStatus("error");
        setErrorMsg(
          data.message ?? "Something went wrong while generating this temporary panel draft."
        );
      }
    } catch {
      setGenStatus("error");
      setErrorMsg("Something went wrong while generating this temporary panel draft.");
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-3 border-t border-sky-blue/25 mt-1">

      {/* Temporary draft disclaimer */}
      <div className="flex items-start gap-2 bg-sky-blue/10 border border-sky-blue/25 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">⚠️</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Temporary review draft only.</strong>{" "}
          Generated images are not saved, uploaded, attached to this episode, committed to GitHub, or
          published.
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-ube-purple text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isLoading
            ? "Generating…"
            : hasDraft
            ? "Regenerate Temporary Draft"
            : "Generate Temporary Panel Draft"}
        </button>

        {hasDraft && !isLoading && (
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-xl border border-tiki-brown/20 text-tiki-brown/60 text-sm font-semibold hover:bg-tiki-brown/5 transition-colors"
          >
            Clear Temporary Draft
          </button>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <p className="text-sm text-tiki-brown/45 italic animate-pulse">
          Generating temporary panel draft…
        </p>
      )}

      {/* Error */}
      {genStatus === "error" && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-warm-coral leading-relaxed font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Not configured */}
      {genStatus === "not_configured" && result && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">🔑</span>
            <p className="text-xs text-tiki-brown/70 leading-relaxed">
              {result.message?.includes("OPENAI_API_KEY")
                ? "OpenAI is not configured yet. Add OPENAI_API_KEY in your Vercel environment variables to enable generation."
                : result.message}
            </p>
          </div>
          {result.generationPrompt && (
            <GenerationPromptBlock prompt={result.generationPrompt} />
          )}
          {result.referenceCharacters && result.referenceCharacters.length > 0 && (
            <ReferenceCharactersBlock chars={result.referenceCharacters} />
          )}
        </div>
      )}

      {/* ── Draft Image Review ── */}
      {genStatus === "done" && result && (
        <div className="flex flex-col gap-5 bg-tiki-brown/3 border border-tiki-brown/10 rounded-2xl p-4 mt-1">

          {/* Section heading */}
          <div className="flex items-center gap-2">
            <span className="text-base">🔍</span>
            <h3 className="text-sm font-black text-tiki-brown">Draft Image Review</h3>
            <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral uppercase tracking-wide">
              Temporary — Not Saved
            </span>
          </div>

          {/* Image preview */}
          {result.image?.base64 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                Temporary Draft Preview — Not Saved
              </p>
              <p className="text-xs text-tiki-brown/50 leading-relaxed">
                This image is a temporary admin review draft. It has not been saved, approved,
                attached to the episode, or published.
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                alt="Temporary story panel draft — not saved, not published"
                className="w-full max-w-lg rounded-2xl border-2 border-warm-coral/30 shadow-sm"
              />
            </div>
          )}

          {/* Reference characters */}
          {(result.referenceCharacters ?? referenceCharacters).length > 0 && (
            <div>
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
                Reference Characters
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(result.referenceCharacters ?? referenceCharacters).map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tiki-specific warning */}
          {hasTiki && (
            <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
              <span className="text-sm flex-shrink-0">⚡</span>
              <p className="text-xs text-tiki-brown/70 leading-relaxed">
                <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
                dramatic, and kid-friendly. Reject or regenerate drafts that make Tiki scary,
                violent, horror-like, cruel, evil, or too intense.
              </p>
            </div>
          )}

          {/* Reference reminder */}
          <div className="flex items-start gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">📎</span>
            <p className="text-xs text-tiki-brown/65 leading-relaxed">
              Compare this draft against the official profile sheet and approved character references
              before using it in any future story panel.
            </p>
          </div>

          {/* Fidelity checklist */}
          <FidelityChecklist checked={checkedItems} onToggle={toggleItem} />

          {/* Local review status */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Local Review Status
            </p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_STATUS_OPTIONS.map(({ value, label, className }) => (
                <button
                  key={value}
                  onClick={() => setReviewStatus(value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-opacity ${className} ${
                    reviewStatus === value ? "opacity-100 shadow-sm" : "opacity-40 hover:opacity-70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-tiki-brown/35 italic">
              Local only — not saved, clears on refresh.
            </p>
          </div>

          {/* Review notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Panel Review Notes
            </label>
            <p className="text-xs text-tiki-brown/40">
              Add notes about character fidelity, scene accuracy, or what should change before
              regenerating.
            </p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g. Colors look off, crown shape incorrect, regenerate with more specific prompt…"
              rows={3}
              className="w-full text-xs text-tiki-brown/75 bg-white border border-tiki-brown/15 rounded-xl px-3 py-2.5 leading-relaxed resize-y placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40"
            />
            <p className="text-xs text-tiki-brown/35 italic">
              Local only — not saved, clears on refresh.
            </p>
          </div>

          {/* API notes */}
          {result.notes && result.notes.length > 0 && (
            <ul className="space-y-1 border-t border-tiki-brown/8 pt-3">
              {result.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-tiki-brown/45">
                  <span className="mt-0.5 text-ube-purple/40 flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
          )}

          {/* Generation prompt */}
          {result.generationPrompt && (
            <GenerationPromptBlock prompt={result.generationPrompt} />
          )}

          {/* Future workflow note */}
          <div className="flex items-start gap-2 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-3 py-2.5">
            <span className="text-sm flex-shrink-0">🔮</span>
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              <strong className="font-semibold">Future phase:</strong> Approved draft images may be
              saved to media storage and attached to the episode after review. Saving is not active
              yet.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
