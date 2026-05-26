"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  HealthIssue,
  MediaHealthSummary,
  CharacterHealthRow,
  EpisodeHealthRow,
  RefAssetStats,
} from "@/lib/mediaHealth";

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterKey =
  | "all"
  | "blocker"
  | "warning"
  | "info"
  | "character"
  | "episode"
  | "reference-asset"
  | "story-panel";

type Props = {
  issues: HealthIssue[];
  summary: MediaHealthSummary;
  characterRows: CharacterHealthRow[];
  episodeRows: EpisodeHealthRow[];
  refStats: RefAssetStats;
};

// ─── Small helpers ────────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: HealthIssue["severity"] }) {
  if (severity === "blocker")
    return (
      <span className="text-warm-coral font-black text-sm flex-shrink-0" title="Blocker">
        ●
      </span>
    );
  if (severity === "warning")
    return (
      <span className="text-pineapple-yellow font-black text-sm flex-shrink-0" title="Warning">
        ▲
      </span>
    );
  return (
    <span className="text-sky-blue font-black text-sm flex-shrink-0" title="Info">
      ℹ
    </span>
  );
}

function SeverityBadge({ severity }: { severity: HealthIssue["severity"] }) {
  const map = {
    blocker: "bg-warm-coral/15 text-warm-coral border-warm-coral/30",
    warning: "bg-pineapple-yellow/25 text-tiki-brown border-pineapple-yellow/40",
    info: "bg-sky-blue/20 text-tiki-brown/70 border-sky-blue/30",
  };
  const label = severity === "blocker" ? "Blocker" : severity === "warning" ? "Warning" : "Info";
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${map[severity]}`}
    >
      {label}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: HealthIssue["scope"] }) {
  const labels: Record<HealthIssue["scope"], string> = {
    character: "Character",
    episode: "Episode",
    scene: "Scene",
    "story-panel": "Story Panel",
    "reference-asset": "Reference",
    "public-page": "Public Page",
  };
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 font-semibold">
      {labels[scope]}
    </span>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-tropical-green" : "bg-warm-coral"}`}
    />
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm px-5 py-4 flex flex-col gap-1">
      <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-black ${accent ?? "text-tiki-brown"}`}>{value}</p>
      {sub && <p className="text-xs text-tiki-brown/50">{sub}</p>}
    </div>
  );
}

// ─── Filter button ────────────────────────────────────────────────────────────

function FilterButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? "bg-tiki-brown text-white border-tiki-brown"
          : "bg-white text-tiki-brown/70 border-tiki-brown/20 hover:border-tiki-brown/40"
      }`}
    >
      {label}
      {count !== undefined && (
        <span
          className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold ${
            active ? "bg-white/20 text-white" : "bg-tiki-brown/10 text-tiki-brown/60"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

export default function MediaHealthClient({
  issues,
  summary,
  characterRows,
  episodeRows,
  refStats,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");

  function matchesFilter(issue: HealthIssue): boolean {
    if (filter === "all") return true;
    if (filter === "blocker") return issue.severity === "blocker";
    if (filter === "warning") return issue.severity === "warning";
    if (filter === "info") return issue.severity === "info";
    if (filter === "character")
      return issue.scope === "character" || issue.scope === "public-page";
    if (filter === "episode") return issue.scope === "episode" || issue.scope === "scene";
    if (filter === "reference-asset") return issue.scope === "reference-asset";
    if (filter === "story-panel") return issue.scope === "story-panel";
    return true;
  }

  const filtered = issues.filter(matchesFilter);

  const counts: Record<FilterKey, number> = {
    all: issues.length,
    blocker: issues.filter((i) => i.severity === "blocker").length,
    warning: issues.filter((i) => i.severity === "warning").length,
    info: issues.filter((i) => i.severity === "info").length,
    character: issues.filter(
      (i) => i.scope === "character" || i.scope === "public-page"
    ).length,
    episode: issues.filter(
      (i) => i.scope === "episode" || i.scope === "scene"
    ).length,
    "reference-asset": issues.filter((i) => i.scope === "reference-asset").length,
    "story-panel": issues.filter((i) => i.scope === "story-panel").length,
  };

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "blocker", label: "Blockers" },
    { key: "warning", label: "Warnings" },
    { key: "info", label: "Info" },
    { key: "character", label: "Characters" },
    { key: "episode", label: "Episodes" },
    { key: "reference-asset", label: "References" },
    { key: "story-panel", label: "Story Panels" },
  ];

  return (
    <div className="flex flex-col gap-8">

      {/* ── Summary cards ── */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Characters" value={summary.totalCharacters} sub={`${summary.publicCharacters} public`} />
        <SummaryCard
          label="Missing Profile Sheets"
          value={summary.charactersWithMissingProfileSheet}
          accent={summary.charactersWithMissingProfileSheet > 0 ? "text-warm-coral" : "text-tropical-green"}
        />
        <SummaryCard
          label="Episodes Checked"
          value={summary.totalEpisodesChecked}
          sub={`${summary.episodesWithMissingPanels} missing panels`}
        />
        <SummaryCard
          label="Blockers"
          value={summary.totalBlockers}
          accent={summary.totalBlockers > 0 ? "text-warm-coral" : "text-tropical-green"}
          sub={`${summary.totalWarnings} warnings`}
        />
      </section>

      {/* ── Filter tabs + issue list ── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <FilterButton
              key={f.key}
              label={f.label}
              active={filter === f.key}
              count={counts[f.key]}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-tropical-green/10 border border-tropical-green/30 rounded-2xl px-5 py-6 text-center">
            <p className="text-sm font-bold text-tropical-green mb-1">
              No issues found for this filter
            </p>
            <p className="text-xs text-tiki-brown/50">
              {issues.length === 0
                ? "Everything looks healthy!"
                : "Try a different filter to see other issues."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((issue) => (
              <div
                key={issue.id}
                className={`bg-white border rounded-2xl px-4 py-3 flex flex-col gap-1.5 ${
                  issue.severity === "blocker"
                    ? "border-warm-coral/30"
                    : issue.severity === "warning"
                    ? "border-pineapple-yellow/40"
                    : "border-tiki-brown/10"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <SeverityIcon severity={issue.severity} />
                  <span className="text-sm font-bold text-tiki-brown leading-snug flex-1 min-w-0">
                    {issue.title}
                  </span>
                  <div className="flex items-center gap-1.5 ml-auto flex-shrink-0 flex-wrap justify-end">
                    <ScopeBadge scope={issue.scope} />
                    <SeverityBadge severity={issue.severity} />
                  </div>
                </div>

                <p className="text-xs text-tiki-brown/60 leading-relaxed">{issue.message}</p>

                {issue.suggestedAction && (
                  <p className="text-xs text-ube-purple/80 font-semibold">
                    → {issue.suggestedAction}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-0.5">
                  {issue.characterSlug && (
                    <Link
                      href="/admin/characters"
                      className="text-xs text-ube-purple hover:underline font-semibold"
                    >
                      View Character Studio →
                    </Link>
                  )}
                  {issue.episodeSlug && (
                    <Link
                      href={`/admin/episodes/${issue.episodeSlug}`}
                      className="text-xs text-ube-purple hover:underline font-semibold"
                    >
                      View Episode →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Character health table ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-black text-tiki-brown">
          Character Health ({characterRows.length})
        </h2>
        <div className="flex flex-col gap-2">
          {characterRows.map((row) => (
            <div
              key={row.slug}
              className={`bg-white border rounded-2xl px-4 py-3 flex flex-col gap-2 ${
                row.hasBlocker
                  ? "border-warm-coral/30"
                  : row.hasWarning
                  ? "border-pineapple-yellow/30"
                  : "border-tiki-brown/10"
              }`}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-tiki-brown">{row.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 font-semibold capitalize">
                  {row.approvalMode}
                </span>
                {row.isPublic && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green font-semibold">
                    Public
                  </span>
                )}
                {row.issueCount > 0 && (
                  <span
                    className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      row.hasBlocker
                        ? "bg-warm-coral/15 text-warm-coral"
                        : row.hasWarning
                        ? "bg-pineapple-yellow/25 text-tiki-brown"
                        : "bg-tiki-brown/8 text-tiki-brown/55"
                    }`}
                  >
                    {row.issueCount} issue{row.issueCount !== 1 ? "s" : ""}
                  </span>
                )}
                {row.issueCount === 0 && (
                  <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green">
                    Healthy
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={row.hasProfileSheet} />
                  <span className="text-tiki-brown/60">Profile sheet</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={row.hasMainImage} />
                  <span className="text-tiki-brown/60">Main image</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={row.supportingRefsCount > 0} />
                  <span className="text-tiki-brown/60">
                    Supporting ({row.supportingRefsCount})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={row.envRefsCount > 0} />
                  <span className="text-tiki-brown/60">Env refs ({row.envRefsCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusDot ok={row.hasColorPalette} />
                  <span className="text-tiki-brown/60">Color palette</span>
                </div>
              </div>

              <Link
                href="/admin/characters"
                className="text-xs text-ube-purple/70 hover:text-ube-purple font-semibold w-fit"
              >
                View in Character Studio →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ── Episode health table ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-black text-tiki-brown">
          Episode Health ({episodeRows.length})
        </h2>
        {episodeRows.length === 0 ? (
          <p className="text-sm text-tiki-brown/50">No episodes found.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {episodeRows.map((row) => (
              <div
                key={row.slug}
                className={`bg-white border rounded-2xl px-4 py-3 flex flex-col gap-2 ${
                  row.hasBlocker ? "border-warm-coral/30" : "border-tiki-brown/10"
                }`}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-tiki-brown">{row.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/55 font-semibold">
                    {row.publicStatus}
                  </span>
                  {row.isPublished && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green font-semibold">
                      Published
                    </span>
                  )}
                  {row.issueCount > 0 && (
                    <span
                      className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                        row.hasBlocker
                          ? "bg-warm-coral/15 text-warm-coral"
                          : "bg-pineapple-yellow/25 text-tiki-brown"
                      }`}
                    >
                      {row.issueCount} issue{row.issueCount !== 1 ? "s" : ""}
                    </span>
                  )}
                  {row.issueCount === 0 && (
                    <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green">
                      Healthy
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="text-tiki-brown/60">
                    Active scenes: <strong className="text-tiki-brown">{row.activeScenes}</strong>
                  </div>
                  <div className="text-tiki-brown/60">
                    Panels attached:{" "}
                    <strong className="text-tiki-brown">{row.scenesWithPanels}</strong>
                  </div>
                  <div className={row.missingPanels > 0 ? "text-warm-coral font-semibold" : "text-tiki-brown/60"}>
                    Missing panels: <strong>{row.missingPanels}</strong>
                  </div>
                  <div className={row.missingAltCount > 0 ? "text-pineapple-yellow/80 font-semibold" : "text-tiki-brown/60"}>
                    Missing alt text: <strong>{row.missingAltCount}</strong>
                  </div>
                  <div className={row.hasAttachedNarration ? "text-tiki-brown/60" : "text-tiki-brown/35"}>
                    Narration audio:{" "}
                    <strong>
                      {row.hasAttachedNarration
                        ? row.narrationVisibility === "public-ready"
                          ? "public-ready"
                          : "admin-only"
                        : "none"}
                    </strong>
                  </div>
                </div>

                <Link
                  href={`/admin/episodes/${row.slug}`}
                  className="text-xs text-ube-purple/70 hover:text-ube-purple font-semibold w-fit"
                >
                  View Episode Admin →
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Reference asset health ── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-black text-tiki-brown">
          Reference Asset Health
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <SummaryCard label="Total Assets" value={refStats.totalAssets} />
          <SummaryCard
            label="Pending Review"
            value={refStats.needsReviewCount}
            accent={refStats.needsReviewCount > 0 ? "text-pineapple-yellow" : "text-tropical-green"}
          />
          <SummaryCard
            label="Missing URL"
            value={refStats.missingUrlCount}
            accent={refStats.missingUrlCount > 0 ? "text-warm-coral" : "text-tropical-green"}
          />
          <SummaryCard
            label="Unknown Character"
            value={refStats.unknownCharacterCount}
            accent={refStats.unknownCharacterCount > 0 ? "text-warm-coral" : "text-tropical-green"}
          />
          <SummaryCard
            label="Unsupported Type"
            value={refStats.unsupportedTypeCount}
            accent={refStats.unsupportedTypeCount > 0 ? "text-pineapple-yellow" : "text-tropical-green"}
          />
        </div>
        <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-4 py-3">
          <p className="text-xs text-tiki-brown/60 leading-relaxed">
            Reference assets are managed in{" "}
            <Link href="/admin/characters" className="text-ube-purple hover:underline font-semibold">
              Character Studio
            </Link>
            . This dashboard does not modify assets automatically.
          </p>
        </div>
      </section>

      {/* ── Read-only notice ── */}
      <div className="flex items-start gap-3 bg-white border border-tiki-brown/10 rounded-2xl px-5 py-4 shadow-sm">
        <span className="text-lg flex-shrink-0">🔒</span>
        <p className="text-xs text-tiki-brown/55 leading-relaxed">
          This dashboard is <strong className="text-tiki-brown">read-only diagnostics</strong>.
          It does not modify any episode JSON, character data, or Blob assets. Use it to
          identify issues, then fix them in the appropriate admin section. Report is generated
          fresh on each page load.
        </p>
      </div>

    </div>
  );
}
