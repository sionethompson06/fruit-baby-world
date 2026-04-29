import type { Metadata } from "next";
import Link from "next/link";
import { loadEpisodeDrafts, type SavedEpisodeDraft } from "@/lib/savedEpisodes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Publishing Queue | Story Studio",
};

// ─── Grouping helpers ─────────────────────────────────────────────────────────

function isPublicReady(d: SavedEpisodeDraft) {
  return d.readyForPublicSite || d.publicStatus === "published" || d.status === "published";
}
function isApprovedNotPublic(d: SavedEpisodeDraft) {
  return d.approvedForSave && !isPublicReady(d);
}
function isNeedsReview(d: SavedEpisodeDraft) {
  return d.reviewStatus === "needs-review" && !isPublicReady(d) && !isApprovedNotPublic(d);
}
function isDraftInProgress(d: SavedEpisodeDraft) {
  return !isPublicReady(d) && !isApprovedNotPublic(d) && !isNeedsReview(d);
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  className = "bg-white",
}: {
  label: string;
  value: number | string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-0.5 rounded-2xl border border-tiki-brown/10 shadow-sm px-5 py-4 min-w-[7.5rem] text-center ${className}`}
    >
      <span className="text-2xl font-black text-tiki-brown">{value}</span>
      <span className="text-xs font-semibold text-tiki-brown/50 uppercase tracking-wide leading-tight">
        {label}
      </span>
    </div>
  );
}

function StatusPill({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

function VisibilityBadge({ draft }: { draft: SavedEpisodeDraft }) {
  if (isPublicReady(draft))
    return (
      <StatusPill className="bg-tropical-green/20 text-tropical-green">Public-Ready</StatusPill>
    );
  if (isApprovedNotPublic(draft))
    return (
      <StatusPill className="bg-sky-blue/40 text-tiki-brown">Approved, Not Public</StatusPill>
    );
  if (isNeedsReview(draft))
    return (
      <StatusPill className="bg-pineapple-yellow/50 text-tiki-brown">Needs Review</StatusPill>
    );
  return <StatusPill className="bg-tiki-brown/10 text-tiki-brown/55">Private Draft</StatusPill>;
}

// ─── Episode queue card ───────────────────────────────────────────────────────

function EpisodeQueueCard({ draft }: { draft: SavedEpisodeDraft }) {
  const date = draft.updatedAt || draft.createdAt;
  const dateLabel = draft.updatedAt ? "Updated" : "Created";
  const formattedDate = date
    ? new Date(date).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="bg-white rounded-2xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-tiki-brown leading-snug mb-0.5">
            {draft.title}
          </h3>
          <p className="text-xs font-mono text-tiki-brown/35 truncate">{draft.slug}</p>
        </div>
        <VisibilityBadge draft={draft} />
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-1.5">
        {draft.reviewStatus && (
          <StatusPill className="bg-tiki-brown/8 text-tiki-brown/60">
            Review: {draft.reviewStatus}
          </StatusPill>
        )}
        {draft.productionStatus && (
          <StatusPill className="bg-tiki-brown/8 text-tiki-brown/60">
            Production: {draft.productionStatus}
          </StatusPill>
        )}
        {draft.approvedForSave && (
          <StatusPill className="bg-tropical-green/15 text-tropical-green">
            Save Approved
          </StatusPill>
        )}
        {draft.publicStatus && draft.publicStatus !== "not-published" && (
          <StatusPill className="bg-ube-purple/10 text-ube-purple">
            Public: {draft.publicStatus}
          </StatusPill>
        )}
      </div>

      {/* Meta grid */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        <div>
          <dt className="text-xs font-semibold text-tiki-brown/40 uppercase tracking-wide">
            Scenes
          </dt>
          <dd className="text-xs text-tiki-brown/70 font-semibold">{draft.sceneCount}</dd>
        </div>
        {formattedDate && (
          <div>
            <dt className="text-xs font-semibold text-tiki-brown/40 uppercase tracking-wide">
              {dateLabel}
            </dt>
            <dd className="text-xs text-tiki-brown/70">{formattedDate}</dd>
          </div>
        )}
        <div className="col-span-2">
          <dt className="text-xs font-semibold text-tiki-brown/40 uppercase tracking-wide">
            File
          </dt>
          <dd className="text-xs font-mono text-tiki-brown/40 truncate">{draft._filePath}</dd>
        </div>
      </dl>

      {/* Media readiness */}
      <div className="bg-tiki-brown/4 rounded-xl px-4 py-3">
        <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
          Media Readiness
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {(
            [
              ["Story Panels", `0 / ${draft.sceneCount} planned`],
              ["Animation Clips", `0 / ${draft.sceneCount} planned`],
              ["Read-Aloud", "Not Started"],
              ["Approved Assets", "0"],
            ] as [string, string][]
          ).map(([label, val]) => (
            <div key={label} className="flex items-center justify-between gap-1">
              <span className="text-xs text-tiki-brown/50">{label}</span>
              <span className="text-xs font-semibold text-warm-coral/60">{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Review link */}
      <Link
        href={`/admin/episodes/${draft.slug}`}
        className="self-start text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
      >
        Review Episode →
      </Link>
    </div>
  );
}

// ─── Queue section ────────────────────────────────────────────────────────────

function QueueSection({
  title,
  icon,
  description,
  drafts,
  emptyText,
  headerClassName = "bg-tiki-brown/6",
}: {
  title: string;
  icon: string;
  description: string;
  drafts: SavedEpisodeDraft[];
  emptyText: string;
  headerClassName?: string;
}) {
  return (
    <div className="rounded-3xl border border-tiki-brown/10 overflow-hidden shadow-sm">
      <div className={`px-6 py-4 flex items-center gap-3 ${headerClassName}`}>
        <span className="text-lg">{icon}</span>
        <div className="flex-1">
          <h2 className="text-sm font-black text-tiki-brown">{title}</h2>
          <p className="text-xs text-tiki-brown/55 leading-snug">{description}</p>
        </div>
        <span className="text-sm font-black text-tiki-brown/50">{drafts.length}</span>
      </div>
      <div className="bg-bg-cream px-4 py-4">
        {drafts.length === 0 ? (
          <p className="text-xs text-tiki-brown/40 italic py-2 px-1">{emptyText}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {drafts.map((d) => (
              <EpisodeQueueCard key={d.slug} draft={d} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PublishingPage() {
  const { drafts, diag } = loadEpisodeDrafts();

  const publicReady = drafts.filter(isPublicReady);
  const approvedNotPublic = drafts.filter(isApprovedNotPublic);
  const needsReview = drafts.filter(isNeedsReview);
  const inProgress = drafts.filter(isDraftInProgress);

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-sky-blue/30 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/10 text-tiki-brown/60 uppercase tracking-widest">
              Read-Only
            </span>
          </div>
          <div className="text-4xl mb-3">📤</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Publishing Queue
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Track saved Fruit Baby episode drafts from review to public-ready status.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Read-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Read-only dashboard. </strong>
            Publishing actions happen from each saved episode detail page after review.
            No statuses are changed here.
          </p>
        </div>

        {/* Empty state */}
        {drafts.length === 0 && (
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm px-8 py-14 text-center flex flex-col items-center gap-4">
            <span className="text-5xl">📭</span>
            <div>
              <p className="text-base font-black text-tiki-brown mb-2">No saved episodes yet</p>
              <p className="text-sm text-tiki-brown/55 leading-relaxed max-w-sm mx-auto">
                Saved episodes will appear here after you create and save approved drafts
                from the Storyboard Builder.
              </p>
            </div>
            <Link
              href="/admin/storyboards"
              className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-ube-purple text-white text-sm font-bold hover:bg-ube-purple/85 transition-colors shadow-sm"
            >
              Create Storyboard →
            </Link>
            {diag.parseErrors.length > 0 && (
              <p className="text-xs text-warm-coral/70 font-mono mt-2">
                Load errors: {diag.parseErrors.join(", ")}
              </p>
            )}
          </div>
        )}

        {/* Summary stats */}
        {drafts.length > 0 && (
          <div className="flex flex-wrap gap-3">
            <StatCard label="Total Saved" value={drafts.length} />
            <StatCard
              label="Public-Ready"
              value={publicReady.length}
              className="bg-tropical-green/10 border-tropical-green/25"
            />
            <StatCard
              label="Approved, Not Public"
              value={approvedNotPublic.length}
              className="bg-sky-blue/15 border-sky-blue/35"
            />
            <StatCard
              label="Needs Review"
              value={needsReview.length}
              className="bg-pineapple-yellow/20 border-pineapple-yellow/40"
            />
            <StatCard label="Draft / In Progress" value={inProgress.length} />
            <StatCard label="Media Not Started" value={drafts.length} />
          </div>
        )}

        {/* Queue sections */}
        {drafts.length > 0 && (
          <>
            <QueueSection
              title="Public-Ready / Published"
              icon="🚀"
              description="Live or eligible to appear on /stories after Vercel redeploy."
              drafts={publicReady}
              emptyText="No public-ready episodes yet."
              headerClassName="bg-tropical-green/12 border-b border-tropical-green/20"
            />
            <QueueSection
              title="Approved for Save"
              icon="✅"
              description="Approved for save but not yet marked public-ready."
              drafts={approvedNotPublic}
              emptyText="No approved-not-public episodes."
              headerClassName="bg-sky-blue/15 border-b border-sky-blue/25"
            />
            <QueueSection
              title="Needs Review"
              icon="🔍"
              description="Submitted for content and character fidelity review."
              drafts={needsReview}
              emptyText="No episodes currently in review."
              headerClassName="bg-pineapple-yellow/20 border-b border-pineapple-yellow/30"
            />
            <QueueSection
              title="Draft / In Progress"
              icon="✏️"
              description="Generated drafts or early-stage episodes not yet submitted for review."
              drafts={inProgress}
              emptyText="No in-progress drafts."
              headerClassName="bg-tiki-brown/6 border-b border-tiki-brown/12"
            />
          </>
        )}

        {/* Character fidelity callout */}
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
          <span className="text-xl flex-shrink-0">🎨</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            Before any episode becomes public, review story content, character behavior, image
            prompts, animation prompts, and future media assets against the official character
            profiles. Official character canon is the source of truth.
          </p>
        </div>

        {/* How publishing works */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6">
          <h2 className="text-base font-black text-tiki-brown mb-4">How Publishing Works</h2>
          <ol className="flex flex-col gap-2.5">
            {[
              "Draft or generate an episode in Storyboard Builder.",
              "Review the generated package and mark it Approved for Save.",
              "Save the approved draft to GitHub.",
              "Open the saved episode detail page in the Episodes library.",
              "Check publish-readiness and media planning.",
              "Mark the episode public-ready from the detail page.",
              "After Vercel redeploys, public-ready episodes can appear on /stories.",
            ].map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-tiki-brown/70 leading-snug"
              >
                <span className="flex-shrink-0 font-black text-ube-purple text-xs mt-0.5 w-4">
                  {i + 1}.
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* How media works later */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6">
          <h2 className="text-base font-black text-tiki-brown mb-4">How Media Works Later</h2>
          <ul className="flex flex-col gap-2.5">
            {[
              "Story Panel Mode will use approved still images for storybook-style reading.",
              "Animation Mode will use approved clips for cartoon-style episodes.",
              "Read-Aloud Mode will use narration, captions, and voiceover planning.",
              "Media generation is not active yet.",
              "Only approved media assets should appear publicly.",
            ].map((item) => (
              <li
                key={item}
                className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-snug"
              >
                <span className="text-sky-blue mt-0.5 flex-shrink-0">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}
