import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, type SavedEpisodeDraft } from "@/lib/savedEpisodes";
import { getEpisodeScenes, getActiveEpisodeScenes } from "@/lib/episodeScenes";
import PublishReadyAction from "./PublishReadyAction";
import { deriveMediaPlan, type MediaPlan, type PanelPlan, type ClipPlan } from "@/lib/episodeMediaPlan";
import PanelDraftGenerator from "./PanelDraftGenerator";
import AnimationRouteTestPanel, { type SceneOption } from "./AnimationRouteTestPanel";
import ReorderPanelsSection, { type PanelSummary } from "./ReorderPanelsSection";
import EditPanelCopySection from "./EditPanelCopySection";
import AddSceneSection from "./AddSceneSection";
import EditSceneSection, { type SceneForEdit } from "./EditSceneSection";
import ArchiveSceneSection, { type SceneForArchive } from "./ArchiveSceneSection";
import SceneIdStabilitySection from "./SceneIdStabilitySection";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import type { Character } from "@/lib/content";
import { isCharacterApprovedForAdminUse, characterHasPrimaryReference } from "@/lib/characterEligibility";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Metadata ────────────────────────────────────────────────────────────────

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

// ─── Safe field helpers ───────────────────────────────────────────────────────

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

// ─── Badge helpers ────────────────────────────────────────────────────────────

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

// ─── Layout primitives ────────────────────────────────────────────────────────

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

// ─── Scene card ───────────────────────────────────────────────────────────────

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

// ─── Publish readiness checklist ─────────────────────────────────────────────

const CHECKLIST_CATEGORIES: {
  label: string;
  icon: string;
  items: string[];
}[] = [
  {
    label: "A. Story Quality",
    icon: "📖",
    items: [
      "Episode has a clear beginning, middle, and ending.",
      "Lesson or moral is clear and age-appropriate.",
      "Tone is warm, playful, and kid-friendly.",
      "Scene breakdown is easy to follow.",
    ],
  },
  {
    label: "B. Character Canon",
    icon: "🧸",
    items: [
      "Featured characters match their official personalities.",
      "Character behavior does not contradict canonical JSON.",
      "Tiki Trouble, if present, remains mischievous, funny, dramatic, and kid-friendly.",
      "No character is made scary, cruel, violent, older, realistic, or off-brand.",
    ],
  },
  {
    label: "C. Visual Prompt Safety",
    icon: "🖼️",
    items: [
      "Image prompt drafts are reference-anchored.",
      "Image prompt drafts do not redesign characters.",
      "Character colors, shapes, accessories, and identity details are protected.",
      "Official uploaded profile images and references must be used before any future visual generation.",
    ],
  },
  {
    label: "D. Animation Prompt Safety",
    icon: "🎬",
    items: [
      "Animation prompt drafts preserve official character design.",
      "Actions are kid-friendly and emotionally safe.",
      "No scary, violent, or intense animation direction is included.",
    ],
  },
  {
    label: "E. Publishing Readiness",
    icon: "✓",
    items: [
      "Review notes have been checked.",
      "Generated content has been reviewed by a human.",
      "Episode is not published automatically.",
      "Future publish action should only happen after final approval.",
    ],
  },
];

function ChecklistRow({ item }: { item: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-tiki-brown/70 leading-relaxed">
      {/* Static hollow square — visual indicator only, not interactive */}
      <span className="flex-shrink-0 mt-0.5 w-4 h-4 rounded border-2 border-tiki-brown/25 bg-tiki-brown/3 inline-block" />
      {item}
    </li>
  );
}

