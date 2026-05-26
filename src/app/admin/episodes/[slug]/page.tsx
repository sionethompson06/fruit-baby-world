import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import AddSceneSection from "./AddSceneSection";
import EditSceneSection, { type SceneForEdit } from "./EditSceneSection";
import ArchiveSceneSection, { type SceneForArchive } from "./ArchiveSceneSection";
import PublicStatusCard from "./PublicStatusCard";
import PublishReadinessChecklist from "./PublishReadinessChecklist";
import MediaPlanningSection from "./MediaPlanningSection";
import MediaProductionOverview from "./MediaProductionOverviewSection";
import StoryPanelPromptBuilder from "./StoryPanelPromptBuilderSection";
import StoryPanelAssetManifest from "./StoryPanelManifestSection";
import AnimationClipManifestPreview from "./AnimationClipManifestSection";
import AnimationPromptBuilder, { buildDeterministicAnimationPrompt } from "./AnimationPromptBuilderSection";
import ReadAloudPromptBuilder from "./ReadAloudPromptBuilderSection";
import AudioNarrationSetupSection from "./AudioNarrationSetupSection";
import AudioNarrationDraftSection from "./AudioNarrationDraftSection";
import SavedStoryPanelAssetLibrary from "./SavedStoryPanelAssetsSection";
import ReferencePackagePreviewSection from "./ReferencePackagePreviewSection";
import BatchMissingPanelDraftsSection from "./BatchMissingPanelDraftsSection";
import EpisodePublishReadinessSection from "./EpisodePublishReadinessSection";
import { buildEpisodePublishReadiness } from "@/lib/episodePublishReadiness";
import { getMediaLifecycleStage } from "@/lib/mediaLifecycle";
import { getAudioNarrationProviderStatus, getDefaultVoiceId, getDefaultNarrationModelId } from "@/lib/audioNarrationConfig";
import type { EpisodeAudioNarration } from "@/lib/audioNarrationTypes";
import {
  getNarrationReadinessForEpisode,
  buildNarrationScriptDraftFromEpisode,
} from "@/lib/audioNarrationContext";
import VideoGenerationSetupSection from "./VideoGenerationSetupSection";
import VideoClipDraftSection, { type SceneVideoOption } from "./VideoClipDraftSection";
import type { SceneReviewData } from "./VideoClipFidelityReviewSection";
import AttachedVideoClipsSection, { type SceneWithVideoClips } from "./AttachedVideoClipsSection";
import { getVideoClipsForScene } from "@/lib/videoClipCoverage";
import { getVideoGenerationProviderStatus } from "@/lib/videoGenerationConfig";
import { getVideoGenerationReadinessForEpisode, buildSceneVideoGenerationContext } from "@/lib/videoGenerationContext";
import {
  buildVideoFidelityChecklist,
  hasTikiInVideoScene,
  getVideoFidelityReferenceThumbnails,
  getVideoFidelityWarnings,
} from "@/lib/videoClipFidelityReview";
import {
  loadReferenceAssets,
  buildEpisodeReferencePackages,
  buildCharacterReferencePackage,
  type CharacterReferencePackage,
} from "@/lib/referenceAssetLoader";
import {
  getActiveScenesMissingStoryPanels,
  getStoryPanelCoverageForEpisode,
  type MissingPanelSceneInfo,
} from "@/lib/storyPanelCoverage";
import {
  getFidelityReferenceThumbnails,
  buildFidelityChecklist,
  hasTikiInScene as checkHasTikiInScene,
  getFidelityWarnings,
} from "@/lib/storyPanelFidelityReview";
import { buildReferenceAwareStoryPanelPrompt } from "@/lib/storyPanelPromptBuilder";
import EpisodeCommandCenterSection from "./EpisodeCommandCenterSection";
import FinalVideoAssemblyPreviewSection from "./FinalVideoAssemblyPreviewSection";
import FinalStoryVideoPreviewSection from "./FinalStoryVideoPreviewSection";
import FinalVideoRenderReadinessSection from "./FinalVideoRenderReadinessSection";
import FinalVideoProductionSection from "./FinalVideoProductionSection";
import { buildFinalVideoAssemblyPackage } from "@/lib/finalVideoAssembly";
import { isFinalVideoAsset } from "@/lib/finalVideoAssetTypes";
import StorybookPagesManager from "./StorybookPagesManager";
import StorybookDetailsEditor from "./StorybookDetailsEditor";
import { getStorybookPages } from "@/lib/storybookPages";

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
  const title = result ? String(result.raw.title ?? slug) : slug;
  return { title: `${title.trim()} | Storybook Builder` };
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
  const storybookPages = getStorybookPages(raw);

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

  // Storybook pages (Phase 19A)
  const storybookPages = getStorybookPages(raw);

  return (
    <main className="min-h-screen bg-gradient-to-b from-ube-purple/6 to-white">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-20 flex flex-col gap-8">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-3xl mx-auto">

          <Link
            href="/admin/episodes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Storybooks
          </Link>

          {/* Builder label + badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-ube-purple/15 text-ube-purple uppercase tracking-widest">
              Storybook Builder
            </span>
            <Pill className="bg-tiki-brown/6 text-tiki-brown/45">
              {normalised.publicStatus === "published" ? "Published" : normalised.publicStatus}
            </Pill>
            {normalised.approvedForSave && (
              <Pill className="bg-tropical-green/20 text-tropical-green">Save Approved</Pill>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-1 leading-tight">
            {normalised.title}
          </h1>
          <p className="text-xs font-mono text-tiki-brown/40 mb-0.5">{normalised.slug}</p>
          <p className="text-sm text-tiki-brown/55 mt-2">
            Add book details, upload images, attach optional audio/video, preview, and publish.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Admin notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Storybook Builder.</strong>{" "}
            Upload book images, attach optional audio/video narration, and publish when ready.
            Use the Details section to update the title and description.
          </p>
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

        {/* ── Section Navigation ── */}
        <nav aria-label="Storybook sections" className="flex flex-wrap gap-2 bg-white border border-tiki-brown/10 rounded-2xl px-4 py-3 shadow-sm">
          {[
            { href: "#details", label: "Details" },
            { href: "#book-images", label: "Book Images" },
            { href: "#audio", label: "Audio" },
            { href: "#video", label: "Video" },
            { href: "#preview", label: "Preview" },
            { href: "#publish-readiness", label: "Publish" },
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* B. STORY OVERVIEW & SCENES                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="details" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="✏️"
            title="Details"
            subtitle="Storybook title, description, and content structure."
          />

          {/* Editable storybook details */}
          <StorybookDetailsEditor
            episodeSlug={normalised.slug}
            initialTitle={normalised.title}
            initialAbout={normalised.shortDescription}
          />

          {/* Scene management */}
          <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-black text-tiki-brown mb-5">✏️ Edit Scenes</h3>
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

          <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
            <h3 className="text-base font-black text-tiki-brown mb-5">➕ Add Scene</h3>
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

          {scenesForArchive.length > 0 && (
            <section className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 sm:p-8">
              <h3 className="text-base font-black text-tiki-brown mb-5">🗄 Archive Scene</h3>
              <ArchiveSceneSection episodeSlug={slug} scenes={scenesForArchive} savedPanelSceneNumbers={[]} />
            </section>
          )}

          {archivedScenes.length > 0 && (
            <div className="text-xs text-tiki-brown/40 text-center">
              {archivedScenes.length} archived scene{archivedScenes.length !== 1 ? "s" : ""} hidden
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* C1. STORYBOOK PAGES (Phase 19A — upload-first)                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="book-images" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="📚"
            title="Book Images"
            subtitle="Upload the finished artwork for your storybook: front cover, two-page spreads, story pages, end page, and back cover."
            badge={
              storybookPages.filter((p) => p.status === "approved" && p.visibility === "public").length > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  {storybookPages.filter((p) => p.status === "approved" && p.visibility === "public").length} public
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* C. AUDIO NARRATION                                                */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="audio" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="🎙️"
            title="Audio Narration"
            subtitle="Attach read-aloud narration for this story."
            badge={
              hasAudio ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  Audio attached ✓
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45 uppercase tracking-wide">
                  No audio yet
                </span>
              )
            }
          />
          {!hasAudio && (
            <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎧</span>
                <div>
                  <h3 className="text-sm font-black text-tiki-brown">Add Audio Narration</h3>
                  <p className="text-xs text-tiki-brown/50">Attach a read-aloud audio file for this story</p>
                </div>
              </div>
              <p className="text-sm text-tiki-brown/55 leading-relaxed">
                Audio upload support is coming next. For now, use the narration tools in
                Developer / Legacy Tools below if needed.
              </p>
            </div>
          )}
          <AudioNarrationDraftSection
            episodeSlug={slug}
            initialScenes={[]}
            initialCoverImage={coverImage}
            initialAudioUrl={audioUrl}
            initialVideoUrl={videoUrl}
            sectionsToShow="audio"
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* D. CARTOON VIDEO                                                  */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="video" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="🎬"
            title="Cartoon Video"
            subtitle="Upload or attach a finished cartoon video for this story."
            badge={
              totalVideoClips > 0 ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  {totalVideoClips} clip{totalVideoClips !== 1 ? "s" : ""} attached ✓
                </span>
              ) : (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/45 uppercase tracking-wide">
                  Optional
                </span>
              )
            }
          />

          {/* Video upload placeholder */}
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎬</span>
              <div>
                <h3 className="text-sm font-black text-tiki-brown">Upload Cartoon Video</h3>
                <p className="text-xs text-tiki-brown/50">Attach a finished cartoon or video for this story</p>
              </div>
            </div>
            <p className="text-sm text-tiki-brown/55 leading-relaxed">
              Video upload support is coming next. Existing final video tools are available in
              Developer / Legacy Tools below.
            </p>
          </div>

          <AttachedVideoClipsSection episodeSlug={normalised.slug} scenes={attachedVideoClipScenes} />

          {/* Final video assembly */}
          <FinalVideoAssemblyPreviewSection pkg={finalVideoPkg} />
          <FinalStoryVideoPreviewSection pkg={finalVideoPkg} />
          <FinalVideoRenderReadinessSection pkg={finalVideoPkg} />
          <FinalVideoProductionSection
            pkg={finalVideoPkg}
            episodeSlug={normalised.slug}
            initialFinalVideo={initialFinalVideo}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* F. PREVIEW                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="preview" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="👁️"
            title="Preview"
            subtitle="Preview the public storybook before publishing."
          />
          <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-tiki-brown">Preview Storybook</h3>
                <p className="text-xs text-tiki-brown/50">
                  Opens the public story page in a new tab. Only published/approved content is visible to readers.
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

            {/* Quick status */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Front Cover",
                  done: storybookPages.some((p) => p.pageRole === "front-cover"),
                  icon: "🖼️",
                },
                {
                  label: `${storybookPages.filter((p) => p.pageRole === "story-spread" || (!p.pageRole && p.layoutType === "two-page-spread")).length} Spreads`,
                  done: storybookPages.some((p) => p.pageRole === "story-spread"),
                  icon: "📖",
                },
                {
                  label: "Audio",
                  done: existingAudioNarration !== null,
                  optional: true,
                  icon: "🎧",
                },
                {
                  label: "Video",
                  done: totalVideoClips > 0,
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

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* G. PUBLISH READINESS                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="publish-readiness" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="🚀"
            title="Publish"
            subtitle="Review public readiness and make this episode live."
            badge={
              publishReadiness.status === "ready" ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                  Ready to publish ✓
                </span>
              ) : publishReadiness.status === "blocked" ? (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80 uppercase tracking-wide">
                  {publishReadiness.blockers.length} blocker{publishReadiness.blockers.length !== 1 ? "s" : ""}
                </span>
              ) : undefined
            }
          />
          <PublicStatusCard normalised={normalised} reviewObj={reviewObj} publishingObj={publishingObj} />
          <EpisodePublishReadinessSection readiness={publishReadiness} />
          <PublishReadinessChecklist />
          <PublishReadyAction
            slug={normalised.slug}
            approvedForSave={normalised.approvedForSave}
            isAlreadyPublished={isAlreadyPublished}
          />
          <div className="flex items-center gap-2.5 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-3">
            <span className="text-base flex-shrink-0">📊</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide mb-0.5">Media Health Dashboard</p>
              <p className="text-xs text-tiki-brown/45">Full asset health, missing panels, and audio status across all episodes.</p>
            </div>
            <a
              href={`/stories/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold bg-ube-purple text-white px-4 py-2 rounded-full hover:bg-ube-purple/85 transition-colors shadow-sm w-fit"
            >
              <span>🔗</span>
              Open story page
            </a>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* G. DEVELOPER / LEGACY TOOLS (consolidated, collapsed)             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <details id="legacy-tools" className="group scroll-mt-4">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between bg-white border border-tiki-brown/10 rounded-2xl px-5 py-4 shadow-sm hover:border-tiki-brown/20 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-base">🔧</span>
                <div>
                  <p className="text-sm font-bold text-tiki-brown">Developer / Legacy Tools</p>
                  <p className="text-xs text-tiki-brown/50">Retained temporarily for debugging and legacy workflows.</p>
                </div>
              </div>
              <span className="text-tiki-brown/40 text-xs group-open:rotate-180 transition-transform flex-shrink-0 ml-3">▼</span>
            </div>
          </summary>
          <div className="mt-3 flex flex-col gap-5">

            {/* Helper note */}
            <div className="flex items-start gap-3 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-4 py-3">
              <span className="text-base flex-shrink-0">ℹ️</span>
              <p className="text-xs text-tiki-brown/55 leading-relaxed">
                These tools are retained temporarily for debugging or legacy workflows.
                The preferred workflow is upload-first story publishing via the sections above.
              </p>
            </div>

            {/* Legacy Narration Generation Tools */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest px-1">Legacy Narration Generation Tools</p>
              <ReadAloudPromptBuilder scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} charBySlug={charBySlug} characterPackages={characterPackages} sceneRefPackages={episodeRefPackages.scenePackages} />
              <AudioNarrationSetupSection providerStatus={narrationProviderStatus} readiness={narrationReadiness} />
            </div>

            {/* Legacy Video Generation Tools */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest px-1">Legacy Video Generation Tools</p>
              <VideoGenerationSetupSection providerStatus={videoProviderStatus} readiness={videoReadiness} />
              <VideoClipDraftSection
                episodeSlug={normalised.slug}
                providerConfigured={videoProviderStatus.configured}
                providerLabel={videoProviderStatus.providerLabel}
                sceneOptions={sceneVideoOptions}
                videoReadiness={videoReadiness}
                sceneReviewData={sceneReviewData}
              />
            </div>

            {/* Legacy Image Generation Tools */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest px-1">Legacy Image Generation Tools</p>
              <StoryPanelPromptBuilder scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} episodeSlug={normalised.slug} charBySlug={charBySlug} characterPackages={characterPackages} sceneRefPackages={episodeRefPackages.scenePackages} />
              <BatchMissingPanelDraftsSection episodeSlug={normalised.slug} coverage={panelCoverage} missingScenes={missingPanelSceneInfos} />
              <SavedStoryPanelAssetLibrary raw={raw} scenes={scenes} episodeSlug={normalised.slug} />
            </div>

            {/* Debug / planning data */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-widest px-1">Debug &amp; Planning Data</p>
              <SceneIdStabilitySection
                episodeSlug={normalised.slug}
                totalScenes={sceneIdStats.totalScenes}
                scenesWithId={sceneIdStats.scenesWithId}
                totalPanels={sceneIdStats.totalPanels}
                panelsWithId={sceneIdStats.panelsWithId}
                totalClips={sceneIdStats.totalClips}
                clipsWithId={sceneIdStats.clipsWithId}
              />
              {imagePrompts.length > 0 && (
                <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Image Prompt Drafts</p>
                  {imagePrompts.map((prompt, i) => (
                    <div key={i} className="bg-sky-blue/10 rounded-xl p-4">
                      <p className="text-sm text-tiki-brown/70 leading-relaxed">{prompt}</p>
                    </div>
                  ))}
                </div>
              )}
              {animPrompts.length > 0 && (
                <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Animation Prompt Drafts</p>
                  {animPrompts.map((prompt, i) => (
                    <div key={i} className="bg-tropical-green/8 rounded-xl p-4">
                      <p className="text-sm text-tiki-brown/70 leading-relaxed">{prompt}</p>
                    </div>
                  ))}
                </div>
              )}
              {fidelityChecklist.length > 0 && (
                <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Character Fidelity Checklist</p>
                  <StringList items={fidelityChecklist} />
                </div>
              )}
              {merchTieIns.length > 0 && (
                <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-5 flex flex-col gap-3">
                  <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide">Merch Tie-Ins</p>
                  <StringList items={merchTieIns} />
                </div>
              )}
              <MediaProductionOverview scenes={activeScenes} isPublicReady={isAlreadyPublished} episodeRefSummary={episodeRefPackages} />
              <MediaPlanningSection plan={mediaPlan} tikiFlagged={tikiFlagged} />
              <ReferencePackagePreviewSection summary={episodeRefPackages} />
              <AnimationPromptBuilder scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} charBySlug={charBySlug} characterPackages={characterPackages} sceneRefPackages={episodeRefPackages.scenePackages} />
              <AnimationRouteTestPanel
                episodeSlug={normalised.slug}
                tikiFlagged={tikiFlagged}
                scenes={sceneOptions}
                featuredCharacters={normalised.featuredCharacters}
              />
              <StoryPanelAssetManifest scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} />
              <AnimationClipManifestPreview scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} />
            </div>

            {/* Developer JSON Preview */}
            <details className="group/json">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between bg-white border border-tiki-brown/10 rounded-2xl px-5 py-4 shadow-sm hover:border-tiki-brown/20 transition-colors">
                  <div>
                    <p className="text-sm font-bold text-tiki-brown">Developer JSON Preview</p>
                    <p className="text-xs text-tiki-brown/50">Full saved episode JSON — click to expand</p>
                  </div>
                  <span className="text-tiki-brown/40 text-xs group-open/json:rotate-180 transition-transform">▼</span>
                </div>
              </summary>
              <div className="mt-2 bg-white border border-tiki-brown/10 rounded-2xl overflow-hidden">
                <pre className="p-5 text-xs font-mono text-tiki-brown/60 leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(raw, null, 2)}
                </pre>
              </div>
            </details>

          </div>
        </details>

        {/* Back link footer */}
        <div className="pt-2">
          <Link
            href="/admin/episodes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            ← Back to Storybooks
          </Link>
        </div>

      </div>
    </main>
  );
}
