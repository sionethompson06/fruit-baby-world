import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import StoryPanelReader, { type ReaderPanel } from "@/components/StoryPanelReader";
import StorybookReader, { type StorybookReaderPage } from "@/components/StorybookReader";
import {
  getActiveEpisodeScenes,
  getApprovedPublicStoryPanels,
  type ApprovedPanel,
} from "@/lib/episodeScenes";
import {
  getPublicStorybookPages,
  shouldUseStorybookPagesForPublicReader,
} from "@/lib/storybookPages";
import {
  getPublicReadyVideoClipsForEpisode,
  type PublicVideoClip,
} from "@/lib/publicVideoClips";
import { getPublicReadyFinalVideo } from "@/lib/publicFinalVideo";
import PublicFinalVideoPlayer from "./components/PublicFinalVideoPlayer";

// ─── Eligibility ──────────────────────────────────────────────────────────────

function isPublicReady(raw: Record<string, unknown>): boolean {
  const pub =
    typeof raw.publishing === "object" && raw.publishing !== null
      ? (raw.publishing as Record<string, unknown>)
      : null;
  return (
    raw.status === "published" ||
    pub?.readyForPublicSite === true ||
    pub?.publicStatus === "published"
  );
}

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result || !isPublicReady(result.raw)) return {};
  const raw = result.raw;
  const title = str(raw.title) || slug;
  const description = str(raw.shortDescription) || str(raw.episodeSummary);
  return {
    title: `${title} | Fruit Baby World Stories`,
    ...(description ? { description } : {}),
    openGraph: str(raw.coverImage)
      ? { images: [{ url: str(raw.coverImage) }] }
      : undefined,
  };
}

