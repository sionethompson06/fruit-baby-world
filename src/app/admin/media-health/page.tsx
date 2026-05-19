import type { Metadata } from "next";
import Link from "next/link";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { loadReferenceAssets } from "@/lib/referenceAssetLoader";
import { loadEpisodeDrafts, loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { buildMediaHealthReport, type EpisodeRawInput } from "@/lib/mediaHealth";
import MediaHealthClient from "./MediaHealthClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Media Health | Admin",
};

export default function MediaHealthPage() {
  // ── Load all data server-side ─────────────────────────────────────────────
  let characters = loadAllCharactersFromDisk();
  try { /* already assigned above */ } catch { characters = []; }

  let referenceAssets: ReturnType<typeof loadReferenceAssets> = [];
  try {
    referenceAssets = loadReferenceAssets();
  } catch { referenceAssets = []; }

  let episodeDrafts: ReturnType<typeof loadEpisodeDrafts>["drafts"] = [];
  try {
    const result = loadEpisodeDrafts();
    episodeDrafts = result.drafts;
  } catch { episodeDrafts = []; }

  // Load raw JSON for each episode draft so we can inspect scenes and panels
  const episodes: EpisodeRawInput[] = [];
  for (const draft of episodeDrafts) {
    try {
      const result = loadEpisodeBySlug(draft.slug);
      if (result) {
        episodes.push({
          slug: draft.slug,
          title: draft.title,
          readyForPublicSite: draft.readyForPublicSite,
          publicStatus: draft.publicStatus,
          raw: result.raw,
        });
      }
    } catch { /* skip episodes that fail to load */ }
  }

  const report = buildMediaHealthReport(characters, referenceAssets, episodes);

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Dashboard
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-wide">
              Admin Only
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60 uppercase tracking-wide">
              Read Only
            </span>
            {report.summary.totalBlockers > 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral uppercase tracking-wide">
                {report.summary.totalBlockers} Blocker{report.summary.totalBlockers !== 1 ? "s" : ""}
              </span>
            )}
            {report.summary.totalBlockers === 0 && report.summary.totalWarnings === 0 && (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/20 text-tropical-green uppercase tracking-wide">
                All Clear
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-2 leading-tight">
            Media Health
          </h1>
          <p className="text-sm text-tiki-brown/60 max-w-2xl leading-relaxed">
            Find missing media, hidden assets, readiness issues, and public display problems.
            All checks are read-only — this dashboard never modifies data.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16">
        <MediaHealthClient
          issues={report.issues}
          summary={report.summary}
          characterRows={report.characterRows}
          episodeRows={report.episodeRows}
          refStats={report.refStats}
        />
      </section>

    </div>
  );
}
