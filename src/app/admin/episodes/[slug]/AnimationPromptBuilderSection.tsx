import type { Character } from "@/lib/content";
import { str, strArr } from "./helpers";
import { getCharacterFidelityNotes } from "./characterFidelityHelpers";

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

export function buildDeterministicAnimationPrompt({
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
  charBySlug,
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeSetting: string;
  episodeTone: string;
  charBySlug?: Record<string, Character>;
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

  const fidelityNotes = getCharacterFidelityNotes(characters, charBySlug);

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

export default function AnimationPromptBuilder({
  scenes,
  raw,
  tikiFlagged,
  charBySlug,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
  charBySlug?: Record<string, Character>;
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
              charBySlug={charBySlug}
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