// ─── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const episodes = loadPublicSavedEpisodes();
  return episodes.map((e) => ({ slug: e.slug }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v))
    return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function formatCharName(slug: string): string {
  if (slug === "tiki" || slug === "tiki-trouble") return "Tiki Trouble";
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function extractPages(raw: Record<string, unknown>): StorybookPage[] {
  const rawScenes = Array.isArray(raw.sceneBreakdown) && raw.sceneBreakdown.length > 0
    ? raw.sceneBreakdown
    : Array.isArray(raw.scenes)
    ? raw.scenes
    : [];

  return (rawScenes as Record<string, unknown>[])
    .filter((s) => str(s.status) !== "archived")
    .map((s, i) => ({
      sceneNumber: typeof s.sceneNumber === "number" ? s.sceneNumber : i + 1,
      title: str(s.title),
      text: str(s.summary) || str(s.text) || str(s.storyText) || str(s.narratorText),
      imageUrl: str(s.imageUrl) || undefined,
    }))
    .filter((p) => p.text);
}

// ─── Character badge ──────────────────────────────────────────────────────────

function CharBadge({ char }: { char: Character }) {
  const color = char.visualIdentity.primaryColors[0] ?? "#FFD84D";
  return (
    <span
      className="text-sm font-semibold px-3 py-1.5 rounded-full text-tiki-brown border border-tiki-brown/15"
      style={{ backgroundColor: `${color}28` }}
    >
      {char.shortName}
    </span>
  );
}

function CharNameBadge({ name }: { name: string }) {
  return (
    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple">
      {formatCharName(name)}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result || !isPublicReady(result.raw)) notFound();

  const { raw } = result;
  const title = str(raw.title) || slug;
  const shortDescription = str(raw.shortDescription) || str(raw.episodeSummary);
  const lesson = str(raw.lesson);
  const setting = str(raw.setting);
  const coverImage = str(raw.coverImage);
  const audioUrl = str(raw.audioUrl) || undefined;
  const videoUrl = str(raw.videoUrl) || undefined;
  const featuredCharacters = strArr(raw.featuredCharacters);

  const pages = extractPages(raw);

  // Public-ready animated clips — only shown when visibility === "public-ready"
  const publicClips = getPublicReadyVideoClipsForEpisode(scenes);

  const merchTieIns = strArr(raw.merchTieIns);

  // Storybook pages take priority over legacy story panels when available
  const useStorybookPages = shouldUseStorybookPagesForPublicReader(raw);
  const publicStorybookPages = useStorybookPages ? getPublicStorybookPages(raw) : [];

  // Premium StorybookReader pages (Phase 19B)
  const storybookReaderPages: StorybookReaderPage[] = publicStorybookPages.map((page) => ({
    id: page.id,
    pageNumber: page.pageNumber,
    title: page.title,
    caption: page.caption,
    readAloudText: page.readAloudText,
    imageUrl: page.imageUrl,
    altText: page.altText || `${title} — Page ${page.pageNumber}`,
    characters: page.characters,
    layoutType: page.layoutType,
    displayMode: page.displayMode,
    spreadNumber: page.spreadNumber,
  }));

  // Approved public story panels (fallback when no storybook pages)
  const approvedPanels: ApprovedPanel[] = useStorybookPages ? [] : getApprovedPublicStoryPanels(raw);
  const sceneByNumber = Object.fromEntries(scenes.map((s) => [Number(s.sceneNumber) || 0, s]));

  // Legacy reader panels — only built when no storybookPages present
  const readerPanels: ReaderPanel[] = approvedPanels.map((panel) => {
    const scene = sceneByNumber[panel.sceneNumber];
    const rawCharIds = scene
      ? strArr(scene.characters ?? panel.referenceCharacters)
      : panel.referenceCharacters;
    const characterNames = rawCharIds.map((id) => {
      const c = charMap[id];
      return c ? c.shortName : formatCharName(id);
    });
    return {
      sceneNumber: panel.sceneNumber,
      panelTitle: str(scene?.title) || panel.panelTitle,
      caption: panel.caption,
      sceneSummary: str(scene?.summary),
      characterNames,
      asset: { url: panel.asset.url, alt: panel.asset.alt },
    };
  });

  // Whether any reader content is available
  const hasReaderContent = storybookReaderPages.length > 0 || readerPanels.length > 0;

  // Public-ready narration audio — only shown when approved and public-ready
  const publicAudio: PublicAudio | null = (() => {
    const an = raw.audioNarration;
    if (typeof an !== "object" || an === null || Array.isArray(an)) return null;
    const a = an as Record<string, unknown>;
    if (typeof a.url !== "string" || !a.url.startsWith("https://")) return null;
    if (a.status !== "approved") return null;
    if (a.visibility !== "public-ready") return null;
    return {
      url: a.url,
      mimeType: typeof a.mimeType === "string" ? a.mimeType : "audio/mpeg",
      voiceStyle: typeof a.voiceStyle === "string" && a.voiceStyle ? a.voiceStyle : null,
    };
  })();

  // Public-ready full final video — only shown when visibility === "public-ready"
  const publicFinalVideo = getPublicReadyFinalVideo(raw);

  // Gradient colors from featured characters
  const heroColorA = featuredChars[0]?.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const heroColorB = featuredChars[1]?.visualIdentity.primaryColors[0] ?? "#7AC943";

  return (
    <main className="min-h-screen bg-gradient-to-b from-pineapple-yellow/8 via-white to-white">
      {/* Nav back */}
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
        <Link
          href="/stories"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-tiki-brown/50 hover:text-tiki-brown transition-colors"
        >
          ← All Stories
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-20 flex flex-col gap-8">
        {/* Episode header */}
        <div className="flex flex-col gap-4">
          {coverImage && (
            <div className="relative w-full aspect-[16/7] rounded-3xl overflow-hidden shadow-lg">
              <Image
                src={coverImage}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 768px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <h1 className="text-2xl sm:text-3xl font-black text-white drop-shadow-lg leading-tight">
                  {title}
                </h1>
              </div>
            </div>
          )}

          {!coverImage && (
            <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown leading-tight">
              {title}
            </h1>
          )}

          {shortDescription && (
            <p className="text-base text-tiki-brown/70 leading-relaxed">
              {shortDescription}
            </p>
          )}

          {/* Meta row */}
          <div className="flex flex-wrap gap-2 items-center">
            {featuredCharacters.map((slug) => {
              const c = charMap[slug];
              return c ? (
                <CharBadge key={slug} char={c} />
              ) : (
                <CharNameBadge key={slug} name={slug} />
              );
            })}
            {setting && (
              <span className="text-xs text-tiki-brown/45 font-medium px-3 py-1.5 rounded-full border border-tiki-brown/12">
                📍 {setting}
              </span>
            )}
          </div>

          {lesson && (
            <div className="flex items-center gap-2 bg-pineapple-yellow/40 border border-pineapple-yellow/60 rounded-2xl px-4 py-2.5 max-w-sm text-center">
              <span className="text-base flex-shrink-0">💡</span>
              <p className="text-sm font-bold text-tiki-brown leading-snug">{lesson}</p>
            </div>
          )}
        </div>
      </section>

      {/* ── Content ── */}
      <section className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-8">

        {/* Back link */}
        <Link
          href="/stories"
          className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
        >
          ← Back to Stories
        </Link>

        {/* ── Section navigation ── */}
        <nav className="flex flex-wrap gap-2" aria-label="Page sections">
          <a
            href="#read-story"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            📖 Story
          </a>
          {publicAudio && (
            <a
              href="#listen"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-tropical-green/10 border border-tropical-green/30 text-tropical-green hover:bg-tropical-green/20 transition-colors"
            >
              🎧 Listen
            </a>
          )}
          <a
            href="#story-panels"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            🖼️ Panels
          </a>
          <a
            href="#read-aloud"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            🎙️ Read-Aloud
          </a>
          {publicClips.length > 0 && (
            <a
              href="#animated-moments"
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-sky-blue/10 border border-sky-blue/30 text-sky-blue hover:bg-sky-blue/20 transition-colors"
            >
              🎬 Watch
            </a>
          )}
        </nav>

        {/* ── Story Mode cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Read Story — active */}
          <div className="flex flex-col items-center gap-2 bg-ube-purple rounded-2xl px-3 py-4 text-center shadow-sm">
            <span className="text-2xl">📖</span>
            <p className="text-xs font-black text-white leading-snug">Read Story</p>
            <span className="text-xs font-bold text-white/70 bg-white/15 px-2 py-0.5 rounded-full">
              Available
            </span>
          </div>

          {/* Storybook / Story Panels — available or coming soon */}
          <div className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center shadow-sm border ${hasReaderContent ? "bg-tropical-green/10 border-tropical-green/25" : "bg-white border-tiki-brown/10"}`}>
            <span className="text-2xl">📖</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">
              {useStorybookPages ? "Storybook" : "Story Panels"}
            </p>
            {hasReaderContent ? (
              <span className="text-xs font-bold text-tropical-green bg-tropical-green/15 px-2 py-0.5 rounded-full">
                Available
              </span>
            ) : (
              <span className="text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
          </div>

          {/* Listen / Read Aloud */}
          <div className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center shadow-sm border ${publicAudio ? "bg-tropical-green/10 border-tropical-green/25" : "bg-pineapple-yellow/20 border-pineapple-yellow/40"}`}>
            <span className="text-2xl">{publicAudio ? "🎧" : "🎙️"}</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">
              {publicAudio ? "Listen" : "Read Aloud"}
            </p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${publicAudio ? "text-tropical-green bg-tropical-green/15" : "text-tiki-brown/60 bg-pineapple-yellow/30"}`}>
              Available
            </span>
          </div>

          {/* Watch — available or coming soon */}
          <div className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center shadow-sm border ${publicClips.length > 0 ? "bg-tropical-green/10 border-tropical-green/25" : "bg-white border-tiki-brown/10"}`}>
            <span className="text-2xl">🎬</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Watch Short</p>
            {publicClips.length > 0 ? (
              <span className="text-xs font-bold text-tropical-green bg-tropical-green/15 px-2 py-0.5 rounded-full">
                Available
              </span>
            ) : (
              <span className="text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
          </div>
        </div>

        {/* ── Today's Lesson ── */}
        <div className="bg-pineapple-yellow/15 border border-pineapple-yellow/45 rounded-3xl px-6 py-5 flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide">
            Today&apos;s Lesson
          </p>
          <p className="text-lg font-black text-tiki-brown leading-snug">
            {lesson || "This story supports kindness, feelings, friendship, and problem-solving."}
          </p>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Talk about this lesson together after reading.
          </p>
        </div>

        {/* ── Grown-Up Guide ── */}
        <div className="bg-tropical-green/8 border border-tropical-green/25 rounded-3xl px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌺</span>
            <p className="text-sm font-black text-tiki-brown">Grown-Up Guide</p>
          </div>
          <p className="text-xs text-tiki-brown/55 leading-relaxed">
            Discussion questions to explore together:
          </p>
          <ul className="flex flex-col gap-2.5">
            {buildDiscussionPrompts(lesson).map((q, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-tropical-green font-black text-sm flex-shrink-0 mt-0.5">
                  {i + 1}.
                </span>
                <p className="text-sm text-tiki-brown/75 leading-relaxed">{q}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* ══════════════════════════════════════════
            READ STORY
        ══════════════════════════════════════════ */}

        {/* About This Story */}
        <PublicSection title="About This Story" icon="📖" id="read-story">
          {shortDesc && (
            <p className="text-sm text-tiki-brown/75 leading-relaxed">{shortDesc}</p>
          )}
          {featuredChars.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">
                Featuring
              </p>
              <p className="text-base font-bold text-tiki-brown leading-snug">{lesson}</p>
            </div>
          )}
        </div>

        {/* ── Full Final Video (public-ready only) ── */}
        {publicFinalVideo && (
          <PublicFinalVideoPlayer video={{ url: publicFinalVideo.url, mimeType: publicFinalVideo.mimeType, durationSeconds: publicFinalVideo.durationSeconds }} />
        )}

        {/* ── Audio Story Player — public-ready audio only ── */}
        {publicAudio && (
          <PublicAudioStoryPlayer audio={publicAudio} title={title} />
        )}

        {/* Scene-by-scene story */}
        {scenes.length > 0 && (
          <PublicSection
            title={`The Story — ${scenes.length} ${scenes.length === 1 ? "Scene" : "Scenes"}`}
            icon="🎬"
          >
            <div className="flex flex-col gap-4">
              {scenes.map((scene, i) => (
                <SceneBlock key={i} scene={scene} index={i} charMap={charMap} />
              ))}
            </div>
          </PublicSection>
        )}

        {scenes.length === 0 && (
          <PublicSection title="Read-Along Dialogue" icon="💬">
            <p className="text-sm text-tiki-brown/60 leading-relaxed">
              Full dialogue version coming soon.
            </p>
          </PublicSection>
        )}

        {/* ══════════════════════════════════════════
            STORYBOOK READER — storybookPages preferred, panels fallback
        ══════════════════════════════════════════ */}

        {storybookReaderPages.length > 0 ? (
          /* ── Premium Storybook Reader (Phase 19B) ── */
          <div
            id="story-panels"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 sm:p-8 flex flex-col gap-6"
          >
            {/* Section header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-tiki-brown flex items-center gap-2">
                  <span aria-hidden>📖</span> Storybook Reader
                </h2>
                <p className="text-sm text-tiki-brown/55 leading-relaxed">
                  Read through the story one beautiful page at a time.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-tropical-green bg-tropical-green/15 px-3 py-1.5 rounded-full">
                {storybookReaderPages.length}{" "}
                {storybookReaderPages.length === 1 ? "page" : "pages"}
              </span>
            </div>

            {/* Premium reader */}
            <StorybookReader pages={storybookReaderPages} episodeTitle={title} />

            {/* Talk about it */}
            {lesson && (
              <div className="flex items-start gap-3 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-5 py-4">
                <span className="text-xl flex-shrink-0" aria-hidden>💬</span>
                <div>
                  <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">
                    Talk About It
                  </p>
                  <p className="text-sm text-tiki-brown/80 leading-relaxed">{lesson}</p>
                </div>
              </div>
            )}
          </div>
        ) : readerPanels.length > 0 ? (
          /* ── Legacy Panel Reader (fallback) ── */
          <div
            id="story-panels"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 sm:p-8 flex flex-col gap-6"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
                  <span aria-hidden>🖼️</span> Picture Story Reader
                </h2>
                <p className="text-sm text-tiki-brown/60 leading-relaxed">
                  Move through the story one illustrated moment at a time.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-tropical-green bg-tropical-green/15 px-3 py-1 rounded-full">
                {readerPanels.length}{" "}
                {readerPanels.length === 1 ? "illustrated panel" : "illustrated panels"}
              </span>
            </div>

            <StoryPanelReader panels={readerPanels} />

            {lesson && (
              <div className="flex items-start gap-3 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-5 py-4">
                <span className="text-xl flex-shrink-0" aria-hidden>💬</span>
                <div>
                  <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">
                    Talk About It
                  </p>
                  <p className="text-sm text-tiki-brown/80 leading-relaxed">{lesson}</p>
                </div>
              </div>
            )}

            <p className="text-xs text-tiki-brown/40 leading-relaxed">
              All story panels are reviewed before appearing here.
            </p>
          </div>
        ) : (
          /* ── Empty state ── */
          <div
            id="story-panels"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
                  <span aria-hidden>📖</span> Storybook Coming Soon
                </h2>
                <p className="text-sm text-tiki-brown/60 leading-relaxed">
                  Beautiful illustrated pages are on the way for this story.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>

            {scenes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scenes.map((scene, i) => (
                  <PanelPlaceholder key={i} scene={scene} index={i} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-28 rounded-2xl bg-tiki-brown/4 border border-tiki-brown/8">
                <p className="text-xs text-tiki-brown/35 font-semibold">
                  Storybook pages are coming soon.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Characters section */}
        {featuredCharacters.length > 0 && (
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
            <h2 className="text-lg font-black text-tiki-brown mb-4">🍉 Characters</h2>
            <div className="flex flex-wrap gap-3">
              {featuredCharacters.map((slug) => {
                const c = charMap[slug];
                return (
                  <Link
                    key={slug}
                    href={`/characters/${slug}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-tiki-brown/12 hover:border-tiki-brown/25 hover:bg-tiki-brown/4 transition-all text-sm font-semibold text-tiki-brown"
                  >
                    {c ? c.shortName : formatCharName(slug)}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Back link */}
        <div className="text-center">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/80 transition-colors"
          >
            ← Explore More Stories
          </Link>
        </div>
      </div>
    </main>
  );
}
