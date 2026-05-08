"use client";

import { useState, useEffect } from "react";

export type SceneForArchive = {
  sceneNumber: number;
  title: string;
  status: string; // "active" | "archived" | ""
};

type UpdateSceneStatusResult =
  | {
      ok: true;
      status: "scene_archived" | "scene_restored";
      path: string;
      commitMessage: string;
      sceneNumber: number;
      htmlUrl: string;
      hasSavedMediaForScene: boolean;
      notes: string[];
    }
  | {
      ok: false;
      status: string;
      message: string;
    };

export default function ArchiveSceneSection({
  episodeSlug,
  scenes,
  savedPanelSceneNumbers,
}: {
  episodeSlug: string;
  scenes: SceneForArchive[];
  savedPanelSceneNumbers: number[];
}) {
  const [selectedSceneNumber, setSelectedSceneNumber] = useState<number | null>(
    scenes.length > 0 ? scenes[0].sceneNumber : null
  );
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<UpdateSceneStatusResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const selectedScene = scenes.find((s) => s.sceneNumber === selectedSceneNumber) ?? null;
  const isArchived = selectedScene?.status === "archived";
  const hasSavedMedia =
    selectedScene !== null && savedPanelSceneNumbers.includes(selectedScene.sceneNumber);

  useEffect(() => {
    setReason("");
    setConfirmed(false);
    setSaveStatus("idle");
    setResult(null);
    setErrorMsg("");
  }, [selectedSceneNumber]);

  const canArchive =
    !isArchived && confirmed && saveStatus !== "loading" && selectedScene !== null;
  const canRestore = isArchived && saveStatus !== "loading" && selectedScene !== null;

  async function handleAction(targetStatus: "archived" | "active") {
    if (!selectedScene) return;
    setSaveStatus("loading");
    setResult(null);
    setErrorMsg("");

    try {
      const body: Record<string, unknown> = {
        episodeSlug,
        sceneNumber: selectedScene.sceneNumber,
        status: targetStatus,
      };
      if (reason.trim()) body.reason = reason.trim();

      const res = await fetch("/api/github/update-episode-scene-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as UpdateSceneStatusResult;
      setResult(data);

      if (data.ok) {
        setSaveStatus("success");
        setConfirmed(false);
      } else {
        setSaveStatus("error");
        if (data.status === "unauthorized") {
          setErrorMsg("Admin access is required. Please unlock the Story Studio again.");
        } else if (data.status === "setup_required") {
          setErrorMsg("GitHub saving is not configured yet.");
        } else if (data.status === "scene_not_found") {
          setErrorMsg("Scene not found in the episode file. The file may have changed.");
        } else {
          setErrorMsg(data.message || "Something went wrong while updating the scene status.");
        }
      }
    } catch {
      setSaveStatus("error");
      setErrorMsg("Something went wrong while updating the scene status.");
    }
  }

  if (scenes.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-2 flex-wrap">
        <span className="text-lg">🗄️</span>
        <div>
          <h2 className="text-base font-black text-tiki-brown">Archive / Restore Scene</h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed mt-0.5">
            Archive a scene to remove it from active story planning and public display without
            deleting it. Archived scenes remain in episode JSON and can be restored later.
          </p>
        </div>
      </div>

      {/* Scene selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
          Select Scene
        </label>
        <select
          value={selectedSceneNumber ?? ""}
          onChange={(e) => {
            setSelectedSceneNumber(Number(e.target.value));
            setSaveStatus("idle");
          }}
          className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
        >
          {scenes.map((s) => (
            <option key={s.sceneNumber} value={s.sceneNumber}>
              Scene {s.sceneNumber}
              {s.title ? ` — ${s.title}` : ""}
              {s.status === "archived" ? " [Archived]" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Current status indicator */}
      {selectedScene && (
        <div className="flex items-center gap-2 px-3 py-2 bg-tiki-brown/4 rounded-xl flex-wrap">
          <span className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Status:
          </span>
          {isArchived ? (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/20 text-warm-coral/80 uppercase tracking-wide">
              Archived
            </span>
          ) : (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green uppercase tracking-wide">
              Active
            </span>
          )}
          {hasSavedMedia && (
            <span className="ml-auto text-xs font-semibold text-sky-blue/80 bg-sky-blue/12 px-2 py-0.5 rounded-full">
              Has saved media
            </span>
          )}
        </div>
      )}

      {/* Media warning */}
      {hasSavedMedia && (
        <div className="flex items-start gap-2.5 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
          <span className="text-sm flex-shrink-0">⚠️</span>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">This scene has saved media assets.</strong> Archiving
            does not delete the media asset or Blob file. Public display rules will hide archived
            scenes where applicable, but the media remains attached until a future cleanup phase.
          </p>
        </div>
      )}

      {/* Archive controls (only when active) */}
      {selectedScene && !isArchived && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
              Archive Reason <span className="text-tiki-brown/30">(optional)</span>
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              placeholder="Optional note about why this scene is being archived."
              className="w-full text-sm text-tiki-brown/80 bg-white border border-tiki-brown/20 rounded-xl px-3 py-2.5 focus:outline-none focus:border-ube-purple/40 focus:ring-1 focus:ring-ube-purple/20 transition-colors"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 flex-shrink-0 accent-ube-purple"
            />
            <span className="text-xs text-tiki-brown/65 leading-relaxed">
              I understand this will archive the scene but will not delete saved media.
            </span>
          </label>
        </div>
      )}

      {/* Action buttons */}
      {selectedScene && (
        <div className="flex items-center gap-3 flex-wrap pt-1">
          {!isArchived ? (
            <button
              type="button"
              onClick={() => handleAction("archived")}
              disabled={!canArchive}
              className="text-sm font-black px-4 py-2 rounded-xl bg-warm-coral text-white hover:bg-warm-coral/85 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              {saveStatus === "loading" ? "Updating scene status…" : "Archive Scene"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleAction("active")}
              disabled={!canRestore}
              className="text-sm font-black px-4 py-2 rounded-xl bg-tropical-green text-white hover:bg-tropical-green/85 disabled:opacity-35 disabled:cursor-not-allowed transition-colors"
            >
              {saveStatus === "loading" ? "Updating scene status…" : "Restore Scene"}
            </button>
          )}
          {saveStatus === "success" && result?.ok && (
            <span className="text-xs font-bold text-tropical-green">
              ✓ {result.status === "scene_archived" ? "Scene archived" : "Scene restored"}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs font-bold text-warm-coral leading-snug">{errorMsg}</span>
          )}
        </div>
      )}

      {/* Success details */}
      {saveStatus === "success" && result?.ok && (
        <div className="flex flex-col gap-3 bg-tropical-green/8 border border-tropical-green/25 rounded-xl px-5 py-4">
          <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
            {result.status === "scene_archived" ? "Scene archived" : "Scene restored"}
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
          {result.hasSavedMediaForScene && (
            <div className="flex items-start gap-2 bg-warm-coral/8 border border-warm-coral/20 rounded-lg px-3 py-2.5 mt-1">
              <span className="text-xs flex-shrink-0">⚠️</span>
              <p className="text-xs text-tiki-brown/65 leading-relaxed">
                This scene has saved media. The media asset was not deleted.
              </p>
            </div>
          )}
          <div className="pt-1 border-t border-tiki-brown/8">
            {result.status === "scene_archived" ? (
              <p className="text-xs text-tiki-brown/55 leading-relaxed">
                After Vercel redeploys, reload this page to see the archived scene status.
              </p>
            ) : (
              <p className="text-xs text-tiki-brown/55 leading-relaxed">
                After Vercel redeploys, reload this page to see the scene return to active tools.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
