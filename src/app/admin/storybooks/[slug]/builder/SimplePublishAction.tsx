"use client";

import { useState } from "react";
import type { StorybookPublishReadiness } from "@/lib/storybookPublishReadiness";

type StorybookStatus = "draft" | "published" | "hidden" | "archived";

type Phase =
  | { name: "idle" }
  | { name: "publishing" }
  | { name: "done"; warnings: string[] }
  | { name: "working"; action: "unpublish" | "hide" | "archive" | "restore" }
  | { name: "unpublished" }
  | { name: "hidden" }
  | { name: "archived" }
  | { name: "restored" }
  | { name: "error"; message: string };

function getEffectiveStatus(initial: StorybookStatus, phase: Phase): StorybookStatus {
  if (phase.name === "done") return "published";
  if (phase.name === "unpublished" || phase.name === "restored") return "draft";
  if (phase.name === "hidden") return "hidden";
  if (phase.name === "archived") return "archived";
  return initial;
}

export default function SimplePublishAction({
  slug,
  initialStatus,
  readiness,
}: {
  slug: string;
  initialStatus: StorybookStatus;
  readiness: StorybookPublishReadiness;
}) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [markAllPublic, setMarkAllPublic] = useState(true);

  const effectiveStatus = getEffectiveStatus(initialStatus, phase);
  const isWorking =
    phase.name === "publishing" ||
    phase.name === "working";

  // ── Publish action ─────────────────────────────────────────────────────────────
  async function handlePublish() {
    setPhase({ name: "publishing" });
    try {
      const res = await fetch("/api/github/publish-storybook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          episodeSlug: slug,
          makeAllBookImagesPublic: markAllPublic,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        warnings?: string[];
        message?: string;
        blockers?: string[];
      };
      if (!data.ok) {
        setPhase({ name: "error", message: data.blockers?.join(" ") || data.message || "Failed to publish." });
        return;
      }
      setPhase({ name: "done", warnings: data.warnings ?? [] });
    } catch {
      setPhase({ name: "error", message: "Network error. Please try again." });
    }
  }

  // ── Status-change actions (draft / hidden / archived) ──────────────────────────
  async function callStatusRoute(
    newStatus: "draft" | "hidden" | "archived",
    action: "unpublish" | "hide" | "archive" | "restore"
  ) {
    setPhase({ name: "working", action });
    try {
      const res = await fetch("/api/github/update-storybook-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ episodeSlug: slug, status: newStatus }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        setPhase({ name: "error", message: data.message ?? "Failed to update status." });
        return;
      }
      if (newStatus === "draft") {
        if (action === "restore") setPhase({ name: "restored" });
        else setPhase({ name: "unpublished" });
      } else if (newStatus === "hidden") {
        setPhase({ name: "hidden" });
      } else {
        setPhase({ name: "archived" });
      }
    } catch {
      setPhase({ name: "error", message: "Network error. Please try again." });
    }
  }

  async function handleUnpublish() {
    if (!confirm("Remove this storybook from public pages? It will remain editable in admin.")) return;
    await callStatusRoute("draft", "unpublish");
  }

  async function handleHide() {
    if (!confirm("Hide this storybook from public pages? It will remain editable in admin.")) return;
    await callStatusRoute("hidden", "hide");
  }

  async function handleArchive() {
    if (!confirm("Archive this storybook? It will be removed from public pages and normal admin lists, but uploaded files will not be deleted.")) return;
    await callStatusRoute("archived", "archive");
  }

  async function handleRestore() {
    await callStatusRoute("draft", "restore");
  }

  const { blockers, warnings, stats } = readiness;
  const hasBlockers = blockers.length > 0;

  // ── Archived ───────────────────────────────────────────────────────────────────
  if (effectiveStatus === "archived") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-warm-coral/8 border border-warm-coral/20 rounded-2xl px-5 py-4">
          <span className="text-xl">📦</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-tiki-brown">Storybook Archived</p>
            <p className="text-xs text-tiki-brown/55 mt-0.5">
              Removed from public pages. All files and pages are preserved.
            </p>
          </div>
        </div>
        {phase.name === "error" && <ErrorBanner message={phase.message} />}
        <button
          type="button"
          onClick={handleRestore}
          disabled={isWorking}
          className="self-start text-xs font-semibold px-4 py-2 rounded-full bg-pineapple-yellow/30 text-tiki-brown hover:bg-pineapple-yellow/50 disabled:opacity-50 transition-colors"
        >
          {isWorking ? "Restoring…" : "Restore to Draft"}
        </button>
      </div>
    );
  }

  // ── Hidden ─────────────────────────────────────────────────────────────────────
  if (effectiveStatus === "hidden") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-2xl px-5 py-4">
          <span className="text-xl">👁️</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-tiki-brown">Hidden from Public</p>
            <p className="text-xs text-tiki-brown/55 mt-0.5">
              Not visible on /stories. Still editable in admin. Files preserved.
            </p>
          </div>
        </div>
        {phase.name === "error" && <ErrorBanner message={phase.message} />}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={hasBlockers || isWorking}
            className="text-xs font-bold px-4 py-2 rounded-full bg-tropical-green/20 text-tropical-green hover:bg-tropical-green/35 disabled:opacity-50 transition-colors"
          >
            {phase.name === "publishing" ? "Publishing…" : "Publish"}
          </button>
          <button
            type="button"
            onClick={handleUnpublish}
            disabled={isWorking}
            className="text-xs font-semibold px-4 py-2 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 disabled:opacity-50 transition-colors"
          >
            {isWorking && phase.name === "working" && phase.action === "unpublish" ? "Saving…" : "Move to Draft"}
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isWorking}
            className="text-xs font-semibold px-4 py-2 rounded-full bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-50 transition-colors"
          >
            {isWorking && phase.name === "working" && phase.action === "archive" ? "Archiving…" : "Archive"}
          </button>
        </div>
      </div>
    );
  }

  // ── Published (or just published) ─────────────────────────────────────────────
  if (effectiveStatus === "published") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 bg-tropical-green/10 border border-tropical-green/25 rounded-2xl px-5 py-4">
          <span className="text-xl">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-tropical-green">Storybook Published</p>
            <p className="text-xs text-tiki-brown/55 mt-0.5">
              Live at{" "}
              <a
                href={`/stories/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
              >
                /stories/{slug} ↗
              </a>
            </p>
          </div>
        </div>

        {phase.name === "done" && phase.warnings.length > 0 && (
          <div className="flex flex-col gap-2 bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3">
            <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Publish Notes</p>
            {phase.warnings.map((w, i) => (
              <p key={i} className="text-xs text-tiki-brown/65 leading-relaxed flex items-start gap-1.5">
                <span className="flex-shrink-0">ℹ️</span>
                {w}
              </p>
            ))}
          </div>
        )}

        {phase.name === "error" && <ErrorBanner message={phase.message} />}

        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-widest">Visibility Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUnpublish}
              disabled={isWorking}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-tiki-brown/8 text-tiki-brown/60 hover:bg-tiki-brown/15 disabled:opacity-50 transition-colors"
            >
              {isWorking && phase.name === "working" && phase.action === "unpublish" ? "Saving…" : "Remove from Public"}
            </button>
            <button
              type="button"
              onClick={handleHide}
              disabled={isWorking}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-sky-blue/15 text-tiki-brown/60 hover:bg-sky-blue/25 disabled:opacity-50 transition-colors"
            >
              {isWorking && phase.name === "working" && phase.action === "hide" ? "Saving…" : "Hide from Public"}
            </button>
            <button
              type="button"
              onClick={handleArchive}
              disabled={isWorking}
              className="text-xs font-semibold px-4 py-2 rounded-full bg-warm-coral/10 text-warm-coral/70 hover:bg-warm-coral/20 disabled:opacity-50 transition-colors"
            >
              {isWorking && phase.name === "working" && phase.action === "archive" ? "Archiving…" : "Archive"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Draft (default) — publish checklist ────────────────────────────────────────
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 sm:p-6 flex flex-col gap-5">

      {/* Banner after unpublish or restore */}
      {(phase.name === "unpublished" || phase.name === "restored") && (
        <div className="flex items-center gap-3 bg-tiki-brown/6 border border-tiki-brown/15 rounded-2xl px-4 py-3">
          <span className="text-lg">📝</span>
          <p className="text-sm font-bold text-tiki-brown">
            {phase.name === "restored" ? "Restored to Draft" : "Storybook set to Draft"}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <p className="text-sm font-black text-tiki-brown">Publish Storybook</p>
        <p className="text-xs text-tiki-brown/55 leading-relaxed">
          Make this storybook visible to readers. Audio and video are optional.
        </p>
      </div>

      {/* Required checklist */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-widest">Required</p>
        <div className="flex flex-col gap-1.5">
          <ChecklistItem done={stats.hasTitle} label="Title" blocker />
          <ChecklistItem done={stats.hasAbout} label="About this story" blocker />
          <ChecklistItem
            done={stats.totalBookImages > 0}
            label={
              stats.totalBookImages > 0
                ? `${stats.totalBookImages} book image${stats.totalBookImages !== 1 ? "s" : ""} uploaded`
                : "Book images uploaded"
            }
            blocker
          />
          <ChecklistItem
            done={stats.publicBookImages > 0}
            label={
              stats.publicBookImages > 0
                ? `${stats.publicBookImages} image${stats.publicBookImages !== 1 ? "s" : ""} Approved + Public`
                : "Public-ready book images"
            }
            note={
              stats.totalBookImages > 0 && stats.publicBookImages === 0
                ? "Use the checkbox below to mark all as public when publishing."
                : undefined
            }
          />
        </div>
      </div>

      {/* Optional checklist */}
      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-widest">Optional</p>
        <div className="grid grid-cols-2 gap-1.5">
          <ChecklistItem done={stats.hasFrontCover} label="Front cover" optional />
          <ChecklistItem done={stats.hasStoryContent} label="Story pages" optional />
          <ChecklistItem done={stats.hasAudio} label="Audio narration" optional />
          <ChecklistItem done={stats.hasVideo} label="Video / cartoon" optional />
        </div>
      </div>

      {hasBlockers && (
        <div className="flex flex-col gap-2 bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3">
          <p className="text-xs font-bold text-warm-coral/80 uppercase tracking-wide">Required before publishing</p>
          {blockers.map((b, i) => (
            <p key={i} className="text-xs text-warm-coral/80 leading-relaxed flex items-start gap-1.5">
              <span className="flex-shrink-0">✕</span>
              {b}
            </p>
          ))}
        </div>
      )}

      {warnings.length > 0 && !hasBlockers && (
        <div className="flex flex-col gap-1.5 bg-pineapple-yellow/10 border border-pineapple-yellow/25 rounded-2xl px-4 py-3">
          <p className="text-[10px] font-bold text-tiki-brown/40 uppercase tracking-widest">Suggestions</p>
          {warnings.slice(0, 4).map((w, i) => (
            <p key={i} className="text-xs text-tiki-brown/60 leading-relaxed flex items-start gap-1.5">
              <span className="flex-shrink-0">ℹ️</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {phase.name === "error" && <ErrorBanner message={phase.message} />}

      {!hasBlockers && stats.totalBookImages > 0 && (
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={markAllPublic}
            onChange={(e) => setMarkAllPublic(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-ube-purple flex-shrink-0 cursor-pointer"
          />
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-tiki-brown group-hover:text-tiki-brown/80 transition-colors">
              Mark all book images Approved + Public
            </span>
            <span className="text-xs text-tiki-brown/50 leading-relaxed">
              {stats.draftBookImages > 0
                ? `${stats.draftBookImages} draft image${stats.draftBookImages !== 1 ? "s" : ""} will be made visible to readers.`
                : "All images are already public."}
            </span>
          </div>
        </label>
      )}

      <button
        type="button"
        onClick={handlePublish}
        disabled={hasBlockers || isWorking}
        className="inline-flex items-center justify-center gap-2 text-sm font-black px-6 py-3 rounded-2xl bg-tropical-green text-white hover:bg-tropical-green/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {phase.name === "publishing" ? (
          <span className="animate-pulse">Publishing…</span>
        ) : (
          <>
            <span aria-hidden>🚀</span>
            Publish Storybook
          </>
        )}
      </button>

      {/* Soft visibility actions for draft storybooks */}
      <div className="flex flex-wrap gap-4 pt-1 border-t border-tiki-brown/8">
        <button
          type="button"
          onClick={handleHide}
          disabled={isWorking}
          className="text-xs font-semibold text-tiki-brown/40 hover:text-tiki-brown/65 disabled:opacity-50 transition-colors"
        >
          Hide from Public
        </button>
        <button
          type="button"
          onClick={handleArchive}
          disabled={isWorking}
          className="text-xs font-semibold text-tiki-brown/40 hover:text-warm-coral/70 disabled:opacity-50 transition-colors"
        >
          Archive Storybook
        </button>
      </div>
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-3 py-2">
      <span className="text-warm-coral font-bold text-sm flex-shrink-0">!</span>
      <p className="text-xs text-warm-coral leading-relaxed">{message}</p>
    </div>
  );
}

function ChecklistItem({
  done,
  label,
  blocker = false,
  optional = false,
  note,
}: {
  done: boolean;
  label: string;
  blocker?: boolean;
  optional?: boolean;
  note?: string;
}) {
  return (
    <div
      className={`flex items-start gap-2 rounded-xl px-3 py-2 border ${
        done
          ? "border-tropical-green/25 bg-tropical-green/6"
          : blocker
          ? "border-warm-coral/20 bg-warm-coral/4"
          : optional
          ? "border-tiki-brown/8 bg-tiki-brown/2"
          : "border-tiki-brown/10 bg-tiki-brown/2"
      }`}
    >
      <span
        className={`text-xs font-bold flex-shrink-0 mt-px ${
          done ? "text-tropical-green" : blocker ? "text-warm-coral/70" : "text-tiki-brown/35"
        }`}
      >
        {done ? "✓" : blocker ? "✕" : "○"}
      </span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={`text-xs font-semibold leading-tight ${
            done ? "text-tropical-green" : blocker ? "text-warm-coral/70" : "text-tiki-brown/45"
          }`}
        >
          {label}
        </span>
        {note && <span className="text-[10px] text-tiki-brown/40 leading-tight">{note}</span>}
        {optional && !done && <span className="text-[10px] text-tiki-brown/30">Optional</span>}
      </div>
    </div>
  );
}
