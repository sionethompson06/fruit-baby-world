import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { getStorybookPages } from "@/lib/storybookPages";
import type { StorybookNarrationAudio } from "@/lib/storybookAudioTypes";
import StorybookPagesManager from "@/app/admin/episodes/[slug]/StorybookPagesManager";
import StorybookDetailsEditor from "@/app/admin/episodes/[slug]/StorybookDetailsEditor";
import SimplePublishAction from "./SimplePublishAction";
import StorybookAudioManager from "./StorybookAudioManager";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  const title = result ? String(result.raw.title ?? slug) : slug;
  return { title: `${String(title).trim()} | Storybook Builder` };
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

function SectionGroupHeader({
  id,
  icon,
  title,
  subtitle,
  badge,
}: {
  id?: string;
  icon: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
}) {
  return (
    <div id={id} className="flex items-start gap-2.5 border-b border-tiki-brown/10 pb-3 scroll-mt-4">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black text-tiki-brown uppercase tracking-wide">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-tiki-brown/50 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Pill({
  children,
  className = "bg-tiki-brown/8 text-tiki-brown/60",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}>
      {children}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StorybookBuilderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result) notFound();

  const { raw, normalised } = result;

  const isRec = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  const reviewObj = isRec(raw.review) ? raw.review : null;
  const publishingObj = isRec(raw.publishing) ? raw.publishing : null;
  const isAlreadyPublished =
    normalised.readyForPublicSite ||
    normalised.publicStatus === "published" ||
    (publishingObj !== null && publishingObj.publicStatus === "published");

  const storybookPages = getStorybookPages(raw);
  const publicPageCount = storybookPages.filter(
    (p) => p.status === "approved" && p.visibility === "public"
  ).length;
  const hasFrontCover = storybookPages.some((p) => p.pageRole === "front-cover");
  const hasBackCover = storybookPages.some((p) => p.pageRole === "back-cover");
  const storyPageCount = storybookPages.filter(
    (p) => p.pageRole === "story-spread" || p.pageRole === "story-page"
  ).length;

  // Load existing storybook narration audio
  const rawNarration = isRec(raw.storybookNarration) ? raw.storybookNarration : null;
  const initialNarration: StorybookNarrationAudio | null = rawNarration && typeof rawNarration.audioUrl === "string" ? {
    id: typeof rawNarration.id === "string" ? rawNarration.id : `storybook-audio-${Date.now()}`,
    title: typeof rawNarration.title === "string" ? rawNarration.title : undefined,
    audioUrl: rawNarration.audioUrl,
    pathname: typeof rawNarration.pathname === "string" ? rawNarration.pathname : undefined,
    mimeType: typeof rawNarration.mimeType === "string" ? rawNarration.mimeType : "audio/mpeg",
    sizeBytes: typeof rawNarration.sizeBytes === "number" ? rawNarration.sizeBytes : undefined,
    durationSeconds: typeof rawNarration.durationSeconds === "number" ? rawNarration.durationSeconds : undefined,
    sourceType: rawNarration.sourceType === "legacy-generated" ? "legacy-generated" : "admin-uploaded",
    status: rawNarration.status === "approved" || rawNarration.status === "archived" ? rawNarration.status : "draft",
    visibility: rawNarration.visibility === "public" ? "public" : "hidden",
    createdAt: typeof rawNarration.createdAt === "string" ? rawNarration.createdAt : new Date().toISOString(),
    updatedAt: typeof rawNarration.updatedAt === "string" ? rawNarration.updatedAt : undefined,
  } : null;
  const hasPublicAudio = initialNarration?.visibility === "public" && initialNarration?.status !== "archived";

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link
            href="/admin/storybooks"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Storybooks
          </Link>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Storybook Builder
            </span>
            <Pill className="bg-tiki-brown/6 text-tiki-brown/45">
              {isAlreadyPublished ? "Published" : normalised.publicStatus === "not-published" ? "Draft" : normalised.publicStatus}
            </Pill>
            {normalised.approvedForSave && (
              <Pill className="bg-tropical-green/20 text-tropical-green">Approved</Pill>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-1 leading-tight">
            {normalised.title}
          </h1>
          <p className="text-xs font-mono text-tiki-brown/40 mt-1">{normalised.slug}</p>
          <p className="text-sm text-tiki-brown/55 mt-2">
            Add details, upload book images, attach optional audio/video, preview, and publish.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Section nav */}
        <nav
          aria-label="Builder sections"
          className="flex flex-wrap gap-2 bg-white border border-tiki-brown/10 rounded-2xl px-4 py-3 shadow-sm"
        >
          {[
            { href: "#details", label: "Details" },
            { href: "#book-images", label: "Book Images" },
            { href: "#audio", label: "Audio" },
            { href: "#video", label: "Video" },
            { href: "#preview", label: "Preview" },
            { href: "#publish", label: "Publish" },
          ].map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-xs font-bold px-3 py-1.5 rounded-full bg-tiki-brown/5 text-tiki-brown/60 hover:bg-ube-purple/10 hover:text-ube-purple transition-colors uppercase tracking-wide"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* ── Details ── */}
        <div className="flex flex-col gap-4">
          <SectionGroupHeader
            id="details"
            icon="✏️"
            title="Details"
            subtitle="Storybook title and description."
          />

          <StorybookDetailsEditor
            episodeSlug={normalised.slug}
            initialTitle={normalised.title}
            initialAbout={normalised.shortDescription}
          />

          {/* Meta summary card */}
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
            <div className="grid grid-cols-[8rem_1fr] gap-y-2 gap-x-4">
              {normalised.shortDescription && (
                <>
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide self-start pt-0.5">About</dt>
                  <dd className="text-sm text-tiki-brown/75 leading-relaxed">{normalised.shortDescription}</dd>
                </>
              )}
              {normalised.productionStatus && (
                <>
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Production</dt>
                  <dd className="text-xs text-tiki-brown/60">{normalised.productionStatus}</dd>
                </>
              )}
              {normalised.updatedAt && (
                <>
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Updated</dt>
                  <dd className="text-xs text-tiki-brown/60">
                    {new Date(normalised.updatedAt).toLocaleString("en-US", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </dd>
                </>
              )}
            </div>
            {normalised.featuredCharacters.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1.5">Featured Characters</p>
                <div className="flex flex-wrap gap-1.5">
                  {normalised.featuredCharacters.map((c) => (
                    <span key={c} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {reviewObj && typeof reviewObj.notes === "string" && reviewObj.notes && (
              <div className="bg-pineapple-yellow/10 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide mb-0.5">Review Notes</p>
                <p className="text-xs text-tiki-brown/70 leading-relaxed">{reviewObj.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Book Images ── */}
        <div className="flex flex-col gap-4">
          <SectionGroupHeader
            id="book-images"
            icon="📚"
            title="Book Images"
            subtitle="Upload the finished artwork: front cover, two-page spreads, story pages, end page, and back cover."
            badge={
              publicPageCount > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  {publicPageCount} public
                </span>
              ) : storybookPages.length > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/60 uppercase tracking-wide">
                  {storybookPages.length} draft
                </span>
              ) : undefined
            }
          />
          <StorybookPagesManager episodeSlug={normalised.slug} initialPages={storybookPages} />
        </div>

        {/* ── Audio ── */}
        <div className="flex flex-col gap-4">
          <SectionGroupHeader
            id="audio"
            icon="🎙️"
            title="Audio Narration"
            subtitle="Upload a finished narration file for readers to listen while reading."
            badge={
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45 uppercase tracking-wide">
                Optional
              </span>
            }
          />
          <StorybookAudioManager
            episodeSlug={normalised.slug}
            initialNarration={initialNarration}
          />
        </div>

        {/* ── Video ── */}
        <div className="flex flex-col gap-4">
          <SectionGroupHeader
            id="video"
            icon="🎬"
            title="Cartoon Video"
            subtitle="Upload or attach a finished cartoon video for this storybook."
            badge={
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45 uppercase tracking-wide">
                Optional
              </span>
            }
          />
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <h3 className="text-sm font-black text-tiki-brown">Upload Cartoon Video</h3>
                <p className="text-xs text-tiki-brown/50">Attach a finished cartoon or animated video for this story</p>
              </div>
            </div>
            <p className="text-sm text-tiki-brown/55 leading-relaxed">
              Video upload support is coming soon. For video tools now, use the{" "}
              <Link
                href={`/admin/episodes/${normalised.slug}#video`}
                className="font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
              >
                legacy editor
              </Link>
              .
            </p>
          </div>
        </div>

        {/* ── Preview ── */}
        <div className="flex flex-col gap-4">
          <SectionGroupHeader
            id="preview"
            icon="👁️"
            title="Preview"
            subtitle="Preview the public storybook page before publishing."
          />
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-black text-tiki-brown">Preview Storybook</h3>
                <p className="text-xs text-tiki-brown/50 mt-0.5">
                  Opens the public story page in a new tab. Only approved/public content is visible to readers.
                </p>
                <p className="text-xs font-mono text-tiki-brown/35 mt-1">
                  /stories/{normalised.slug}
                </p>
              </div>
              <a
                href={`/stories/${normalised.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/85 transition-colors"
              >
                <span>👁️</span>
                Preview Storybook
              </a>
            </div>

            {/* Readiness checklist */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {
                  label: "Title",
                  done: Boolean(normalised.title),
                  optional: false,
                  icon: "📝",
                },
                {
                  label: "About",
                  done: Boolean(normalised.shortDescription),
                  optional: false,
                  icon: "📄",
                },
                {
                  label: "Front Cover",
                  done: hasFrontCover,
                  optional: false,
                  icon: "📖",
                },
                {
                  label: storyPageCount > 0 ? `${storyPageCount} Spread${storyPageCount !== 1 ? "s" : ""}/Page${storyPageCount !== 1 ? "s" : ""}` : "Story Spreads / Pages",
                  done: storyPageCount > 0,
                  optional: false,
                  icon: "🖼️",
                },
                {
                  label: "Book Order Reviewed",
                  done: storybookPages.length > 1,
                  optional: false,
                  icon: "📋",
                },
                {
                  label: "Back Cover",
                  done: hasBackCover,
                  optional: true,
                  icon: "📚",
                },
                {
                  label: hasPublicAudio ? "Audio Public" : initialNarration && initialNarration.status !== "archived" ? "Audio (Hidden)" : "Audio",
                  done: hasPublicAudio,
                  optional: true,
                  icon: "🎧",
                },
                {
                  label: "Video",
                  done: false,
                  optional: true,
                  icon: "🎬",
                },
              ].map(({ label, done, optional, icon }) => (
                <div
                  key={label}
                  className={`flex items-center gap-2 rounded-2xl border px-3 py-2.5 ${
                    done
                      ? "border-tropical-green/30 bg-tropical-green/8"
                      : optional
                      ? "border-tiki-brown/10 bg-tiki-brown/3"
                      : "border-warm-coral/25 bg-warm-coral/5"
                  }`}
                >
                  <span className="text-base">{icon}</span>
                  <div className="flex flex-col">
                    <span className={`text-xs font-bold leading-tight ${done ? "text-tropical-green" : optional ? "text-tiki-brown/45" : "text-warm-coral/70"}`}>
                      {done ? "✓" : optional ? "○" : "✕"} {label}
                    </span>
                    {optional && !done && (
                      <span className="text-[10px] text-tiki-brown/35">Optional</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Publish ── */}
        <div className="flex flex-col gap-4">
          <SectionGroupHeader
            id="publish"
            icon="🚀"
            title="Publish"
            subtitle="Make this storybook live on the public site."
            badge={
              isAlreadyPublished ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  Live ✓
                </span>
              ) : undefined
            }
          />
          <SimplePublishAction
            slug={normalised.slug}
            approvedForSave={normalised.approvedForSave}
            isAlreadyPublished={isAlreadyPublished}
          />
        </div>

        {/* ── Legacy editor link ── */}
        <div className="flex items-start gap-3 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-5 py-4">
          <span className="text-base flex-shrink-0">🔧</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide mb-0.5">Legacy Editor</p>
            <p className="text-xs text-tiki-brown/50 leading-relaxed">
              Advanced tools — scene breakdown, narration generation, video generation, review approval — are available in the legacy editor.
            </p>
          </div>
          <Link
            href={`/admin/episodes/${normalised.slug}`}
            className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors flex-shrink-0 whitespace-nowrap"
          >
            Open Legacy Editor →
          </Link>
        </div>

        {/* Back link footer */}
        <div className="pt-2">
          <Link
            href="/admin/storybooks"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            ← Back to Storybooks
          </Link>
        </div>

      </section>
    </div>
  );
}
