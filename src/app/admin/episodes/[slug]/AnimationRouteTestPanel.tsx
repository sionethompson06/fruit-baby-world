"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SceneOption = {
  sceneNumber: number;
  title: string;
  characters: string[];
  prompt: string;
};

type Props = {
  episodeSlug: string;
  tikiFlagged: boolean;
  scenes: SceneOption[];
  featuredCharacters: string[];
};

type TestStatus =
  | "idle"
  | "loading"
  | "not_implemented_yet"
  | "validation_error"
  | "unauthorized"
  | "error";

type AnimationCharacterRef = {
  slug: string;
  name: string;
  type: string;
  visualStyleNotes: string;
  fidelityRules: string[];
  imageMainPath: string;
  profileSheetPath: string;
};

type AnimationPackage = {
  episodeSlug: string;
  sceneNumber: number;
  durationSeconds: number;
  animationPrompt: string;
  finalGenerationInstructions: string;
  referenceCharacters: AnimationCharacterRef[];
  safetyRules: string[];
  fidelityRules: string[];
};

type ApiResult = {
  ok: boolean;
  status: string;
  message?: string;
  animationPackage?: AnimationPackage;
  notes?: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = [3, 6, 9, 12, 15] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function AnimationRouteTestPanel({
  episodeSlug,
  tikiFlagged,
  scenes,
  featuredCharacters,
}: Props) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [duration, setDuration] = useState<number>(6);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [result, setResult] = useState<ApiResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedScene = scenes[selectedIndex] ?? scenes[0];
  const sceneChars =
    selectedScene?.characters.length > 0
      ? selectedScene.characters
      : featuredCharacters;
  const hasTikiInScene =
    sceneChars.some((c) => c.toLowerCase().includes("tiki")) || tikiFlagged;

  function reset() {
    setTestStatus("idle");
    setResult(null);
    setErrorMsg("");
  }

  async function handleTest() {
    if (!selectedScene) return;
    setTestStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const res = await fetch("/api/generate-animation-clip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          episodeSlug,
          sceneNumber: selectedScene.sceneNumber,
          animationPrompt: selectedScene.prompt,
          referenceCharacters: sceneChars.length > 0 ? sceneChars : ["pineapple-baby"],
          durationSeconds: duration,
        }),
      });

      const data = (await res.json()) as ApiResult;
      setResult(data);

      if (res.status === 401) {
        setTestStatus("unauthorized");
        return;
      }
      if (data.status === "not_implemented_yet") {
        setTestStatus("not_implemented_yet");
        return;
      }
      if (data.status === "validation_error") {
        setTestStatus("validation_error");
        setErrorMsg(data.message ?? "Validation failed.");
        return;
      }
      setTestStatus("error");
      setErrorMsg(data.message ?? "Something went wrong.");
    } catch {
      setTestStatus("error");
      setErrorMsg("Something went wrong while testing the animation route.");
    }
  }

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (scenes.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
        <PanelHeader />
        <p className="text-sm text-tiki-brown/50 italic">
          No scenes available. Save an episode with a sceneBreakdown to test the animation route.
        </p>
      </div>
    );
  }

  // ── Main panel ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      <PanelHeader />

      {/* Admin-only notice */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          This is an admin-only route test.{" "}
          <strong className="font-bold text-tiki-brown">
            No video is generated, saved, uploaded, attached to the episode, or published.
          </strong>
        </p>
      </div>

      {/* Scene selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Select Scene
        </label>
        <select
          value={selectedIndex}
          onChange={(e) => {
            setSelectedIndex(Number(e.target.value));
            reset();
          }}
          className="w-full text-sm text-tiki-brown bg-white border border-tiki-brown/20 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ube-purple/30"
        >
          {scenes.map((scene, i) => (
            <option key={i} value={i}>
              Scene {scene.sceneNumber}
              {scene.title ? ` — ${scene.title}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Animation prompt */}
      {selectedScene && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Animation Prompt
          </p>
          <pre className="bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-4 py-3 text-xs text-tiki-brown/70 leading-relaxed whitespace-pre-wrap break-words font-sans">
            {selectedScene.prompt}
          </pre>
        </div>
      )}

      {/* Reference characters */}
      {sceneChars.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Reference Characters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sceneChars.map((c) => (
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

      {/* Tiki guardrail */}
      {hasTikiInScene && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
            dramatic, and kid-friendly. Do not make Tiki scary, violent, horror-like, cruel,
            evil, or too intense.
          </p>
        </div>
      )}

      {/* Duration selector */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Duration
        </label>
        <div className="flex flex-wrap gap-2">
          {DURATION_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                duration === d
                  ? "bg-ube-purple text-white border-ube-purple"
                  : "bg-white text-tiki-brown/60 border-tiki-brown/20 hover:border-tiki-brown/40"
              }`}
            >
              {d}s
            </button>
          ))}
        </div>
      </div>

      {/* Test button */}
      <button
        type="button"
        onClick={handleTest}
        disabled={testStatus === "loading"}
        className="self-start flex items-center gap-2 bg-ube-purple text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-ube-purple/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {testStatus === "loading" ? (
          <>
            <span className="inline-block animate-spin">⏳</span>
            Building animation package…
          </>
        ) : (
          <>🎞️ Test Animation Package</>
        )}
      </button>

      {/* ── Status messages ── */}

      {testStatus === "unauthorized" && (
        <StatusCallout icon="🔒" variant="error">
          Admin access is required. Please unlock the Story Studio again.
        </StatusCallout>
      )}

      {testStatus === "validation_error" && (
        <StatusCallout icon="⚠️" variant="error">
          {errorMsg}
        </StatusCallout>
      )}

      {testStatus === "error" && (
        <StatusCallout icon="⚠️" variant="error">
          Something went wrong while testing the animation route.
        </StatusCallout>
      )}

      {/* ── Success: not_implemented_yet + animationPackage ── */}

      {testStatus === "not_implemented_yet" && result?.animationPackage && (
        <AnimationPackageResult
          pkg={result.animationPackage}
          notes={result.notes ?? []}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PanelHeader() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🎞️</span>
        <h2 className="text-base font-black text-tiki-brown">Animation Route Test</h2>
        <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50 uppercase tracking-wide">
          Admin Only
        </span>
      </div>
      <p className="text-sm text-tiki-brown/65 leading-relaxed">
        Test the animation clip generation route and inspect the returned animation package.
        No video is generated.
      </p>
    </div>
  );
}

function StatusCallout({
  icon,
  variant,
  children,
}: {
  icon: string;
  variant: "error" | "info" | "success";
  children: React.ReactNode;
}) {
  const cls =
    variant === "error"
      ? "bg-warm-coral/10 border-warm-coral/30"
      : variant === "success"
      ? "bg-tropical-green/10 border-tropical-green/30"
      : "bg-pineapple-yellow/12 border-pineapple-yellow/30";
  return (
    <div className={`flex items-start gap-3 border rounded-xl px-4 py-3 ${cls}`}>
      <span className="text-base flex-shrink-0">{icon}</span>
      <p className="text-sm text-tiki-brown/70 leading-relaxed">{children}</p>
    </div>
  );
}

function AnimationPackageResult({
  pkg,
  notes,
}: {
  pkg: {
    episodeSlug: string;
    sceneNumber: number;
    durationSeconds: number;
    animationPrompt: string;
    finalGenerationInstructions: string;
    referenceCharacters: AnimationCharacterRef[];
    safetyRules: string[];
    fidelityRules: string[];
  };
  notes: string[];
}) {
  return (
    <div className="flex flex-col gap-5">

      {/* Status banner */}
      <div className="flex items-start gap-3 bg-tropical-green/10 border border-tropical-green/30 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">✅</span>
        <div>
          <p className="text-sm font-bold text-tiki-brown">Animation package built successfully.</p>
          <p className="text-xs text-tiki-brown/60 mt-0.5">
            Animation generation is not active yet, but the animation package was built successfully.
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["Episode", pkg.episodeSlug || "—"],
            ["Scene", String(pkg.sceneNumber)],
            ["Duration", `${pkg.durationSeconds}s`],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-tiki-brown/4 rounded-xl px-3 py-2 text-center">
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">
              {label}
            </p>
            <p className="text-sm font-black text-tiki-brown/70">{value}</p>
          </div>
        ))}
      </div>

      {/* Reference characters */}
      {pkg.referenceCharacters.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Reference Characters
          </p>
          <div className="flex flex-col gap-3">
            {pkg.referenceCharacters.map((ref) => (
              <div
                key={ref.slug}
                className="bg-tiki-brown/3 border border-tiki-brown/8 rounded-xl px-4 py-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
                    {ref.name}
                  </span>
                  <span className="text-xs text-tiki-brown/40 font-mono">{ref.slug}</span>
                </div>
                {ref.imageMainPath && (
                  <p className="text-xs text-tiki-brown/45 font-mono truncate">
                    Main: {ref.imageMainPath}
                  </p>
                )}
                {ref.profileSheetPath && (
                  <p className="text-xs text-tiki-brown/45 font-mono truncate">
                    Sheet: {ref.profileSheetPath}
                  </p>
                )}
                {ref.fidelityRules.length > 0 && (
                  <ul className="flex flex-col gap-0.5 mt-0.5">
                    {ref.fidelityRules.map((rule, i) => (
                      <li
                        key={i}
                        className="text-xs text-tiki-brown/60 leading-relaxed flex items-start gap-1.5"
                      >
                        <span className="text-tiki-brown/30 flex-shrink-0 mt-0.5">•</span>
                        {rule}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final generation instructions */}
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
          Final Generation Instructions
        </p>
        <pre className="bg-tiki-brown/4 border border-tiki-brown/10 rounded-xl px-4 py-3 text-xs text-tiki-brown/70 leading-relaxed whitespace-pre-wrap break-words font-mono max-h-80 overflow-y-auto">
          {pkg.finalGenerationInstructions}
        </pre>
      </div>

      {/* Safety rules */}
      {pkg.safetyRules.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Safety Rules
          </p>
          <ul className="flex flex-col gap-1">
            {pkg.safetyRules.map((rule, i) => (
              <li
                key={i}
                className="text-xs text-tiki-brown/65 leading-relaxed flex items-start gap-1.5"
              >
                <span className="text-tropical-green flex-shrink-0 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fidelity rules */}
      {pkg.fidelityRules.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Fidelity Rules
          </p>
          <ul className="flex flex-col gap-1">
            {pkg.fidelityRules.map((rule, i) => (
              <li
                key={i}
                className="text-xs text-tiki-brown/65 leading-relaxed flex items-start gap-1.5"
              >
                <span className="text-ube-purple flex-shrink-0 mt-0.5">•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* API notes */}
      {notes.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">Notes</p>
          {notes.map((note, i) => (
            <p key={i} className="text-xs text-tiki-brown/50 italic leading-relaxed">
              {note}
            </p>
          ))}
        </div>
      )}

      {/* Future workflow note */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Future phase:</strong> this package can be sent to a
          video generation provider after reference-image handling, storage, and approval workflow
          are finalized.
        </p>
      </div>
    </div>
  );
}
