import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import { getAllCharacters, type Character } from "@/lib/content";

// ─── Public eligibility ───────────────────────────────────────────────────────

function isPublicReady(raw: Record<string, unknown>): boolean {
  const pub = typeof raw.publishing === "object" && raw.publishing !== null
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

// ─── Static params (public-ready episodes only) ───────────────────────────────

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
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-5">
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
      <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-1">Lesson</p>
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

// ─── Dialogue line parser ─────────────────────────────────────────────────────

function DialogueLine({ line }: { line: string }) {
  const colonIdx = line.indexOf(":");
  if (colonIdx > 0 && colonIdx < 40) {
    const speaker = line.slice(0, colonIdx).trim();
    const text = line.slice(colonIdx + 1).trim();
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs font-bold text-ube-purple uppercase tracking-wide">{speaker}</span>
        <p className="text-sm text-tiki-brown/80 leading-relaxed pl-3 border-l-2 border-ube-purple/20">
          {text}
        </p>
      </div>
    );
  }
  return <p className="text-sm text-tiki-brown/80 leading-relaxed italic">{line}</p>;
}

// ─── Scene card ───────────────────────────────────────────────────────────────

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
      {/* Scene header */}
      <div className="bg-gradient-to-r from-ube-purple/8 to-transparent px-5 py-3 flex items-center gap-3">
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-ube-purple/15 text-ube-purple flex-shrink-0">
          Scene {String(num)}
        </span>
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Summary */}
        {summary && (
          <p className="text-sm text-tiki-brown/75 leading-relaxed">{summary}</p>
        )}

        {/* Characters in scene */}
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

        {/* Emotional beat */}
        {emotionalBeat && (
          <p className="text-xs font-semibold text-tropical-green/80 italic">{emotionalBeat}</p>
        )}

        {/* Dialogue */}
        {dialogue.length > 0 && (
          <div className="flex flex-col gap-3 bg-sky-blue/10 rounded-xl p-4">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">Read Along</p>
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
  const featuredChars = featuredCharIds.map((id) => charMap[id]).filter((c): c is Character => Boolean(c));
  const scenes = recArr(raw.sceneBreakdown).length > 0 ? recArr(raw.sceneBreakdown) : recArr(raw.scenes);
  const merchTieIns = strArr(raw.merchTieIns);

  // Top-level dialogue is notes-only in this episode — skip it for public display.
  // Scene-level dialogue is shown inside each SceneBlock.

  // Gradient for hero based on featured characters
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
          <span className="text-5xl select-none" role="img" aria-label="story">🎬</span>

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
      <section className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-10 flex flex-col gap-6">

        {/* Back link */}
        <Link
          href="/stories"
          className="self-start inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
        >
          ← Back to Stories
        </Link>

        {/* Lesson */}
        <LessonBubble lesson={lesson} />

        {/* Overview */}
        {(shortDesc || setting || ageRange || tone) && (
          <PublicSection title="About This Story" icon="📖">
            {shortDesc && (
              <p className="text-sm text-tiki-brown/75 leading-relaxed">{shortDesc}</p>
            )}
            <dl className="flex flex-col gap-2">
              {setting && (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Setting</dt>
                  <dd className="text-sm text-tiki-brown/75">{setting}</dd>
                </div>
              )}
              {ageRange && (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Ages</dt>
                  <dd className="text-sm text-tiki-brown/75">{ageRange}</dd>
                </div>
              )}
              {tone && (
                <div className="grid grid-cols-[7rem_1fr] gap-2 items-baseline">
                  <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">Tone</dt>
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

        {/* Dialogue coming soon (if no scene-level dialogue was available) */}
        {scenes.length === 0 && (
          <PublicSection title="Read-Along Dialogue" icon="💬">
            <p className="text-sm text-tiki-brown/60 leading-relaxed">
              Full dialogue version coming soon.
            </p>
          </PublicSection>
        )}

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
                <li key={i} className="flex items-start gap-2 text-sm text-tiki-brown/70 leading-relaxed">
                  <span className="text-tiki-brown/30 flex-shrink-0 mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </PublicSection>
        )}

        {/* Coming soon — media note */}
        <div className="flex items-start gap-3 bg-sky-blue/15 border border-sky-blue/40 rounded-2xl px-5 py-4">
          <span className="text-xl flex-shrink-0">🎬</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Still-image story panels and animated video will be added after media assets are
            generated and approved.
          </p>
        </div>

        {/* Footer back link */}
        <div className="pt-2">
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
