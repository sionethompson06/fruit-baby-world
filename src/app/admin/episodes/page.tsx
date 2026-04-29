import type { Metadata } from "next";
import Link from "next/link";
import { loadEpisodeDrafts, type SavedEpisodeDraft, type EpisodeLoadDiag } from "@/lib/savedEpisodes";

export const metadata: Metadata = {
  title: "Episode Package Studio | Story Studio",
};

// Force dynamic server rendering on every request. Prevents stale static
// output after new episode JSON files are committed and Vercel redeploys.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Badge helpers ────────────────────────────────────────────────────────────

function ReviewBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    "draft":             { label: "Draft",             className: "bg-tiki-brown/10 text-tiki-brown/70" },
    "needs-review":      { label: "Needs Review",      className: "bg-pineapple-yellow/50 text-tiki-brown" },
    "approved-for-save": { label: "Approved for Save", className: "bg-tropical-green/20 text-tropical-green" },
    "revise":            { label: "Revise",            className: "bg-warm-coral/25 text-warm-coral" },
  };
  const meta = map[status] ?? { label: status, className: "bg-tiki-brown/10 text-tiki-brown/70" };
  return (
    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function Pill({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

// ─── Diagnostic panel (admin-only, no secrets exposed) ───────────────────────

function DiagPanel({ diag }: { diag: EpisodeLoadDiag }) {
  return (
    <div className="bg-white border border-tiki-brown/15 rounded-2xl p-5 font-mono text-xs text-tiki-brown/60 space-y-1">
      <p className="font-bold text-tiki-brown/80 mb-2 font-sans text-sm">File discovery diagnostics</p>
      <p><span className="text-tiki-brown/40">cwd:</span> {diag.cwd}</p>
      <p><span className="text-tiki-brown/40">dir:</span> {diag.dir}</p>
      <p><span className="text-tiki-brown/40">dirExists:</span> {String(diag.dirExists)}</p>
      <p><span className="text-tiki-brown/40">jsonFilesFound:</span> {diag.jsonFilesFound}</p>
      {diag.filenames.length > 0 && (
        <div>
          <p className="text-tiki-brown/40">filenames:</p>
          <ul className="ml-4 space-y-0.5">
            {diag.filenames.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
      {diag.parseErrors.length > 0 && (
        <div>
          <p className="text-warm-coral">errors:</p>
          <ul className="ml-4 space-y-0.5 text-warm-coral/80">
            {diag.parseErrors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Episode card ─────────────────────────────────────────────────────────────

function EpisodeCard({ draft }: { draft: SavedEpisodeDraft }) {
  return (
    <article className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">

      {/* Badge row */}
      <div className="flex flex-wrap items-center gap-2">
        <ReviewBadge status={draft.reviewStatus} />
        {draft.status !== "draft" && (
          <Pill className="bg-sky-blue/50 text-tiki-brown">Status: {draft.status}</Pill>
        )}
        {draft.productionStatus && (
          <Pill className="bg-tiki-brown/8 text-tiki-brown/70">Production: {draft.productionStatus}</Pill>
        )}
        {draft.approvedForSave && (
          <Pill className="bg-tropical-green/20 text-tropical-green">Save Approved</Pill>
        )}
        {draft.readyForPublicSite && (
          <Pill className="bg-ube-purple/15 text-ube-purple">Ready to Publish</Pill>
        )}
        <Pill className="bg-tiki-brown/6 text-tiki-brown/50">Public: {draft.publicStatus}</Pill>
      </div>

      {/* Title + slug */}
      <div>
        <h2 className="text-xl font-black text-tiki-brown leading-snug">{draft.title}</h2>
        {draft.slug && (
          <p className="text-xs font-mono text-tiki-brown/40 mt-0.5">{draft.slug}</p>
        )}
      </div>

      {/* Description */}
      {draft.shortDescription && (
        <p className="text-sm text-tiki-brown/70 leading-relaxed line-clamp-3">
          {draft.shortDescription}
        </p>
      )}

      {/* Meta grid */}
      {(draft.lesson || draft.setting || draft.tone || draft.targetAgeRange || draft.sceneCount > 0) && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
          {draft.lesson && (
            <><dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Lesson</dt>
              <dd className="text-xs text-tiki-brown/75">{draft.lesson}</dd></>
          )}
          {draft.setting && (
            <><dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Setting</dt>
              <dd className="text-xs text-tiki-brown/75">{draft.setting}</dd></>
          )}
          {draft.tone && (
            <><dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Tone</dt>
              <dd className="text-xs text-tiki-brown/75">{draft.tone}</dd></>
          )}
          {draft.targetAgeRange && (
            <><dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Age Range</dt>
              <dd className="text-xs text-tiki-brown/75">{draft.targetAgeRange}</dd></>
          )}
          {draft.sceneCount > 0 && (
            <><dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Scenes</dt>
              <dd className="text-xs text-tiki-brown/75">{draft.sceneCount}</dd></>
          )}
        </dl>
      )}

      {/* Featured characters */}
      {draft.featuredCharacters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {draft.featuredCharacters.map((char) => (
            <span key={char} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
              {char}
            </span>
          ))}
        </div>
      )}

      {/* Review notes */}
      {draft.reviewNotes && (
        <div className="bg-pineapple-yellow/15 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-tiki-brown mb-0.5">Review Notes</p>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">{draft.reviewNotes}</p>
        </div>
      )}

      {/* File + timestamps */}
      <div className="flex flex-col gap-0.5 pt-2 border-t border-tiki-brown/8">
        <p className="text-xs font-mono text-tiki-brown/35">{draft._filePath}</p>
        {draft.updatedAt && (
          <p className="text-xs text-tiki-brown/35">
            Updated:{" "}
            {new Date(draft.updatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
        {!draft.updatedAt && draft.createdAt && (
          <p className="text-xs text-tiki-brown/35">
            Created:{" "}
            {new Date(draft.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        )}
      </div>

      {/* View draft link */}
      <div className="pt-1">
        <Link
          href={`/admin/episodes/${draft.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-ube-purple hover:text-ube-purple/70 transition-colors"
        >
          View Draft →
        </Link>
      </div>
    </article>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EpisodesPage() {
  const { drafts, diag } = loadEpisodeDrafts();

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Hero */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Admin Only
            </span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-tiki-brown/10 text-tiki-brown/70 uppercase tracking-widest">
              Draft Library
            </span>
          </div>
          <div className="text-4xl mb-3">🎬</div>
          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-3 leading-tight">
            Episode Package Studio
          </h1>
          <p className="text-tiki-brown/70 text-base leading-relaxed max-w-xl">
            Review saved episode draft packages. All episodes here are
            internal drafts — none are visible on the public site yet.
          </p>
          <div className="mt-6">
            <Link
              href="/admin/storyboards"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold text-sm px-5 py-2.5 rounded-full shadow hover:bg-ube-purple/90 transition-colors"
            >
              <span>+</span>
              Create New Storyboard
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Draft-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📁</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">Saved draft episodes only</p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              These are episode package JSON files committed to{" "}
              <code className="font-mono text-xs bg-tiki-brown/8 px-1 py-0.5 rounded">src/content/episodes/</code>{" "}
              in the repository. Saved drafts are read from{" "}
              <code className="font-mono text-xs bg-tiki-brown/8 px-1 py-0.5 rounded">src/content/episodes</code>{" "}
              after GitHub commits and Vercel redeploys. Read-only — no editing, deleting, or publishing controls.
            </p>
          </div>
        </div>

        {/* File count */}
        <p className="text-sm font-semibold text-tiki-brown/50">
          {diag.jsonFilesFound} episode JSON file{diag.jsonFilesFound !== 1 ? "s" : ""} found.
          {" "}{drafts.length} rendered.
        </p>

        {/* Directory not found */}
        {!diag.dirExists && (
          <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-tiki-brown mb-1">
                Episode directory not found at deployment
              </p>
              <p className="text-sm text-tiki-brown/65 leading-relaxed mb-3">
                The server could not find{" "}
                <code className="font-mono text-xs bg-tiki-brown/8 px-1 py-0.5 rounded">src/content/episodes/</code>.
                This usually means the JSON files were not included in the Vercel output bundle.
                The <code className="font-mono text-xs">outputFileTracingIncludes</code> setting in{" "}
                <code className="font-mono text-xs">next.config.ts</code> should fix this after the next redeploy.
              </p>
              <DiagPanel diag={diag} />
            </div>
          </div>
        )}

        {/* Files found but none parsed */}
        {diag.dirExists && diag.jsonFilesFound > 0 && drafts.length === 0 && (
          <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm font-bold text-tiki-brown mb-1">
                Episode JSON files were found but could not be parsed
              </p>
              <DiagPanel diag={diag} />
            </div>
          </div>
        )}

        {/* Empty state — directory exists but zero JSON files */}
        {diag.dirExists && diag.jsonFilesFound === 0 && (
          <div className="bg-white rounded-3xl border border-dashed border-tiki-brown/20 p-10 text-center flex flex-col items-center gap-4">
            <p className="text-4xl">🌴</p>
            <div>
              <p className="text-base font-black text-tiki-brown mb-1">No saved episodes yet</p>
              <p className="text-sm text-tiki-brown/60 leading-relaxed max-w-sm mx-auto">
                Saved episode drafts will appear here after you generate,
                review, approve, and save them from the Storyboard Builder.
              </p>
            </div>
            <Link
              href="/admin/storyboards"
              className="inline-flex items-center gap-2 bg-ube-purple text-white font-bold text-sm px-5 py-2.5 rounded-full shadow hover:bg-ube-purple/90 transition-colors mt-2"
            >
              <span>+</span>
              Create New Storyboard
            </Link>
            <DiagPanel diag={diag} />
          </div>
        )}

        {/* Episode cards */}
        {drafts.map((draft) => (
          <EpisodeCard key={draft._filename} draft={draft} />
        ))}

        {/* Fidelity callout */}
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
          <span className="text-xl flex-shrink-0">🎨</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Image &amp; animation prompts require human review
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              All AI-generated image and animation prompts must be checked for
              character fidelity against official reference art before any asset
              generation. Do not send prompts to an image model without a manual fidelity review.
            </p>
          </div>
        </div>

        {/* Diagnostic footer — always shown for admin visibility */}
        <DiagPanel diag={diag} />

        {/* Future workflow */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-7">
          <h2 className="text-base font-black text-tiki-brown mb-4">Future workflow</h2>
          <ul className="space-y-3">
            {[
              "Approved drafts flow to an animation production queue",
              "Image prompts are reviewed and sent to a controlled image-generation pipeline",
              "Episodes are scheduled, published to the public site, and linked to merchandise",
              "Published episode data feeds into the public /stories page automatically",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-tiki-brown/70 leading-snug">
                <span className="text-ube-purple mt-0.5 flex-shrink-0">→</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

      </section>
    </div>
  );
}
