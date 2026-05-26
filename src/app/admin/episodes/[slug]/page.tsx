import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { getEpisodeScenes, getActiveEpisodeScenes } from "@/lib/episodeScenes";
import PublishReadyAction from "./PublishReadyAction";
import { deriveMediaPlan } from "@/lib/episodeMediaPlan";
import AnimationRouteTestPanel, { type SceneOption } from "./AnimationRouteTestPanel";
import AddSceneSection from "./AddSceneSection";
import EditSceneSection, { type SceneForEdit } from "./EditSceneSection";
import ArchiveSceneSection, { type SceneForArchive } from "./ArchiveSceneSection";
import SceneIdStabilitySection from "./SceneIdStabilitySection";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import type { Character } from "@/lib/content";
import { isCharacterApprovedForAdminUse } from "@/lib/characterEligibility";
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
import { getStorybookPages } from "@/lib/storybookPages";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Metadata ────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  const title = result ? String(result.raw.title ?? slug) : slug;
  return { title: `${title.trim()} | Episode Studio` };
}

// ─── Safe field helpers ─────────────────────────────────────────────────────────────────────

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

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
  if (isRec(v)) {
    const inner = v.notes ?? v.text ?? v.content ?? v.value;
    if (typeof inner === "string" && inner.trim()) return [inner.trim()];
  }
  return [];
}

function recArr(v: unknown): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isRec);
}

// Detect if Tiki appears anywhere in the episode
function hasTiki(raw: Record<string, unknown>): boolean {
  return JSON.stringify(raw).toLowerCase().includes("tiki");
}

// ─── Badge helpers ──────────────────────────────────────────────────────────────────────────────

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

function Pill({
  children,
  className = "bg-tiki-brown/8 text-tiki-brown/60",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${className}`}
    >
      {children}
    </span>
  );
}

// ─── Layout primitives ───────────────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
      <h2 className="text-base font-black text-tiki-brown">{title}</h2>
      {children}
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2 items-baseline">
      <dt className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-tiki-brown/80">{value}</dd>
    </div>
  );
}

function StringList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-tiki-brown/75 leading-relaxed">
          <span className="text-ube-purple mt-0.5 flex-shrink-0">•</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function Callout({
  icon,
  children,
  className = "bg-pineapple-yellow/15 border-pineapple-yellow/40",
}: {
  icon: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 border rounded-2xl px-4 py-3 ${className}`}>
      <span className="text-lg flex-shrink-0">{icon}</span>
      <p className="text-sm text-tiki-brown/70 leading-relaxed">{children}</p>
    </div>
  );
}

// ─── Section group header ────────────────────────────────────────────────────────────────────────

function SectionGroupHeader({
  icon,
  title,
  subtitle,
  badge,
  nextAction,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  nextAction?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-tiki-brown/10 pb-3">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-black text-tiki-brown uppercase tracking-wide">{title}</h2>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-tiki-brown/50 mt-0.5">{subtitle}</p>}
        {nextAction && (
          <p className="text-xs font-semibold text-ube-purple/70 mt-1">→ {nextAction}</p>
        )}
      </div>
    </div>
  );
}

// ─── Scene card ────────────────────────────────────────────────────────────────────────────────

