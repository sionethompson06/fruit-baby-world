"use client";

import { useState } from "react";

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
      <pre className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3 text-xs text-tiki-brown/65 leading-relaxed whitespace-pre-wrap break-words font-sans select-all max-h-72 overflow-y-auto">
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

  async function handleGenerate() {
    setGenStatus("loading");
    setResult(null);
    setErrorMsg("");

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

  const isLoading = genStatus === "loading";

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

      {/* Generate button */}
      <div>
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="px-4 py-2 rounded-xl bg-ube-purple text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isLoading ? "Generating…" : "Generate Temporary Panel Draft"}
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <p className="text-sm text-tiki-brown/45 italic animate-pulse">
          Generating temporary panel draft…
        </p>
      )}

      {/* Error state */}
      {genStatus === "error" && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-warm-coral leading-relaxed font-semibold">{errorMsg}</p>
        </div>
      )}

      {/* Not configured — show prompt metadata so it's still useful */}
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

      {/* Success — image or prompt metadata */}
      {genStatus === "done" && result && (
        <div className="flex flex-col gap-4">
          {/* Image preview */}
          {result.image?.base64 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
                Temporary Draft Preview — Not Saved
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:${result.image.mimeType};base64,${result.image.base64}`}
                alt="Temporary story panel draft — not saved, not published"
                className="w-full max-w-lg rounded-2xl border-2 border-warm-coral/30 shadow-sm"
              />
              <div className="flex items-start gap-2 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-3 py-2.5">
                <span className="text-sm flex-shrink-0">🎨</span>
                <p className="text-xs text-tiki-brown/70 leading-relaxed">
                  <strong className="font-semibold">Review required:</strong> Compare this draft
                  against the official character profile images. Characters must not be redesigned.
                </p>
              </div>
            </div>
          )}

          {/* Notes */}
          {result.notes && result.notes.length > 0 && (
            <ul className="space-y-1">
              {result.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-tiki-brown/50">
                  <span className="mt-0.5 text-ube-purple/50 flex-shrink-0">•</span>
                  {note}
                </li>
              ))}
            </ul>
          )}

          {result.generationPrompt && (
            <GenerationPromptBlock prompt={result.generationPrompt} />
          )}
          {result.referenceCharacters && result.referenceCharacters.length > 0 && (
            <ReferenceCharactersBlock chars={result.referenceCharacters} />
          )}
        </div>
      )}
    </div>
  );
}
