import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import { getAllCharacters, type Character } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { type StorybookReaderPage, type StorybookNarrationAudioProp } from "@/components/StorybookReader";
import StoryExperienceSwitcher from "@/components/StoryExperienceSwitcher";
import StorybookVideoPlayer from "@/components/StorybookVideoPlayer";
import {
  getActiveEpisodeScenes,
} from "@/lib/episodeScenes";
import {
  getPublicStorybookBookPages,
} from "@/lib/storybookPages";
import {
  getPublicReadyVideoClipsForEpisode,
  type PublicVideoClip,
} from "@/lib/publicVideoClips";
import { getPublicReadyFinalVideo } from "@/lib/publicFinalVideo";
import PublicFinalVideoPlayer from "./components/PublicFinalVideoPlayer";
import { getCoverPageSettings, isCoverPageEnabled } from "@/lib/coverPage";
import CoverPage from "@/components/cover/CoverPage";

// ─── Public eligibility ───────────────────────────────────────────────────────

function isPublicReady(raw: Record<string, unknown>): boolean {
  if (raw.status === "archived" || raw.status === "hidden") return false;
  if (raw.status === "coming-soon") return false;
  const pub =
    typeof raw.publishing === "object" && raw.publishing !== null
      ? (raw.publishing as Record<string, unknown>)
      : null;
  if (pub?.publicStatus === "coming-soon") return false;
  return (
    raw.status === "published" ||
    pub?.readyForPublicSite === true ||
    pub?.publicStatus === "published"
  );
}

function isComingSoon(raw: Record<string, unknown>): boolean {
  if (raw.status === "coming-soon") return true;
  const pub =
    typeof raw.publishing === "object" && raw.publishing !== null
      ? (raw.publishing as Record<string, unknown>)
      : null;
  return pub?.publicStatus === "coming-soon";
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result) return {};
  const { raw } = result;
  if (!isPublicReady(raw) && !isComingSoon(raw)) return {};
  const title = str(raw.title) || slug;
  const description = str(raw.shortDescription) || str(raw.episodeSummary);
  return {
    title: `${title} | Pineapple Baby Stories`,
    ...(description ? { description } : {}),
  };
}

// ─── Static params ────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const episodes = loadPublicSavedEpisodes();
  return episodes.map((e) => ({ slug: e.slug }));
}

// ─── Safe field helpers ───────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v))
    return v
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

// ─── Layout primitives ────────────────────────────────────────────────────────

function PublicSection({
  title,
  icon,
  id,
  children,
}: {
  title: string;
  icon?: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
    >
      <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  );
}

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

// ─── Public audio story player ───────────────────────────────────────────────

type PublicAudio = {
  url: string;
  mimeType: string;
  voiceStyle: string | null;
};

