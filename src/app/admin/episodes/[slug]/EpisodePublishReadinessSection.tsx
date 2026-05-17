import Link from "next/link";
import type {
  EpisodePublishReadiness,
  ReadinessCheckItem,
  SceneReadiness,
} from "@/lib/episodePublishReadiness";

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: EpisodePublishReadiness["status"] }) {
  const map = {
    ready: {
      label: "Ready to Publish",
      className: "bg-tropical-green/20 border-tropical-green/40 text-tropical-green",
      icon: "✓",
    },
    "needs-work": {
      label: "Needs Work",
      className: "bg-pineapple-yellow/25 border-pineapple-yellow/50 text-tiki-brown",
      icon: "▲",
    },
    blocked: {
      label: "Blocked",
      className: "bg-warm-coral/15 border-warm-coral/40 text-warm-coral",
      icon: "●",
    },
  };
  const { label, className, icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-black uppercase tracking-wide ${className}`}
    >
      <span className="text-xs">{icon}</span>
      {label}
    </span>
  );
}

// ─── Checklist item ───────────────────────────────────────────────────────────

function ChecklistRow({ item }: { item: ReadinessCheckItem }) {
  const iconMap = {
    pass: { icon: "✓", color: "text-tropical-green" },
    warning: { icon: "▲", color: "text-pineapple-yellow" },
    fail: { icon: "✗", color: "text-warm-coral" },
  };
  const { icon, color } = iconMap[item.status];
  return (
    <li
      className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${
        item.status === "fail"
          ? "bg-warm-coral/5 border border-warm-coral/15"
          : item.status === "warning"
          ? "bg-pineapple-yellow/8 border border-pineapple-yellow/20"
          : "bg-transparent"
      }`}
    >
      <span className={`font-black text-sm flex-shrink-0 mt-0.5 ${color}`}>{icon}</span>
      <div className="flex flex-col gap-0.5 min-w-0">
        <span
          className={`text-sm font-semibold ${
            item.status === "fail"
              ? "text-tiki-brown"
              : item.status === "warning"
              ? "text-tiki-brown/80"
              : "text-tiki-brown/70"
          }`}
        >
          {item.label}
        </span>
        {item.message && (
          <span
            className={`text-xs leading-relaxed ${
              item.status === "fail"
                ? "text-warm-coral/80"
                : item.status === "warning"
                ? "text-tiki-brown/60"
                : "text-tiki-brown/50"
            }`}
          >
            {item.message}
          </span>
        )}
        {item.suggestedAction && (
          <span className="text-xs text-ube-purple/80 font-semibold">
            → {item.suggestedAction}
          </span>
        )}
      </div>
    </li>
  );
}

// ─── Scene row ────────────────────────────────────────────────────────────────

