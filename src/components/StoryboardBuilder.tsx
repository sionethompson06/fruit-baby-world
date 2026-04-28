"use client";

import { useState, useRef } from "react";
import type { Character } from "@/lib/content";
import {
  type SceneDraft,
  type StoryboardDraft,
  type EpisodePackagePreview,
  createSlug,
  buildEpisodePackagePreview,
} from "@/lib/storyboard";

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

function emptyScene(id: string, sceneNumber: number): SceneDraft {
  return { id, sceneNumber, title: "", summary: "", characters: [], visualNotes: "", emotionalBeat: "" };
}

// ─── CharPills ────────────────────────────────────────────────────────────────

function CharPills({
  characters,
  selected,
  onToggle,
  hint,
}: {
  characters: Character[];
  selected: string[];
  onToggle: (id: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap gap-2">
        {characters.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onToggle(c.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selected.includes(c.id)
                ? "bg-ube-purple/15 border-2 border-ube-purple/50 text-ube-purple shadow-sm"
                : "bg-bg-cream border border-tiki-brown/25 text-tiki-brown/55 hover:border-ube-purple/40 hover:text-tiki-brown hover:bg-white"
            }`}
          >
            {selected.includes(c.id) && (
              <span className="mr-1 opacity-70">✓</span>
            )}
            {c.shortName}
          </button>
        ))}
      </div>
      {selected.length === 0 && hint && (
        <p className="text-xs text-tiki-brown/35 italic">{hint}</p>
      )}
    </div>
  );
}

// ─── Episode Package Panel ────────────────────────────────────────────────────

const FUTURE_SECTIONS = [
  {
    emoji: "💬",
    label: "Dialogue Draft",
    key: "dialogueDraft" as const,
  },
  {
    emoji: "🎙️",
    label: "Voiceover Notes",
    key: "voiceoverNotes" as const,
  },
  {
    emoji: "🖼️",
    label: "Image Prompts",
    key: "imagePrompts" as const,
  },
  {
    emoji: "🎬",
    label: "Animation Prompts",
    key: "animationPrompts" as const,
  },
];

function EpisodePackagePanel({
  pkg,
  characters,
}: {
  pkg: EpisodePackagePreview;
  characters: Character[];
}) {
  const [showJson, setShowJson] = useState(false);
  const charMap = Object.fromEntries(characters.map((c) => [c.id, c]));
  const val = (v: string) => v || "—";

  return (
    <div className="flex flex-col gap-4">

      {/* 1 · Episode Overview */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-xs font-black text-tiki-brown/50 uppercase tracking-widest">
          Episode Overview
        </h3>

        {/* Status badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/40 text-tiki-brown uppercase tracking-wide">
            {pkg.status}
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
            {pkg.productionStatus}
          </span>
        </div>

        {/* Title + slug */}
        <div>
          <p className={`text-base font-black leading-tight ${
            pkg.title ? "text-tiki-brown" : "text-tiki-brown/30 italic"
          }`}>
            {pkg.title || "Untitled Episode"}
          </p>
          {pkg.slug && (
            <p className="text-[10px] font-mono text-tiki-brown/35 mt-0.5">
              /{pkg.slug}
            </p>
          )}
        </div>

        {/* Description */}
        {pkg.shortDescription && (
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            {pkg.shortDescription}
          </p>
        )}

        {/* Field grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {[
            { label: "Setting", value: pkg.setting },
            { label: "Lesson", value: pkg.lesson },
            { label: "Age Range", value: pkg.targetAgeRange },
            { label: "Tone", value: pkg.tone },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">
                {label}
              </p>
              <p className="text-xs text-tiki-brown/75 font-semibold mt-0.5">
                {val(value)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 2 · Featured Characters */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-2.5">
        <h3 className="text-xs font-black text-tiki-brown/50 uppercase tracking-widest">
          Featured Characters
        </h3>
        {pkg.featuredCharacters.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {pkg.featuredCharacters.map((id) => {
              const c = charMap[id];
              return (
                <span
                  key={id}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full border border-tiki-brown/15 text-tiki-brown"
                  style={{
                    backgroundColor: c
                      ? `${c.visualIdentity.primaryColors[0]}22`
                      : undefined,
                  }}
                >
                  {c ? c.shortName : id}
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-tiki-brown/35 italic">
            No characters selected yet.
          </p>
        )}
      </div>

      {/* 3 · Scene Breakdown */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-black text-tiki-brown/50 uppercase tracking-widest px-1">
          Scene Breakdown
        </h3>
        {pkg.sceneBreakdown.map((scene) => (
          <div
            key={scene.sceneNumber}
            className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm p-4 flex flex-col gap-3"
          >
            {/* Scene header */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-pineapple-yellow/40 text-tiki-brown text-[10px] font-black flex items-center justify-center flex-shrink-0">
                {scene.sceneNumber}
              </span>
              <p className={`text-xs font-black leading-snug ${
                scene.title ? "text-tiki-brown" : "text-tiki-brown/30 italic"
              }`}>
                {scene.title || "Untitled Scene"}
              </p>
            </div>

            {/* Summary */}
            {scene.summary && (
              <p className="text-xs text-tiki-brown/65 leading-relaxed">
                {scene.summary}
              </p>
            )}

            {/* Characters */}
            {scene.characters.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {scene.characters.map((id) => {
                  const c = charMap[id];
                  return (
                    <span
                      key={id}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-tiki-brown/15 text-tiki-brown/70"
                    >
                      {c ? c.shortName : id}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Visual notes + Emotional beat */}
            {(scene.visualNotes || scene.emotionalBeat) && (
              <div className="grid grid-cols-2 gap-2">
                {scene.visualNotes && (
                  <div>
                    <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">
                      Visual
                    </p>
                    <p className="text-[10px] text-tiki-brown/60 leading-snug">
                      {scene.visualNotes}
                    </p>
                  </div>
                )}
                {scene.emotionalBeat && (
                  <div>
                    <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">
                      Beat
                    </p>
                    <p className="text-[10px] text-tiki-brown/60 leading-snug">
                      {scene.emotionalBeat}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Future generation mini-badges */}
            <div className="pt-1 border-t border-tiki-brown/8">
              <div className="grid grid-cols-2 gap-1">
                {[
                  { emoji: "💬", label: "Dialogue" },
                  { emoji: "🎙️", label: "Voiceover" },
                  { emoji: "🖼️", label: "Image" },
                  { emoji: "🎬", label: "Animation" },
                ].map(({ emoji, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 text-[10px] font-semibold text-tiki-brown/40 px-2 py-1 rounded-lg bg-blush-pink/20"
                  >
                    <span>{emoji}</span>
                    <span>{label}</span>
                    <span className="ml-auto text-tiki-brown/25">future</span>
                  </span>
                ))}
              </div>
              {/* Character fidelity notes for scene */}
              {scene.characterFidelityNotes.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {scene.characterFidelityNotes.map((note) => (
                    <li
                      key={note}
                      className="text-[10px] text-warm-coral/70 leading-snug flex items-start gap-1"
                    >
                      <span className="flex-shrink-0 mt-0.5">⚠</span>
                      {note}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 4 · Future Generation */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
        <h3 className="text-xs font-black text-tiki-brown/50 uppercase tracking-widest">
          Future Generation
        </h3>
        <div className="flex flex-col gap-2">
          {FUTURE_SECTIONS.map(({ emoji, label, key }) => (
            <div
              key={key}
              className="flex items-start gap-2.5 bg-blush-pink/15 rounded-xl px-3 py-2.5"
            >
              <span className="text-sm flex-shrink-0">{emoji}</span>
              <div>
                <p className="text-xs font-bold text-tiki-brown mb-0.5">
                  {label}
                </p>
                <p className="text-[10px] text-tiki-brown/55 leading-snug">
                  {pkg[key].notes}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5 · Character Fidelity Checklist */}
      <div className="bg-white rounded-3xl border border-warm-coral/20 shadow-sm p-5 flex flex-col gap-2.5">
        <h3 className="text-xs font-black text-tiki-brown/50 uppercase tracking-widest">
          🔒 Character Fidelity
        </h3>
        <ul className="space-y-2">
          {pkg.characterFidelityChecklist.map((rule) => (
            <li
              key={rule}
              className="flex items-start gap-1.5 text-[10px] text-tiki-brown/70 leading-snug"
            >
              <span className="text-warm-coral flex-shrink-0 mt-0.5">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* 6 · Approval Status */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-2.5">
        <h3 className="text-xs font-black text-tiki-brown/50 uppercase tracking-widest">
          Approval Status
        </h3>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/40 text-tiki-brown uppercase tracking-wide">
            {pkg.approval.status}
          </span>
          {pkg.approval.requiresHumanReview && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warm-coral/20 text-tiki-brown uppercase tracking-wide">
              Human Review Required
            </span>
          )}
        </div>
        <p className="text-[10px] text-tiki-brown/55 leading-snug">
          {pkg.approval.notes}
        </p>
      </div>

      {/* 7 · Developer JSON */}
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5">
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="flex items-center justify-between w-full text-xs font-black text-tiki-brown/50 uppercase tracking-widest hover:text-tiki-brown/70 transition-colors"
        >
          <span>Developer JSON</span>
          <span className="text-tiki-brown/30">{showJson ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {showJson && (
          <pre className="mt-3 text-[10px] text-tiki-brown/65 bg-bg-cream rounded-2xl p-3 overflow-y-auto overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap break-words">
            {JSON.stringify(pkg, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StoryboardBuilder({ characters }: { characters: Character[] }) {
  const idCounter = useRef(2);
  const [previewMode, setPreviewMode] = useState<"storyboard" | "episode-package">("storyboard");
  const [showDraftJson, setShowDraftJson] = useState(false);

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

  // ── Derived ───────────────────────────────────────────────────────────────

  const charMap = Object.fromEntries(characters.map((c) => [c.id, c]));

  // ── Preview objects ───────────────────────────────────────────────────────

  const episodePackage = buildEpisodePackagePreview(draft);

  const previewData = {
    id: "",
    slug: createSlug(draft.title) || "",
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
  const labelCls = "block text-xs font-bold text-tiki-brown/65 mb-0.5 uppercase tracking-wide";
  const helperCls = "text-xs text-tiki-brown/40 mt-0.5 mb-2 leading-snug";

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
            Draft Fruit Baby story ideas, organize scenes, and preview the future
            episode package structure before AI generation is added.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16">

        {/* Draft-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm mb-8">
          <span className="text-xl flex-shrink-0">🏗️</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Draft only — nothing saves yet
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              This is a planning tool. Everything you type lives in memory only —
              nothing is saved to a file or database. AI generation is not active
              yet. GitHub saving will be added in a future phase. Refreshing the
              page will clear the draft.
            </p>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8 items-start">

          {/* ── LEFT: Form ─────────────────────────────────────────────── */}
          <div className="flex flex-col gap-6">

            {/* Story Basics */}
            <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2 mb-0.5">
                  <span>📖</span> Story Basics
                </h2>
                <p className="text-xs text-tiki-brown/45">
                  Start with the core idea for the episode.
                </p>
              </div>

              <div>
                <label className={labelCls}>Episode Title</label>
                <p className={helperCls}>Give this short story a working title.</p>
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
                <p className={helperCls}>One or two sentences about the story.</p>
                <textarea
                  className={`${fieldCls} resize-none`}
                  rows={3}
                  placeholder="e.g. Mango Baby accidentally mixes up everyone's fruit baskets and the gang has to sort them out before the big festival."
                  value={draft.shortDescription}
                  onChange={(e) => patchDraft({ shortDescription: e.target.value })}
                />
              </div>
            </div>

            {/* Featured Characters */}
            <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2 mb-0.5">
                  <span>🍍</span> Featured Characters
                </h2>
                <p className="text-xs text-tiki-brown/45">
                  Choose which official Fruit Baby World characters appear in this story.
                </p>
              </div>
              <CharPills
                characters={characters}
                selected={draft.featuredCharacters}
                onToggle={toggleFeaturedChar}
                hint="No characters selected yet — tap one above to add them."
              />
            </div>

            {/* Story Direction */}
            <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2 mb-0.5">
                  <span>🧭</span> Story Direction
                </h2>
                <p className="text-xs text-tiki-brown/45">
                  Guide the setting, lesson, tone, and creative notes.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Setting</label>
                  <p className={helperCls}>Where does the story happen?</p>
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
                  <p className={helperCls}>What should children learn or feel by the end?</p>
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
                  <p className={helperCls}>Who is this episode written for?</p>
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
                  <p className={helperCls}>e.g. Playful, cozy, silly, adventurous, gentle.</p>
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
                <p className={helperCls}>Optional extra ideas, reminders, or creative direction.</p>
                <textarea
                  className={`${fieldCls} resize-none`}
                  rows={3}
                  placeholder="e.g. Could open with a musical number — Tiki causes the chaos but helps fix it at the end."
                  value={draft.storyNotes}
                  onChange={(e) => patchDraft({ storyNotes: e.target.value })}
                />
              </div>
            </div>

            {/* Scene List */}
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-sm font-black text-tiki-brown flex items-center gap-2 mb-0.5">
                  <span>🎬</span> Scene List
                  <span className="text-xs font-semibold text-tiki-brown/40 ml-1">
                    ({draft.scenes.length})
                  </span>
                </h2>
                <p className="text-xs text-tiki-brown/45">
                  Break the story into simple moments that can later become scenes, prompts, and animation clips.
                </p>
              </div>

              {draft.scenes.map((scene) => (
                <div
                  key={scene.id}
                  className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4"
                >
                  {/* Scene header */}
                  <div className="flex items-center justify-between pb-1 border-b border-tiki-brown/8">
                    <div className="flex items-center gap-2.5">
                      <span className="w-8 h-8 rounded-full bg-pineapple-yellow/50 text-tiki-brown text-sm font-black flex items-center justify-center flex-shrink-0 shadow-sm">
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
                        className="text-xs font-semibold text-tiki-brown/40 hover:text-warm-coral px-3 py-1.5 rounded-full hover:bg-warm-coral/10 transition-all"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div>
                    <label className={labelCls}>Scene Title</label>
                    <p className={helperCls}>A name for this moment.</p>
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
                    <p className={helperCls}>What happens — keep it to a sentence or two.</p>
                    <textarea
                      className={`${fieldCls} resize-none`}
                      rows={3}
                      placeholder="e.g. Mango Baby rushes in carrying too many baskets and bumps into Pineapple Baby, sending fruit flying everywhere."
                      value={scene.summary}
                      onChange={(e) => patchScene(scene.id, { summary: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Characters in Scene</label>
                    <p className={helperCls}>Who appears in this scene?</p>
                    <CharPills
                      characters={characters}
                      selected={scene.characters}
                      onToggle={(charId) => toggleSceneChar(scene.id, charId)}
                      hint="No characters added to this scene yet."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Visual Notes</label>
                      <p className={helperCls}>Colors, mood, and setting details.</p>
                      <textarea
                        className={`${fieldCls} resize-none`}
                        rows={3}
                        placeholder="e.g. Bright, warm light — fruit flying in every direction."
                        value={scene.visualNotes}
                        onChange={(e) => patchScene(scene.id, { visualNotes: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelCls}>Emotional Beat</label>
                      <p className={helperCls}>How does the story move forward here?</p>
                      <textarea
                        className={`${fieldCls} resize-none`}
                        rows={3}
                        placeholder="e.g. Surprise and panic — but also the first moment of teamwork."
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
                className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl border-2 border-dashed border-pineapple-yellow/50 text-sm font-bold text-tiki-brown/55 hover:border-pineapple-yellow hover:text-tiki-brown hover:bg-pineapple-yellow/5 transition-all"
              >
                <span className="text-base leading-none">+</span>
                <span>Add Scene</span>
              </button>
            </div>
          </div>

          {/* ── RIGHT: Preview + Checklist ─────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">

            {/* Preview mode tabs */}
            <div className="flex gap-1 bg-white rounded-2xl border border-tiki-brown/10 shadow-sm p-1.5">
              {(["storyboard", "episode-package"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
                {/* Human-readable draft summary */}
                <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👁️</span>
                      <h2 className="text-sm font-black text-tiki-brown">Storyboard Draft</h2>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/55 uppercase tracking-wide">
                      Not saved
                    </span>
                  </div>

                  {/* Title */}
                  <p className={`text-base font-black leading-tight ${
                    draft.title ? "text-tiki-brown" : "text-tiki-brown/25 italic"
                  }`}>
                    {draft.title || "Untitled Episode"}
                  </p>

                  {/* Description */}
                  {draft.shortDescription ? (
                    <p className="text-xs text-tiki-brown/65 leading-relaxed">
                      {draft.shortDescription}
                    </p>
                  ) : (
                    <p className="text-xs text-tiki-brown/30 italic">No description yet.</p>
                  )}

                  {/* Characters */}
                  <div>
                    <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide mb-1.5">
                      Characters
                    </p>
                    {draft.featuredCharacters.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {draft.featuredCharacters.map((id) => {
                          const c = charMap[id];
                          return (
                            <span
                              key={id}
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-tiki-brown/15 text-tiki-brown/70"
                              style={{
                                backgroundColor: c
                                  ? `${c.visualIdentity.primaryColors[0]}22`
                                  : undefined,
                              }}
                            >
                              {c ? c.shortName : id}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-tiki-brown/30 italic">No characters selected.</p>
                    )}
                  </div>

                  {/* Field grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {[
                      { label: "Setting", value: draft.setting },
                      { label: "Lesson", value: draft.lesson },
                      { label: "Age Range", value: draft.targetAgeRange },
                      { label: "Tone", value: draft.tone },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide">
                          {label}
                        </p>
                        <p className={`text-xs mt-0.5 ${
                          value ? "text-tiki-brown/75 font-semibold" : "text-tiki-brown/25 italic"
                        }`}>
                          {value || "—"}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Scene list */}
                  <div>
                    <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-wide mb-1.5">
                      Scenes ({draft.scenes.length})
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {draft.scenes.map((s) => (
                        <div
                          key={s.id}
                          className="flex items-center gap-2 bg-bg-cream rounded-xl px-3 py-2"
                        >
                          <span className="w-5 h-5 rounded-full bg-pineapple-yellow/40 text-tiki-brown text-[10px] font-black flex items-center justify-center flex-shrink-0">
                            {s.sceneNumber}
                          </span>
                          <span className={`text-xs ${
                            s.title
                              ? "font-semibold text-tiki-brown"
                              : "italic text-tiki-brown/30"
                          }`}>
                            {s.title || "Untitled Scene"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Collapsible raw JSON — secondary */}
                  <div className="pt-2 border-t border-tiki-brown/8">
                    <button
                      type="button"
                      onClick={() => setShowDraftJson((v) => !v)}
                      className="flex items-center justify-between w-full text-[10px] font-bold text-tiki-brown/35 uppercase tracking-widest hover:text-tiki-brown/55 transition-colors py-1"
                    >
                      <span>Raw Draft JSON</span>
                      <span>{showDraftJson ? "▲ Hide" : "▼ Show"}</span>
                    </button>
                    {showDraftJson && (
                      <pre className="mt-2 text-[10px] text-tiki-brown/60 bg-bg-cream rounded-xl p-3 overflow-y-auto overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap break-words">
                        {JSON.stringify(previewData, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>

                {/* Character Fidelity Checklist */}
                <div className="bg-white rounded-3xl border border-warm-coral/20 shadow-sm p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm">🔒</span>
                    <h2 className="text-sm font-black text-tiki-brown">
                      Character Fidelity
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
              /* Episode Package visual panel */
              <EpisodePackagePanel pkg={episodePackage} characters={characters} />
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
