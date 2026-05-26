"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type FormState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "error"; message: string };

export default function CreateStorybookForm({
  characterOptions,
}: {
  characterOptions: string[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [state, setState] = useState<FormState>({ phase: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setState({ phase: "error", message: "Storybook title is required." });
      return;
    }
    if (!about.trim()) {
      setState({ phase: "error", message: "About this story is required." });
      return;
    }
    setState({ phase: "submitting" });
    try {
      const res = await fetch("/api/github/create-storybook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          about: about.trim(),
          featuredCharacters: selectedChars,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setState({ phase: "error", message: data.message ?? "Failed to create storybook." });
        return;
      }
      router.push(`/admin/episodes/${data.slug}`);
    } catch {
      setState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  function toggleChar(name: string) {
    setSelectedChars((prev) =>
      prev.includes(name) ? prev.filter((c) => c !== name) : [...prev, name]
    );
  }

  const busy = state.phase === "submitting";

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/admin/episodes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Storybooks
          </Link>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">📖</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-2 leading-tight">
            Create New Storybook
          </h1>
          <p className="text-tiki-brown/65 text-base leading-relaxed">
            Start a new storybook by adding a title and about text. You can upload cover and spread images after creation.
          </p>
        </div>
      </section>

      {/* Form */}
      <section className="max-w-2xl mx-auto w-full px-4 sm:px-6 pb-16">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Title */}
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-bold text-tiki-brown">
                Storybook Title <span className="text-warm-coral">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Day Mango Made a Mess"
                disabled={busy}
                maxLength={120}
                className="text-base border border-tiki-brown/15 rounded-xl px-4 py-3 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 disabled:opacity-50"
              />
            </div>

            {/* About */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="about" className="text-sm font-bold text-tiki-brown">
                About This Story <span className="text-warm-coral">*</span>
              </label>
              <textarea
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="A short description of what this story is about. This appears on the public story page."
                rows={4}
                disabled={busy}
                maxLength={600}
                className="text-sm border border-tiki-brown/15 rounded-xl px-4 py-3 bg-white text-tiki-brown placeholder:text-tiki-brown/35 focus:outline-none focus:ring-2 focus:ring-ube-purple/30 resize-none disabled:opacity-50 leading-relaxed"
              />
              <p className="text-xs text-tiki-brown/35 text-right">{about.length}/600</p>
            </div>
          </div>

          {/* Featured Characters (optional) */}
          {characterOptions.length > 0 && (
            <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-3">
              <div>
                <p className="text-sm font-bold text-tiki-brown mb-0.5">Featured Characters</p>
                <p className="text-xs text-tiki-brown/50">Optional. Select characters who appear in this storybook.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {characterOptions.map((name) => {
                  const active = selectedChars.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleChar(name)}
                      disabled={busy}
                      className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                        active
                          ? "bg-ube-purple text-white"
                          : "bg-ube-purple/10 text-ube-purple hover:bg-ube-purple/20"
                      } disabled:opacity-50`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {state.phase === "error" && (
            <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-4 py-3">
              <span className="text-warm-coral font-bold flex-shrink-0 text-sm">!</span>
              <p className="text-sm text-warm-coral">{state.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {busy ? (
                <>
                  <span className="animate-pulse">Creating…</span>
                </>
              ) : (
                <>
                  <span>📖</span>
                  Create Storybook
                </>
              )}
            </button>
            <Link
              href="/admin/episodes"
              className="text-sm font-semibold text-tiki-brown/55 hover:text-tiki-brown transition-colors px-4 py-3"
            >
              Cancel
            </Link>
          </div>

          {busy && (
            <p className="text-xs text-tiki-brown/45 text-center">
              Creating your storybook and saving to GitHub…
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
