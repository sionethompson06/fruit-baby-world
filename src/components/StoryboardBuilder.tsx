"use client";

import { useState, useRef } from "react";
import type { Character } from "@/lib/content";

// ─── Local types ──────────────────────────────────────────────────────────────

type SceneDraft = {
  id: string;
  sceneNumber: number;
  title: string;
  summary: string;
  characters: string[];
  visualNotes: string;
  emotionalBeat: string;
};

type StoryboardDraft = {
  title: string;
  shortDescription: string;
  featuredCharacters: string[];
  setting: string;
  lesson: string;
  targetAgeRange: string;
  tone: string;
  storyNotes: string;
  scenes: SceneDraft[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const AGE_RANGES = ["2–4 years", "3–5 years", "4–6 years", "5–7 years", "6–8 years"];
const TONES = ["Playful", "Heartwarming", "Funny", "Exciting", "Educational", "Adventurous", "Mischievous"];

const FIDELITY_RULES = [
  "Use canonical character JSON as the source of truth — do not invent traits.",
  "Use official uploaded character profile images for all visual references.",
  "Do not redesign characters — preserve body shape, silhouette, and colors.",
  "Keep Tiki mischievous but kid-friendly and in-brand.",
  "Future AI image prompts must be reference-anchored to official character art.",
  "All generated character variations require human approval before publishing.",
];

const PIPELINE_STEPS = [
  { step: 1, label: "Draft storyboard", emoji: "✍️", active: true },
  { step: 2, label: "Generate episode package", emoji: "⚙️", active: false },
  { step: 3, label: "Review character fidelity", emoji: "🔍", active: false },
  { step: 4, label: "Approve draft", emoji: "✅", active: false },
  { step: 5, label: "Save to GitHub", emoji: "💾", active: false },
  { step: 6, label: "Publish to website", emoji: "🚀", active: false },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function emptyScene(id: string, sceneNumber: number): SceneDraft {
  return { id, sceneNumber, title: "", summary: "", characters: [], visualNotes: "", emotionalBeat: "" };
}

// ─── CharPills ────────────────────────────────────────────────────────────────

function CharPills({
  characters,
  selected,
  onToggle,
}: {
  characters: Character[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {characters.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onToggle(c.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            selected.includes(c.id)
              ? "bg-ube-purple/15 border-2 border-ube-purple/40 text-ube-purple"
              : "bg-white border border-tiki-brown/20 text-tiki-brown/60 hover:border-ube-purple/30 hover:text-tiki-brown"
          }`}
        >
          {c.shortName}
        </button>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StoryboardBuilder({ characters }: { characters: Character[] }) {
  const idCounter = useRef(2);
  const [previewMode, setPreviewMode] = useState<"storyboard" | "episode-package">("storyboard");

  const [draft, setDraft] = useState<StoryboardDraft>({
    title: "",
    shortDescription: "",
    featuredCharacters: [],
    setting: "",
    lesson: "",
    targetAgeRange: "",
    tone: "",
    storyNotes: "",
    scenes: [emptyScene("scene-1", 1)],
  });

  // ── Draft updaters ────────────────────────────────────────────────────────

  const patchDraft = (patch: Partial<Omit<StoryboardDraft, "scenes">>) =>
    setDraft((prev) => ({ ...prev, ...patch }));

  const toggleFeaturedChar = (id: string) =>
    setDraft((prev) => ({
      ...prev,
      featuredCharacters: prev.featuredCharacters.includes(id)
        ? prev.featuredCharacters.filter((c) => c !== id)
        : [...prev.featuredCharacters, id],
    }));

  const patchScene = (sceneId: string, patch: Partial<Omit<SceneDraft, "id" | "sceneNumber">>) =>
    setDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
    }));

  const toggleSceneChar = (sceneId: string, charId: string) =>
    setDraft((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) =>
        s.id === sceneId
          ? {
              ...s,
              characters: s.characters.includes(charId)
                ? s.characters.filter((c) => c !== charId)
                : [...s.characters, charId],
            }
          : s
      ),
    }));

  const addScene = () => {
    const id = `scene-${idCounter.current++}`;
    setDraft((prev) => ({
      ...prev,
      scenes: [...prev.scenes, emptyScene(id, prev.scenes.length + 1)],
    }));
  };

  const removeScene = (sceneId: string) =>
    setDraft((prev) => ({
      ...prev,
      scenes: prev.scenes
        .filter((s) => s.id !== sceneId)
        .map((s, i) => ({ ...s, sceneNumber: i + 1 })),
    }));

  // ── Preview object ────────────────────────────────────────────────────────

  const previewData = {
    id: "",
    slug: slugify(draft.title) || "",
    title: draft.title,
    status: "draft",
    featuredCharacters: draft.featuredCharacters,
    shortDescription: draft.shortDescription,
    setting: draft.setting,
    lesson: draft.lesson,
    targetAgeRange: draft.targetAgeRange,
    tone: draft.tone,
    storyNotes: draft.storyNotes,
    scenes: draft.scenes.map((s) => ({
      sceneNumber: s.sceneNumber,
      title: s.title,
      summary: s.summary,
      characters: s.characters,
      visualNotes: s.visualNotes,
      emotionalBeat: s.emotionalBeat,
    })),
    merchTieIns: [],
    createdIn: "Storyboard Builder Draft",
  };

  // ── Shared styles ─────────────────────────────────────────────────────────

  const fieldCls =
    "w-full px-3.5 py-2.5 rounded-xl border border-tiki-brown/20 bg-white text-sm text-tiki-brown placeholder:text-tiki-brown/30 focus:outline-none focus:border-ube-purple/40 focus:ring-2 focus:ring-ube-purple/10 transition-all";
  const labelCls = "block text-xs font-bold text-tiki-brown/65 mb-1.5 uppercase tracking-wide";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-b from-pineapple-yellow/20 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-pineapple-yellow/40 text-tiki-brown uppercase tracking-widest">
              Draft Only
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">📝</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-2 leading-tight">
            Storyboard Builder
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Draft simple Fruit Baby story ideas, organize scenes, and prepare
            future episode packages.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16">

        {/* Draft-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm mb-8">
          <span className="text-xl flex-shrink-0">🏗️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Draft-only planning tool
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Storyboards are not saved yet. AI generation, GitHub saving, and
              publishing will be added in future phases. Refreshing the page
              will clear this draft.
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── LEFT: Form ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Story Info */}
            <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
              <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2">
                <span>📖</span> Story Info
              </h2>

              <div>
                <label className={labelCls}>Episode Title</label>
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="e.g. The Mango Mix-Up"
                  value={draft.title}
                  onChange={(e) => patchDraft({ title: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Short Description</label>
                <textarea
                  className={`${fieldCls} resize-none`}
                  rows={3}
                  placeholder="A brief summary of this episode..."
                  value={draft.shortDescription}
                  onChange={(e) => patchDraft({ shortDescription: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls}>Featured Characters</label>
                <CharPills
                  characters={characters}
                  selected={draft.featuredCharacters}
                  onToggle={toggleFeaturedChar}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Setting</label>
                  <input
                    type="text"
                    className={fieldCls}
                    placeholder="e.g. The Tiki Treehouse"
                    value={draft.setting}
                    onChange={(e) => patchDraft({ setting: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Lesson / Moral</label>
                  <input
                    type="text"
                    className={fieldCls}
                    placeholder="e.g. Sharing is sweeter together"
                    value={draft.lesson}
                    onChange={(e) => patchDraft({ lesson: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Target Age Range</label>
                  <select
                    className={fieldCls}
                    value={draft.targetAgeRange}
                    onChange={(e) => patchDraft({ targetAgeRange: e.target.value })}
                  >
                    <option value="">Select age range…</option>
                    {AGE_RANGES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Tone</label>
                  <select
                    className={fieldCls}
                    value={draft.tone}
                    onChange={(e) => patchDraft({ tone: e.target.value })}
                  >
                    <option value="">Select tone…</option>
                    {TONES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Story Notes</label>
                <textarea
                  className={`${fieldCls} resize-none`}
                  rows={3}
                  placeholder="Additional notes, ideas, or directions for this episode..."
                  value={draft.storyNotes}
                  onChange={(e) => patchDraft({ storyNotes: e.target.value })}
                />
              </div>
            </div>

            {/* Scenes */}
            <div className="flex flex-col gap-4">
              <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2">
                <span>🎬</span> Scenes
                <span className="text-xs font-semibold text-tiki-brown/40 ml-1">
                  ({draft.scenes.length})
                </span>
              </h2>

              {draft.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4"
                >
                  {/* Scene header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-pineapple-yellow/40 text-tiki-brown text-xs font-black flex items-center justify-center flex-shrink-0">
                        {scene.sceneNumber}
                      </span>
                      <span className="text-sm font-black text-tiki-brown">
                        Scene {scene.sceneNumber}
                      </span>
                    </div>
                    {draft.scenes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeScene(scene.id)}
                        className="text-xs font-semibold text-warm-coral/70 hover:text-warm-coral px-3 py-1 rounded-full hover:bg-warm-coral/10 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Scene Title</label>
                    <input
                      type="text"
                      className={fieldCls}
                      placeholder="e.g. The Great Fruit Scramble"
                      value={scene.title}
                      onChange={(e) => patchScene(scene.id, { title: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Scene Summary</label>
                    <textarea
                      className={`${fieldCls} resize-none`}
                      rows={3}
                      placeholder="What happens in this scene..."
                      value={scene.summary}
                      onChange={(e) => patchScene(scene.id, { summary: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Characters in Scene</label>
                    <CharPills
                      characters={characters}
                      selected={scene.characters}
                      onToggle={(charId) => toggleSceneChar(scene.id, charId)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Visual Notes</label>
                      <textarea
                        className={`${fieldCls} resize-none`}
                        rows={3}
                        placeholder="Visual mood, colors, and style for this scene..."
                        value={scene.visualNotes}
                        onChange={(e) => patchScene(scene.id, { visualNotes: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Emotional Beat</label>
                      <textarea
                        className={`${fieldCls} resize-none`}
                        rows={3}
                        placeholder="e.g. Surprise and delight, tension resolves..."
                        value={scene.emotionalBeat}
                        onChange={(e) => patchScene(scene.id, { emotionalBeat: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Scene */}
              <button
                type="button"
                onClick={addScene}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl border-2 border-dashed border-pineapple-yellow/50 text-sm font-bold text-tiki-brown/55 hover:border-pineapple-yellow hover:text-tiki-brown hover:bg-pineapple-yellow/5 transition-all"
              >
                <span className="text-base leading-none">+</span>
                <span>Add Scene</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT: Preview + Checklist ─────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-20">

            {/* Preview mode tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-tiki-brown/10 shadow-sm p-1.5">
              {(["storyboard", "episode-package"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    previewMode === mode
                      ? "bg-ube-purple text-white shadow-sm"
                      : "text-tiki-brown/60 hover:bg-ube-purple/10 hover:text-ube-purple"
                  }`}
                >
                  {mode === "storyboard" ? "📋 Storyboard Draft" : "🎬 Episode Package"}
                </button>
              ))}
            </div>

            {previewMode === "storyboard" ? (
              <>
                {/* Live JSON Preview */}
                <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">👁️</span>
                    <h2 className="text-sm font-black text-tiki-brown">Live Preview</h2>
                  </div>
                  <p className="text-xs text-tiki-brown/40 mb-3">
                    Updates as you type — not saved.
                  </p>
                  <pre className="text-xs text-tiki-brown/75 bg-bg-cream rounded-2xl p-4 overflow-y-auto overflow-x-auto max-h-72 leading-relaxed whitespace-pre-wrap break-words">
                    {JSON.stringify(previewData, null, 2)}
                  </pre>
                </div>

                {/* Character Fidelity Checklist */}
                <div className="bg-white rounded-3xl border border-warm-coral/20 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">🔒</span>
                    <h2 className="text-sm font-black text-tiki-brown">
                      Character Fidelity Checklist
                    </h2>
                  </div>
                  <ul className="space-y-2.5">
                    {FIDELITY_RULES.map((rule) => (
                      <li
                        key={rule}
                        className="flex items-start gap-2 text-xs text-tiki-brown/70 leading-snug"
                      >
                        <span className="text-warm-coral flex-shrink-0 mt-0.5">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              /* Episode Package placeholder */
              <div className="bg-white rounded-3xl border border-ube-purple/20 shadow-sm p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎬</span>
                  <h2 className="text-sm font-black text-tiki-brown">
                    Episode Package Preview
                  </h2>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blush-pink/40 text-tiki-brown w-fit">
                  Coming Next
                </span>
                <p className="text-sm text-tiki-brown/65 leading-relaxed">
                  This future preview will map the storyboard draft into a
                  production-ready episode package structure. AI generation is
                  not active yet.
                </p>
                <div className="bg-bg-cream rounded-2xl px-4 py-3 mt-1">
                  <p className="text-xs font-semibold text-tiki-brown/50">
                    Will include: scene breakdown, dialogue placeholders,
                    voiceover notes, image &amp; animation prompt structure,
                    character fidelity checklist, and approval workflow.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Future Workflow ───────────────────────────────────────────── */}
        <div className="mt-10 pt-8 border-t border-dashed border-tiki-brown/15">
          <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2 mb-1">
            <span>🔄</span> Future Workflow
          </h2>
          <p className="text-xs text-tiki-brown/45 mb-5">
            Planned pipeline — informational only. None of these steps are active yet except Step 1.
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3">
            {PIPELINE_STEPS.map((s, i) => (
              <div key={s.step} className="flex items-center gap-3">
                <div
                  className={`rounded-2xl border px-4 py-3 flex items-center gap-3 flex-shrink-0 ${
                    s.active
                      ? "bg-pineapple-yellow/20 border-pineapple-yellow/50"
                      : "bg-white border-tiki-brown/10"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                      s.active
                        ? "bg-pineapple-yellow text-tiki-brown"
                        : "bg-tiki-brown/10 text-tiki-brown/40"
                    }`}
                  >
                    {s.step}
                  </span>
                  <span className="text-sm">{s.emoji}</span>
                  <span
                    className={`text-xs font-semibold whitespace-nowrap ${
                      s.active ? "text-tiki-brown" : "text-tiki-brown/50"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span className="text-tiki-brown/20 font-bold text-lg hidden sm:block">
                    →
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
