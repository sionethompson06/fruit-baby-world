import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import { getAllCharacters, type Character } from "@/lib/content";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import StoryPanelReader, { type ReaderPanel } from "@/components/StoryPanelReader";
import {
  getActiveEpisodeScenes,
  getApprovedPublicStoryPanels,
  type ApprovedPanel,
} from "@/lib/episodeScenes";

// ─── Public eligibility ───────────────────────────────────────────────────────

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

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result || !isPublicReady(result.raw)) return {};
  const { raw } = result;
  const title = str(raw.title) || slug;
  const description = str(raw.shortDescription) || str(raw.episodeSummary);
  return {
    title: `${title} | Fruit Baby World Stories`,
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

function formatCharName(slug: string): string {
  const overrides: Record<string, string> = {
    tiki: "Tiki Trouble",
    "tiki-trouble": "Tiki Trouble",
  };
  if (overrides[slug]) return overrides[slug];
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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

function LessonBubble({ lesson }: { lesson: string }) {
  if (!lesson) return null;
  return (
    <div className="bg-pineapple-yellow/20 border border-pineapple-yellow/40 rounded-2xl px-5 py-4">
      <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-1">
        Lesson
      </p>
      <p className="text-base font-bold text-tiki-brown leading-snug">{lesson}</p>
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

function CharNameBadge({ name }: { name: string }) {
  return (
    <span className="text-sm font-semibold px-3 py-1.5 rounded-full bg-ube-purple/10 text-ube-purple">
      {formatCharName(name)}
    </span>
  );
}

// ─── Dialogue line ────────────────────────────────────────────────────────────

function DialogueLine({ line }: { line: string }) {
  const colonIdx = line.indexOf(":");
  if (colonIdx > 0 && colonIdx < 40) {
    const speaker = line.slice(0, colonIdx).trim();
    const text = line.slice(colonIdx + 1).trim();
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-ube-purple uppercase tracking-wide">
          {speaker}
        </span>
        <p className="text-sm text-tiki-brown/80 leading-relaxed pl-3 border-l-2 border-ube-purple/20">
          {text}
        </p>
      </div>
    );
  }
  return (
    <p className="text-sm text-tiki-brown/80 leading-relaxed italic">{line}</p>
  );
}

// ─── Read Story scene block ───────────────────────────────────────────────────

function SceneBlock({
  scene,
  index,
  charMap,
}: {
  scene: Record<string, unknown>;
  index: number;
  charMap: Record<string, Character>;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const chars = strArr(scene.characters);
  const dialogue = strArr(scene.dialogueDraft);
  const emotionalBeat = str(scene.emotionalBeat);

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-ube-purple/8 to-transparent px-5 py-3 flex items-center gap-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/15 text-ube-purple flex-shrink-0">
          Scene {String(num)}
        </span>
        {title && (
          <span className="text-sm font-bold text-tiki-brown">{title}</span>
        )}
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {summary && (
          <p className="text-sm text-tiki-brown/75 leading-relaxed">{summary}</p>
        )}

        {chars.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chars.map((id) => {
              const c = charMap[id];
              return c ? (
                <CharBadge key={id} char={c} />
              ) : (
                <CharNameBadge key={id} name={id} />
              );
            })}
          </div>
        )}

        {emotionalBeat && (
          <p className="text-xs font-semibold text-tropical-green/80 italic">
            {emotionalBeat}
          </p>
        )}

        {dialogue.length > 0 && (
          <div className="flex flex-col gap-3 bg-sky-blue/10 rounded-xl p-4">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
              Read Along
            </p>
            <div className="flex flex-col gap-3">
              {dialogue.map((line, i) => (
                <DialogueLine key={i} line={line} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Story panel placeholder card ────────────────────────────────────────────

function PanelPlaceholder({
  scene,
  index,
}: {
  scene: Record<string, unknown>;
  index: number;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);

  return (
    <div className="border border-tiki-brown/10 rounded-2xl overflow-hidden flex flex-col">
      {/* Placeholder panel area */}
      <div className="flex items-center justify-center h-36 bg-gradient-to-br from-pineapple-yellow/15 via-sky-blue/10 to-tropical-green/10 border-b border-tiki-brown/8">
        <div className="flex flex-col items-center gap-2 text-center px-4">
          <span className="text-3xl select-none">🖼️</span>
          <span className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide">
            Artwork not added yet
          </span>
        </div>
      </div>

      {/* Panel info */}
      <div className="px-4 py-3 flex flex-col gap-1 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/60">
            Panel {String(num)}
          </span>
          {title && (
            <span className="text-xs font-bold text-tiki-brown/70">{title}</span>
          )}
        </div>
        {summary && (
          <p className="text-xs text-tiki-brown/55 leading-relaxed line-clamp-2">
            {summary}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Approved story panel card ───────────────────────────────────────────────

function ApprovedPanelCard({
  panel,
  scene,
  charMap,
}: {
  panel: ApprovedPanel;
  scene?: Record<string, unknown>;
  charMap: Record<string, Character>;
}) {
  const sceneTitle = str(scene?.title) || panel.panelTitle;
  const sceneSummary = str(scene?.summary);
  const chars = strArr(scene?.characters ?? panel.referenceCharacters);
  const altText =
    panel.asset.alt ||
    `Illustrated story panel for Scene ${panel.sceneNumber}: ${sceneTitle}`;

  return (
    <div className="rounded-3xl overflow-hidden flex flex-col shadow-md bg-white border border-tiki-brown/10">
      {/* Panel image — full width, aspect-ratio preserving */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={panel.asset.url}
        alt={altText}
        className="w-full block"
      />

      {/* Panel info — warm cream card */}
      <div className="px-6 py-5 flex flex-col gap-3 bg-pineapple-yellow/5 border-t border-tiki-brown/8">
        {/* Scene number + title */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/15 text-ube-purple flex-shrink-0">
            Scene {panel.sceneNumber}
          </span>
          {sceneTitle && (
            <span className="text-sm font-black text-tiki-brown leading-snug">
              {sceneTitle}
            </span>
          )}
        </div>

        {/* Scene summary */}
        {sceneSummary && (
          <p className="text-sm text-tiki-brown/75 leading-relaxed">
            {sceneSummary}
          </p>
        )}

        {/* Character badges */}
        {chars.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chars.map((id) => {
              const c = charMap[id];
              return c ? (
                <CharBadge key={id} char={c} />
              ) : (
                <CharNameBadge key={id} name={id} />
              );
            })}
          </div>
        )}

        {/* Public caption */}
        {panel.caption && (
          <p className="text-xs text-tiki-brown/55 leading-relaxed italic border-t border-tiki-brown/8 pt-2">
            {panel.caption}
          </p>
        )}
      </div>
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

// ─── Read-Aloud Mode helpers ──────────────────────────────────────────────────

const READING_CUES = [
  "Use a warm, slow voice for this scene.",
  "Pause after each line to let the feelings land.",
  "Try giving each character a slightly different voice.",
  "Read this part gently — it's an emotional moment.",
  "Make eye contact with your child after reading this scene.",
  "Slow down here — this is the heart of the story.",
  "Use a cheerful, hopeful tone for this scene.",
  "Read with curiosity — let your child wonder along with you.",
];

const REFLECTION_QUESTIONS_BASE = [
  "What do you think {character} was feeling in this part?",
  "Has something like this ever happened to you?",
  "What would you do if you were in this story?",
  "Why do you think that moment was important?",
  "How did the characters help each other here?",
  "What do you think will happen next?",
  "If you could talk to one of the characters, what would you say?",
  "What feeling word fits this part of the story?",
];

function buildReadingCue(sceneIndex: number): string {
  return READING_CUES[sceneIndex % READING_CUES.length];
}

function buildReflectionQuestion(sceneIndex: number, lesson: string): string {
  const base = REFLECTION_QUESTIONS_BASE[sceneIndex % REFLECTION_QUESTIONS_BASE.length];
  if (lesson && sceneIndex === REFLECTION_QUESTIONS_BASE.length - 1) {
    return `Today's lesson is: "${lesson}" — what does that mean to you?`;
  }
  return base.replace("{character}", "one of the characters");
}

function deriveNarration(scene: Record<string, unknown>): string {
  const summary = str(scene.summary);
  if (summary) return summary;
  const title = str(scene.title);
  if (title) return `Scene: ${title}`;
  return "The story continues…";
}

// ─── Read-Aloud components ────────────────────────────────────────────────────

function ReadAloudSceneCard({
  scene,
  index,
  lesson,
}: {
  scene: Record<string, unknown>;
  index: number;
  lesson: string;
}) {
  const sceneNumber = Number(scene.sceneNumber) || index + 1;
  const title = str(scene.title);
  const narration = deriveNarration(scene);
  const dialogue = strArr(scene.dialogueDraft);
  const readingCue = buildReadingCue(index);
  const reflectionQ = buildReflectionQuestion(index, lesson);

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
      {/* Scene header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-ube-purple text-white text-xs font-black flex-shrink-0">
          {sceneNumber}
        </div>
        {title && (
          <h3 className="text-sm font-black text-tiki-brown leading-snug">{title}</h3>
        )}
      </div>

      {/* Narration text */}
      <p className="text-base text-tiki-brown/80 leading-relaxed font-medium">{narration}</p>

      {/* First dialogue line as a read-along hint */}
      {dialogue.length > 0 && (
        <div className="flex items-start gap-2.5 bg-sky-blue/8 border border-sky-blue/20 rounded-2xl px-4 py-3">
          <span className="text-base flex-shrink-0">💬</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed italic">
            {dialogue[0]}
          </p>
        </div>
      )}

      {/* Reading cue */}
      <div className="flex items-start gap-2.5 bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-4 py-3">
        <span className="text-base flex-shrink-0">🎙️</span>
        <p className="text-sm font-semibold text-tiki-brown/65 leading-relaxed">{readingCue}</p>
      </div>

      {/* Reflection question */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-4 py-3">
        <span className="text-base flex-shrink-0">🌟</span>
        <div>
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-1">
            Reflection
          </p>
          <p className="text-sm text-tiki-brown/80 leading-relaxed">{reflectionQ}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StoryDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);

  if (!result || !isPublicReady(result.raw)) notFound();

  const { raw } = result;

  // Character lookup — prefer disk-loaded chars so new approved characters resolve correctly
  let diskChars: Character[] = [];
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

  const merchTieIns = strArr(raw.merchTieIns);

  // Approved public story panels (archived scenes excluded by shared helper)
  const approvedPanels = getApprovedPublicStoryPanels(raw);
  const sceneByNumber = Object.fromEntries(scenes.map((s) => [Number(s.sceneNumber) || 0, s]));

  // Build flat reader panel data for the client component
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

  // Gradient colors from featured characters
  const heroColorA = featuredChars[0]?.visualIdentity.primaryColors[0] ?? "#FFD84D";
  const heroColorB = featuredChars[1]?.visualIdentity.primaryColors[0] ?? "#7AC943";

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* ── Hero ── */}
      <section
        className="py-14 px-4 text-center"
        style={{
          background: `linear-gradient(160deg, ${heroColorA}30 0%, ${heroColorB}18 60%, #FFF9ED 100%)`,
        }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center gap-4">
          <span className="text-5xl select-none" role="img" aria-label="story">
            📖
          </span>

          <h1 className="text-3xl sm:text-5xl font-black text-tiki-brown leading-tight">
            {title}
          </h1>

          {shortDesc && (
            <p className="text-base sm:text-lg text-tiki-brown/70 leading-relaxed max-w-xl">
              {shortDesc}
            </p>
          )}

          {/* Character badges */}
          {featuredChars.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-1">
              {featuredChars.map((c) => (
                <CharBadge key={c.id} char={c} />
              ))}
            </div>
          )}

          {/* Meta pills */}
          <div className="flex flex-wrap justify-center gap-2 text-xs font-semibold text-tiki-brown/60">
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
          <a
            href="#animated-short"
            className="text-xs font-semibold px-3 py-1.5 rounded-full bg-white border border-tiki-brown/15 text-tiki-brown/65 hover:text-tiki-brown hover:border-tiki-brown/30 transition-colors"
          >
            🎬 Animated Short
          </a>
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

          {/* Story Panels — available or coming soon */}
          <div className={`flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-center shadow-sm border ${approvedPanels.length > 0 ? "bg-tropical-green/10 border-tropical-green/25" : "bg-white border-tiki-brown/10"}`}>
            <span className="text-2xl">🖼️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Story Panels</p>
            {approvedPanels.length > 0 ? (
              <span className="text-xs font-bold text-tropical-green bg-tropical-green/15 px-2 py-0.5 rounded-full">
                Available
              </span>
            ) : (
              <span className="text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-2 py-0.5 rounded-full">
                Coming Soon
              </span>
            )}
          </div>

          {/* Read Aloud — active */}
          <div className="flex flex-col items-center gap-2 bg-pineapple-yellow/20 border border-pineapple-yellow/40 rounded-2xl px-3 py-4 text-center shadow-sm">
            <span className="text-2xl">🎙️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Read Aloud</p>
            <span className="text-xs font-bold text-tiki-brown/60 bg-pineapple-yellow/30 px-2 py-0.5 rounded-full">
              Available
            </span>
          </div>

          {/* Watch — coming soon */}
          <div className="flex flex-col items-center gap-2 bg-white border border-tiki-brown/10 rounded-2xl px-3 py-4 text-center shadow-sm">
            <span className="text-2xl">🎬</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Watch Short</p>
            <span className="text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-2 py-0.5 rounded-full">
              Coming Soon
            </span>
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
              <div className="flex flex-wrap gap-2">
                {featuredChars.map((c) => (
                  <Link
                    key={c.id}
                    href={`/characters/${c.slug}`}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-tiki-brown/10 hover:border-tiki-brown/25 transition-colors"
                    style={{ backgroundColor: `${c.visualIdentity.primaryColors[0]}18` }}
                  >
                    <span className="text-sm font-bold text-tiki-brown">{c.shortName}</span>
                    <span className="text-xs text-tiki-brown/45">→</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {!shortDesc && featuredChars.length === 0 && (
            <p className="text-sm text-tiki-brown/55 leading-relaxed">
              A Fruit Baby World story for young readers.
            </p>
          )}
        </PublicSection>

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
            STORY PANELS — approved or coming soon
        ══════════════════════════════════════════ */}

        {approvedPanels.length > 0 ? (
          <div
            id="story-panels"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-6"
          >
            {/* Section header */}
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
                  <span>🖼️</span> Picture Story Reader
                </h2>
                <p className="text-sm text-tiki-brown/60 leading-relaxed">
                  Move through the story one illustrated moment at a time.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-tropical-green bg-tropical-green/15 px-3 py-1 rounded-full">
                {approvedPanels.length}{" "}
                {approvedPanels.length === 1 ? "illustrated panel" : "illustrated panels"}
              </span>
            </div>

            {/* Interactive reader */}
            <StoryPanelReader panels={readerPanels} />

            {/* Talk about it */}
            {lesson && (
              <div className="flex items-start gap-3 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-5 py-4">
                <span className="text-xl flex-shrink-0">💬</span>
                <div>
                  <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">
                    Talk About It
                  </p>
                  <p className="text-sm text-tiki-brown/80 leading-relaxed">
                    {lesson}
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-tiki-brown/40 leading-relaxed">
              All story panels are reviewed before appearing here.
            </p>
          </div>
        ) : (
          <div
            id="story-panels"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
                  <span>🖼️</span> Illustrated Story Panels
                </h2>
                <p className="text-sm text-tiki-brown/60 leading-relaxed">
                  Read the story through approved illustrated moments.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-3 py-1 rounded-full">
                Coming Soon
              </span>
            </div>

            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Illustrated story panels will appear here once artwork has been reviewed and approved.
            </p>

            {scenes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {scenes.map((scene, i) => (
                  <PanelPlaceholder key={i} scene={scene} index={i} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-28 rounded-2xl bg-tiki-brown/4 border border-tiki-brown/8">
                <p className="text-xs text-tiki-brown/35 font-semibold">
                  No scenes available yet
                </p>
              </div>
            )}

            <p className="text-xs text-tiki-brown/45 leading-relaxed">
              Some stories may later include still-image panels once official artwork is approved.
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            READ-ALOUD STORY MODE
        ══════════════════════════════════════════ */}

        {scenes.length > 0 && (
          <div
            id="read-aloud"
            className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-6"
          >
            {/* Section header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
                  <span>🎙️</span> Read-Aloud Mode
                </h2>
                <p className="text-sm text-tiki-brown/60 leading-relaxed">
                  Read the story out loud with gentle pacing, expression, and reflection questions.
                </p>
              </div>
              <span className="flex-shrink-0 text-xs font-bold text-tiki-brown/60 bg-pineapple-yellow/25 px-3 py-1 rounded-full">
                {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
              </span>
            </div>

            {/* Guide card */}
            <div className="bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-2xl p-5 flex flex-col gap-3">
              <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide">
                Reader&apos;s Guide
              </p>
              <dl className="flex flex-col gap-2">
                <div className="grid grid-cols-[8rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Suggested reader</dt>
                  <dd className="text-sm text-tiki-brown/75">Adult or older child reading aloud</dd>
                </div>
                <div className="grid grid-cols-[8rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Pacing</dt>
                  <dd className="text-sm text-tiki-brown/75">Slow and expressive — pause between scenes</dd>
                </div>
                {lesson && (
                  <div className="grid grid-cols-[8rem_1fr] gap-2 items-baseline">
                    <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Focus skill</dt>
                    <dd className="text-sm text-tiki-brown/75">{lesson}</dd>
                  </div>
                )}
                <div className="grid grid-cols-[8rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Audio</dt>
                  <dd className="text-sm text-tiki-brown/75">Coming later — read together for now</dd>
                </div>
              </dl>
            </div>

            {/* No-audio notice */}
            <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-2xl px-5 py-4">
              <span className="text-lg flex-shrink-0">🔇</span>
              <p className="text-sm text-tiki-brown/60 leading-relaxed">
                Audio narration is not active yet. This read-aloud mode is designed for adults
                and children to read together.
              </p>
            </div>

            {/* Scene cards */}
            <div className="flex flex-col gap-5">
              {scenes.map((scene, i) => (
                <ReadAloudSceneCard key={i} scene={scene} index={i} lesson={lesson} />
              ))}
            </div>

            {/* Closing lesson reflection */}
            {lesson && (
              <div className="flex items-start gap-3 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-2xl px-5 py-4">
                <span className="text-xl flex-shrink-0">💛</span>
                <div>
                  <p className="text-xs font-bold text-tiki-brown/55 uppercase tracking-wide mb-1">
                    After the Story
                  </p>
                  <p className="text-sm text-tiki-brown/80 leading-relaxed">
                    Today&apos;s lesson: {lesson}. Take a moment to talk about it together.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════
            WATCH ANIMATED SHORT — COMING SOON
        ══════════════════════════════════════════ */}

        <div
          id="animated-short"
          className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
              <span>🎬</span> Watch Animated Short
            </h2>
            <span className="flex-shrink-0 text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-3 py-1 rounded-full">
              Coming Soon
            </span>
          </div>

          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Animated story clips are planned for future releases after video assets are
            created, reviewed, and approved.
          </p>

          {/* Video placeholder */}
          <div className="flex flex-col items-center justify-center gap-4 h-44 bg-gradient-to-br from-pineapple-yellow/8 via-sky-blue/6 to-tropical-green/8 rounded-2xl border border-tiki-brown/8">
            <span className="text-5xl select-none" aria-hidden="true">🎬</span>
            <div className="text-center">
              <p className="text-sm font-bold text-tiki-brown/45">Animation coming later</p>
              {scenes.length > 0 && (
                <p className="text-xs text-tiki-brown/30 mt-0.5">
                  {scenes.length} planned {scenes.length === 1 ? "scene" : "scenes"}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-tiki-brown/40 leading-relaxed">
            All animated clips will be reviewed and approved before appearing here.
          </p>
        </div>

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