function SceneRow({ scene }: { scene: SceneReadiness }) {
  const hasBlocker = scene.blockers.length > 0;
  const hasWarning = scene.warnings.length > 0;
  const statusIcon = hasBlocker ? "✗" : hasWarning ? "▲" : "✓";
  const statusColor = hasBlocker
    ? "text-warm-coral"
    : hasWarning
    ? "text-pineapple-yellow"
    : "text-tropical-green";

  return (
    <div
      className={`border rounded-xl px-3 py-2.5 flex flex-col gap-1.5 ${
        hasBlocker
          ? "border-warm-coral/20 bg-warm-coral/3"
          : hasWarning
          ? "border-pineapple-yellow/25"
          : "border-tiki-brown/8"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-black text-sm flex-shrink-0 ${statusColor}`}>
          {statusIcon}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple flex-shrink-0">
          Scene {scene.sceneNumber}
        </span>
        {scene.title && (
          <span className="text-sm font-semibold text-tiki-brown truncate">{scene.title}</span>
        )}
        {scene.sceneId && (
          <span className="ml-auto text-xs font-mono text-tiki-brown/35 bg-tiki-brown/5 px-1.5 py-0.5 rounded flex-shrink-0">
            {scene.sceneId}
          </span>
        )}
      </div>

      {scene.characters.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {scene.characters.map((c) => (
            <span
              key={c}
              className="text-xs px-1.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-3 text-xs">
        <span
          className={`flex items-center gap-1 ${scene.hasPanel ? "text-tropical-green" : "text-warm-coral font-semibold"}`}
        >
          {scene.hasPanel ? "✓" : "✗"} Panel
        </span>
        {scene.hasPanel && (
          <>
            <span
              className={`flex items-center gap-1 ${scene.panelHasAltText ? "text-tropical-green" : "text-pineapple-yellow"}`}
            >
              {scene.panelHasAltText ? "✓" : "▲"} Alt text
            </span>
            <span
              className={`flex items-center gap-1 ${scene.panelHasCaption ? "text-tropical-green" : "text-tiki-brown/40"}`}
            >
              {scene.panelHasCaption ? "✓" : "–"} Caption
            </span>
          </>
        )}
        {scene.hasReferencePackage && (
          <span
            className={`flex items-center gap-1 ${scene.referencesReady ? "text-tropical-green" : "text-pineapple-yellow"}`}
          >
            {scene.referencesReady ? "✓" : "▲"} Refs
          </span>
        )}
      </div>

      {(scene.blockers.length > 0 || scene.warnings.length > 0) && (
        <div className="flex flex-col gap-0.5">
          {scene.blockers.map((b) => (
            <p key={b} className="text-xs text-warm-coral/80 font-semibold">
              ✗ {b}
            </p>
          ))}
          {scene.warnings.map((w) => (
            <p key={w} className="text-xs text-tiki-brown/55">
              ▲ {w}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="flex flex-col items-center bg-tiki-brown/4 rounded-xl px-3 py-2 min-w-[60px]">
      <span className={`text-xl font-black ${accent ?? "text-tiki-brown"}`}>{value}</span>
      <span className="text-xs text-tiki-brown/50 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

export default function EpisodePublishReadinessSection({
  readiness,
}: {
  readiness: EpisodePublishReadiness;
}) {
  const { summary, checklist, sceneReadiness, status } = readiness;
  const activeScenes = sceneReadiness.filter((s) => !s.isArchived);
  const archivedScenes = sceneReadiness.filter((s) => s.isArchived);
  const failItems = checklist.filter((c) => c.status === "fail");
  const warnItems = checklist.filter((c) => c.status === "warning");

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-5">

      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-black text-tiki-brown">Episode Publish Readiness</h2>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-tiki-brown/50 leading-relaxed">
          Publish readiness checks show what is missing before this story goes public.
          They do not publish or change anything.
        </p>
      </div>

      {/* Summary stat chips */}
      <div className="flex flex-wrap gap-2">
        <StatChip label="Active Scenes" value={summary.activeScenes} />
        <StatChip
          label="Panels Attached"
          value={`${summary.scenesWithPanels}/${summary.activeScenes}`}
          accent={summary.scenesMissingPanels > 0 ? "text-warm-coral" : "text-tropical-green"}
        />
        {summary.blockers > 0 && (
          <StatChip
            label="Blockers"
            value={summary.blockers}
            accent="text-warm-coral"
          />
        )}
        {summary.warnings > 0 && (
          <StatChip
            label="Warnings"
            value={summary.warnings}
            accent="text-pineapple-yellow"
          />
        )}
        {summary.blockers === 0 && summary.warnings === 0 && (
          <StatChip label="Issues" value="None" accent="text-tropical-green" />
        )}
        {summary.archivedScenes > 0 && (
          <StatChip
            label="Archived"
            value={summary.archivedScenes}
            accent="text-tiki-brown/40"
          />
        )}
      </div>

      {/* Quick-fail summary if blocked */}
      {failItems.length > 0 && (
        <div className="bg-warm-coral/8 border border-warm-coral/25 rounded-2xl px-4 py-3 flex flex-col gap-1.5">
          <p className="text-xs font-bold text-warm-coral uppercase tracking-wide">
            {failItems.length} blocker{failItems.length !== 1 ? "s" : ""} must be resolved before publishing
          </p>
          {failItems.map((item) => (
            <p key={item.id} className="text-xs text-tiki-brown/70 leading-snug">
              <span className="text-warm-coral font-bold">✗</span>{" "}
              {item.message || item.label}
            </p>
          ))}
        </div>
      )}

      {/* Full checklist */}
      <details open>
        <summary className="cursor-pointer list-none flex items-center justify-between group">
          <span className="text-sm font-bold text-tiki-brown">
            Readiness Checklist ({checklist.length} checks)
          </span>
          <span className="text-xs text-tiki-brown/40 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <ul className="mt-3 flex flex-col gap-1.5">
          {checklist.map((item) => (
            <ChecklistRow key={item.id} item={item} />
          ))}
        </ul>
      </details>

      {/* Per-scene readiness */}
      {activeScenes.length > 0 && (
        <details>
          <summary className="cursor-pointer list-none flex items-center justify-between group">
            <span className="text-sm font-bold text-tiki-brown">
              Scene Readiness ({activeScenes.length} active scene{activeScenes.length !== 1 ? "s" : ""})
            </span>
            <span className="text-xs text-tiki-brown/40 group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {activeScenes.map((s) => (
              <SceneRow key={s.sceneNumber} scene={s} />
            ))}
            {archivedScenes.length > 0 && (
              <p className="text-xs text-tiki-brown/40 px-2 py-1">
                {archivedScenes.length} archived scene{archivedScenes.length !== 1 ? "s" : ""} — not required for publish.
              </p>
            )}
          </div>
        </details>
      )}

      {/* Action links */}
      <div className="flex flex-wrap gap-3 pt-1 border-t border-tiki-brown/8">
        {(summary.scenesMissingPanels > 0 || warnItems.some((i) => i.id === "all-panels-have-alt-text")) && (
          <p className="text-xs text-tiki-brown/55 leading-relaxed">
            <strong className="text-tiki-brown">Missing panels?</strong> Use the Story Panel Prompt Builder or Batch Missing Panel Drafts section below.
          </p>
        )}
        <div className="flex flex-wrap gap-3 w-full">
          <Link
            href="/admin/characters"
            className="text-xs font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            Character Studio →
          </Link>
          <Link
            href="/admin/media-health"
            className="text-xs font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            Full Media Health Dashboard →
          </Link>
        </div>
      </div>

    </div>
  );
}
