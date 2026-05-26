import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import AddSceneSection from "./AddSceneSection";
import EditSceneSection, { type SceneForEdit } from "./EditSceneSection";
import ArchiveSceneSection, { type SceneForArchive } from "./ArchiveSceneSection";
import PublicStatusCard from "./PublicStatusCard";
import EpisodeUploadClient, { type SceneUploadState } from "./EpisodeUploadClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result) return {};
  const title = str(result.raw.title) || slug;
  return { title: `${title} — Admin | Fruit Baby World` };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strArr(v: unknown): string[] {
  if (Array.isArray(v))
    return v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean);
  return [];
}

function getRawScenes(raw: Record<string, unknown>): Record<string, unknown>[] {
  const fromBreakdown = Array.isArray(raw.sceneBreakdown) ? raw.sceneBreakdown as Record<string, unknown>[] : [];
  if (fromBreakdown.length > 0) return fromBreakdown;
  return Array.isArray(raw.scenes) ? raw.scenes as Record<string, unknown>[] : [];
}

function getActiveScenes(raw: Record<string, unknown>): Record<string, unknown>[] {
  return getRawScenes(raw).filter((s) => str(s.status) !== "archived");
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminEpisodePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result) notFound();

  const { raw, normalised } = result;
  const title = str(raw.title) || slug;
  const shortDescription = str(raw.shortDescription) || str(raw.episodeSummary);
  const lesson = str(raw.lesson);
  const setting = str(raw.setting);
  const featuredCharacters = strArr(raw.featuredCharacters);
  const coverImage = str(raw.coverImage) || undefined;
  const audioUrl = str(raw.audioUrl) || undefined;
  const videoUrl = str(raw.videoUrl) || undefined;

  const allChars = loadAllCharactersFromDisk();
  const charLabels: Record<string, string> = {};
  for (const c of allChars) charLabels[c.slug] = c.shortName ?? c.slug;

  const activeScenes = getActiveScenes(raw);
  const archivedScenes = getRawScenes(raw).filter((s) => str(s.status) === "archived");

  const scenesForUpload: SceneUploadState[] = activeScenes.map((s, i) => ({
    sceneNumber: typeof s.sceneNumber === "number" ? s.sceneNumber : i + 1,
    title: str(s.title),
    text: str(s.summary) || str(s.storyText as unknown),
    imageUrl: str(s.imageUrl) || undefined,
  }));

  const scenesForEdit: SceneForEdit[] = activeScenes.map((s, i) => ({
    sceneNumber: typeof s.sceneNumber === "number" ? s.sceneNumber : i + 1,
    title: str(s.title),
    summary: str(s.summary),
    characters: strArr(s.characters),
    visualNotes: str(s.visualNotes),
    emotionalBeat: str(s.emotionalBeat),
    dialogueDraft: Array.isArray(s.dialogueDraft)
      ? (s.dialogueDraft as string[]).join("\n")
      : str(s.dialogueDraft),
    voiceoverNotes: str(s.voiceoverNotes),
    imagePromptDraft: "",
    animationPromptDraft: "",
  }));

  const scenesForArchive: SceneForArchive[] = activeScenes.map((s, i) => ({
    sceneNumber: typeof s.sceneNumber === "number" ? s.sceneNumber : i + 1,
    title: str(s.title),
    status: str(s.status) || "active",
  }));

  const isPublicReady =
    str(raw.status) === "published" ||
    (typeof raw.publishing === "object" &&
      raw.publishing !== null &&
      ((raw.publishing as Record<string, unknown>).readyForPublicSite === true ||
        (raw.publishing as Record<string, unknown>).publicStatus === "published"));

  return (
    <main className="min-h-screen bg-gradient-to-b from-ube-purple/6 to-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-tiki-brown/50">
          <Link href="/admin" className="hover:text-tiki-brown transition-colors">Admin</Link>
          <span>/</span>
          <Link href="/admin/episodes" className="hover:text-tiki-brown transition-colors">Episodes</Link>
          <span>/</span>
          <span className="text-tiki-brown font-semibold">{title}</span>
        </div>

        {/* Episode header */}
        <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-tiki-brown leading-tight">{title}</h1>
              <p className="text-xs text-tiki-brown/40 font-mono mt-1">{slug}</p>
            </div>
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0 ${
                isPublicReady
                  ? "bg-tropical-green/15 text-tropical-green"
                  : "bg-tiki-brown/8 text-tiki-brown/50"
              }`}
            >
              {isPublicReady ? "Published" : str(raw.status) || "Draft"}
            </span>
          </div>

          {shortDescription && (
            <p className="text-sm text-tiki-brown/70 leading-relaxed">{shortDescription}</p>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-tiki-brown/50">
            {lesson && <span>📚 {lesson}</span>}
            {setting && <span>📍 {setting}</span>}
          </div>

          {featuredCharacters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {featuredCharacters.map((charSlug) => (
                <span
                  key={charSlug}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-ube-purple/10 text-ube-purple"
                >
                  {charLabels[charSlug] ?? charSlug}
                </span>
              ))}
            </div>
          )}

          {isPublicReady && (
            <Link
              href={`/stories/${slug}`}
              target="_blank"
              className="text-sm font-semibold text-ube-purple hover:text-ube-purple/80 transition-colors"
            >
              View public page →
            </Link>
          )}
        </div>

        {/* Public status */}
        <PublicStatusCard
          normalised={normalised}
          reviewObj={typeof raw.review === "object" && raw.review !== null ? raw.review as Record<string, unknown> : null}
          publishingObj={typeof raw.publishing === "object" && raw.publishing !== null ? raw.publishing as Record<string, unknown> : null}
        />

        {/* Upload media */}
        <EpisodeUploadClient
          episodeSlug={slug}
          initialScenes={scenesForUpload}
          initialCoverImage={coverImage}
          initialAudioUrl={audioUrl}
          initialVideoUrl={videoUrl}
        />

        {/* Scene management */}
        <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-black text-tiki-brown mb-5">✏️ Edit Scenes</h2>
          {scenesForEdit.length === 0 && (
            <p className="text-sm text-tiki-brown/50 mb-4">No scenes yet.</p>
          )}
          <EditSceneSection
            episodeSlug={slug}
            scenes={scenesForEdit}
            savedPanelSceneNumbers={[]}
            characterOptions={allChars.map((c) => ({
              slug: c.slug,
              label: c.shortName ?? c.slug,
              approvalMode: c.approvalMode,
            }))}
          />
        </section>

        {/* Add scene */}
        <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
          <h2 className="text-base font-black text-tiki-brown mb-5">➕ Add Scene</h2>
          <AddSceneSection
            episodeSlug={slug}
            currentSceneCount={activeScenes.length}
            characterOptions={allChars.map((c) => ({
              slug: c.slug,
              label: c.shortName ?? c.slug,
              approvalMode: c.approvalMode,
            }))}
          />
        </section>

        {/* Archive */}
        {scenesForArchive.length > 0 && (
          <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
            <h2 className="text-base font-black text-tiki-brown mb-5">🗄 Archive Scene</h2>
            <ArchiveSceneSection episodeSlug={slug} scenes={scenesForArchive} savedPanelSceneNumbers={[]} />
          </section>
        )}

        {archivedScenes.length > 0 && (
          <div className="text-xs text-tiki-brown/40 text-center">
            {archivedScenes.length} archived scene{archivedScenes.length !== 1 ? "s" : ""} hidden from display
          </div>
        )}
      </div>
    </main>
  );
}
