"use client";

import { useState, useCallback } from "react";

export type PanelSummary = {
  sceneNumber: number;
  panelTitle: string;
  imageUrl: string;
  isPublic: boolean;
  displayOrder?: number;
};

type ReorderResult =
  | {
      ok: true;
      status: "reordered";
      path: string;
      commitMessage: string;
      orderedSceneNumbers: number[];
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
    };

function swapAt<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export default function ReorderPanelsSection({
  episodeSlug,
  initialPanels,
}: {
  episodeSlug: string;
  initialPanels: PanelSummary[];
}) {
  const [panels, setPanels] = useState<PanelSummary[]>(initialPanels);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<ReorderResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const initialOrder = initialPanels.map((p) => p.sceneNumber).join(",");
  const currentOrder = panels.map((p) => p.sceneNumber).join(",");
  const hasUnsavedChanges = initialOrder !== currentOrder;

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setPanels((prev) => swapAt(prev, index, index - 1));
    setStatus("idle");
    setResult(null);
  }, []);

  const moveDown = useCallback((index: number) => {
    setPanels((prev) => {
      if (index >= prev.length - 1) return prev;
      return swapAt(prev, index, index + 1);
    });
    setStatus("idle");
    setResult(null);
  }, []);

  async function handleSave() {
    setStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/github/reorder-story-panel-assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          orderedSceneNumbers: panels.map((p) => p.sceneNumber),
        }),
      });

      const data = (await res.json()) as ReorderResult;
      setResult(data);

      if (data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(data.message ?? "Save failed.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error.");
    }
  }

  if (initialPanels.length < 2) return null;

  return (
    <div className="flex flex-col gap-4 border-t border-tiki-brown/10 pt-5 mt-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-base">↕️</span>
        <h3 className="text-sm font-black text-tiki-brown">Reorder Story Panels</h3>
        {hasUnsavedChanges && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/50 text-tiki-brown/80">
            Unsaved changes
          </span>
        )}
      </div>

      <p className="text-xs text-tiki-brown/60 leading-relaxed">
        Drag using ↑ ↓ buttons to set the display order. The public story page will
        show panels in this order after Vercel redeploys.
      </p>

      {hasUnsavedChanges && (
        <div className="flex items-start gap-2 bg-pineapple-yellow/20 border border-pineapple-yellow/50 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs font-semibold text-tiki-brown/75 leading-relaxed">
            Panel order has unsaved changes.
          </p>
        </div>
      )}

      {/* Panel list */}
      <div className="flex flex-col gap-2">
        {panels.map((panel, index) => (
          <div
            key={panel.sceneNumber}
            className="flex items-center gap-3 bg-tiki-brown/3 border border-tiki-brown/10 rounded-xl px-3 py-2.5"
          >
            {/* Thumbnail */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={panel.imageUrl}
              alt={panel.panelTitle}
              className="w-12 h-9 object-cover rounded-lg flex-shrink-0 border border-tiki-brown/10"
            />

            {/* Info */}
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple flex-shrink-0">
                  Scene {panel.sceneNumber}
                </span>
                {panel.isPublic && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green flex-shrink-0">
                    Public
                  </span>
                )}
              </div>
              <p className="text-xs text-tiki-brown/65 truncate leading-tight">{panel.panelTitle}</p>
            </div>

            {/* Move buttons */}
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="text-xs font-bold px-2 py-1 rounded-lg bg-white border border-tiki-brown/15 text-tiki-brown/60 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label={`Move panel ${panel.sceneNumber} up`}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === panels.length - 1}
                className="text-xs font-bold px-2 py-1 rounded-lg bg-white border border-tiki-brown/15 text-tiki-brown/60 hover:text-tiki-brown hover:border-tiki-brown/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                aria-label={`Move panel ${panel.sceneNumber} down`}
              >
                ↓
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "loading" || !hasUnsavedChanges}
          className="text-sm font-black px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {status === "loading" ? "Saving…" : "Save Panel Order"}
        </button>
        {status === "success" && (
          <span className="text-xs font-bold text-tropical-green">✓ Order saved</span>
        )}
        {status === "error" && (
          <span className="text-xs font-bold text-warm-coral">{errorMsg}</span>
        )}
      </div>

      {/* Success details */}
      {status === "success" && result?.ok && (
        <div className="flex flex-col gap-2 bg-tropical-green/8 border border-tropical-green/25 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            Commit details
          </p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong>Path:</strong> {result.path}
          </p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong>Commit:</strong> {result.commitMessage}
          </p>
          {result.htmlUrl && (
            <a
              href={result.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              View commit on GitHub ↗
            </a>
          )}
          <p className="text-xs text-tiki-brown/50 leading-relaxed">
            Vercel redeploy is required before the public page reflects the new order.
          </p>
        </div>
      )}
    </div>
  );
}
