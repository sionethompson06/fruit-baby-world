import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadEpisodeBySlug, type SavedEpisodeDraft } from "@/lib/savedEpisodes";
import PublishReadyAction from "./PublishReadyAction";

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