function SceneCard({
  scene,
  index,
  isArchived = false,
}: {
  scene: Record<string, unknown>;
  index: number;
  isArchived?: boolean;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const characters = strArr(scene.characters);
  const visualNotes = str(scene.visualNotes);
  const emotionalBeat = str(scene.emotionalBeat);
  const dialogue = strArr(scene.dialogueDraft);
  const voiceover = strArr(scene.voiceoverNotes);
  const imagePrompt = str(scene.imagePromptDraft);
  const animPrompt = str(scene.animationPromptDraft);
  const fidelityNotes = strArr(scene.characterFidelityNotes);

  return (
    <div className={`border rounded-2xl p-5 flex flex-col gap-3 ${isArchived ? "border-warm-coral/20 bg-warm-coral/4 opacity-70" : "border-tiki-brown/10"}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
          Scene {String(num)}
        </span>
        {isArchived && (
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-warm-coral/20 text-warm-coral/80 uppercase tracking-wide">
            Archived
          </span>
        )}
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
        {str(scene.sceneId) && (
          <span className="ml-auto text-xs font-mono text-tiki-brown/35 bg-tiki-brown/5 px-2 py-0.5 rounded">
            {str(scene.sceneId)}
          </span>
        )}
      </div>

      {summary && <p className="text-sm text-tiki-brown/70 leading-relaxed">{summary}</p>}

      {characters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {characters.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/60">
              {c}
            </span>
          ))}
        </div>
      )}

      {visualNotes && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Visual Notes</p>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">{visualNotes}</p>
        </div>
      )}

      {emotionalBeat && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Emotional Beat</p>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">{emotionalBeat}</p>
        </div>
      )}

      {dialogue.length > 0 && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">Dialogue</p>
          <ul className="space-y-1">
            {dialogue.map((line, i) => (
              <li key={i} className="text-sm font-mono text-tiki-brown/75 leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {voiceover.length > 0 && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Voiceover</p>
          {voiceover.map((v, i) => (
            <p key={i} className="text-sm text-tiki-brown/65 leading-relaxed italic">{v}</p>
          ))}
        </div>
      )}

      {imagePrompt && (
        <div className="bg-sky-blue/20 rounded-xl p-3">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Image Prompt Draft</p>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">{imagePrompt}</p>
        </div>
      )}

      {animPrompt && (
        <div className="bg-tropical-green/10 rounded-xl p-3">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Animation Prompt Draft</p>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">{animPrompt}</p>
        </div>
      )}

      {fidelityNotes.length > 0 && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Character Fidelity Notes</p>
          <StringList items={fidelityNotes} />
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function EpisodeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const result = loadEpisodeBySlug(slug);
  if (!result) notFound();

  const { raw, normalised } = result;

  // Convenience accessors into raw
  const sourceStoryboard = isRec(raw.sourceStoryboard) ? raw.sourceStoryboard : null;
  const reviewObj = isRec(raw.review) ? raw.review : null;
  const publishingObj = isRec(raw.publishing) ? raw.publishing : null;
  const scenes = getEpisodeScenes(raw);
  const sourceScenes = sourceStoryboard ? recArr(sourceStoryboard.scenes) : [];
  const imagePrompts = strArr(raw.imagePromptDrafts);
  const animPrompts = strArr(raw.animationPromptDrafts);
  const fidelityChecklist = strArr(raw.characterFidelityChecklist);
  const merchTieIns = strArr(raw.merchTieIns);
  const topDialogue = strArr(raw.dialogueDraft);
  const topVoiceover = strArr(raw.voiceoverNotes);
  const tikiFlagged = hasTiki(raw);
  const isAlreadyPublished =
    normalised.readyForPublicSite ||
    normalised.publicStatus === "published" ||
    (publishingObj !== null && publishingObj.publicStatus === "published");

  const mediaPlan = deriveMediaPlan(raw);

  const sceneForEditList: SceneForEdit[] = scenes.map((s) => {
    const rawDialogue = s.dialogueDraft;
    const dialogueDraft = Array.isArray(rawDialogue)
      ? rawDialogue
          .filter((l): l is string => typeof l === "string")
          .map((l) => l.trim())
          .filter(Boolean)
          .join("\n")
      : str(rawDialogue);
    return {
      sceneNumber: typeof s.sceneNumber === "number" ? s.sceneNumber : 0,
      title: str(s.title),
      summary: str(s.summary),
      characters: strArr(s.characters),
      visualNotes: str(s.visualNotes),
      emotionalBeat: str(s.emotionalBeat),
      dialogueDraft,
      voiceoverNotes: str(s.voiceoverNotes),
      imagePromptDraft: str(s.imagePromptDraft),
      animationPromptDraft: str(s.animationPromptDraft),
    };
  });

  const savedPanelSceneNumbers: number[] = (() => {
    const media = isRec(raw.media) ? raw.media : null;
    const spm = media && isRec(media.storyPanelMode) ? media.storyPanelMode : null;
    const panels = spm && Array.isArray(spm.panels) ? spm.panels : [];
    return panels
      .filter(isRec)
      .map((p) => (typeof p.sceneNumber === "number" ? p.sceneNumber : -1))
      .filter((n) => n > 0);
  })();

  // Scene ID stability stats (for SceneIdStabilitySection)
  const sceneIdStats = (() => {
    const scenesWithId = scenes.filter(
      (s) => typeof s.sceneId === "string" && (s.sceneId as string).length > 0
    ).length;
    const media = isRec(raw.media) ? raw.media : null;
    const spm = media && isRec(media.storyPanelMode) ? media.storyPanelMode : null;
    const panels = (spm && Array.isArray(spm.panels) ? spm.panels : []).filter(isRec);
    const panelsWithId = panels.filter(
      (p) => typeof p.sceneId === "string" && (p.sceneId as string).length > 0
    ).length;
    const am = media && isRec(media.animationMode) ? media.animationMode : null;
    const clips = (am && Array.isArray(am.clips) ? am.clips : []).filter(isRec);
    const clipsWithId = clips.filter(
      (c) => typeof c.sceneId === "string" && (c.sceneId as string).length > 0
    ).length;
    return {
      totalScenes: scenes.length,
      scenesWithId,
      totalPanels: panels.length,
      panelsWithId,
      totalClips: clips.length,
      clipsWithId,
    };
  })();

  // Scenes available for active generation (excludes archived)
  const activeScenes = getActiveEpisodeScenes(raw);

  // Load eligible characters from disk for scene builders
  let allDiskChars: Character[] = [];
  try {
    allDiskChars = loadAllCharactersFromDisk();
  } catch { /* fallback: empty, selectors will use their built-in fallback */ }
  const eligibleChars = allDiskChars.filter(isCharacterApprovedForAdminUse);
  const sceneCharacterOptions = eligibleChars.map((c) => ({
    slug: c.slug === "tiki" ? "tiki-trouble" : c.slug,
    label: c.name,
    approvalMode: c.approvalMode,
  }));
  const charBySlug: Record<string, Character> = {};
  for (const c of allDiskChars) {
    charBySlug[c.slug] = c;
    if (c.slug === "tiki") charBySlug["tiki-trouble"] = c;
  }

  // Load reference assets and build episode reference packages
  let referenceAssets: ReturnType<typeof loadReferenceAssets> = [];
  try {
    referenceAssets = loadReferenceAssets();
  } catch { /* fallback: empty */ }
  const episodeRefPackages = buildEpisodeReferencePackages(
    normalised.slug,
    activeScenes,
    referenceAssets,
    charBySlug
  );
  // Deduplicated per-character packages for section components
  const characterPackageMap = new Map<string, CharacterReferencePackage>();
  for (const sp of episodeRefPackages.scenePackages) {
    for (const cp of sp.characterPackages) {
      if (!characterPackageMap.has(cp.characterSlug)) {
        characterPackageMap.set(cp.characterSlug, cp);
      }
    }
  }
  // Also include all eligible chars that may not appear in scenes
  for (const c of allDiskChars) {
    if (!characterPackageMap.has(c.slug)) {
      characterPackageMap.set(c.slug, buildCharacterReferencePackage(c, referenceAssets));
    }
  }
  const characterPackages = Array.from(characterPackageMap.values());

  const sceneForArchiveList: SceneForArchive[] = scenes.map((s) => ({
    sceneNumber: typeof s.sceneNumber === "number" ? s.sceneNumber : 0,
    title: str(s.title),
    status: str(s.status),
  }));

  // Pre-compute scene options for AnimationRouteTestPanel (client component)
  const episodeSetting = str(raw.setting);
  const episodeTone = str(raw.tone);
  const sceneOptions: SceneOption[] = activeScenes.map((scene, i) => {
    const num = typeof scene.sceneNumber === "number" ? scene.sceneNumber : i + 1;
    const title = str(scene.title);
    const characters = strArr(scene.characters);
    const existingPrompt = str(scene.animationPromptDraft);
    const prompt =
      existingPrompt ||
      buildDeterministicAnimationPrompt({
        sceneNum: num,
        title,
        characters,
        setting: episodeSetting,
        tone: episodeTone,
        emotionalBeat: str(scene.emotionalBeat),
        visualNotes: str(scene.visualNotes),
      });
    return { sceneNumber: num, title, characters, prompt };
  });

  // Panel coverage and missing panel scene infos for batch generation
  const panelCoverage = getStoryPanelCoverageForEpisode(raw);
  const rawMissingScenes = getActiveScenesMissingStoryPanels(raw);
  const missingPanelSceneInfos: MissingPanelSceneInfo[] = rawMissingScenes.map((scene) => {
    const sceneNum = typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0;
    const sceneId = str(scene.sceneId);
    const title = str(scene.title);
    const summary = str(scene.summary);
    const characters = strArr(scene.characters);
    const referenceCharacters = strArr(scene.referenceCharacters);
    const scenePkg = episodeRefPackages.scenePackages.find((p) => p.sceneNumber === sceneNum);
    const hasTikiScene = scenePkg
      ? checkHasTikiInScene(scenePkg)
      : characters.some((c) => c.toLowerCase().includes("tiki"));
    const fidelityThumbnails = scenePkg ? getFidelityReferenceThumbnails(scenePkg, charBySlug) : [];
    const fidelityChecklist = buildFidelityChecklist(hasTikiScene);
    const panelPrompt =
      scenePkg && Object.keys(charBySlug).length > 0
        ? buildReferenceAwareStoryPanelPrompt(scenePkg, charBySlug, {
            sceneNumber: sceneNum,
            title,
            summary,
            setting: episodeSetting,
            mood: episodeTone,
            emotionalBeat: str(scene.emotionalBeat),
            visualNotes: str(scene.visualNotes),
          })
        : `Create a kid-friendly still storybook panel for Scene ${sceneNum}${title ? ` — "${title}"` : ""}. ${summary}`.trim();
    let readinessBadge: MissingPanelSceneInfo["readinessBadge"] = "prompt-only";
    let totalApprovedRefs = 0;
    if (scenePkg && scenePkg.characterPackages.length > 0) {
      const pkgs = scenePkg.characterPackages;
      totalApprovedRefs = pkgs.reduce((sum, cp) => sum + cp.totalApprovedCount, 0);
      const allReady = pkgs.every((cp) => cp.isGenerationReady);
      const allHaveSheets = pkgs.every((cp) => cp.profileSheets.length > 0);
      if (allReady && allHaveSheets) {
        readinessBadge = "reference-ready";
      } else if (allReady) {
        readinessBadge = "needs-official-ref";
      } else {
        readinessBadge = "no-approved-refs";
      }
    }
    const referenceWarnings = scenePkg
      ? getFidelityWarnings(scenePkg, charBySlug).map((w) => `${w.characterName}: ${w.message}`)
      : [];
    return {
      sceneNumber: sceneNum,
      sceneId,
      title,
      summary,
      characters,
      referenceCharacters,
      panelPrompt,
      readinessBadge,
      referenceWarnings,
      fidelityThumbnails,
      fidelityChecklist,
      hasTiki: hasTikiScene,
      totalApprovedRefs,
    };
  });

  // Episode publish readiness (read-only diagnostics)
  const publishReadiness = buildEpisodePublishReadiness(raw, {
    charBySlug,
    sceneRefPackages: episodeRefPackages.scenePackages,
  });

  // Final video assembly plan (preview only — no rendering)
  const finalVideoPkg = buildFinalVideoAssemblyPackage(raw);
  const initialFinalVideo = isFinalVideoAsset(raw.finalVideo) ? raw.finalVideo : null;

  const narrationProviderStatus = getAudioNarrationProviderStatus();
  const narrationReadiness = getNarrationReadinessForEpisode(raw);
  const narrationScriptDraft = buildNarrationScriptDraftFromEpisode(raw);
  const initialNarrationScript = narrationScriptDraft.scenes
    .filter((s) => !s.scriptLine.startsWith("[Scene "))
    .map((s) =>
      s.title ? `Scene ${s.sceneNumber} — ${s.title}:\n${s.scriptLine}` : s.scriptLine
    )
    .join("\n\n");
  const defaultVoiceId = getDefaultVoiceId();
  const defaultModelId = getDefaultNarrationModelId() ?? "eleven_multilingual_v2";

  // Video generation provider status and readiness (Phase 14A)
  const videoProviderStatus = getVideoGenerationProviderStatus();
  const videoReadiness = getVideoGenerationReadinessForEpisode(
    raw,
    episodeRefPackages.scenePackages,
    videoProviderStatus.configured
  );

  // Scene video options for VideoClipDraftSection (Phase 14B)
  const refBySceneNumber = new Map(
    episodeRefPackages.scenePackages.map((pkg) => [pkg.sceneNumber, pkg])
  );
  const sceneVideoOptions: SceneVideoOption[] = activeScenes.map((scene, i) => {
    const num = typeof scene.sceneNumber === "number" ? scene.sceneNumber : i + 1;
    const sceneId = str(scene.sceneId);
    const title = str(scene.title);
    const existingPrompt = str(scene.animationPromptDraft);
    const animationPrompt =
      existingPrompt ||
      buildDeterministicAnimationPrompt({
        sceneNum: num,
        title,
        characters: strArr(scene.characters),
        setting: str(raw.setting),
        tone: str(raw.tone),
        emotionalBeat: str(scene.emotionalBeat),
        visualNotes: str(scene.visualNotes),
      });
    const scenePkg = refBySceneNumber.get(num);
    const sceneCtx = buildSceneVideoGenerationContext(scene, scenePkg);
    return {
      sceneNumber: num,
      sceneId,
      title,
      animationPrompt,
      hasAnimationPrompt: sceneCtx.hasAnimationPrompt,
      hasCharacterReferences: sceneCtx.hasCharacterReferences,
      approvedReferenceCount: sceneCtx.approvedReferenceCount,
    };
  });

  // Scene review data for VideoClipFidelityReviewSection (Phase 14C)
  const sceneReviewData: Record<number, SceneReviewData> = {};
  for (const [sceneNum, refPkg] of refBySceneNumber) {
    const hasTikiScene = hasTikiInVideoScene(refPkg);
    sceneReviewData[sceneNum] = {
      thumbnails: getVideoFidelityReferenceThumbnails(refPkg, charBySlug),
      checklistItems: buildVideoFidelityChecklist(hasTikiScene),
      fidelityWarnings: getVideoFidelityWarnings(refPkg),
      hasTiki: hasTikiScene,
    };
  }

  // Attached video clips per scene (Phase 14E)
  const attachedVideoClipScenes: SceneWithVideoClips[] = activeScenes.map((scene) => ({
    sceneNumber: typeof scene.sceneNumber === "number" ? scene.sceneNumber : 0,
    sceneId: str(scene.sceneId),
    sceneTitle: str(scene.title),
    videoClips: getVideoClipsForScene(scene),
  }));

  // Extract existing attached narration audio from episode JSON (Phase 13E)
  const existingAudioNarration: EpisodeAudioNarration | null = (() => {
    const an = raw.audioNarration;
    if (!isRec(an)) return null;
    if (typeof an.url !== "string" || !an.url) return null;
    return {
      id: typeof an.id === "string" ? an.id : `audio-unknown`,
      type: "episode-narration",
      status: "approved",
      provider: typeof an.provider === "string" ? an.provider : "elevenlabs",
      voiceId: typeof an.voiceId === "string" ? an.voiceId : undefined,
      modelId: typeof an.modelId === "string" ? an.modelId : undefined,
      voiceStyle: typeof an.voiceStyle === "string" ? an.voiceStyle : undefined,
      url: an.url,
      pathname: typeof an.pathname === "string" ? an.pathname : undefined,
      mimeType: typeof an.mimeType === "string" ? an.mimeType : "audio/mpeg",
      sizeBytes: typeof an.sizeBytes === "number" ? an.sizeBytes : undefined,
      scriptText: typeof an.scriptText === "string" ? an.scriptText : undefined,
      reviewNotes: typeof an.reviewNotes === "string" ? an.reviewNotes : undefined,
      approvedBy: typeof an.approvedBy === "string" ? an.approvedBy : undefined,
      approvedAt: typeof an.approvedAt === "string" ? an.approvedAt : undefined,
      attachedAt: typeof an.attachedAt === "string" ? an.attachedAt : new Date().toISOString(),
      visibility:
        an.visibility === "public-ready" || an.visibility === "hidden"
          ? an.visibility
          : "admin-only",
    } satisfies EpisodeAudioNarration;
  })();

  const existingAudioLifecycleStage = existingAudioNarration
    ? getMediaLifecycleStage(existingAudioNarration, "audio")
    : "unknown";

  // Command center derived values
  const totalVideoClips = attachedVideoClipScenes.reduce((sum, s) => sum + s.videoClips.length, 0);
  const hasAudio = existingAudioNarration !== null;

  // Storybook pages (Phase 19A)
  const storybookPages = getStorybookPages(raw);

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-3xl mx-auto">

          <Link
            href="/admin/episodes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Story Studio
          </Link>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Pill className="bg-ube-purple/15 text-ube-purple">Admin Only</Pill>
            <Pill className="bg-tiki-brown/8 text-tiki-brown/60">Read Only</Pill>
            <ReviewBadge status={normalised.reviewStatus} />
            {normalised.productionStatus && (
              <Pill>Production: {normalised.productionStatus}</Pill>
            )}
            {normalised.approvedForSave && (
              <Pill className="bg-tropical-green/20 text-tropical-green">Save Approved</Pill>
            )}
            <Pill className="bg-tiki-brown/6 text-tiki-brown/45">
              Public: {normalised.publicStatus}
            </Pill>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-tiki-brown mb-1 leading-tight">
            {normalised.title}
          </h1>
          <p className="text-xs font-mono text-tiki-brown/40 mb-1">{normalised.slug}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Admin notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Publishing workspace.</strong>{" "}
            Upload storybook pages, audio narration, and video for this episode. Use the Publish
            section to make it live when all content is ready.
          </p>
        </div>

        {/* Tiki Trouble guardrail */}
        {tikiFlagged && (
          <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
            <span className="text-xl flex-shrink-0">⚡</span>
            <div>
              <p className="text-sm font-bold text-tiki-brown mb-0.5">Tiki Trouble is in this episode</p>
              <p className="text-sm text-tiki-brown/65 leading-relaxed">
                Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly.
                Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.
              </p>
            </div>
          </div>
        )}

        {/* ── A. Episode Command Center ── */}
        <EpisodeCommandCenterSection
          normalised={normalised}
          publishReadiness={publishReadiness}
          panelCoverage={panelCoverage}
          audioLifecycleStage={existingAudioLifecycleStage}
          totalVideoClips={totalVideoClips}
          finalVideoStatus={finalVideoPkg.status}
        />

        {/* ── Section Navigation ── */}
        <nav aria-label="Production sections" className="flex flex-wrap gap-2 bg-white border border-tiki-brown/10 rounded-2xl px-4 py-3 shadow-sm">
          {[
            { href: "#story", label: "Story" },
            { href: "#storybook-pages", label: "Storybook Pages" },
            { href: "#audio", label: "Audio" },
            { href: "#video", label: "Video" },
            { href: "#publish-readiness", label: "Publish" },
            { href: "#advanced-tools", label: "Advanced" },
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
        <div id="story" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="📖"
            title="Story"
            subtitle="Episode details, scenes, and production structure."
          />

          {/* Episode Overview */}
          <Section title="Episode Overview">
            <dl className="flex flex-col gap-2">
              <MetaRow label="Lesson" value={normalised.lesson} />
              <MetaRow label="Setting" value={normalised.setting} />
              <MetaRow label="Tone" value={normalised.tone} />
              <MetaRow label="Age Range" value={normalised.targetAgeRange} />
              <MetaRow label="Status" value={normalised.status} />
              <MetaRow label="Production" value={normalised.productionStatus} />
              {str(raw.storyNotes) && <MetaRow label="Story Notes" value={str(raw.storyNotes)} />}
              {str(raw.createdIn) && <MetaRow label="Created In" value={str(raw.createdIn)} />}
              {normalised.updatedAt && (
                <MetaRow
                  label="Updated"
                  value={new Date(normalised.updatedAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
              )}
              {normalised.createdAt && !normalised.updatedAt && (
                <MetaRow
                  label="Created"
                  value={new Date(normalised.createdAt).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                />
              )}
            </dl>
            {normalised.shortDescription && (
              <div>
                <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-tiki-brown/75 leading-relaxed">{normalised.shortDescription}</p>
              </div>
            )}
            {str(raw.episodeSummary) && str(raw.episodeSummary) !== normalised.shortDescription && (
              <div>
                <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">Episode Summary</p>
                <p className="text-sm text-tiki-brown/75 leading-relaxed">{str(raw.episodeSummary)}</p>
              </div>
            )}
            {normalised.featuredCharacters.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-2">Featured Characters</p>
                <div className="flex flex-wrap gap-1.5">
                  {normalised.featuredCharacters.map((c) => (
                    <span key={c} className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Section>

          {/* Review Status — show notes if present, otherwise collapsed */}
          {reviewObj && str(reviewObj.notes) && (
            <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-2xl px-5 py-4">
              <p className="text-xs font-bold text-tiki-brown/60 uppercase tracking-wide mb-1.5">Review Notes</p>
              <p className="text-sm text-tiki-brown/70 leading-relaxed">{str(reviewObj.notes)}</p>
            </div>
          )}

          {/* Source Storyboard — collapsed by default */}
          {sourceStoryboard && (
            <details className="group">
              <summary className="cursor-pointer list-none bg-white rounded-2xl border border-tiki-brown/10 px-5 py-3 flex items-center gap-2 hover:border-tiki-brown/20 transition-colors shadow-sm">
                <span className="text-sm font-bold text-tiki-brown flex-1">Source Storyboard</span>
                <span className="text-xs text-tiki-brown/35 group-open:hidden">▼ Show original</span>
                <span className="text-xs text-tiki-brown/35 hidden group-open:inline">▲ Hide</span>
              </summary>
              <div className="mt-2">
                <Section title="Source Storyboard">
                  <dl className="flex flex-col gap-2">
                    <MetaRow label="Title" value={str(sourceStoryboard.title)} />
                    <MetaRow label="Lesson" value={str(sourceStoryboard.lesson)} />
                    <MetaRow label="Setting" value={str(sourceStoryboard.setting)} />
                    <MetaRow label="Tone" value={str(sourceStoryboard.tone)} />
                    <MetaRow label="Age Range" value={str(sourceStoryboard.targetAgeRange)} />
                  </dl>
                  {str(sourceStoryboard.shortDescription) && (
                    <p className="text-sm text-tiki-brown/70 leading-relaxed">{str(sourceStoryboard.shortDescription)}</p>
                  )}
                  {str(sourceStoryboard.storyNotes) && (
                    <div>
                      <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">Story Notes</p>
                      <p className="text-sm text-tiki-brown/65 leading-relaxed italic">{str(sourceStoryboard.storyNotes)}</p>
                    </div>
                  )}
                  {sourceScenes.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">
                        Original Scenes ({sourceScenes.length})
                      </p>
                      {sourceScenes.map((scene, i) => (
                        <SceneCard key={i} scene={scene} index={i} />
                      ))}
                    </div>
                  )}
                </Section>
              </div>
            </details>
          )}

          {/* Scene Breakdown */}
          {scenes.length > 0 && (
            <Section title={`Scene Breakdown (${scenes.length} scene${scenes.length !== 1 ? "s" : ""})`}>
              {scenes.some((s) => str(s.status) === "archived") && (
                <p className="text-xs text-tiki-brown/45 leading-relaxed">
                  Archived scenes are shown with muted styling and are excluded from active generation tools.
                </p>
              )}
              <div className="flex flex-col gap-4">
                {scenes.map((scene, i) => (
                  <SceneCard key={i} scene={scene} index={i} isArchived={str(scene.status) === "archived"} />
                ))}
              </div>
            </Section>
          )}

          {/* Add / Edit / Archive */}
          <AddSceneSection episodeSlug={normalised.slug} currentSceneCount={scenes.length} characterOptions={sceneCharacterOptions.length > 0 ? sceneCharacterOptions : undefined} />
          <EditSceneSection
            episodeSlug={normalised.slug}
            scenes={sceneForEditList}
            savedPanelSceneNumbers={savedPanelSceneNumbers}
            characterOptions={sceneCharacterOptions.length > 0 ? sceneCharacterOptions : undefined}
          />
          <ArchiveSceneSection
            episodeSlug={normalised.slug}
            scenes={sceneForArchiveList}
            savedPanelSceneNumbers={savedPanelSceneNumbers}
          />

          {/* Dialogue / Voiceover — episode-level, collapsed */}
          {(topDialogue.length > 0 || topVoiceover.length > 0) && (
            <details className="group">
              <summary className="cursor-pointer list-none bg-white rounded-2xl border border-tiki-brown/10 px-5 py-3 flex items-center gap-2 hover:border-tiki-brown/20 transition-colors shadow-sm">
                <span className="text-sm font-bold text-tiki-brown flex-1">Dialogue &amp; Voiceover Notes</span>
                <span className="text-xs text-tiki-brown/35 group-open:hidden">▼ Show</span>
                <span className="text-xs text-tiki-brown/35 hidden group-open:inline">▲ Hide</span>
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                {topDialogue.length > 0 && (
                  <Section title="Dialogue Draft"><StringList items={topDialogue} /></Section>
                )}
                {topVoiceover.length > 0 && (
                  <Section title="Voiceover Notes">
                    {topVoiceover.map((v, i) => (
                      <p key={i} className="text-sm text-tiki-brown/70 leading-relaxed italic">{v}</p>
                    ))}
                  </Section>
                )}
              </div>
            </details>
          )}

          {/* Character integrity note */}
          <div className="flex items-start gap-3 bg-tiki-brown/3 border border-tiki-brown/8 rounded-2xl px-5 py-3">
            <span className="text-sm flex-shrink-0">🍍</span>
            <p className="text-xs text-tiki-brown/55 leading-relaxed">
              Character integrity comes from official profiles, approved references, and generation
              rules managed in{" "}
              <Link href="/admin/characters" className="font-bold text-ube-purple hover:text-ube-purple/70 transition-colors">
                Character Studio
              </Link>
              . All generated visuals must be reference-anchored and reviewed before publishing.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* C1. STORYBOOK PAGES (Phase 19A — upload-first)                    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="storybook-pages" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="📚"
            title="Storybook Pages"
            subtitle="Upload final artwork images to build the public storybook reader. Approved public pages replace legacy panels."
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
        {/* C. AUDIO                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="audio" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="🎙️"
            title="Audio"
            subtitle="Upload and manage audio narration for this episode."
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
            nextAction={!hasAudio ? "Upload audio narration" : undefined}
          />
          <AudioNarrationDraftSection
            episodeSlug={slug}
            initialScript={initialNarrationScript}
            providerConfigured={narrationProviderStatus.configured}
            defaultVoiceId={defaultVoiceId}
            defaultModelId={defaultModelId}
            hasTiki={tikiFlagged}
            existingAudioNarration={existingAudioNarration}
          />
          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2 bg-white rounded-2xl border border-tiki-brown/10 px-5 py-3 shadow-sm hover:border-tiki-brown/20 transition-colors">
                <span className="text-sm font-bold text-tiki-brown flex-1">AI Narration Tools</span>
                <span className="text-xs text-tiki-brown/40 group-open:hidden">▼ Show</span>
                <span className="text-xs text-tiki-brown/40 hidden group-open:inline">▲ Hide</span>
              </div>
            </summary>
            <div className="mt-2 flex flex-col gap-4">
              <ReadAloudPromptBuilder scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} charBySlug={charBySlug} characterPackages={characterPackages} sceneRefPackages={episodeRefPackages.scenePackages} />
              <AudioNarrationSetupSection providerStatus={narrationProviderStatus} readiness={narrationReadiness} />
            </div>
          </details>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* D. VIDEO                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <div id="video" className="flex flex-col gap-4 scroll-mt-4">
          <SectionGroupHeader
            icon="🎬"
            title="Video"
            subtitle="Upload and manage video content for this episode."
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
                <p className="text-xs text-tiki-brown/50">Attach a finished video file for this episode</p>
              </div>
            </div>
            <p className="text-sm text-tiki-brown/55 leading-relaxed">
              Direct video upload coming soon. Use the Final Video section below to attach a completed
              video, or attach individual scene clips from the AI Video tools.
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

          <details className="group">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center gap-2 bg-white rounded-2xl border border-tiki-brown/10 px-5 py-3 shadow-sm hover:border-tiki-brown/20 transition-colors">
                <span className="text-sm font-bold text-tiki-brown flex-1">AI Video Generation Tools</span>
                <span className="text-xs text-tiki-brown/40 group-open:hidden">▼ Show</span>
                <span className="text-xs text-tiki-brown/40 hidden group-open:inline">▲ Hide</span>
              </div>
            </summary>
            <div className="mt-2 flex flex-col gap-4">
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
          </details>
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
            <Link href="/admin/media-health" className="text-xs font-bold text-ube-purple hover:text-ube-purple/70 transition-colors flex-shrink-0">
              View →
            </Link>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* F. LEGACY TOOLS (collapsed)                                       */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <details>
          <summary className="cursor-pointer list-none">
            <div id="legacy-tools" className="flex items-center gap-2 bg-white rounded-2xl border border-tiki-brown/10 px-5 py-3 shadow-sm hover:border-tiki-brown/20 transition-colors scroll-mt-4">
              <span className="text-sm font-bold text-tiki-brown flex-1">Legacy Image Generation Tools</span>
              <span className="text-xs text-tiki-brown/40">▼ Show</span>
            </div>
          </summary>
          <div className="mt-2 flex flex-col gap-4">
            <SectionGroupHeader
              icon="🖼️"
              title="Picture Panels"
              subtitle="Legacy AI tools for generating and reviewing story panel artwork."
              badge={
                panelCoverage.scenesMissingPanel > 0 ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warm-coral/15 text-warm-coral/80 uppercase tracking-wide">
                    Needs {panelCoverage.scenesMissingPanel} panel{panelCoverage.scenesMissingPanel !== 1 ? "s" : ""}
                  </span>
                ) : panelCoverage.totalActiveScenes > 0 ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green uppercase tracking-wide">
                    All panels done ✓
                  </span>
                ) : undefined
              }
            />
            <StoryPanelPromptBuilder scenes={activeScenes} raw={raw} tikiFlagged={tikiFlagged} episodeSlug={normalised.slug} charBySlug={charBySlug} characterPackages={characterPackages} sceneRefPackages={episodeRefPackages.scenePackages} />
            <BatchMissingPanelDraftsSection episodeSlug={normalised.slug} coverage={panelCoverage} missingScenes={missingPanelSceneInfos} />
            <SavedStoryPanelAssetLibrary raw={raw} scenes={scenes} episodeSlug={normalised.slug} />
          </div>
        </details>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* G. ADVANCED TOOLS                                                 */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <details id="advanced-tools" className="group scroll-mt-4">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between bg-white border border-tiki-brown/10 rounded-2xl px-5 py-4 shadow-sm hover:border-tiki-brown/20 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-base">🔧</span>
                <div>
                  <p className="text-sm font-bold text-tiki-brown">Advanced Tools</p>
                  <p className="text-xs text-tiki-brown/50">Developer/debug views and detailed manifests — grouped here to keep the main workflow simple.</p>
                </div>
              </div>
              <span className="text-tiki-brown/40 text-xs group-open:rotate-180 transition-transform flex-shrink-0 ml-3">▼</span>
            </div>
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            {/* Scene ID stability (diagnostic) */}
            <SceneIdStabilitySection
              episodeSlug={normalised.slug}
              totalScenes={sceneIdStats.totalScenes}
              scenesWithId={sceneIdStats.scenesWithId}
              totalPanels={sceneIdStats.totalPanels}
              panelsWithId={sceneIdStats.panelsWithId}
              totalClips={sceneIdStats.totalClips}
              clipsWithId={sceneIdStats.clipsWithId}
            />
            {/* Draft prompt & planning text */}
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
            ← Back to Story Studio
          </Link>
        </div>

      </section>
    </div>
  );
}
