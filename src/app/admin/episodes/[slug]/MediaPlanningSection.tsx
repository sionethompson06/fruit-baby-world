import type { MediaPlan, PanelPlan, ClipPlan } from "@/lib/episodeMediaPlan";

function MediaStatusPill({ label, value }: { label: string; value: string }) {
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

export default function MediaPlanningSection({
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
