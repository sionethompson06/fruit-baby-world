"use client";

import { useState } from "react";

type UpdateCopyResult =
  | {
      ok: true;
      status: "updated";
      path: string;
      commitMessage: string;
      sceneNumber: number;
      alt: string;
      caption: string;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
    };

const MIN_ALT = 20;
const MAX_ALT = 300;
const MAX_CAPTION = 240;

export default function EditPanelCopySection({
  episodeSlug,
  sceneNumber,
  initialAlt,
  initialCaption,
}: {
  episodeSlug: string;
  sceneNumber: number;
  initialAlt: string;
  initialCaption: string;
}) {
  const [alt, setAlt] = useState(initialAlt);
  const [caption, setCaption] = useState(initialCaption);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<UpdateCopyResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const altChanged = alt.trim() !== initialAlt.trim();
  const captionChanged = caption.trim() !== initialCaption.trim();
  const hasChanges = altChanged || captionChanged;

  const altValid = alt.trim().length >= MIN_ALT && alt.trim().length <= MAX_ALT;
  const captionValid = caption.trim().length <= MAX_CAPTION;
  const canSave = hasChanges && altValid && captionValid && saveStatus !== "loading";

  async function handleSave() {
    if (!canSave) return;
    setSaveStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/github/update-story-panel-copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          sceneNumber,
          alt: alt.trim(),
          caption: caption.trim(),
        }),
      });

      const data = (await res.json()) as UpdateCopyResult;
      setResult(data);

      if (data.ok) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
        if (data.status === "unauthorized") {
          setErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        } else if (data.status === "setup_required") {
          setErrorMsg("GitHub saving is not configured yet.");
        } else if (data.status === "panel_not_found") {
          setErrorMsg(data.message);
        } else {
          setErrorMsg(data.message || "Something went wrong while saving story panel copy.");
        }
      }
    } catch {
      setSaveStatus("error");
      setErrorMsg("Something went wrong while saving story panel copy.");
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4 border-t border-tiki-brown/8">
      {/* Section header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm">✏️</span>
        <p className="text-xs font-black text-tiki-brown/60 uppercase tracking-wide">
          Edit Alt Text &amp; Caption
        </p>
      </div>

      <p className="text-xs text-tiki-brown/55 leading-relaxed">
        Alt text supports accessibility. Captions are optional public-facing story text.
        This updates the episode JSON in GitHub and does not change the image file.
      </p>

      {/* Alt text field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`alt-${sceneNumber}`}
          className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide"
        >
          Alt Text <span className="text-warm-coral/70">*</span>
        </label>
        <textarea
          id={`alt-${sceneNumber}`}
          value={alt}
          onChange={(e) => {
            setAlt(e.target.value);
            setSaveStatus("idle");
          }}
          rows={3}
          maxLength={MAX_ALT}
          placeholder="Accessible description of the story panel image."
          className="w-full text-xs text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-tiki-brown/40 leading-tight">
            {MIN_ALT}–{MAX_ALT} characters. Kid-friendly, no prompt or admin language.
          </p>
          <span
            className={`text-xs font-semibold flex-shrink-0 ${
              alt.trim().length > MAX_ALT || (alt.trim().length > 0 && alt.trim().length < MIN_ALT)
                ? "text-warm-coral/70"
                : "text-tiki-brown/35"
            }`}
          >
            {alt.trim().length}/{MAX_ALT}
          </span>
        </div>
      </div>

      {/* Caption field */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`caption-${sceneNumber}`}
          className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide"
        >
          Public Caption <span className="text-tiki-brown/30">(optional)</span>
        </label>
        <textarea
          id={`caption-${sceneNumber}`}
          value={caption}
          onChange={(e) => {
            setCaption(e.target.value);
            setSaveStatus("idle");
          }}
          rows={2}
          maxLength={MAX_CAPTION}
          placeholder="Optional public-facing story caption for this panel."
          className="w-full text-xs text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-tiki-brown/40 leading-tight">
            Max {MAX_CAPTION} characters.
          </p>
          <span
            className={`text-xs font-semibold flex-shrink-0 ${
              caption.trim().length > MAX_CAPTION ? "text-warm-coral/70" : "text-tiki-brown/35"
            }`}
          >
            {caption.trim().length}/{MAX_CAPTION}
          </span>
        </div>
      </div>

      {/* Save button row */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave}
          className="text-xs font-black px-3.5 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          {saveStatus === "loading" ? "Saving story panel copy…" : "Save Copy"}
        </button>
        {saveStatus === "success" && (
          <span className="text-xs font-bold text-tropical-green">✓ Story panel copy saved</span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs font-bold text-warm-coral leading-snug">{errorMsg}</span>
        )}
      </div>

      {/* Success details */}
      {saveStatus === "success" && result?.ok && (
        <div className="flex flex-col gap-2 bg-tropical-green/8 border border-tropical-green/25 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Commit details
          </p>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            <strong>Path:</strong> {result.path}
          </p>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
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
          <p className="text-xs text-tiki-brown/45 leading-relaxed">
            Vercel redeploy is required before public pages reflect the change.
          </p>
        </div>
      )}
    </div>
  );
}
