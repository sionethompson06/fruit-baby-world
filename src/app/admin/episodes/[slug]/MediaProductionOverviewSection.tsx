import { str, strArr } from "./helpers";

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

export default function MediaProductionOverview({
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
