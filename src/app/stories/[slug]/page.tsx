import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import { getAllCharacters, type Character } from "@/lib/content";

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

function recArr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is Record<string, unknown> =>
      typeof x === "object" && x !== null && !Array.isArray(x)
  );
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
      {name}
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

  // Character lookup
  const allChars = getAllCharacters();
  const charMap = Object.fromEntries(allChars.map((c) => [c.id, c]));

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
  const scenes =
    recArr(raw.sceneBreakdown).length > 0
      ? recArr(raw.sceneBreakdown)
      : recArr(raw.scenes);
  const merchTieIns = strArr(raw.merchTieIns);

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

        {/* ── Story Mode cards ── */}
        <div className="grid grid-cols-3 gap-3">
          {/* Read Story — active */}
          <div className="flex flex-col items-center gap-2 bg-ube-purple rounded-2xl px-3 py-4 text-center shadow-sm">
            <span className="text-2xl">📖</span>
            <p className="text-xs font-black text-white leading-snug">Read Story</p>
            <span className="text-xs font-bold text-white/70 bg-white/15 px-2 py-0.5 rounded-full">
              Available
            </span>
          </div>

          {/* Story Panels — coming soon */}
          <div className="flex flex-col items-center gap-2 bg-white border border-tiki-brown/10 rounded-2xl px-3 py-4 text-center shadow-sm">
            <span className="text-2xl">🖼️</span>
            <p className="text-xs font-black text-tiki-brown leading-snug">Story Panels</p>
            <span className="text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-2 py-0.5 rounded-full">
              Coming Soon
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

        {/* ── Lesson ── */}
        <LessonBubble lesson={lesson} />

        {/* ── Educational callout ── */}
        <div className="flex items-start gap-3 bg-tropical-green/10 border border-tropical-green/25 rounded-2xl px-5 py-4">
          <span className="text-xl flex-shrink-0">🌺</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            Fruit Baby stories are designed to support kindness, feelings, friendship,
            problem-solving, and playful learning.
          </p>
        </div>

        {/* ══════════════════════════════════════════
            READ STORY
        ══════════════════════════════════════════ */}

        {/* About This Story */}
        {(shortDesc || setting || ageRange || tone) && (
          <PublicSection title="About This Story" icon="📖" id="read-story">
            {shortDesc && (
              <p className="text-sm text-tiki-brown/75 leading-relaxed">{shortDesc}</p>
            )}
            <dl className="flex flex-col gap-2">
              {setting && (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">
                    Setting
                  </dt>
                  <dd className="text-sm text-tiki-brown/75">{setting}</dd>
                </div>
              )}
              {ageRange && (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">
                    Ages
                  </dt>
                  <dd className="text-sm text-tiki-brown/75">{ageRange}</dd>
                </div>
              )}
              {tone && (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">
                    Tone
                  </dt>
                  <dd className="text-sm text-tiki-brown/75">{tone}</dd>
                </div>
              )}
            </dl>
          </PublicSection>
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

        {/* Read-aloud note */}
        <div className="flex items-start gap-3 bg-sky-blue/10 border border-sky-blue/30 rounded-2xl px-5 py-4">
          <span className="text-lg flex-shrink-0">🎙️</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Read-aloud narration and captions are planned for future story releases.
          </p>
        </div>

        {/* ══════════════════════════════════════════
            STORY PANELS — COMING SOON
        ══════════════════════════════════════════ */}

        <div
          id="story-panels"
          className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-black text-tiki-brown flex items-center gap-2">
              <span>🖼️</span> Story Panels
            </h2>
            <span className="flex-shrink-0 text-xs font-bold text-warm-coral/70 bg-warm-coral/10 px-3 py-1 rounded-full">
              Coming Soon
            </span>
          </div>

          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Future approved still-image panels will appear here after artwork is generated,
            reviewed, and approved.
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
            Future approved animation clips will appear here after video generation, review,
            and approval.
          </p>

          {/* Video placeholder */}
          <div className="flex flex-col items-center justify-center gap-4 h-52 bg-gradient-to-br from-tiki-brown/8 via-tiki-brown/5 to-tiki-brown/8 rounded-2xl border border-tiki-brown/10">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/70 border border-tiki-brown/15 shadow-sm">
              <span className="text-3xl ml-1 select-none">▶</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-tiki-brown/45">Video not added yet</p>
              {scenes.length > 0 && (
                <p className="text-xs text-tiki-brown/30 mt-0.5">
                  {scenes.length} planned {scenes.length === 1 ? "clip" : "clips"}
                </p>
              )}
            </div>
          </div>

          <p className="text-xs text-tiki-brown/45 leading-relaxed">
            Some stories may later include animated shorts once official video is approved.
          </p>
        </div>

        {/* ══════════════════════════════════════════
            CHARACTERS & EXTRAS
        ══════════════════════════════════════════ */}

        {/* Featured characters */}
        {featuredChars.length > 0 && (
          <PublicSection title="Characters" icon="🍍">
            <p className="text-sm text-tiki-brown/60 leading-relaxed">
              Featuring official Fruit Baby World characters.
            </p>
            <div className="flex flex-wrap gap-2">
              {featuredChars.map((c) => (
                <Link
                  key={c.id}
                  href={`/characters/${c.slug}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-tiki-brown/10 bg-white hover:border-tiki-brown/25 transition-colors"
                  style={{ backgroundColor: `${c.visualIdentity.primaryColors[0]}15` }}
                >
                  <span className="text-sm font-bold text-tiki-brown">{c.name}</span>
                  <span className="text-xs text-tiki-brown/50">→</span>
                </Link>
              ))}
            </div>
          </PublicSection>
        )}

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
