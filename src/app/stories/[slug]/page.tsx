import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, loadPublicSavedEpisodes } from "@/lib/savedEpisodes";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import type { Character } from "@/lib/content";
import StorybookReader, { type StorybookPage } from "@/components/StorybookReader";

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

  // Load character profiles for badges
  const allCharsFromDisk = loadAllCharactersFromDisk();
  const charMap: Record<string, Character> = {};
  for (const c of allCharsFromDisk) charMap[c.slug] = c;

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
            <div className="bg-pineapple-yellow/20 border border-pineapple-yellow/40 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-1">
                Lesson
              </p>
              <p className="text-base font-bold text-tiki-brown leading-snug">{lesson}</p>
            </div>
          )}
        </div>

        {/* Storybook reader */}
        {pages.length > 0 ? (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-black text-tiki-brown">📖 Read the Story</h2>
            <StorybookReader
              pages={pages}
              episodeTitle={title}
              audioUrl={audioUrl}
              videoUrl={videoUrl}
            />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-8 text-center">
            <p className="text-tiki-brown/50 font-semibold">Story coming soon!</p>
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
