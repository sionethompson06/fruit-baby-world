"use client";

import { useState } from "react";

type SaveState =
  | { phase: "idle" }
  | { phase: "saving" }
  | { phase: "saved" }
  | { phase: "error"; message: string };

export default function StorybookDetailsEditor({
  episodeSlug,
  initialTitle,
  initialAbout,
}: {
  episodeSlug: string;
  initialTitle: string;
  initialAbout: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [about, setAbout] = useState(initialAbout);
  const [saveState, setSaveState] = useState<SaveState>({ phase: "idle" });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSaveState({ phase: "error", message: "Title is required." });
      return;
    }
    if (!about.trim()) {
      setSaveState({ phase: "error", message: "About this story is required." });
      return;
    }
    setSaveState({ phase: "saving" });
    try {
      const res = await fetch("/api/github/update-storybook-details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          title: title.trim(),
          about: about.trim(),
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setSaveState({ phase: "error", message: data.message ?? "Failed to save details." });
        return;
      }
      setSaveState({ phase: "saved" });
      setTimeout(() => setSaveState({ phase: "idle" }), 3000);
    } catch {
      setSaveState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  const busy = saveState.phase === "saving";

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">✏️</span>
        <h3 className="text-base font-black text-tiki-brown">Storybook Details</h3>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`title-${episodeSlug}`} className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            Title <span className="text-warm-coral">*</span>
          </label>
          <input
            id={`title-${episodeSlug}`}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            maxLength={120}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={`about-${episodeSlug}`} className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">
            About This Story <span className="text-warm-coral">*</span>
          </label>
          <textarea
            id={`about-${episodeSlug}`}
            value={about}
            onChange={(e) => setAbout(e.target.value)}
            disabled={busy}
            rows={3}
            maxLength={600}
            className="text-sm border border-tiki-brown/15 rounded-xl px-3 py-2 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 resize-none disabled:opacity-50 leading-relaxed"
          />
        </div>

        {saveState.phase === "error" && (
          <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2">
            <span className="text-warm-coral font-bold text-sm flex-shrink-0">!</span>
            <p className="text-xs text-warm-coral">{saveState.message}</p>
          </div>
        )}

        {saveState.phase === "saved" && (
          <div className="flex items-center gap-2 bg-tropical-green/10 border border-tropical-green/25 rounded-xl px-3 py-2">
            <span className="text-tropical-green text-sm">✓</span>
            <p className="text-xs text-tropical-green font-semibold">Details saved to GitHub.</p>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={busy}
            className="text-sm font-bold px-5 py-2.5 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "Saving…" : "Save Details"}
          </button>
        </div>
      </form>
    </div>
  );
}
