"use client";

import { useState } from "react";

type PanelVisibility = "public" | "hidden";

type VisibilityResult =
  | { ok: true; visibility: PanelVisibility; notes: string[] }
  | { ok: false; message: string };

export default function PanelVisibilityControl({
  episodeSlug,
  sceneNumber,
  initialVisibility,
}: {
  episodeSlug: string;
  sceneNumber: number;
  initialVisibility: PanelVisibility;
}) {
  const [visibility, setVisibility] = useState<PanelVisibility>(initialVisibility);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VisibilityResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const isHidden = visibility === "hidden";
  const targetAction = isHidden ? "restore" : "hide";

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/github/update-story-panel-visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          sceneNumber,
          visibility: targetAction === "hide" ? "hidden" : "public",
          hiddenReason: targetAction === "hide" ? reason : undefined,
        }),
      });
      const data = (await res.json()) as
        | { ok: true; visibility: PanelVisibility; notes: string[] }
        | { ok: false; message: string };
      if (data.ok) {
        setVisibility(data.visibility);
        setReason("");
        setShowConfirm(false);
        setResult({ ok: true, visibility: data.visibility, notes: data.notes });
      } else {
        setResult({ ok: false, message: data.message });
      }
    } catch {
      setResult({ ok: false, message: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-4 border-t border-tiki-brown/8">
      {/* Visibility status badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-black text-tiki-brown/55 uppercase tracking-wide">
          Panel Visibility
        </span>
        {isHidden ? (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral">
            Hidden from Public
          </span>
        ) : (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green">
            Publicly Visible
          </span>
        )}
      </div>

      {isHidden && (
        <div className="flex items-start gap-2 bg-warm-coral/6 border border-warm-coral/20 rounded-xl px-3 py-2">
          <p className="text-xs text-warm-coral/80 leading-relaxed">
            This panel is hidden from the public story page. The Blob asset is not deleted and
            can be restored at any time.
          </p>
        </div>
      )}

      {/* Action area */}
      {!showConfirm ? (
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className={`self-start text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
            isHidden
              ? "bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25"
              : "bg-warm-coral/10 text-warm-coral hover:bg-warm-coral/20"
          }`}
        >
          {isHidden ? "Restore Panel to Public" : "Hide Panel from Public"}
        </button>
      ) : (
        <div className="flex flex-col gap-3 bg-tiki-brown/3 border border-tiki-brown/12 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown">
            {isHidden
              ? "Restore this panel to public display?"
              : "Hide this panel from public display?"}
          </p>

          {!isHidden && (
            <div className="flex flex-col gap-1">
              <label className="text-xs text-tiki-brown/50 font-semibold" htmlFor={`reason-${sceneNumber}`}>
                Reason (optional, admin only, max 500 chars)
              </label>
              <textarea
                id={`reason-${sceneNumber}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={2}
                placeholder="e.g. Image quality issue, waiting for replacement..."
                className="text-xs border border-tiki-brown/15 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-ube-purple/30 bg-white text-tiki-brown placeholder:text-tiki-brown/30"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                isHidden
                  ? "bg-tropical-green/20 text-tropical-green hover:bg-tropical-green/30"
                  : "bg-warm-coral/15 text-warm-coral hover:bg-warm-coral/25"
              }`}
            >
              {loading
                ? "Saving…"
                : isHidden
                ? "Confirm: Restore Panel"
                : "Confirm: Hide Panel"}
            </button>
            <button
              type="button"
              onClick={() => { setShowConfirm(false); setReason(""); setResult(null); }}
              disabled={loading}
              className="text-xs font-semibold text-tiki-brown/50 hover:text-tiki-brown/70 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div
          className={`rounded-xl px-3 py-2.5 text-xs leading-relaxed ${
            result.ok
              ? "bg-tropical-green/10 border border-tropical-green/25 text-tropical-green"
              : "bg-warm-coral/10 border border-warm-coral/25 text-warm-coral"
          }`}
        >
          {result.ok ? (
            <div className="flex flex-col gap-0.5">
              <p className="font-bold">
                {result.visibility === "hidden"
                  ? "Panel hidden from public display."
                  : "Panel restored to public display."}
              </p>
              {result.notes.map((n) => (
                <p key={n} className="text-tropical-green/75">{n}</p>
              ))}
            </div>
          ) : (
            <p>{result.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