function PublicAudioStoryPlayer({
  audio,
  title,
}: {
  audio: PublicAudio;
  title: string;
}) {
  return (
    <div
      id="listen"
      className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
      aria-labelledby="audio-player-heading"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex flex-col gap-1">
          <h2
            id="audio-player-heading"
            className="text-lg font-black text-tiki-brown flex items-center gap-2"
          >
            <span aria-hidden="true">🎧</span> Listen to the Story
          </h2>
          <p className="text-sm text-tiki-brown/60 leading-relaxed">
            Hear <em>{title}</em> read aloud.
          </p>
        </div>
        <span className="flex-shrink-0 text-xs font-bold text-tropical-green bg-tropical-green/15 px-3 py-1 rounded-full">
          Audio Available
        </span>
      </div>

      {/* Player */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide">
          Full Story Narration
        </p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          controls
          src={audio.url}
          className="w-full rounded-xl"
          aria-label={`Audio narration of ${title}`}
        >
          <p className="text-sm text-tiki-brown/60">
            Your browser does not support the audio element.
          </p>
        </audio>
      </div>

      {/* Voice style hint — only show if safe/friendly value */}
      {audio.voiceStyle && (
        <p className="text-xs text-tiki-brown/45 leading-relaxed">
          Narration style:{" "}
          <span className="font-semibold">
            {audio.voiceStyle.replace(/-/g, " ")}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── Discussion prompts ───────────────────────────────────────────────────────

function buildDiscussionPrompts(lesson: string): string[] {
  const lower = lesson.toLowerCase();
  if (lower.includes("word") || lower.includes("say") || lower.includes("speak") || lower.includes("language")) {
    return [
      "What words in this story helped someone feel better?",
      "Can you think of a kind thing to say to a friend?",
      "How do you think it felt when someone said something unkind?",
      "What could you say differently next time?",
    ];
  }
  if (lower.includes("kind") || lower.includes("help") || lower.includes("share")) {
    return [
      "Who was kind in this story, and how did they show it?",
      "How did it feel to help someone?",
      "When have you helped a friend recently?",
      "What small act of kindness could you do today?",
    ];
  }
  if (lower.includes("feel") || lower.includes("emotion") || lower.includes("sad") || lower.includes("happy")) {
    return [
      "What feelings did you notice in this story?",
      "Which character felt the way you sometimes feel?",
      "What helps you when you feel upset?",
      "How can we tell when a friend needs some extra kindness?",
    ];
  }
  if (lower.includes("friend") || lower.includes("trust") || lower.includes("together")) {
    return [
      "What made the characters good friends to each other?",
      "How did they solve a problem together?",
      "What does it mean to be a true friend?",
      "How can you be a great friend this week?",
    ];
  }
  return [
    "What did the characters feel in this story?",
    "Which words helped someone feel better?",
    "What would you do if this happened to you?",
    "How can friends solve a problem kindly?",
  ];
}

// ─── Animated clip card (public) ─────────────────────────────────────────────

function AnimatedClipCard({ clip }: { clip: PublicVideoClip }) {
  const sceneLabel = clip.sceneTitle ? clip.sceneTitle : `Scene ${clip.sceneNumber}`;
  const ariaLabel = `Animated clip — ${sceneLabel}${clip.durationSeconds ? `, ${clip.durationSeconds} seconds` : ""}`;

  return (
    <div className="flex flex-col gap-3">
      {/* Scene label */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-blue/15 text-sky-blue flex-shrink-0">
          Scene {clip.sceneNumber}
        </span>
        {clip.sceneTitle && (
          <span className="text-sm font-bold text-tiki-brown">{clip.sceneTitle}</span>
        )}
        {clip.durationSeconds && (
          <span className="text-xs text-tiki-brown/40 ml-auto">{clip.durationSeconds}s</span>
        )}
      </div>

      {/* Video player */}
      <video
        src={clip.url}
        controls
        playsInline
        preload="metadata"
        className="w-full rounded-2xl border border-tiki-brown/10 bg-black shadow-sm"
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        Your browser does not support the video element.
      </video>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const coverSettings = getCoverPageSettings();
  if (isCoverPageEnabled(coverSettings)) return <CoverPage settings={coverSettings} />;

  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);

  if (!result) notFound();
  // draft / hidden / archived → 404
  if (!isPublicReady(result.raw) && !isComingSoon(result.raw)) notFound();

  const { raw } = result;

  // ── Coming Soon teaser page ───────────────────────────────────────────────────
  if (isComingSoon(raw)) {
    const title = str(raw.title) || "Untitled Storybook";
    const shortDesc = str(raw.shortDescription) || str(raw.episodeSummary);
    const lesson = str(raw.lesson);
    const storybookPages = Array.isArray(raw.storybookPages)
      ? (raw.storybookPages as Record<string, unknown>[])
      : [];
    const frontCoverUrl = storybookPages.find(
      (p) => p.pageRole === "front-cover" && typeof p.imageUrl === "string"
    )?.imageUrl as string | undefined;
    const featuredCharIds = strArr(raw.featuredCharacters);

    return (
      <div className="flex flex-col bg-bg-cream min-h-screen">
        <section
          className="py-14 px-4 text-center"
          style={{ background: "linear-gradient(160deg, #FFD84D22 0%, #7AC94318 60%, #FFF9ED 100%)" }}
        >
          <div className="max-w-xl mx-auto flex flex-col items-center gap-6">
            {frontCoverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={frontCoverUrl}
                alt={`${title} cover`}
                className="w-44 rounded-2xl shadow-2xl border-2 border-white/60"
              />
            ) : (
              <span className="text-7xl select-none" role="img" aria-label="storybook">📖</span>
            )}
            <div className="flex flex-col items-center gap-3">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-pineapple-yellow/60 text-tiki-brown/80 uppercase tracking-wide">
                🌟 Coming Soon
              </span>
              <h1 className="brand-title-universe-logo text-3xl sm:text-4xl leading-tight text-center">
                {title}
              </h1>
              {shortDesc && (
                <p className="text-base text-tiki-brown/65 leading-relaxed max-w-md">{shortDesc}</p>
              )}
              {lesson && (
                <div className="flex items-center gap-2 bg-pineapple-yellow/30 border border-pineapple-yellow/50 rounded-2xl px-4 py-2.5 max-w-sm">
                  <span className="text-base flex-shrink-0">💡</span>
                  <p className="text-sm font-bold text-tiki-brown leading-snug">{lesson}</p>
                </div>
              )}
              {featuredCharIds.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {featuredCharIds.map((id) => (
                    <span key={id} className="text-sm font-semibold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple/80">
                      {id.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white/80 border border-tiki-brown/10 rounded-3xl px-6 py-5 max-w-sm w-full">
              <p className="text-base font-black text-tiki-brown mb-1">Growing Soon</p>
              <p className="text-sm text-tiki-brown/60 leading-relaxed">
                This Pineapple Baby storybook is being prepared. Check back soon to read the full story!
              </p>
            </div>
            <Link
              href="/stories"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
            >
              ← Back to Stories
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Character lookup — prefer disk-loaded chars so new approved characters resolve correctly
  let diskChars: Character[] = [];
  // getAllCharacters() fallback is legacy (6 originals only); kept as last resort if disk load fails
  try { diskChars = loadAllCharactersFromDisk(); } catch { diskChars = getAllCharacters(); }
  const charMap = Object.fromEntries(diskChars.map((c) => [c.id, c]));

  // Field extraction
  const title = str(raw.title) || "Untitled Episode";
  const shortDesc = str(raw.shortDescription) || str(raw.episodeSummary);
  const lesson = str(raw.lesson);
  const setting = str(raw.setting);
  const tone = str(raw.tone);
  const ageRange = str(raw.targetAgeRange);
  const featuredCharIds = strArr(raw.featuredCharacters);
  const featuredChars = featuredCharIds
    .map((id) => charMap[id])
    .filter((c): c is Character => Boolean(c));

  // Active-only scenes for public display (archived scenes excluded)
  const scenes = getActiveEpisodeScenes(raw);

  // Public-ready animated clips — only shown when visibility === "public-ready"
  const publicClips = getPublicReadyVideoClipsForEpisode(scenes);

  const merchTieIns = strArr(raw.merchTieIns);

  // Public storybook pages for the immersive reader
  const publicStorybookPages = getPublicStorybookBookPages(raw);

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
    pageRole: page.pageRole,
  }));

  // Whether the immersive storybook reader is available
  const hasReaderContent = storybookReaderPages.length > 0;

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

  // Public storybook narration — only shown when visibility is "public" and not archived
  const narrationAudio: StorybookNarrationAudioProp | null = (() => {
    const sn = raw.storybookNarration;
    if (typeof sn !== "object" || sn === null || Array.isArray(sn)) return null;
    const n = sn as Record<string, unknown>;
    if (n.visibility !== "public") return null;
    if (n.status === "archived") return null;

    const mode = n.mode === "sequence" ? ("sequence" as const) : ("single-file" as const);

    // For sequence mode: must have blocks
    if (mode === "sequence") {
      const rawSeq = n.sequence;
      if (typeof rawSeq !== "object" || rawSeq === null || Array.isArray(rawSeq)) return null;
      const seqObj = rawSeq as Record<string, unknown>;
      if (!Array.isArray(seqObj.blocks) || seqObj.blocks.length === 0) return null;

      // Build typed blocks — only include entries with required string fields
      const blocks = (seqObj.blocks as unknown[])
        .filter(
          (b): b is Record<string, unknown> =>
            typeof b === "object" && b !== null && !Array.isArray(b)
        )
        .filter(
          (b) =>
            typeof b.pageId === "string" &&
            typeof b.blockId === "string" &&
            typeof b.audioUrl === "string"
        )
        .map((b, i) => ({
          pageId: b.pageId as string,
          blockId: b.blockId as string,
          speakerSlug: typeof b.speakerSlug === "string" ? b.speakerSlug : "narrator",
          speakerName: typeof b.speakerName === "string" ? b.speakerName : "Narrator",
          audioUrl: b.audioUrl as string,
          pathname: typeof b.pathname === "string" ? b.pathname : undefined,
          sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : i,
        }));

      if (blocks.length === 0) return null;

      // Use first block URL as the audioUrl fallback
      const firstBlockUrl = blocks[0].audioUrl;
      if (!firstBlockUrl.startsWith("https://")) return null;

      return {
        audioUrl: firstBlockUrl,
        title: typeof n.title === "string" ? n.title : undefined,
        mimeType: typeof n.mimeType === "string" ? n.mimeType : "audio/mpeg",
        mode: "sequence" as const,
        sequence: { blocks },
      };
    }

    // single-file mode: must have audioUrl
    if (typeof n.audioUrl !== "string" || !n.audioUrl.startsWith("https://")) return null;
    return {
      audioUrl: n.audioUrl,
      title: typeof n.title === "string" ? n.title : undefined,
      mimeType: typeof n.mimeType === "string" ? n.mimeType : undefined,
      mode: "single-file" as const,
    };
  })();

  // Page-level audio — map of pageId → audioUrl for approved+public items
  const publicPageAudioMap: Record<string, string> = (() => {
    const spa = raw.storybookPageAudio;
    if (typeof spa !== "object" || spa === null || Array.isArray(spa)) return {};
    const config = spa as Record<string, unknown>;
    if (!Array.isArray(config.pages)) return {};
    const map: Record<string, string> = {};
    for (const item of config.pages as unknown[]) {
      if (typeof item !== "object" || item === null) continue;
      const p = item as Record<string, unknown>;
      if (typeof p.pageId !== "string" || typeof p.audioUrl !== "string") continue;
      if (p.status !== "approved" || p.visibility !== "public") continue;
      map[p.pageId] = p.audioUrl;
    }
    return map;
  })();
  const hasAnyPageAudio = Object.keys(publicPageAudioMap).length > 0;

  // Public storybook video/cartoon — shown when visibility is "public" and not archived
  const publicVideo: { videoUrl: string; title?: string; description?: string; posterImageUrl?: string; mimeType?: string } | null = (() => {
    const sv = raw.storybookVideo;
    if (typeof sv !== "object" || sv === null || Array.isArray(sv)) return null;
    const v = sv as Record<string, unknown>;
    if (typeof v.videoUrl !== "string" || !v.videoUrl.startsWith("https://")) return null;
    if (v.visibility !== "public") return null;
    if (v.status === "archived") return null;
    return {
      videoUrl: v.videoUrl,
      title: typeof v.title === "string" ? v.title : undefined,
      description: typeof v.description === "string" ? v.description : undefined,
      posterImageUrl: typeof v.posterImageUrl === "string" ? v.posterImageUrl : undefined,
      mimeType: typeof v.mimeType === "string" ? v.mimeType : undefined,
    };
  })();

  // Front cover image URL — used as fallback poster for video player
  const frontCoverUrl = publicStorybookPages.find((p) => p.pageRole === "front-cover")?.imageUrl;

  // Public-ready full final video — only shown when visibility === "public-ready"
  const publicFinalVideo = getPublicReadyFinalVideo(raw);

  // Gradient colors from featured characters
  const heroColorA = featuredChars[0]?.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const heroColorB = featuredChars[1]?.visualIdentity.primaryColors[0] ?? "#7AC943";

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── Hero ── */}
      <section
        className="py-12 px-4"
        style={{
          background: `linear-gradient(160deg, ${heroColorA}30 0%, ${heroColorB}18 60%, #FFF9ED 100%)`,
        }}
      >
        <div className={`max-w-4xl mx-auto flex gap-8 sm:gap-12 ${frontCoverUrl ? "flex-col sm:flex-row items-center" : "flex-col items-center text-center"}`}>

          {/* Front cover image */}
          {frontCoverUrl && (
            <div className="flex-shrink-0 w-44 sm:w-52">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={frontCoverUrl}
                alt={`${title} cover`}
                className="w-full rounded-2xl shadow-2xl border-2 border-white/60"
              />
            </div>
          )}

          {/* Title & meta */}
          <div className={`flex flex-col gap-4 ${frontCoverUrl ? "sm:flex-1" : "max-w-2xl"}`}>
            {!frontCoverUrl && (
              <span className="text-5xl select-none" role="img" aria-label="story">📖</span>
            )}

            <h1 className="brand-title-universe-logo text-3xl sm:text-5xl leading-tight">
              {title}
            </h1>

            {shortDesc && (
              <p className={`text-base sm:text-lg text-tiki-brown/70 leading-relaxed ${frontCoverUrl ? "" : "max-w-xl"}`}>
                {shortDesc}
              </p>
            )}

            {/* Character badges */}
            {featuredChars.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${frontCoverUrl ? "" : "justify-center"}`}>
                {featuredChars.map((c) => (
                  <CharBadge key={c.id} char={c} />
                ))}
              </div>
            )}

            {/* Audio callout + Read Storybook CTA */}
            {hasReaderContent ? (
              <div className={`flex flex-col gap-3 ${frontCoverUrl ? "" : "items-center"}`}>
                {/* Prominent audio callout */}
                {(narrationAudio || hasAnyPageAudio) && (
                  <div className={`flex items-center gap-3 bg-ube-purple/10 border border-ube-purple/20 rounded-2xl px-4 py-3 ${frontCoverUrl ? "self-start" : ""}`}>
                    <span className="text-xl flex-shrink-0" aria-hidden="true">🎧</span>
                    <div>
                      <p className="text-xs font-black text-ube-purple leading-tight">Audio Available</p>
                      <p className="text-xs text-tiki-brown/60 leading-snug mt-0.5">Read-aloud audio is included in the storybook reader.</p>
                    </div>
                  </div>
                )}
                {/* Primary CTA */}
                <div className={`flex flex-col gap-1.5 ${frontCoverUrl ? "items-start" : "items-center"}`}>
                  <a
                    href="#open-reader"
                    className="flex items-center gap-2 text-sm font-black px-6 py-3.5 rounded-2xl bg-ube-purple text-white hover:bg-ube-purple/90 transition-colors shadow-md"
                  >
                    <span aria-hidden>📖</span> Read Storybook
                  </a>
                  <p className="text-xs text-tiki-brown/50 leading-relaxed">
                    {(narrationAudio || hasAnyPageAudio)
                      ? "Open the reader to read or listen page by page."
                      : "Open the storybook reader."}
                  </p>
                </div>
                {/* Watch Cartoon secondary CTA */}
                {publicVideo && (
                  <a
                    href="#watch-story"
                    className={`flex items-center gap-2 text-sm font-black px-5 py-3 rounded-2xl bg-white border border-tropical-green/30 text-tropical-green hover:bg-tropical-green/8 transition-colors ${frontCoverUrl ? "" : "self-center"}`}
                  >
                    <span aria-hidden>🎬</span> Watch Cartoon
                  </a>
                )}
              </div>
            ) : (
              <p className={`text-sm text-tiki-brown/50 italic ${frontCoverUrl ? "" : "text-center"}`}>
                This storybook is coming soon.
              </p>
            )}

            {/* Meta pills */}
            <div className={`flex flex-wrap gap-2 text-xs font-semibold text-tiki-brown/60 ${frontCoverUrl ? "" : "justify-center"}`}>
              {setting && (
                <span className="flex items-center gap-1 bg-white/60 border border-tiki-brown/10 px-3 py-1 rounded-full">
                  📍 {setting}
                </span>
              )}
              {ageRange && (
                <span className="flex items-center gap-1 bg-white/60 border border-tiki-brown/10 px-3 py-1 rounded-full">
                  🎒 {ageRange}
                </span>
              )}
              {tone && (
                <span className="flex items-center gap-1 bg-white/60 border border-tiki-brown/10 px-3 py-1 rounded-full">
                  ✨ {tone}
                </span>
              )}
            </div>

            {/* Lesson pill */}
            {lesson && (
              <div className={`flex items-center gap-2 bg-pineapple-yellow/40 border border-pineapple-yellow/60 rounded-2xl px-4 py-2.5 max-w-sm ${frontCoverUrl ? "" : "self-center text-center"}`}>
                <span className="text-base flex-shrink-0">💡</span>
                <p className="text-sm font-bold text-tiki-brown leading-snug">{lesson}</p>
              </div>
            )}
          </div>
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

        {/* ── Full Final Video (public-ready only) ── */}
        {publicFinalVideo && (
          <PublicFinalVideoPlayer video={{ url: publicFinalVideo.url, mimeType: publicFinalVideo.mimeType, durationSeconds: publicFinalVideo.durationSeconds }} />
        )}

        {/* ── Audio Story Player — public-ready audio only ── */}
        {publicAudio && (
          <PublicAudioStoryPlayer audio={publicAudio} title={title} />
        )}

        {/* ══════════════════════════════════════════
            IMMERSIVE READER — mounted for hash-triggered overlay
            (not rendered inline; FocusModeReader is position:fixed)
        ══════════════════════════════════════════ */}

        {storybookReaderPages.length > 0 && (
          <div className="h-0 overflow-hidden" aria-hidden="true">
            <StoryExperienceSwitcher
              pages={storybookReaderPages}
              episodeTitle={title}
              backHref="/stories"
              narrationAudio={narrationAudio ?? undefined}
              fallbackPosterUrl={frontCoverUrl}
              immersiveOnly={true}
              pageAudioMap={hasAnyPageAudio ? publicPageAudioMap : undefined}
            />
          </div>
        )}

        {/* ══════════════════════════════════════════
            WATCH THE CARTOON — public video, shown inline
        ══════════════════════════════════════════ */}

        {publicVideo && (
          <div
            id="watch-story"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
          >
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-black text-tiki-brown flex items-center gap-2">
                  <span aria-hidden>🎬</span> Watch the Cartoon
                </h2>
                <p className="text-sm text-tiki-brown/55 leading-relaxed">
                  Enjoy the animated version of this story.
                </p>
              </div>
            </div>
            <StorybookVideoPlayer video={publicVideo} fallbackPosterUrl={frontCoverUrl} />
          </div>
        )}

        {/* ══════════════════════════════════════════
            WATCH THE ANIMATED MOMENTS
            Only shown when public-ready clips exist
        ══════════════════════════════════════════ */}

        {publicClips.length > 0 && (
          <div
            id="animated-moments"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-6"
          >
            {/* Section header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
                  <span>🎬</span> Watch the Animated Moments
                </h2>
                <p className="text-sm text-tiki-brown/60 leading-relaxed">
                  Enjoy short cartoon-style moments from this story.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-tropical-green bg-tropical-green/15 px-3 py-1 rounded-full">
                {publicClips.length} {publicClips.length === 1 ? "animated clip" : "animated clips"}
              </span>
            </div>

            {/* Clip cards */}
            <div className="flex flex-col gap-6">
              {publicClips.map((clip) => (
                <AnimatedClipCard key={clip.id} clip={clip} />
              ))}
            </div>

            <p className="text-xs text-tiki-brown/40 leading-relaxed">
              All animated clips are reviewed and approved before appearing here.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            EXTRAS
        ══════════════════════════════════════════ */}

        {/* Merch tie-ins */}
        {merchTieIns.length > 0 && (
          <PublicSection title="Inspired Products Coming Soon" icon="🎁">
            <p className="text-xs text-tiki-brown/50 leading-relaxed">
              Products inspired by this story are in development.
            </p>
            <ul className="flex flex-col gap-2">
              {merchTieIns.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-tiki-brown/70 leading-relaxed"
                >
                  <span className="text-tiki-brown/30 flex-shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </PublicSection>
        )}

        {/* ══════════════════════════════════════════
            FOOTER NAVIGATION
        ══════════════════════════════════════════ */}

        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-tiki-brown/10">
          <Link
            href="/stories"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            ← Back to Stories
          </Link>
          <div className="flex gap-4">
            <Link
              href="/characters"
              className="text-sm font-semibold text-tiki-brown/60 hover:text-tiki-brown transition-colors"
            >
              Meet the Characters →
            </Link>
            <Link
              href="/shop"
              className="text-sm font-semibold text-tiki-brown/60 hover:text-tiki-brown transition-colors"
            >
              Explore the Shop →
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}
