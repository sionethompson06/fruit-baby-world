import type { Metadata } from "next";
import Link from "next/link";
import { loadEpisodeDrafts, loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { getStorybookPages } from "@/lib/storybookPages";
import { buildStorybookPublishReadiness } from "@/lib/storybookPublishReadiness";
import { normalizeStorybookStatus } from "@/lib/storybookStatus";

export const metadata: Metadata = {
  title: "Storybooks | Admin",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function StatusBadge({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}>
      {label}
    </span>
  );
}

export default async function StorybooksPage() {
  const { drafts, diag } = loadEpisodeDrafts();

  const enriched = drafts.map((draft) => {
    const result = loadEpisodeBySlug(draft.slug);
    if (!result) return { draft, coverImageUrl: null as string | null, pageCount: 0, publishReady: false };
    const pages = getStorybookPages(result.raw);
    const cover = pages.find((p) => p.pageRole === "front-cover") ?? pages[0];
    const readiness = buildStorybookPublishReadiness(result.raw);
    const storybookStatus = normalizeStorybookStatus(result.raw);
    return {
      draft,
      coverImageUrl: cover?.imageUrl ?? null,
      pageCount: pages.length,
      publishReady: readiness.ready,
      storybookStatus,
    };
  });

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
          </div>
          <div className="text-4xl mb-3">📖</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Storybooks
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Create, edit, preview, and publish uploaded storybooks.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/storybooks/new"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold text-sm px-5 py-2.5 rounded-full shadow hover:bg-ube-purple/90 transition-colors"
            >
              <span>+</span>
              Create New Storybook
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-5">

        {/* Count */}
        <p className="text-sm font-semibold text-tiki-brown/50">
          {diag.jsonFilesFound} storybook{diag.jsonFilesFound !== 1 ? "s" : ""} found.
        </p>

        {/* Empty state */}
        {drafts.length === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-tiki-brown/20 p-10 text-center flex flex-col items-center gap-4">
            <p className="text-4xl">🌴</p>
            <div>
              <p className="text-base font-black text-tiki-brown mb-1">No storybooks yet</p>
              <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-sm mx-auto">
                Create your first storybook to get started.
              </p>
            </div>
            <Link
              href="/admin/storybooks/new"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold text-sm px-5 py-2.5 rounded-full shadow hover:bg-ube-purple/90 transition-colors mt-2"
            >
              <span>+</span>
              Create New Storybook
            </Link>
          </div>
        )}

        {/* Storybook cards */}
        {enriched.map(({ draft, coverImageUrl, pageCount, publishReady, storybookStatus }) => (
          <article
            key={draft._filename}
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm overflow-hidden flex flex-col sm:flex-row"
          >
            {/* Cover thumbnail */}
            <div className="w-full sm:w-32 flex-shrink-0 bg-tiki-brown/5 flex items-center justify-center min-h-[7rem] sm:min-h-0">
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt={`${draft.title} cover`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl opacity-20">📖</span>
              )}
            </div>

            {/* Content */}
            <div className="flex flex-col gap-3 p-5 flex-1 min-w-0">

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                {storybookStatus === "published" ? (
                  <StatusBadge label="Published" className="bg-tropical-green/20 text-tropical-green" />
                ) : storybookStatus === "coming-soon" ? (
                  <StatusBadge label="Coming Soon" className="bg-pineapple-yellow/40 text-tiki-brown/75" />
                ) : storybookStatus === "hidden" ? (
                  <StatusBadge label="Hidden" className="bg-sky-blue/20 text-tiki-brown/60" />
                ) : storybookStatus === "archived" ? (
                  <StatusBadge label="Archived" className="bg-warm-coral/15 text-warm-coral/70" />
                ) : publishReady ? (
                  <StatusBadge label="Ready to Publish" className="bg-pineapple-yellow/40 text-tiki-brown/70" />
                ) : (
                  <StatusBadge label="Draft" className="bg-tiki-brown/10 text-tiki-brown/60" />
                )}
                {pageCount > 0 && (
                  <StatusBadge
                    label={`${pageCount} page${pageCount !== 1 ? "s" : ""}`}
                    className="bg-sky-blue/30 text-tiki-brown/65"
                  />
                )}
              </div>

              {/* Title + slug */}
              <div>
                <h2 className="text-lg font-black text-tiki-brown leading-snug">{draft.title}</h2>
                <p className="text-xs font-mono text-tiki-brown/35 mt-0.5">{draft.slug}</p>
              </div>

              {/* Description */}
              {draft.shortDescription && (
                <p className="text-sm text-tiki-brown/65 leading-relaxed line-clamp-2">
                  {draft.shortDescription}
                </p>
              )}

              {/* Characters */}
              {draft.featuredCharacters.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draft.featuredCharacters.map((char) => (
                    <span
                      key={char}
                      className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <p className="text-xs text-tiki-brown/35">
                {draft.updatedAt
                  ? `Updated ${new Date(draft.updatedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                  : draft.createdAt
                  ? `Created ${new Date(draft.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}`
                  : ""}
              </p>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link
                  href={`/admin/storybooks/${draft.slug}/builder`}
                  className="inline-flex items-center gap-1.5 text-sm font-bold bg-ube-purple text-white px-4 py-2 rounded-full hover:bg-ube-purple/85 transition-colors shadow-sm"
                >
                  Edit Storybook →
                </Link>
                {storybookStatus === "published" ? (
                  <a
                    href={`/stories/${draft.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-tropical-green/15 text-tropical-green hover:bg-tropical-green/25 transition-colors"
                  >
                    View Public ↗
                  </a>
                ) : storybookStatus === "coming-soon" ? (
                  <a
                    href={`/stories/${draft.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-pineapple-yellow/25 text-tiki-brown/60 hover:bg-pineapple-yellow/40 transition-colors"
                  >
                    View Teaser ↗
                  </a>
                ) : (
                  <a
                    href={`/stories/${draft.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-full bg-tiki-brown/6 text-tiki-brown/50 hover:bg-tiki-brown/12 hover:text-tiki-brown transition-colors"
                  >
                    Preview ↗
                  </a>
                )}
              </div>
            </div>
          </article>
        ))}

      </section>
    </div>
  );
}
