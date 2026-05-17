import { str, strArr } from "./helpers";

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

export default function StoryPanelAssetManifest({
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
