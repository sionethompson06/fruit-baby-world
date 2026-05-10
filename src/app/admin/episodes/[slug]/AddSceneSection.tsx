"use client";

import { useState } from "react";

type CharacterOption = { slug: string; label: string; approvalMode?: string };

const FALLBACK_CHARACTERS: CharacterOption[] = [
  { slug: "pineapple-baby", label: "Pineapple Baby" },
  { slug: "ube-baby", label: "Ube Baby" },
  { slug: "kiwi-baby", label: "Kiwi Baby" },
  { slug: "coconut-baby", label: "Coconut Baby" },
  { slug: "mango-baby", label: "Mango Baby" },
  { slug: "tiki-trouble", label: "Tiki Trouble" },
];

type AddSceneResult =
  | {
      ok: true;
      status: "scene_added";
      path: string;
      commitMessage: string;
      sceneNumber: number;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
    };

export default function AddSceneSection({
  episodeSlug,
  currentSceneCount,
  characterOptions,
}: {
  episodeSlug: string;
  currentSceneCount: number;
  characterOptions?: CharacterOption[];
}) {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [characters, setCharacters] = useState<string[]>([]);
  const [visualNotes, setVisualNotes] = useState("");
  const [emotionalBeat, setEmotionalBeat] = useState("");
  const [dialogueDraft, setDialogueDraft] = useState("");
  const [voiceoverNotes, setVoiceoverNotes] = useState("");
  const [imagePromptDraft, setImagePromptDraft] = useState("");
  const [animationPromptDraft, setAnimationPromptDraft] = useState("");

  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AddSceneResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  function toggleCharacter(slug: string) {
    setCharacters((prev) =>
      prev.includes(slug) ? prev.filter((c) => c !== slug) : [...prev, slug]
    );
    setSaveStatus("idle");
  }

  const canSave =
    title.trim().length >= 2 &&
    summary.trim().length >= 10 &&
    characters.length > 0 &&
    saveStatus !== "loading";

  async function handleSubmit() {
    if (!canSave) return;
    setSaveStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/github/add-episode-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug,
          scene: {
            title: title.trim(),
            summary: summary.trim(),
            characters,
            visualNotes: visualNotes.trim(),
            emotionalBeat: emotionalBeat.trim(),
            dialogueDraft: dialogueDraft.trim(),
            voiceoverNotes: voiceoverNotes.trim(),
            imagePromptDraft: imagePromptDraft.trim(),
            animationPromptDraft: animationPromptDraft.trim(),
          },
        }),
      });

      const data = (await res.json()) as AddSceneResult;
      setResult(data);

      if (data.ok) {
        setSaveStatus("success");
        // Reset form
        setTitle("");
        setSummary("");
        setCharacters([]);
        setVisualNotes("");
        setEmotionalBeat("");
        setDialogueDraft("");
        setVoiceoverNotes("");
        setImagePromptDraft("");
        setAnimationPromptDraft("");
      } else {
        setSaveStatus("error");
        if (data.status === "unauthorized") {
          setErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        } else if (data.status === "setup_required") {
          setErrorMsg("GitHub saving is not configured yet.");
        } else {
          setErrorMsg(data.message || "Something went wrong while adding the scene.");
        }
      }
    } catch {
      setSaveStatus("error");
      setErrorMsg("Something went wrong while adding the scene.");
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-lg">➕</span>
        <div>
          <h2 className="text-base font-black text-tiki-brown">Add Scene to Episode</h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed mt-0.5">
            Add a new scene to this saved episode. New scenes are appended to the end to
            protect existing scene numbers and saved media. After saving to GitHub and
            redeploying, the new scene will appear in the Story Panel Prompt Builder,
            Animation Prompt Builder, Read-Aloud Builder, and media planning sections.
          </p>
        </div>
      </div>

      {/* Placement note */}
      <div className="flex items-start gap-2.5 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-3">
        <span className="text-sm flex-shrink-0">📌</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          New scenes are added to the end of the episode in this phase. Middle insertion
          and scene reordering will be handled later with stable scene IDs.
          {currentSceneCount > 0 && (
            <> This episode currently has <strong>{currentSceneCount}</strong> scene{currentSceneCount !== 1 ? "s" : ""}. The new scene will be Scene <strong>{currentSceneCount + 1}</strong>.</>
          )}
        </p>
      </div>

      {/* ── Form ── */}
      <div className="flex flex-col gap-4">

        {/* Title */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Scene Title <span className="text-warm-coral/70">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSaveStatus("idle"); }}
            maxLength={120}
            placeholder="e.g. The Kind Apology"
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Scene Summary <span className="text-warm-coral/70">*</span>
          </label>
          <textarea
            value={summary}
            onChange={(e) => { setSummary(e.target.value); setSaveStatus("idle"); }}
            rows={3}
            maxLength={800}
            placeholder="Describe what happens in this scene."
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Characters */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Characters <span className="text-warm-coral/70">*</span>
          </label>
          <p className="text-xs text-tiki-brown/40 leading-relaxed">
            Only Official Internal and Public characters are available for active story builders. Draft characters stay private until approved.
          </p>
          <div className="flex flex-wrap gap-2">
            {(characterOptions ?? FALLBACK_CHARACTERS).map(({ slug, label, approvalMode }) => {
              const selected = characters.includes(slug);
              const isInternal = approvalMode === "official-internal";
              return (
                <button
                  key={slug}
                  type="button"
                  onClick={() => toggleCharacter(slug)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    selected
                      ? "bg-ube-purple text-white border-ube-purple"
                      : "bg-white text-tiki-brown/60 border-tiki-brown/20 hover:border-ube-purple/40"
                  }`}
                >
                  {label}
                  {isInternal && <span className="ml-1 font-normal opacity-60">(Internal)</span>}
                </button>
              );
            })}
          </div>
          {characters.length > 0 && (
            <p className="text-xs text-tiki-brown/45 leading-tight">
              Selected: {characters.join(", ")}
            </p>
          )}
        </div>

        {/* Visual notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Visual Notes <span className="text-tiki-brown/30">(optional)</span>
          </label>
          <textarea
            value={visualNotes}
            onChange={(e) => { setVisualNotes(e.target.value); setSaveStatus("idle"); }}
            rows={2}
            maxLength={800}
            placeholder="Scene setting, mood, or visual direction."
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Emotional beat */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Emotional Beat <span className="text-tiki-brown/30">(optional)</span>
          </label>
          <input
            type="text"
            value={emotionalBeat}
            onChange={(e) => { setEmotionalBeat(e.target.value); setSaveStatus("idle"); }}
            maxLength={400}
            placeholder="What children should feel or notice in this scene."
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Dialogue draft */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Dialogue Draft <span className="text-tiki-brown/30">(optional)</span>
          </label>
          <textarea
            value={dialogueDraft}
            onChange={(e) => { setDialogueDraft(e.target.value); setSaveStatus("idle"); }}
            rows={3}
            maxLength={1200}
            placeholder={"e.g. Pineapple Baby: Are you okay?\nMango Baby: I feel a little sad."}
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Voiceover notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Voiceover / Read-Aloud Notes <span className="text-tiki-brown/30">(optional)</span>
          </label>
          <textarea
            value={voiceoverNotes}
            onChange={(e) => { setVoiceoverNotes(e.target.value); setSaveStatus("idle"); }}
            rows={2}
            maxLength={1200}
            placeholder="Pacing, tone, or narration notes for the read-aloud."
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Image prompt draft */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Image Prompt Draft <span className="text-tiki-brown/30">(optional)</span>
          </label>
          <textarea
            value={imagePromptDraft}
            onChange={(e) => { setImagePromptDraft(e.target.value); setSaveStatus("idle"); }}
            rows={2}
            maxLength={1500}
            placeholder="Custom image prompt, or leave blank to use a safe default."
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>

        {/* Animation prompt draft */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Animation Prompt Draft <span className="text-tiki-brown/30">(optional)</span>
          </label>
          <textarea
            value={animationPromptDraft}
            onChange={(e) => { setAnimationPromptDraft(e.target.value); setSaveStatus("idle"); }}
            rows={2}
            maxLength={1500}
            placeholder="Custom animation prompt, or leave blank to use a safe default."
            className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 leading-relaxed resize-none focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
          />
        </div>
      </div>

      {/* Submit row */}
      <div className="flex items-center gap-3 flex-wrap pt-1">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSave}
          className="text-sm font-black px-4 py-2 rounded-xl bg-ube-purple text-white hover:bg-ube-purple/85 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
        >
          {saveStatus === "loading" ? "Adding scene to episode JSON…" : "Add Scene to Episode JSON"}
        </button>
        {saveStatus === "success" && (
          <span className="text-xs font-bold text-tropical-green">✓ Scene added</span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs font-bold text-warm-coral leading-snug">{errorMsg}</span>
        )}
      </div>

      {/* Success details */}
      {saveStatus === "success" && result?.ok && (
        <div className="flex flex-col gap-3 bg-tropical-green/8 border border-tropical-green/25 rounded-xl px-5 py-4">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            Scene added
          </p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong>Scene Number:</strong> {result.sceneNumber}
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
          <div className="flex flex-col gap-1.5 pt-1 border-t border-tiki-brown/8">
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              After Vercel redeploys, reload this page to see the new scene in the media builders.
            </p>
            <p className="text-xs font-semibold text-tiki-brown/60 leading-relaxed">
              Next steps after redeploy: generate a temporary story panel draft for the new scene,
              review it, upload it, and attach it to the episode JSON.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