function PublishReadinessChecklist() {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">
      <div>
        <h2 className="text-base font-black text-tiki-brown mb-2">
          Publish Readiness Checklist
        </h2>
        <div className="flex items-start gap-2.5 bg-pineapple-yellow/15 border border-pineapple-yellow/40 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            Review each item before using the Publish-Ready Action below. The
            checklist is for human review only — it does not automatically
            enforce any conditions.
          </p>
        </div>
      </div>

      {CHECKLIST_CATEGORIES.map((cat) => (
        <div key={cat.label}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">{cat.icon}</span>
            <h3 className="text-sm font-bold text-tiki-brown">{cat.label}</h3>
          </div>
          <ul className="space-y-2.5 pl-1">
            {cat.items.map((item) => (
              <ChecklistRow key={item} item={item} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function PublicStatusCard({
  normalised,
  reviewObj,
  publishingObj,
}: {
  normalised: SavedEpisodeDraft;
  reviewObj: Record<string, unknown> | null;
  publishingObj: Record<string, unknown> | null;
}) {
  const isPublicReady =
    normalised.readyForPublicSite ||
    normalised.publicStatus === "published" ||
    (isRec(publishingObj) && publishingObj.publicStatus === "published");

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">
      <h2 className="text-base font-black text-tiki-brown">Current Public Status</h2>

      <dl className="flex flex-col gap-2">
        <MetaRow
          label="Public Status"
          value={str(publishingObj?.publicStatus) || normalised.publicStatus}
        />
        <MetaRow
          label="Ready for Public Site"
          value={String(normalised.readyForPublicSite)}
        />
        <MetaRow
          label="Approved for Save"
          value={String(normalised.approvedForSave)}
        />
        {reviewObj && str(reviewObj.status) && (
          <MetaRow label="Review Status" value={str(reviewObj.status)} />
        )}
      </dl>

      {isPublicReady ? (
        <div className="flex items-center gap-2.5 bg-tropical-green/15 border border-tropical-green/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">🟢</span>
          <p className="text-sm font-semibold text-tropical-green">
            This episode is marked public-ready in JSON.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 bg-tiki-brown/6 border border-tiki-brown/15 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">🔒</span>
          <p className="text-sm font-semibold text-tiki-brown/60">
            This episode is not public-ready yet.
          </p>
        </div>
      )}

      <p className="text-xs text-tiki-brown/50 leading-relaxed">
        Drafts remain private to the admin library until a future publishing
        phase marks them public-ready.
      </p>
    </div>
  );
}

// ─── Media Planning section ──────────────────────────────────────────────────

function MediaStatusPill({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-tiki-brown/4 rounded-2xl px-4 py-2.5 min-w-[7rem] text-center">
      <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-bold text-tiki-brown/55">{value}</span>
    </div>
  );
}

function PanelCard({ panel }: { panel: PanelPlan }) {
  return (
    <div className="border border-tiki-brown/10 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-blue/30 text-tiki-brown/60">
          Panel {panel.sceneNumber}
        </span>
        <span className="text-xs font-bold text-tiki-brown/70">{panel.panelTitle}</span>
      </div>
      {panel.summary && (
        <p className="text-xs text-tiki-brown/60 leading-relaxed">{panel.summary}</p>
      )}
      {panel.referenceCharacters.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {panel.referenceCharacters.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-ube-purple/8 text-ube-purple/70">
              {c}
            </span>
          ))}
        </div>
      )}
      {panel.imagePromptDraft && (
        <div className="bg-sky-blue/10 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">Image Prompt Draft</p>
          <p className="text-xs text-tiki-brown/60 leading-relaxed line-clamp-3">{panel.imagePromptDraft}</p>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-tiki-brown/35">
        <span className="font-semibold">Status:</span>
        <span className="font-bold uppercase tracking-wide text-warm-coral/60">{panel.status}</span>
        <span className="ml-auto font-mono">asset: —</span>
      </div>
    </div>
  );
}

function ClipCard({ clip }: { clip: ClipPlan }) {
  return (
    <div className="border border-tiki-brown/10 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green/80">
          Clip {clip.sceneNumber}
        </span>
        <span className="text-xs font-bold text-tiki-brown/70">{clip.clipTitle}</span>
        <span className="ml-auto text-xs text-tiki-brown/35 font-mono">{clip.durationSeconds}s</span>
      </div>
      {clip.summary && (
        <p className="text-xs text-tiki-brown/60 leading-relaxed">{clip.summary}</p>
      )}
      {clip.referenceCharacters.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {clip.referenceCharacters.map((c) => (
            <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-ube-purple/8 text-ube-purple/70">
              {c}
            </span>
          ))}
        </div>
      )}
      {clip.animationPromptDraft && (
        <div className="bg-tropical-green/8 rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">Animation Prompt Draft</p>
          <p className="text-xs text-tiki-brown/60 leading-relaxed line-clamp-3">{clip.animationPromptDraft}</p>
        </div>
      )}
      <div className="flex items-center gap-2 text-xs text-tiki-brown/35">
        <span className="font-semibold">Status:</span>
        <span className="font-bold uppercase tracking-wide text-warm-coral/60">{clip.status}</span>
        <span className="ml-auto font-mono">asset: —</span>
      </div>
    </div>
  );
}

function MediaPlanningSection({
  plan,
  tikiFlagged,
}: {
  plan: MediaPlan;
  tikiFlagged: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <h2 className="text-base font-black text-tiki-brown mb-2">Media Planning</h2>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          This episode can later become a still-image story, an animated short, or a read-aloud
          story. Media generation is not active yet.
        </p>
      </div>

      {/* Compact status summary */}
      <div className="flex flex-wrap gap-2">
        <MediaStatusPill label="Story Panels" value={`${plan.storyPanelMode.panels.length} planned · Not Started`} />
        <MediaStatusPill label="Animation Clips" value={`${plan.animationMode.clips.length} planned · Not Started`} />
        <MediaStatusPill label="Read-Aloud" value="Not Started" />
        <MediaStatusPill label="Approved Assets" value="0" />
      </div>

      {/* Future display note */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Future public story pages will support reading mode and video mode once media assets
          are generated, reviewed, approved, and attached.
        </p>
      </div>

      {/* ── A. Story Panel Mode ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🖼️</span>
          <h3 className="text-sm font-black text-tiki-brown">Story Panel Mode</h3>
          <span className="ml-auto text-xs font-bold text-warm-coral/60 uppercase tracking-wide">Not Started</span>
        </div>
        <p className="text-xs text-tiki-brown/55 leading-relaxed mb-3">
          {plan.storyPanelMode.description}
        </p>
        {plan.storyPanelMode.panels.length > 0 ? (
          <div className="flex flex-col gap-3">
            {plan.storyPanelMode.panels.map((panel) => (
              <PanelCard key={panel.sceneNumber} panel={panel} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-tiki-brown/40 italic">
            No scenes found to derive panels from.
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-tiki-brown/8" />

      {/* ── B. Animation Mode ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🎬</span>
          <h3 className="text-sm font-black text-tiki-brown">Animation Mode</h3>
          <span className="ml-auto text-xs font-bold text-warm-coral/60 uppercase tracking-wide">Not Started</span>
        </div>
        <p className="text-xs text-tiki-brown/55 leading-relaxed mb-3">
          {plan.animationMode.description}
        </p>
        {plan.animationMode.clips.length > 0 ? (
          <div className="flex flex-col gap-3">
            {plan.animationMode.clips.map((clip) => (
              <ClipCard key={clip.sceneNumber} clip={clip} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-tiki-brown/40 italic">
            No scenes found to derive animation clips from.
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-tiki-brown/8" />

      {/* ── C. Read-Aloud / Voiceover Mode ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🎙️</span>
          <h3 className="text-sm font-black text-tiki-brown">Read-Aloud / Voiceover Mode</h3>
          <span className="ml-auto text-xs font-bold text-warm-coral/60 uppercase tracking-wide">Not Started</span>
        </div>
        <p className="text-xs text-tiki-brown/55 leading-relaxed mb-3">
          {plan.readAloudMode.description}
        </p>
        <div className="flex flex-col gap-2">
          {plan.readAloudMode.voiceoverNotes ? (
            <div className="bg-pineapple-yellow/12 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Voiceover Notes</p>
              <p className="text-xs text-tiki-brown/65 leading-relaxed">{plan.readAloudMode.voiceoverNotes}</p>
            </div>
          ) : (
            <p className="text-xs text-tiki-brown/40 italic">No voiceover notes found.</p>
          )}
          <div className="bg-tiki-brown/4 rounded-xl px-4 py-3">
            <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">Caption Planning</p>
            <p className="text-xs text-tiki-brown/40 italic">Caption notes — not started.</p>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-tiki-brown/8" />

      {/* ── Media Approval Guardrails ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🔒</span>
          <h3 className="text-sm font-black text-tiki-brown">Media Approval Guardrails</h3>
        </div>
        <ul className="space-y-2">
          {[
            "Media assets must be reviewed before public display.",
            "Only approved assets should appear on public story pages.",
            "Still images must be reference-anchored to official character profile images.",
            "Video clips must preserve official character design.",
            "Generated media must not redesign characters.",
            "Public users should not freely generate character variations.",
            "Admin review is required before any generated image/video is published.",
          ].map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed">
              <span className="flex-shrink-0 mt-0.5 text-warm-coral/60">⚠</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Character fidelity reminder */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🎨</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          Every still image panel and animation clip must preserve official character body shape,
          colors, proportions, facial style, accessories, and cute baby-like design language.
        </p>
      </div>

      {/* Tiki guardrail */}
      {tikiFlagged && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
            dramatic, and kid-friendly. Do not make Tiki scary, violent, horror-like, cruel, evil,
            or too intense in any generated media.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Story Panel Prompt Builder ──────────────────────────────────────────────

const CHARACTER_FIDELITY_NOTES: Record<string, string[]> = {
  "pineapple baby": [
    "Preserve sunny yellow/golden body and green leafy crown.",
    "Maintain warm friendly face, rounded baby-like shape, and kind expression.",
  ],
  "ube baby": [
    "Preserve purple/lavender ube identity and gentle dreamy expression.",
    "Cozy magical feeling, rounded baby-like shape.",
  ],
  "kiwi baby": [
    "Preserve fuzzy kiwi-brown body, green kiwi top, leaf crown, and white blossom accent.",
    "Maintain warm eyes, blush, and sweet smile.",
  ],
  "coconut baby": [
    "Preserve warm coconut-brown and cream identity and calm comforting expression.",
    "Rounded baby-like shape.",
  ],
  "mango baby": [
    "Preserve mango yellow/orange identity and playful joyful expression.",
    "Tropical green leaf accents, energetic baby-like personality.",
  ],
  "tiki trouble": [
    "Preserve carved wooden tiki body, leafy green crown, and orange/red band.",
    "Mischievous kid-friendly expression — must remain funny, dramatic, sneaky, and kid-friendly.",
    "Do not make Tiki scary, violent, horror-like, cruel, evil, or too intense.",
  ],
};

const GLOBAL_FIDELITY_RULES = [
  "Preserve official body shape and silhouette.",
  "Preserve proportions — do not make characters taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve cute baby-like design language throughout.",
  "Do not redesign characters — no new features, altered silhouettes, or style changes.",
  "Do not use generic fruit mascots or loose 'inspired by' versions.",
  "Do not publish generated visuals without human approval.",
];

function buildDeterministicPrompt({
  sceneNum,
  title,
  characters,
  setting,
  tone,
  emotionalBeat,
  visualNotes,
}: {
  sceneNum: number | string;
  title: string;
  characters: string[];
  setting: string;
  tone: string;
  emotionalBeat: string;
  visualNotes: string;
}): string {
  const charList = characters.length > 0 ? characters.join(", ") : "the Fruit Baby characters";
  const parts: string[] = [
    `Create a kid-friendly still storybook panel for Scene ${sceneNum}${title ? `, "${title}"` : ""}.`,
    `Show ${charList}${setting ? ` in ${setting}` : ""}.`,
  ];
  if (tone) parts.push(`The scene should feel ${tone}.`);
  if (emotionalBeat) parts.push(`Communicate: ${emotionalBeat}.`);
  if (visualNotes) parts.push(`Visual notes: ${visualNotes}.`);
  parts.push(
    "Preserve official Fruit Baby character designs exactly — use uploaded reference images.",
    "Do not redesign characters."
  );
  return parts.join(" ");
}

function getCharacterFidelityNotes(
  characters: string[]
): { character: string; notes: string[] }[] {
  return characters
    .map((c) => {
      const nameKey = c.toLowerCase().replace(/-/g, " ").trim();
      const notes = CHARACTER_FIDELITY_NOTES[nameKey];
      return notes ? { character: c, notes } : null;
    })
    .filter((x): x is { character: string; notes: string[] } => x !== null);
}

function PanelPromptCard({
  scene,
  index,
  episodeSetting,
  episodeTone,
  episodeSlug,
  episodeFeaturedCharacters,
  charBySlug,
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeSetting: string;
  episodeTone: string;
  episodeSlug: string;
  episodeFeaturedCharacters: string[];
  charBySlug: Record<string, Character>;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const sceneNum = typeof num === "number" ? num : index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const characters = strArr(scene.characters);
  const visualNotes = str(scene.visualNotes);
  const emotionalBeat = str(scene.emotionalBeat);
  const existingPrompt = str(scene.imagePromptDraft);
  const hasTikiInScene = characters.some((c) => c.toLowerCase().includes("tiki"));
  const refChars = characters.length > 0 ? characters : episodeFeaturedCharacters;

  const promptText =
    existingPrompt ||
    buildDeterministicPrompt({
      sceneNum: num as number | string,
      title,
      characters,
      setting: episodeSetting,
      tone: episodeTone,
      emotionalBeat,
      visualNotes,
    });

  const fidelityNotes = getCharacterFidelityNotes(characters);

  return (
    <div id={`panel-prompt-scene-${sceneNum}`} className="border border-tiki-brown/10 rounded-2xl p-5 flex flex-col gap-4">
      {/* Panel header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-blue/30 text-tiki-brown/70">
          Panel {String(num)}
        </span>
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/60 uppercase tracking-wide">
          Prompt Draft
        </span>
      </div>

      {summary && <p className="text-sm text-tiki-brown/65 leading-relaxed">{summary}</p>}

      {/* Reference characters */}
      {characters.length > 0 && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
            Reference Characters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {characters.map((c) => (
              <span
                key={c}
                className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Visual notes + emotional beat */}
      {(visualNotes || emotionalBeat) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {visualNotes && (
            <div>
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
                Visual Notes
              </p>
              <p className="text-xs text-tiki-brown/65 leading-relaxed">{visualNotes}</p>
            </div>
          )}
          {emotionalBeat && (
            <div>
              <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
                Emotional Beat
              </p>
              <p className="text-xs text-tiki-brown/65 leading-relaxed">{emotionalBeat}</p>
            </div>
          )}
        </div>
      )}

      {/* Prompt copy block */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            {existingPrompt ? "Image Prompt Draft (from saved data)" : "Image Prompt Draft (deterministic)"}
          </p>
          {existingPrompt && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green font-bold">
              Saved
            </span>
          )}
        </div>
        <pre className="bg-sky-blue/12 border border-sky-blue/30 rounded-xl px-4 py-3 text-xs text-tiki-brown/70 leading-relaxed whitespace-pre-wrap break-words font-sans select-all">
          {promptText}
        </pre>
        <p className="text-xs text-tiki-brown/35 italic">Select text above to copy.</p>
      </div>

      {/* Per-character fidelity notes */}
      {fidelityNotes.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Character Fidelity Notes
          </p>
          {fidelityNotes.map(({ character, notes }) => {
            const nameSlug = character.toLowerCase().replace(/ /g, "-").trim();
            const charObj = charBySlug[nameSlug];
            const missingReference = charObj ? !characterHasPrimaryReference(charObj) : false;
            return (
              <div
                key={character}
                className="bg-warm-coral/6 border border-warm-coral/15 rounded-xl px-4 py-3"
              >
                {missingReference && (
                  <p className="text-xs font-semibold text-warm-coral/80 mb-1.5">
                    Reference readiness warning: {character} is approved for admin use but does not yet have a Primary Official Reference or approved reference asset.
                  </p>
                )}
                <p className="text-xs font-bold text-tiki-brown/60 mb-1.5">{character}</p>
                <ul className="space-y-1">
                  {notes.map((note, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed"
                    >
                      <span className="flex-shrink-0 text-warm-coral/50 mt-0.5">•</span>
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Tiki scene-level guardrail */}
      {hasTikiInScene && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
            and kid-friendly. Do not make Tiki scary, violent, or too intense.
          </p>
        </div>
      )}

      {/* Reference assets required */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">📎</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Reference Assets Required.</strong>{" "}
          Future image generation must use the official uploaded character profile images and
          approved reference images for every character in this panel.
        </p>
      </div>

      {/* Panel status row — read-only */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-tiki-brown/8">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Status:</span>
          <span className="text-xs font-bold text-pineapple-yellow/80 uppercase tracking-wide">
            Prompt Draft
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Image Asset:</span>
          <span className="text-xs font-bold text-warm-coral/60 uppercase tracking-wide">
            Not Generated
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Approved:</span>
          <span className="text-xs font-bold text-warm-coral/60 uppercase tracking-wide">No</span>
        </div>
      </div>

      {/* Temporary draft generation — client-side, nothing is saved */}
      <PanelDraftGenerator
        episodeSlug={episodeSlug}
        sceneNumber={sceneNum}
        panelPrompt={promptText}
        referenceCharacters={refChars}
        sceneTitle={title}
        sceneSummary={summary}
      />
    </div>
  );
}

function StoryPanelPromptBuilder({
  scenes,
  raw,
  tikiFlagged,
  episodeSlug,
  charBySlug,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
  episodeSlug: string;
  charBySlug: Record<string, Character>;
}) {
  const setting = str(raw.setting);
  const tone = str(raw.tone);
  const featuredCharacters = strArr(raw.featuredCharacters);

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🖼️</span>
          <h2 className="text-base font-black text-tiki-brown">Story Panel Prompt Builder</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple uppercase tracking-wide">
            Admin Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Generate temporary story panel image drafts for review. Drafts are not saved, uploaded,
          or attached to this episode. Human review and approval are required before any image is used.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        {(
          [
            ["Planned Panels", String(scenes.length)],
            ["Approved Image Assets", "0"],
            ["Generation Status", "Not Started"],
            ["Media Mode", "Story Panels"],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 bg-sky-blue/10 border border-sky-blue/20 rounded-2xl px-4 py-2.5 min-w-[8rem] text-center"
          >
            <span className="text-sm font-black text-tiki-brown">{value}</span>
            <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Temporary draft warning */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">⚠️</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold text-tiki-brown">Generated panel drafts are temporary review images only.</strong>{" "}
          They are not saved, uploaded, attached to this episode, committed to GitHub, or published.
        </p>
      </div>

      {/* Panel prompt cards */}
      {scenes.length === 0 ? (
        <p className="text-sm text-tiki-brown/40 italic">
          No scenes found. Save an episode with a sceneBreakdown to see panel prompts.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {scenes.map((scene, i) => (
            <PanelPromptCard
              key={i}
              scene={scene}
              index={i}
              episodeSetting={setting}
              episodeTone={tone}
              episodeSlug={episodeSlug}
              episodeFeaturedCharacters={featuredCharacters}
              charBySlug={charBySlug}
            />
          ))}
        </div>
      )}

      {/* Global visual fidelity rules */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-3">
          Global Visual Fidelity Rules
        </p>
        <ul className="space-y-1.5">
          {GLOBAL_FIDELITY_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed">
              <span className="flex-shrink-0 text-ube-purple/50 mt-0.5">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Episode-level Tiki guardrail */}
      {tikiFlagged && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚡</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
            dramatic, and kid-friendly across all panels. Do not make Tiki scary, violent,
            horror-like, cruel, evil, or too intense in any generated image.
          </p>
        </div>
      )}

      {/* Character fidelity reminder */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🎨</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          Every story panel must preserve official character body shape, colors, proportions, facial
          style, accessories, and cute baby-like design language. No generated image should be
          published without human approval.
        </p>
      </div>
    </div>
  );
}