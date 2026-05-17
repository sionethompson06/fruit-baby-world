import { str, strArr } from "./helpers";

function deriveClipCaption(scene: Record<string, unknown>, index: number): string {
  const num = scene.sceneNumber ?? index + 1;
  const title = str(scene.title);
  const summary = str(scene.summary);
  const parts: string[] = [`Animated clip for Scene ${String(num)}`];
  if (title) parts[0] += `: ${title}`;
  parts[0] += ".";
  if (summary) parts.push(summary.slice(0, 100) + (summary.length > 100 ? "…" : ""));
  return parts.join(" ");
}

function ManifestClipCard({
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
  const hasAnimPrompt =
    Boolean(str(scene.animationPromptDraft)) || true; // deterministic always available
  const promptLabel = str(scene.animationPromptDraft)
    ? "Yes (saved)"
    : "Yes (deterministic)";
  const caption = deriveClipCaption(scene, index);
  const hasTikiInScene = characters.some((c) => c.toLowerCase().includes("tiki"));

  return (
    <div className="border border-tiki-brown/10 rounded-2xl p-4 flex flex-col gap-3 bg-white">
      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-tropical-green/12 text-tiki-brown/60">
          Clip {String(num)}
        </span>
        {title && <span className="text-sm font-bold text-tiki-brown">{title}</span>}
        <span className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
          Not Generated
        </span>
      </div>

      {summary && (
        <p className="text-xs text-tiki-brown/55 leading-relaxed">{summary}</p>
      )}

      {/* Manifest fields */}
      <dl className="grid grid-cols-[13rem_1fr] gap-x-3 gap-y-1.5 text-xs">
        <dt className="text-tiki-brown/40 font-semibold">Status</dt>
        <dd className="font-bold text-tiki-brown/45 uppercase tracking-wide">not-generated</dd>

        <dt className="text-tiki-brown/40 font-semibold">Approval status</dt>
        <dd className="font-bold text-warm-coral/55 uppercase tracking-wide">not-approved</dd>

        <dt className="text-tiki-brown/40 font-semibold">Animation prompt</dt>
        <dd className="text-tiki-brown/60">{hasAnimPrompt ? promptLabel : "No"}</dd>

        <dt className="text-tiki-brown/40 font-semibold">Package built (session)</dt>
        <dd className="text-tiki-brown/35 italic">Check Animation Route Test above ↑</dd>

        <dt className="text-tiki-brown/40 font-semibold">Video generated</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Video saved</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Asset approved</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Public use allowed</dt>
        <dd className="font-bold text-warm-coral/55">No</dd>

        <dt className="text-tiki-brown/40 font-semibold">Estimated duration</dt>
        <dd className="text-tiki-brown/60">6s</dd>

        <dt className="text-tiki-brown/40 font-semibold">Planned MIME type</dt>
        <dd className="text-tiki-brown/45 font-mono">video/mp4</dd>

        <dt className="text-tiki-brown/40 font-semibold">Storage provider</dt>
        <dd className="text-tiki-brown/35 italic">Not configured</dd>

        <dt className="text-tiki-brown/40 font-semibold">Character fidelity</dt>
        <dd className="font-semibold text-tiki-brown/45">Review required</dd>

        <dt className="text-tiki-brown/40 font-semibold">Motion safety</dt>
        <dd className="font-semibold text-tiki-brown/45">Review required</dd>

        <dt className="text-tiki-brown/40 font-semibold">Human review</dt>
        <dd className="font-semibold text-tiki-brown/55">Required</dd>
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

      {/* Caption placeholder */}
      <div>
        <p className="text-xs font-bold text-tiki-brown/35 uppercase tracking-wide mb-0.5">
          Future Caption (placeholder)
        </p>
        <p className="text-xs text-tiki-brown/50 italic leading-relaxed">{caption}</p>
      </div>

      {/* Tiki scene warning */}
      {hasTikiInScene && (
        <div className="flex items-start gap-2 bg-warm-coral/8 border border-warm-coral/20 rounded-xl px-3 py-2">
          <span className="text-xs flex-shrink-0">⚡</span>
          <p className="text-xs text-tiki-brown/65 leading-relaxed">
            Tiki Trouble animation must remain mischievous, funny, dramatic, and kid-friendly.
            Reject clips that make Tiki scary, violent, horror-like, cruel, evil, or too intense.
          </p>
        </div>
      )}
    </div>
  );
}

export default function AnimationClipManifestPreview({
  scenes,
  raw,
  tikiFlagged,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
}) {
  void raw;
  const totalPlannedClips = scenes.length;
  const estimatedSeconds = totalPlannedClips * 6;

  return (
    <div className="bg-white rounded-3xl border border-tiki-brown/10 shadow-sm p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🎥</span>
          <h2 className="text-base font-black text-tiki-brown">
            Animation Clip Asset Manifest Preview
          </h2>
          <span className="ml-auto text-xs font-bold px-2.5 py-0.5 rounded-full bg-tiki-brown/8 text-tiki-brown/40 uppercase tracking-wide">
            Preview Only
          </span>
        </div>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          This preview shows the future asset data shape for approved animated story clips.
          No video is generated, uploaded, attached to the episode, or published yet.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            ["Planned Clips", String(totalPlannedClips), false],
            ["Generated Video Assets", "0", true],
            ["Saved Video Assets", "0", true],
            ["Approved Video Assets", "0", true],
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
      <dl className="grid grid-cols-[14rem_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Public-ready video assets</dt>
        <dd className="font-bold text-warm-coral/55">0</dd>

        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Estimated total duration</dt>
        <dd className="text-tiki-brown/60">{estimatedSeconds}s ({totalPlannedClips} clip{totalPlannedClips !== 1 ? "s" : ""} × 6s)</dd>

        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Anim. packages (session)</dt>
        <dd className="text-tiki-brown/35 italic">Check Animation Route Test above ↑</dd>

        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Storage status</dt>
        <dd className="font-bold text-warm-coral/55 uppercase tracking-wide">Not Configured for Video</dd>

        <dt className="text-tiki-brown/40 font-semibold uppercase tracking-wide">Manifest status</dt>
        <dd className="font-bold text-pineapple-yellow/70 uppercase tracking-wide">Preview Only</dd>
      </dl>

      {/* Per-clip manifest cards */}
      {scenes.length === 0 ? (
        <p className="text-sm text-tiki-brown/40 italic">
          No scenes found. Save an episode with a sceneBreakdown to see the manifest preview.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {scenes.map((scene, i) => (
            <ManifestClipCard key={i} scene={scene} index={i} />
          ))}
        </div>
      )}

      {/* Animation safety requirement */}
      <div className="flex items-start gap-3 bg-warm-coral/8 border border-warm-coral/25 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🎨</span>
        <p className="text-sm text-tiki-brown/65 leading-relaxed">
          <strong className="font-semibold">Animation Safety Requirement:</strong>{" "}
          Each approved animation clip must be checked against official character profile images
          and motion safety rules before it can be attached to an episode or displayed publicly.
        </p>
      </div>

      {/* Tiki episode-level reminder */}
      {tikiFlagged && (
        <div className="flex items-start gap-3 bg-warm-coral/10 border border-warm-coral/30 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">⚡</span>
          <p className="text-sm text-tiki-brown/70 leading-relaxed">
            <strong className="font-bold">Tiki Trouble:</strong> Animation must remain mischievous,
            funny, dramatic, and kid-friendly. Reject clips that make Tiki scary, violent,
            horror-like, cruel, evil, or too intense.
          </p>
        </div>
      )}

      {/* Video Provider Decision Reminder */}
      <div className="bg-tiki-brown/4 rounded-2xl p-5 flex flex-col gap-3">
        <p className="text-xs font-bold text-tiki-brown/45 uppercase tracking-wide">
          Video Provider Decision Reminder
        </p>
        <ul className="space-y-1.5">
          {[
            "The app currently prepares animation packages but does not generate video.",
            "A future video provider must support reference-anchored character consistency.",
            "Generated video must be reviewed before storage or public display.",
            "Public story pages should only show approved video assets.",
            "Temporary animation packages are not permanent assets.",
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

      {/* Future animation storage strategy */}
      <div className="flex items-start gap-3 bg-sky-blue/8 border border-sky-blue/20 rounded-xl px-4 py-3">
        <span className="text-base flex-shrink-0">🔮</span>
        <p className="text-sm text-tiki-brown/60 leading-relaxed">
          <strong className="font-semibold">Future phase:</strong> approved animation clips should
          be stored in media storage, then attached to the episode JSON as approved video asset
          URLs. GitHub should store lightweight JSON references, not large video files.
        </p>
      </div>

    </div>
  );
}
