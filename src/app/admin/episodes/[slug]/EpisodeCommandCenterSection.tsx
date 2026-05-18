import type { SavedEpisodeDraft } from "@/lib/savedEpisodes";
import type { EpisodePublishReadiness } from "@/lib/episodePublishReadiness";
import type { StoryPanelCoverage } from "@/lib/storyPanelCoverage";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  normalised: SavedEpisodeDraft;
  publishReadiness: EpisodePublishReadiness;
  panelCoverage: StoryPanelCoverage;
  hasAudio: boolean;
  totalVideoClips: number;
};

// ─── Next action ──────────────────────────────────────────────────────────────

function deriveNextAction({
  activeSceneCount,
  scenesMissingPanel,
  hasAudio,
  totalVideoClips,
  blockerCount,
}: {
  activeSceneCount: number;
  scenesMissingPanel: number;
  hasAudio: boolean;
  totalVideoClips: number;
  blockerCount: number;
}): string {
  if (activeSceneCount === 0) return "Add scenes to the story";
  if (scenesMissingPanel > 0) return "Create missing picture panels";
  if (blockerCount > 0) return "Fix publish blockers";
  if (!hasAudio) return "Create or attach audio narration";
  if (totalVideoClips === 0) return "Create animated clips (optional)";
  return "Review publish status";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EpisodeCommandCenterSection({
  normalised,
  publishReadiness,
  panelCoverage,
  hasAudio,
  totalVideoClips,
}: Props) {
  const activeSceneCount = panelCoverage.totalActiveScenes;
  const blockerCount = publishReadiness.blockers.length;
  const warningCount = publishReadiness.warnings.length;

  const nextAction = deriveNextAction({
    activeSceneCount,
    scenesMissingPanel: panelCoverage.scenesMissingPanel,
    hasAudio,
    totalVideoClips,
    blockerCount,
  });

  const overallBadge =
    publishReadiness.status === "ready"
      ? { label: "Ready", className: "bg-tropical-green/20 text-tropical-green border-tropical-green/30" }
      : publishReadiness.status === "blocked"
      ? { label: "Blocked", className: "bg-warm-coral/15 text-warm-coral border-warm-coral/30" }
      : { label: "Needs Work", className: "bg-pineapple-yellow/25 text-tiki-brown/80 border-pineapple-yellow/40" };

  const counts: { label: string; value: string; warn?: boolean }[] = [
    { label: "Active Scenes", value: String(activeSceneCount) },
    {
      label: "Panels Done",
      value: `${panelCoverage.scenesWithPanel}/${activeSceneCount}`,
    },
    {
      label: "Missing Panels",
      value: String(panelCoverage.scenesMissingPanel),
      warn: panelCoverage.scenesMissingPanel > 0,
    },
    { label: "Audio", value: hasAudio ? "Attached" : "None", warn: !hasAudio },
    { label: "Video Clips", value: totalVideoClips > 0 ? String(totalVideoClips) : "None" },
    { label: "Blockers", value: String(blockerCount), warn: blockerCount > 0 },
    { label: "Warnings", value: String(warningCount) },
  ];

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg">🎬</span>
          <h2 className="text-base font-black text-tiki-brown">Episode Command Center</h2>
          <span
            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${overallBadge.className}`}
          >
            {overallBadge.label}
          </span>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/6 text-tiki-brown/45 uppercase tracking-wide">
          Public: {normalised.publicStatus}
        </span>
      </div>

      {/* Quick count chips */}
      <div className="flex flex-wrap gap-2">
        {counts.map(({ label, value, warn }) => (
          <div
            key={label}
            className={`flex flex-col items-center rounded-xl px-3 py-1.5 min-w-[68px] border ${
              warn
                ? "bg-warm-coral/8 border-warm-coral/20"
                : "bg-tiki-brown/3 border-tiki-brown/8"
            }`}
          >
            <span className={`text-sm font-black ${warn ? "text-warm-coral" : "text-tiki-brown"}`}>
              {value}
            </span>
            <span className="text-xs text-tiki-brown/45 text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Next action */}
      <div className="flex items-center gap-3 bg-ube-purple/8 border border-ube-purple/20 rounded-2xl px-4 py-3">
        <span className="text-sm font-black text-ube-purple/50 flex-shrink-0">→</span>
        <div>
          <p className="text-xs font-bold text-ube-purple/50 uppercase tracking-wide mb-0.5">Next Action</p>
          <p className="text-sm font-bold text-ube-purple">{nextAction}</p>
        </div>
      </div>

    </div>
  );
}
