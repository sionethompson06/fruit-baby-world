import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, type SavedEpisodeDraft } from "@/lib/savedEpisodes";
import PublishReadyAction from "./PublishReadyAction";
import { deriveMediaPlan, type MediaPlan, type PanelPlan, type ClipPlan } from "@/lib/episodeMediaPlan";
import PanelDraftGenerator from "./PanelDraftGenerator";

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

function SceneCard({ scene, index }: { scene: Record<string, unknown>; index: number }) {
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
    <div className="border border-tiki-brown/10 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple">
          Scene {String(num)}
        </span>
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
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
      const key = c.toLowerCase().trim();
      const notes = CHARACTER_FIDELITY_NOTES[key];
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
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeSetting: string;
  episodeTone: string;
  episodeSlug: string;
  episodeFeaturedCharacters: string[];
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
    <div className="border border-tiki-brown/10 rounded-2xl p-5 flex flex-col gap-4">
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
          {fidelityNotes.map(({ character, notes }) => (
            <div
              key={character}
              className="bg-warm-coral/6 border border-warm-coral/15 rounded-xl px-4 py-3"
            >
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
          ))}
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
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
  episodeSlug: string;
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

// ─── Story Panel Asset Manifest Preview ──────────────────────────────────────

function deriveAltText(scene: Record<string, unknown>, index: number): string {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const short = summary.length > 70 ? summary.slice(0, 67) + "…" : summary;
  if (title && short) return `Story panel for Scene ${String(num)}: ${title}. ${short}`;
  if (title) return `Story panel for Scene ${String(num)}: ${title}.`;
  return `Story panel for Scene ${String(num)}.`;
}

function ManifestPanelCard({
  scene,
  index,
}: {
  scene: Record<string, unknown>;
  index: number;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const characters = strArr(scene.characters);
  const promptAvailable = str(scene.imagePromptDraft)
    ? "Yes (saved)"
    : "Yes (deterministic)";
  const altText = deriveAltText(scene, index);
  const hasTikiInScene = characters.some((c) => c.toLowerCase().includes("tiki"));

  return (
    <div className="border border-tiki-brown/10 rounded-2xl p-4 flex flex-col gap-3 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-blue/20 text-tiki-brown/60">
          Panel {String(num)}
        </span>
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
          Not Saved
        </span>
      </div>

      {summary && (
        <p className="text-xs text-tiki-brown/55 leading-relaxed">{summary}</p>
      )}

      {/* Manifest fields */}
      <dl className="grid grid-cols-[11rem_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-tiki-brown/40 font-semibold">Status</dt>
        <dd className="font-bold text-tiki-brown/45 uppercase tracking-wide">not-saved</dd>

        <dt className="text-tiki-brown/40 font-semibold">Approval</dt>
        <dd className="font-bold text-warm-coral/55 uppercase tracking-wide">not-approved</dd>

        <dt className="text-tiki-brown/40 font-semibold">Prompt available</dt>
        <dd className="text-tiki-brown/60">{promptAvailable}</dd>

        <dt className="text-tiki-brown/40 font-semibold">Temp draft (session)</dt>
        <dd className="text-tiki-brown/35 italic">Session only — check panel above ↑</dd>

        <dt className="text-tiki-brown/40 font-semibold">Asset saved</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Asset approved</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Public use allowed</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Human review</dt>
        <dd className="font-semibold text-tiki-brown/55">Required</dd>

        <dt className="text-tiki-brown/40 font-semibold">Storage provider</dt>
        <dd className="text-tiki-brown/35 italic">Not configured</dd>
      </dl>

      {/* Reference characters */}
      {characters.length > 0 && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide mb-1.5">
            Reference Characters
          </p>
          <div className="flex flex-wrap gap-1.5">
            {characters.map((c) => (
              <span
                key={c}
                className="text-xs px-2 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Alt text placeholder */}
      <div>
        <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide mb-0.5">
          Future Alt Text (placeholder)
        </p>
        <p className="text-xs text-tiki-brown/50 italic leading-relaxed">{altText}</p>
      </div>

      {/* Tiki scene warning */}
      {hasTikiInScene && (
        <div className="flex items-start gap-2 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-3 py-2">
          <span className="text-xs flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            Tiki Trouble must remain mischievous, funny, dramatic, and kid-friendly. Reject drafts
            that make Tiki scary, violent, horror-like, cruel, evil, or too intense.
          </p>
        </div>
      )}
    </div>
  );
}

function StoryPanelAssetManifest({
  scenes,
  raw,
  tikiFlagged,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
}) {
  void raw; // available for future field extraction

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📋</span>
          <h2 className="text-base font-black text-tiki-brown">
            Story Panel Asset Manifest Preview
          </h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
            Preview Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          This preview shows the future asset data shape for approved story panel images. Nothing
          is saved, uploaded, attached to the episode, or published yet.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["Planned Panels", String(scenes.length), false],
            ["Saved Assets", "0", true],
            ["Approved Assets", "0", true],
            ["Public-Ready Assets", "0", true],
          ] as [string, string, boolean][]
        ).map(([label, value, isZero]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 bg-tiki-brown/4 border border-tiki-brown/8 rounded-2xl px-3 py-2.5 text-center"
          >
            <span
              className={`text-sm font-black ${isZero ? "text-warm-coral/60" : "text-tiki-brown"}`}
            >
              {value}
            </span>
            <span className="text-xs font-semibold text-tiki-brown/35 uppercase tracking-wide leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Additional summary rows */}
      <dl className="grid grid-cols-[12rem_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Temp drafts (session)</dt>
        <dd className="text-tiki-brown/35 italic">Session only — check panels above ↑</dd>

        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Storage status</dt>
        <dd className="font-bold text-warm-coral/55 uppercase tracking-wide">Not Configured</dd>

        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Manifest status</dt>
        <dd className="font-bold text-pineapple-yellow/70 uppercase tracking-wide">Preview Only</dd>
      </dl>

      {/* Per-panel manifest cards */}
      {scenes.length === 0 ? (
        <p className="text-sm text-tiki-brown/40 italic">
          No scenes found. Save an episode with a sceneBreakdown to see the manifest preview.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {scenes.map((scene, i) => (
            <ManifestPanelCard key={i} scene={scene} index={i} />
          ))}
        </div>
      )}

      {/* Character fidelity requirement */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🎨</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Character Fidelity Requirement:</strong>{" "}
          Each approved story panel asset must be checked against official character profile images
          before it can be attached to an episode or displayed publicly.
        </p>
      </div>

      {/* Tiki episode-level reminder */}
      {tikiFlagged && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚡</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Assets must remain mischievous,
            funny, dramatic, and kid-friendly. Reject drafts that make Tiki scary, violent,
            horror-like, cruel, evil, or too intense.
          </p>
        </div>
      )}

      {/* Storage Decision Reminder */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
          Storage Decision Reminder
        </p>
        <ul className="space-y-1.5">
          {[
            "Generated images should not be stored in large amounts directly in GitHub.",
            "Episode JSON should eventually reference approved media asset URLs — not embed base64 data.",
            "Approved media must be reviewed before any public display.",
            "Public story pages should only show approved media assets.",
            "Temporary base64 previews are not permanent assets.",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-xs text-tiki-brown/60 leading-relaxed"
            >
              <span className="flex-shrink-0 text-tiki-brown/25 mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Future storage strategy */}
      <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          <strong className="font-semibold">Future phase:</strong> Approved story panel images
          should be stored in a media storage service, then attached to the episode JSON as approved
          asset references. GitHub should store lightweight JSON references, not large generated
          image files.
        </p>
      </div>

    </div>
  );
}

// ─── Animation Prompt Builder ────────────────────────────────────────────────

const GLOBAL_ANIMATION_FIDELITY_RULES = [
  "Preserve official body shape and silhouette in motion.",
  "Preserve proportions — do not make characters taller, thinner, older, or more realistic.",
  "Preserve eye style, mouth style, and blush/cheek details throughout all frames.",
  "Preserve fruit/body textures, leaf/crown shapes, and accessories.",
  "Preserve color palette exactly — do not shift hues or desaturate.",
  "Preserve cute baby-like design language throughout all frames.",
  "Use gentle kid-friendly motion — soft, bouncy, warm, and expressive.",
  "Avoid scary, violent, intense, harsh, or jarring movement.",
  "Do not redesign characters — no new features, altered silhouettes, or style changes.",
  "Do not use generic fruit mascots or loose 'inspired by' versions.",
  "Do not publish generated animation without human approval.",
];

function buildDeterministicAnimationPrompt({
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
    `Create a short kid-friendly animated cartoon clip for Scene ${sceneNum}${title ? `, "${title}"` : ""}.`,
    `Show ${charList}${setting ? ` in ${setting}` : ""}.`,
    "The action should be gentle, clear, and easy for children to follow.",
  ];
  if (tone) parts.push(`The scene should feel ${tone}.`);
  if (emotionalBeat) parts.push(`Communicate: ${emotionalBeat}.`);
  if (visualNotes) parts.push(`Visual notes: ${visualNotes}.`);
  parts.push(
    "Use soft storybook-style movement, simple camera direction, and warm expressions.",
    "Preserve official Fruit Baby character designs exactly — use uploaded reference images.",
    "Do not redesign characters."
  );
  return parts.join(" ");
}

function AnimationPromptCard({
  scene,
  index,
  episodeSetting,
  episodeTone,
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeSetting: string;
  episodeTone: string;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const characters = strArr(scene.characters);
  const visualNotes = str(scene.visualNotes);
  const emotionalBeat = str(scene.emotionalBeat);
  const existingPrompt = str(scene.animationPromptDraft);
  const hasTikiInScene = characters.some((c) => c.toLowerCase().includes("tiki"));

  const promptText =
    existingPrompt ||
    buildDeterministicAnimationPrompt({
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
    <div className="border border-tiki-brown/10 rounded-2xl p-5 flex flex-col gap-4">
      {/* Clip header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green/80">
          Clip {String(num)}
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

      {/* Animation planning details */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["Suggested Duration", "6 seconds"],
            ["Movement Style", "Gentle cartoon movement"],
            ["Camera Style", "Simple child-friendly framing"],
            ["Audio / Voiceover", "Not generated"],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-tiki-brown/4 rounded-xl px-3 py-2">
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">
              {label}
            </p>
            <p className="text-xs text-tiki-brown/65 font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Prompt copy block */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            {existingPrompt
              ? "Animation Prompt Draft (from saved data)"
              : "Animation Prompt Draft (deterministic)"}
          </p>
          {existingPrompt && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green font-bold">
              Saved
            </span>
          )}
        </div>
        <pre className="bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-4 py-3 text-xs text-tiki-brown/70 leading-relaxed whitespace-pre-wrap break-words font-sans select-all">
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
          {fidelityNotes.map(({ character, notes }) => (
            <div
              key={character}
              className="bg-warm-coral/6 border border-warm-coral/15 rounded-xl px-4 py-3"
            >
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
          ))}
        </div>
      )}

      {/* Tiki scene-level guardrail */}
      {hasTikiInScene && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Must remain mischievous, funny,
            and kid-friendly. Do not make Tiki scary, violent, or too intense in animation.
          </p>
        </div>
      )}

      {/* Reference assets required */}
      <div className="flex items-start gap-2.5 bg-pineapple-yellow/12 border border-pineapple-yellow/30 rounded-xl px-3 py-2.5">
        <span className="text-sm flex-shrink-0">📎</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Reference Assets Required.</strong>{" "}
          Future video generation must use the official uploaded character profile images and
          approved reference images for every character in this clip.
        </p>
      </div>

      {/* Clip status row — read-only */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-tiki-brown/8">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Status:</span>
          <span className="text-xs font-bold text-pineapple-yellow/80 uppercase tracking-wide">
            Prompt Draft
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Video Asset:</span>
          <span className="text-xs font-bold text-warm-coral/60 uppercase tracking-wide">
            Not Generated
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Approved:</span>
          <span className="text-xs font-bold text-warm-coral/60 uppercase tracking-wide">No</span>
        </div>
      </div>
    </div>
  );
}

function AnimationPromptBuilder({
  scenes,
  raw,
  tikiFlagged,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
}) {
  const setting = str(raw.setting);
  const tone = str(raw.tone);
  const estimatedSeconds = scenes.length * 6;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎬</span>
          <h2 className="text-base font-black text-tiki-brown">Animation Prompt Builder</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50 uppercase tracking-wide">
            Read-Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          These prompts prepare future animated cartoon-style clips. No videos are generated yet.
          Future animation generation must use official character references and human approval.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        {(
          [
            ["Planned Clips", String(scenes.length)],
            ["Approved Video Assets", "0"],
            ["Generation Status", "Not Started"],
            ["Media Mode", "Animation Clips"],
            ["Est. Draft Length", `${estimatedSeconds}s`],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 bg-tropical-green/8 border border-tropical-green/20 rounded-2xl px-4 py-2.5 min-w-[8rem] text-center"
          >
            <span className="text-sm font-black text-tiki-brown">{value}</span>
            <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Duration note */}
      {scenes.length > 0 && (
        <p className="text-xs text-tiki-brown/50 leading-relaxed">
          Estimated animation draft length at 6 seconds per scene:{" "}
          <strong className="text-tiki-brown/70">{estimatedSeconds} seconds</strong> (
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""}).
        </p>
      )}

      {/* No generation notice */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Video generation is not active. These are text-only prompt drafts for planning purposes.
          No video assets have been created. Official character reference images must be provided
          before any animation generation begins.
        </p>
      </div>

      {/* Animation prompt cards */}
      {scenes.length === 0 ? (
        <p className="text-sm text-tiki-brown/40 italic">
          No scenes found. Save an episode with a sceneBreakdown to see animation prompts.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {scenes.map((scene, i) => (
            <AnimationPromptCard
              key={i}
              scene={scene}
              index={i}
              episodeSetting={setting}
              episodeTone={tone}
            />
          ))}
        </div>
      )}

      {/* Global animation fidelity rules */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-3">
          Global Animation Fidelity Rules
        </p>
        <ul className="space-y-1.5">
          {GLOBAL_ANIMATION_FIDELITY_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed">
              <span className="flex-shrink-0 text-tropical-green/50 mt-0.5">•</span>
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
            dramatic, and kid-friendly across all animation clips. Do not make Tiki scary, violent,
            horror-like, cruel, evil, or too intense in any generated video.
          </p>
        </div>
      )}

      {/* Character fidelity reminder */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🎨</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          Every animation clip must preserve official character body shape, colors, proportions,
          facial style, accessories, and cute baby-like design language. No generated video should
          be published without human approval.
        </p>
      </div>
    </div>
  );
}

// ─── Read-Aloud / Voiceover Prompt Builder ───────────────────────────────────

const CHARACTER_VOICE_GUIDANCE: Record<string, string> = {
  "pineapple baby": "Warm, kind, and encouraging — a gentle reassuring voice.",
  "ube baby": "Gentle, dreamy, and soft — a soothing calm presence.",
  "kiwi baby": "Cheerful, curious, and sweet — bright and expressive.",
  "coconut baby": "Calm, comforting, and dependable — steady and warm.",
  "mango baby": "Playful, energetic, and joyful — enthusiastic and upbeat.",
  "tiki trouble": "Dramatic, mischievous, and funny — but never scary or cruel.",
};

const NARRATION_SAFETY_RULES = [
  "Keep narration warm and emotionally safe for young children.",
  "Avoid harsh, scary, or jarring delivery.",
  "Avoid sarcasm that could feel mean-spirited.",
  "Keep conflict easy for young children to understand and follow.",
  "Reinforce kindness, friendship, empathy, courage, or problem-solving.",
  "Keep Tiki playful and funny rather than frightening.",
  "Use expressive but calm narration that matches the lesson.",
  "Do not publish generated audio without human approval.",
];

function buildDeterministicNarration({
  sceneNum,
  title,
  emotionalBeat,
  lesson,
  tone,
}: {
  sceneNum: number | string;
  title: string;
  emotionalBeat: string;
  lesson: string;
  tone: string;
}): string {
  const parts: string[] = [
    `Read Scene ${sceneNum}${title ? `, "${title},"` : ""} in a warm, gentle, kid-friendly voice.`,
  ];
  if (emotionalBeat) parts.push(`Emphasize the emotional beat: ${emotionalBeat}.`);
  parts.push("Keep pacing slow enough for young children to follow.");
  if (tone) parts.push(`The scene should feel ${tone}.`);
  if (lesson) parts.push(`Use expressive but calm narration that supports the lesson: ${lesson}.`);
  parts.push("Pause naturally between sentences. Make the story feel safe, fun, and engaging.");
  return parts.join(" ");
}

function getVoiceGuidance(characters: string[]): { character: string; guidance: string }[] {
  return characters
    .map((c) => {
      const key = c.toLowerCase().trim();
      const guidance = CHARACTER_VOICE_GUIDANCE[key];
      return guidance ? { character: c, guidance } : null;
    })
    .filter((x): x is { character: string; guidance: string } => x !== null);
}

function ReadAloudCard({
  scene,
  index,
  episodeTone,
  episodeLesson,
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeTone: string;
  episodeLesson: string;
}) {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const characters = strArr(scene.characters);
  const emotionalBeat = str(scene.emotionalBeat);
  const existingVoiceover = strArr(scene.voiceoverNotes).join(" ").trim();
  const dialogue = strArr(scene.dialogueDraft);
  const hasTikiInScene = characters.some((c) => c.toLowerCase().includes("tiki"));

  const narrationText =
    existingVoiceover ||
    buildDeterministicNarration({
      sceneNum: num as number | string,
      title,
      emotionalBeat,
      lesson: episodeLesson,
      tone: episodeTone,
    });

  const voiceGuidance = getVoiceGuidance(characters);

  return (
    <div className="border border-tiki-brown/10 rounded-2xl p-5 flex flex-col gap-4">
      {/* Card header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-pineapple-yellow/30 text-tiki-brown/70">
          Scene {String(num)}
        </span>
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-sky-blue/25 text-tiki-brown/60 uppercase tracking-wide">
          Planning Draft
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

      {/* Emotional beat */}
      {emotionalBeat && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
            Emotional Tone
          </p>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">{emotionalBeat}</p>
        </div>
      )}

      {/* Dialogue notes */}
      {dialogue.length > 0 && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1.5">
            Dialogue Draft (possible read-aloud lines)
          </p>
          <ul className="space-y-1">
            {dialogue.map((line, i) => (
              <li key={i} className="text-xs font-mono text-tiki-brown/65 leading-relaxed">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Planning detail tiles */}
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["Suggested Pacing", "Gentle and clear"],
            ["Suggested Tone", episodeTone || "Warm and playful"],
            ["Caption Status", "Not generated"],
            ["Voice Asset", "Not generated"],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div key={label} className="bg-tiki-brown/4 rounded-xl px-3 py-2">
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-0.5">
              {label}
            </p>
            <p className="text-xs text-tiki-brown/65 font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {/* Narration planning copy block */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            {existingVoiceover
              ? "Narration / Voiceover Notes (from saved data)"
              : "Narration / Voiceover Notes (deterministic)"}
          </p>
          {existingVoiceover && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-tropical-green/15 text-tropical-green font-bold">
              Saved
            </span>
          )}
        </div>
        <pre className="bg-pineapple-yellow/10 border border-pineapple-yellow/30 rounded-xl px-4 py-3 text-xs text-tiki-brown/70 leading-relaxed whitespace-pre-wrap break-words font-sans select-all">
          {narrationText}
        </pre>
        <p className="text-xs text-tiki-brown/35 italic">Select text above to copy.</p>
      </div>

      {/* Per-character voice guidance */}
      {voiceGuidance.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
            Character Voice Guidance
          </p>
          {voiceGuidance.map(({ character, guidance }) => (
            <div
              key={character}
              className="flex items-start gap-2.5 bg-sky-blue/10 border border-sky-blue/20 rounded-xl px-3 py-2.5"
            >
              <span className="text-xs font-bold text-tiki-brown/60 whitespace-nowrap">
                {character}:
              </span>
              <span className="text-xs text-tiki-brown/65 leading-relaxed">{guidance}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tiki voice guardrail */}
      {hasTikiInScene && (
        <div className="flex items-start gap-2.5 bg-warm-coral/10 border border-warm-coral/25 rounded-xl px-3 py-2.5">
          <span className="text-sm flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Voice direction should be
            mischievous, funny, dramatic, and kid-friendly. Do not make him frightening, cruel,
            violent, horror-like, or too intense.
          </p>
        </div>
      )}

      {/* Status row — read-only */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-tiki-brown/8">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Status:</span>
          <span className="text-xs font-bold text-pineapple-yellow/80 uppercase tracking-wide">
            Planning Draft
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Voice Asset:</span>
          <span className="text-xs font-bold text-warm-coral/60 uppercase tracking-wide">
            Not Generated
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tiki-brown/40 font-semibold">Approved:</span>
          <span className="text-xs font-bold text-warm-coral/60 uppercase tracking-wide">No</span>
        </div>
      </div>
    </div>
  );
}

function ReadAloudPromptBuilder({
  scenes,
  raw,
  tikiFlagged,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
}) {
  const tone = str(raw.tone);
  const lesson = str(raw.lesson);
  const topVoiceover = strArr(raw.voiceoverNotes).join(" ").trim();

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎙️</span>
          <h2 className="text-base font-black text-tiki-brown">
            Read-Aloud / Voiceover Prompt Builder
          </h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50 uppercase tracking-wide">
            Read-Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          These notes prepare future narration, captions, and read-aloud experiences. No audio or
          voice generation is active yet. Future audio must be reviewed for age-appropriate tone,
          warmth, and character consistency.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex flex-wrap gap-3">
        {(
          [
            ["Narration Segments", String(scenes.length)],
            ["Caption Status", "Not Started"],
            ["Voice Assets", "Not Generated"],
            ["Approved Audio", "0"],
            ["Read-Aloud Mode", "Not Started"],
          ] as [string, string][]
        ).map(([label, value]) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 bg-pineapple-yellow/10 border border-pineapple-yellow/25 rounded-2xl px-4 py-2.5 min-w-[8rem] text-center"
          >
            <span className="text-sm font-black text-tiki-brown">{value}</span>
            <span className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide leading-tight">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Public guidance note */}
      <div className="flex items-start gap-3 bg-tropical-green/8 border border-tropical-green/20 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">📖</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Read-aloud content should help children follow the story, understand the lesson, and feel
          emotionally safe.
        </p>
      </div>

      {/* Episode-level voiceover notes */}
      {topVoiceover && (
        <div>
          <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-2">
            Episode-Level Voiceover Notes
          </p>
          <div className="bg-pineapple-yellow/10 border border-pineapple-yellow/25 rounded-xl px-4 py-3">
            <p className="text-xs text-tiki-brown/70 leading-relaxed">{topVoiceover}</p>
          </div>
        </div>
      )}

      {/* No generation notice */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          Audio generation is not active. These are text-only planning notes for narration,
          captions, and voice direction. No voice assets have been created. Human review is required
          before any audio is produced or published.
        </p>
      </div>

      {/* Scene read-aloud cards */}
      {scenes.length === 0 ? (
        <p className="text-sm text-tiki-brown/40 italic">
          No scenes found. Save an episode with a sceneBreakdown to see read-aloud planning notes.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {scenes.map((scene, i) => (
            <ReadAloudCard
              key={i}
              scene={scene}
              index={i}
              episodeTone={tone}
              episodeLesson={lesson}
            />
          ))}
        </div>
      )}

      {/* Character voice guidance reference */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-3">
          Character Voice Guidance Reference
        </p>
        <div className="flex flex-col gap-2">
          {Object.entries(CHARACTER_VOICE_GUIDANCE).map(([key, guidance]) => {
            const label = key
              .split(" ")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ");
            return (
              <div key={key} className="flex items-start gap-2.5">
                <span className="text-xs font-bold text-tiki-brown/60 whitespace-nowrap min-w-[8rem]">
                  {label}:
                </span>
                <span className="text-xs text-tiki-brown/65 leading-relaxed">{guidance}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Narration safety rules */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-3">
          Child-Safety Narration Guardrails
        </p>
        <ul className="space-y-1.5">
          {NARRATION_SAFETY_RULES.map((rule) => (
            <li key={rule} className="flex items-start gap-2 text-xs text-tiki-brown/65 leading-relaxed">
              <span className="flex-shrink-0 text-pineapple-yellow/70 mt-0.5">•</span>
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Episode-level Tiki voice guardrail */}
      {tikiFlagged && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚡</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble Voice Direction:</strong> Must be
            mischievous, funny, dramatic, and kid-friendly across all narration and dialogue.
            Do not make Tiki frightening, cruel, violent, horror-like, or too intense.
          </p>
        </div>
      )}

      {/* Approval reminder */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-xs text-tiki-brown/65 leading-relaxed">
          No generated audio or voice asset should be published without human review and approval.
          Voice direction notes are for planning only — no audio has been produced.
        </p>
      </div>
    </div>
  );
}

// ─── Media Production Overview ───────────────────────────────────────────────

const MEDIA_PIPELINE_STEPS = [
  "Review episode text content.",
  "Review character fidelity against official profiles.",
  "Generate still-image panel prompt drafts.",
  "Review and approve story panel images.",
  "Generate animation clip prompt drafts.",
  "Review and approve animation clips.",
  "Prepare read-aloud narration and captions.",
  "Attach approved media assets to the episode.",
  "Publish media-enhanced story publicly.",
];

function MediaProductionOverview({
  scenes,
  isPublicReady,
}: {
  scenes: Record<string, unknown>[];
  isPublicReady: boolean;
}) {
  const count = scenes.length;
  const estimatedSeconds = count * 6;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📊</span>
          <h2 className="text-base font-black text-tiki-brown">Media Production Overview</h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/50 uppercase tracking-wide">
            Read-Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          This overview tracks future media readiness for still-image story panels, animated clips,
          and read-aloud narration. Media generation and asset approval are not active yet.
        </p>
      </div>

      {/* A–D summary cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* A. Story Panels */}
        <div className="border border-sky-blue/30 rounded-2xl p-4 flex flex-col gap-1.5 bg-sky-blue/5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🖼️</span>
            <h3 className="text-sm font-black text-tiki-brown">Story Panels</h3>
          </div>
          {(
            [
              ["Planned Panels", String(count)],
              ["Generated Images", "0"],
              ["Approved Images", "0"],
              ["Status", "Not Started"],
              ["Source", "Scene Breakdown"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
              <dd className="text-xs text-tiki-brown/70 font-bold">{value}</dd>
            </div>
          ))}
        </div>

        {/* B. Animation Clips */}
        <div className="border border-tropical-green/25 rounded-2xl p-4 flex flex-col gap-1.5 bg-tropical-green/5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🎬</span>
            <h3 className="text-sm font-black text-tiki-brown">Animation Clips</h3>
          </div>
          {(
            [
              ["Planned Clips", String(count)],
              ["Generated Videos", "0"],
              ["Approved Videos", "0"],
              ["Est. Duration", `${estimatedSeconds}s`],
              ["Status", "Not Started"],
              ["Source", "Scene Breakdown"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
              <dd className="text-xs text-tiki-brown/70 font-bold">{value}</dd>
            </div>
          ))}
        </div>

        {/* C. Read-Aloud */}
        <div className="border border-pineapple-yellow/30 rounded-2xl p-4 flex flex-col gap-1.5 bg-pineapple-yellow/5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🎙️</span>
            <h3 className="text-sm font-black text-tiki-brown">Read-Aloud / Voiceover</h3>
          </div>
          {(
            [
              ["Narration Segments", String(count)],
              ["Caption Status", "Not Generated"],
              ["Voice Assets", "Not Generated"],
              ["Approved Audio", "0"],
              ["Status", "Not Started"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
              <dd className="text-xs text-tiki-brown/70 font-bold">{value}</dd>
            </div>
          ))}
        </div>

        {/* D. Character Fidelity Review */}
        <div className="border border-warm-coral/20 rounded-2xl p-4 flex flex-col gap-1.5 bg-warm-coral/4">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">🎨</span>
            <h3 className="text-sm font-black text-tiki-brown">Character Fidelity</h3>
          </div>
          {(
            [
              ["Official Refs Required", "Yes"],
              ["Character Redesign", "Not Allowed"],
              ["Human Approval", "Required"],
              ["Public Generation", "Not Allowed"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
              <dd
                className={`text-xs font-bold ${
                  value === "Yes" || value === "Required"
                    ? "text-tropical-green"
                    : value === "Not Allowed"
                    ? "text-warm-coral/70"
                    : "text-tiki-brown/70"
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </div>
      </div>

      {/* E. Public Media Status — full width */}
      <div className="border border-ube-purple/20 rounded-2xl p-4 bg-ube-purple/4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-base">🌐</span>
          <h3 className="text-sm font-black text-tiki-brown">Public Media Status</h3>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
          {(
            [
              ["Story Text", isPublicReady ? "Available" : "Not Public Yet"],
              ["Story Panels", "Coming Soon"],
              ["Animated Short", "Coming Soon"],
              ["Read-Aloud Audio", "Coming Soon"],
              ["Approved Assets", "0"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-2">
              <dt className="text-xs text-tiki-brown/45 font-semibold">{label}</dt>
              <dd
                className={`text-xs font-bold ${
                  value === "Available" ? "text-tropical-green" : "text-tiki-brown/55"
                }`}
              >
                {value}
              </dd>
            </div>
          ))}
        </div>
      </div>

      {/* Scene → Media map */}
      {scenes.length === 0 ? (
        <div className="bg-tiki-brown/4 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-1">
            Scene → Media Map
          </p>
          <p className="text-xs text-tiki-brown/40 italic">
            Add scene breakdowns before media production planning.
          </p>
        </div>
      ) : (
        <div>
          <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-3">
            Scene → Media Map
          </p>
          {/* Header */}
          <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_4rem] gap-2 px-3 mb-1">
            {["#", "Title", "Panel", "Clip", "Read-Aloud", "Assets"].map((h) => (
              <span
                key={h}
                className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide"
              >
                {h}
              </span>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            {scenes.map((scene, i) => {
              const num = scene.sceneNumber ?? i + 1;
              const title = str(scene.title) || `Scene ${String(num)}`;
              const hasImagePrompt = Boolean(str(scene.imagePromptDraft));
              const hasAnimPrompt = Boolean(str(scene.animationPromptDraft));
              const hasVoiceover = strArr(scene.voiceoverNotes).length > 0;
              return (
                <div
                  key={i}
                  className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem_4rem] gap-2 bg-tiki-brown/3 rounded-xl px-3 py-2 items-center"
                >
                  <span className="text-xs font-bold text-tiki-brown/50">{String(num)}</span>
                  <span className="text-xs text-tiki-brown/70 font-semibold truncate">{title}</span>
                  <span className="text-xs font-semibold text-sky-blue/80">
                    {hasImagePrompt ? "Saved ✓" : "Draft ✓"}
                  </span>
                  <span className="text-xs font-semibold text-tropical-green/80">
                    {hasAnimPrompt ? "Saved ✓" : "Draft ✓"}
                  </span>
                  <span className="text-xs font-semibold text-pineapple-yellow/80">
                    {hasVoiceover ? "Saved ✓" : "Draft ✓"}
                  </span>
                  <span className="text-xs text-tiki-brown/35 font-mono">—</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-tiki-brown/35 italic mt-2">
            All prompt drafts are text-only planning. No assets generated.
          </p>
        </div>
      )}

      {/* Future Media Pipeline */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5">
        <p className="text-xs font-bold text-tiki-brown/50 uppercase tracking-wide mb-3">
          Future Media Pipeline
        </p>
        <ol className="flex flex-col gap-2">
          {MEDIA_PIPELINE_STEPS.map((step, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-xs text-tiki-brown/65 leading-relaxed"
            >
              <span className="flex-shrink-0 font-black text-ube-purple/60 w-4">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Media safety callout */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔒</span>
        <p className="text-sm text-tiki-brown/70 leading-relaxed">
          <strong className="font-bold text-tiki-brown">Media safety: </strong>
          Only approved, reference-anchored media should appear publicly. Generated still images,
          animation clips, and voice assets must be reviewed before use.
        </p>
      </div>

      {/* Public user generation warning */}
      <div className="flex items-start gap-3 bg-pineapple-yellow/12 border border-pineapple-yellow/35 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">⚠️</span>
        <p className="text-sm text-tiki-brown/70 leading-relaxed">
          <strong className="font-bold text-tiki-brown">Public generation: </strong>
          Public users should not freely generate or remix official Fruit Baby characters.
          Character variation and media generation will remain admin-controlled.
        </p>
      </div>
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
  const scenes = recArr(raw.sceneBreakdown).length > 0 ? recArr(raw.sceneBreakdown) : recArr(raw.scenes);
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

  return (
    <div className="flex flex-col bg-bg-cream min-h-screen">

      {/* Header */}
      <section className="bg-gradient-to-b from-ube-purple/10 via-bg-cream to-bg-cream py-10 px-4">
        <div className="max-w-3xl mx-auto">

          <Link
            href="/admin/episodes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors mb-6"
          >
            ← Back to Saved Episode Drafts
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
          <p className="text-xs font-mono text-tiki-brown/35">{normalised._filePath}</p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto w-full px-4 sm:px-6 pb-16 flex flex-col gap-6">

        {/* Read-only notice */}
        <div className="flex items-start gap-3 bg-white border border-pineapple-yellow/40 rounded-2xl px-5 py-4 shadow-sm">
          <span className="text-xl flex-shrink-0">📋</span>
          <p className="text-sm text-tiki-brown/65 leading-relaxed">
            <strong className="text-tiki-brown font-bold">Read-only draft. </strong>
            This is a saved episode draft from GitHub content files. Content editing and
            delete workflows are not available. A controlled publish-ready action is
            available below after review.
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

        {/* ── Public Status ── */}
        <PublicStatusCard
          normalised={normalised}
          reviewObj={reviewObj}
          publishingObj={publishingObj}
        />

        {/* ── Publish Readiness Checklist ── */}
        <PublishReadinessChecklist />

        {/* ── Publish-Ready Action ── */}
        <PublishReadyAction
          slug={normalised.slug}
          approvedForSave={normalised.approvedForSave}
          isAlreadyPublished={isAlreadyPublished}
        />

        {/* ── Media Planning ── */}
        <MediaPlanningSection plan={mediaPlan} tikiFlagged={tikiFlagged} />

        {/* ── Media Production Overview ── */}
        <MediaProductionOverview scenes={scenes} isPublicReady={isAlreadyPublished} />

        {/* ── Story Panel Prompt Builder ── */}
        <StoryPanelPromptBuilder scenes={scenes} raw={raw} tikiFlagged={tikiFlagged} episodeSlug={normalised.slug} />

        {/* ── Story Panel Asset Manifest Preview ── */}
        <StoryPanelAssetManifest scenes={scenes} raw={raw} tikiFlagged={tikiFlagged} />

        {/* ── Animation Prompt Builder ── */}
        <AnimationPromptBuilder scenes={scenes} raw={raw} tikiFlagged={tikiFlagged} />

        {/* ── Read-Aloud / Voiceover Prompt Builder ── */}
        <ReadAloudPromptBuilder scenes={scenes} raw={raw} tikiFlagged={tikiFlagged} />

        {/* ── A. Episode Overview ── */}
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
              <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">
                Description
              </p>
              <p className="text-sm text-tiki-brown/75 leading-relaxed">
                {normalised.shortDescription}
              </p>
            </div>
          )}

          {str(raw.episodeSummary) && str(raw.episodeSummary) !== normalised.shortDescription && (
            <div>
              <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">
                Episode Summary
              </p>
              <p className="text-sm text-tiki-brown/75 leading-relaxed">{str(raw.episodeSummary)}</p>
            </div>
          )}

          {normalised.featuredCharacters.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-2">
                Featured Characters
              </p>
              <div className="flex flex-wrap gap-1.5">
                {normalised.featuredCharacters.map((c) => (
                  <span
                    key={c}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* ── B. Review Status ── */}
        {reviewObj && (
          <Section title="Review Status">
            <dl className="flex flex-col gap-2">
              <MetaRow label="Status" value={str(reviewObj.status)} />
              <MetaRow label="Approved for Save" value={String(Boolean(reviewObj.approvedForSave))} />
              <MetaRow label="Requires Human Review" value={String(Boolean(reviewObj.requiresHumanReview))} />
            </dl>
            {str(reviewObj.notes) && (
              <div className="bg-pineapple-yellow/15 rounded-xl px-4 py-3">
                <p className="text-xs font-bold text-tiki-brown mb-0.5">Review Notes</p>
                <p className="text-sm text-tiki-brown/70 leading-relaxed">{str(reviewObj.notes)}</p>
              </div>
            )}
            {Array.isArray(reviewObj.checkedFidelityItems) && reviewObj.checkedFidelityItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-2">
                  Checked Fidelity Items
                </p>
                <StringList items={strArr(reviewObj.checkedFidelityItems)} />
              </div>
            )}
          </Section>
        )}

        {/* ── C. Publishing Status ── */}
        {publishingObj && (
          <Section title="Publishing Status">
            <dl className="flex flex-col gap-2">
              <MetaRow label="Public Status" value={str(publishingObj.publicStatus)} />
              <MetaRow label="Ready for Public Site" value={String(Boolean(publishingObj.readyForPublicSite))} />
            </dl>
            <Callout icon="🔒">
              This draft is not published. It will not appear on the public site unless it is
              explicitly marked ready and published in a future phase.
            </Callout>
          </Section>
        )}

        {/* ── D. Source Storyboard ── */}
        {sourceStoryboard && (
          <Section title="Source Storyboard">
            <dl className="flex flex-col gap-2">
              <MetaRow label="Title" value={str(sourceStoryboard.title)} />
              <MetaRow label="Lesson" value={str(sourceStoryboard.lesson)} />
              <MetaRow label="Setting" value={str(sourceStoryboard.setting)} />
              <MetaRow label="Tone" value={str(sourceStoryboard.tone)} />
              <MetaRow label="Age Range" value={str(sourceStoryboard.targetAgeRange)} />
            </dl>
            {str(sourceStoryboard.shortDescription) && (
              <p className="text-sm text-tiki-brown/70 leading-relaxed">
                {str(sourceStoryboard.shortDescription)}
              </p>
            )}
            {str(sourceStoryboard.storyNotes) && (
              <div>
                <p className="text-xs font-semibold text-tiki-brown/45 uppercase tracking-wide mb-1">
                  Story Notes
                </p>
                <p className="text-sm text-tiki-brown/65 leading-relaxed italic">
                  {str(sourceStoryboard.storyNotes)}
                </p>
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
        )}

        {/* ── E. Scene Breakdown ── */}
        {scenes.length > 0 && (
          <Section title={`Scene Breakdown (${scenes.length} scene${scenes.length !== 1 ? "s" : ""})`}>
            <div className="flex flex-col gap-4">
              {scenes.map((scene, i) => (
                <SceneCard key={i} scene={scene} index={i} />
              ))}
            </div>
          </Section>
        )}

        {/* ── F. Dialogue Draft (top-level) ── */}
        {topDialogue.length > 0 && (
          <Section title="Dialogue Draft">
            <StringList items={topDialogue} />
          </Section>
        )}

        {/* ── G. Voiceover Notes (top-level) ── */}
        {topVoiceover.length > 0 && (
          <Section title="Voiceover Notes">
            {topVoiceover.map((v, i) => (
              <p key={i} className="text-sm text-tiki-brown/70 leading-relaxed italic">{v}</p>
            ))}
          </Section>
        )}

        {/* ── H. Image Prompt Drafts ── */}
        {imagePrompts.length > 0 && (
          <Section title="Image Prompt Drafts">
            <Callout icon="🖼️" className="bg-sky-blue/20 border-sky-blue/40">
              Image prompts are draft text only. Future visual generation must use official
              character references and human review before any assets are created.
            </Callout>
            <div className="flex flex-col gap-3">
              {imagePrompts.map((prompt, i) => (
                <div key={i} className="bg-sky-blue/10 rounded-xl p-4">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
                    Prompt {imagePrompts.length > 1 ? i + 1 : ""}
                  </p>
                  <p className="text-sm text-tiki-brown/70 leading-relaxed">{prompt}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── I. Animation Prompt Drafts ── */}
        {animPrompts.length > 0 && (
          <Section title="Animation Prompt Drafts">
            <Callout icon="🎬" className="bg-tropical-green/10 border-tropical-green/30">
              Animation prompts are draft text only. Future animation must preserve official
              character design and remain kid-friendly.
            </Callout>
            <div className="flex flex-col gap-3">
              {animPrompts.map((prompt, i) => (
                <div key={i} className="bg-tropical-green/8 rounded-xl p-4">
                  <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide mb-1">
                    Prompt {animPrompts.length > 1 ? i + 1 : ""}
                  </p>
                  <p className="text-sm text-tiki-brown/70 leading-relaxed">{prompt}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* ── J. Merch Tie-Ins ── */}
        {merchTieIns.length > 0 && (
          <Section title="Merch Tie-Ins">
            <StringList items={merchTieIns} />
          </Section>
        )}

        {/* ── K. Character Fidelity Checklist ── */}
        {fidelityChecklist.length > 0 && (
          <Section title="Character Fidelity Checklist">
            <StringList items={fidelityChecklist} />
          </Section>
        )}

        {/* Character fidelity reminder — always shown */}
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-2xl px-5 py-4">
          <span className="text-xl flex-shrink-0">🎨</span>
          <div>
            <p className="text-sm font-bold text-tiki-brown mb-0.5">
              Character fidelity required before any visual step
            </p>
            <p className="text-sm text-tiki-brown/65 leading-relaxed">
              Before any image, animation, or public publishing step, this draft must be
              reviewed against official character profiles and uploaded reference images.
              Official character canon is the source of truth. Characters must not be
              redesigned, and all generated visuals must be reference-anchored.
            </p>
          </div>
        </div>

        {/* ── L. Developer JSON Preview ── */}
        <details className="group">
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between bg-white border border-tiki-brown/10 rounded-2xl px-5 py-4 shadow-sm hover:border-tiki-brown/20 transition-colors">
              <div>
                <p className="text-sm font-bold text-tiki-brown">Developer JSON Preview</p>
                <p className="text-xs text-tiki-brown/50">Full saved episode JSON — click to expand</p>
              </div>
              <span className="text-tiki-brown/40 text-xs group-open:rotate-180 transition-transform">▼</span>
            </div>
          </summary>
          <div className="mt-2 bg-white border border-tiki-brown/10 rounded-2xl overflow-hidden">
            <pre className="p-5 text-xs font-mono text-tiki-brown/60 leading-relaxed overflow-x-auto whitespace-pre-wrap break-words">
              {JSON.stringify(raw, null, 2)}
            </pre>
          </div>
        </details>

        {/* Back link footer */}
        <div className="pt-2">
          <Link
            href="/admin/episodes"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ube-purple hover:text-ube-purple/70 transition-colors"
          >
            ← Back to Saved Episode Drafts
          </Link>
        </div>

      </section>
    </div>
  );
}
