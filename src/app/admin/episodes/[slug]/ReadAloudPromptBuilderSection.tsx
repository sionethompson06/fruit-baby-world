import type { Character } from "@/lib/content";
import { str, strArr } from "./helpers";
import type { CharacterReferencePackage } from "@/lib/referenceAssetLoader";

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

function getVoiceGuidance(
  characters: string[],
  charBySlug?: Record<string, Character>
): { character: string; guidance: string }[] {
  return characters
    .map((c) => {
      const nameKey = c.toLowerCase().replace(/-/g, " ").trim();
      const hardcoded = CHARACTER_VOICE_GUIDANCE[nameKey];
      if (hardcoded) return { character: c, guidance: hardcoded };
      if (charBySlug) {
        const slug = nameKey.replace(/ /g, "-");
        const charObj = charBySlug[slug];
        if (charObj?.voiceGuide) {
          const parts: string[] = [];
          if (typeof charObj.voiceGuide === "string") parts.push(charObj.voiceGuide);
          else if (typeof charObj.voiceGuide === "object" && charObj.voiceGuide !== null) {
            const vg = charObj.voiceGuide as Record<string, unknown>;
            if (typeof vg.tone === "string") parts.push(`Tone: ${vg.tone}`);
            if (typeof vg.pacing === "string") parts.push(`Pacing: ${vg.pacing}`);
            if (typeof vg.emotion === "string") parts.push(`Emotion: ${vg.emotion}`);
          }
          if (parts.length > 0) return { character: c, guidance: parts.join(" ") };
        }
      }
      return null;
    })
    .filter((x): x is { character: string; guidance: string } => x !== null);
}

function ReadAloudCard({
  scene,
  index,
  episodeTone,
  episodeLesson,
  charBySlug,
  characterPackages,
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeTone: string;
  episodeLesson: string;
  charBySlug?: Record<string, Character>;
  characterPackages?: CharacterReferencePackage[];
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

  const voiceGuidance = getVoiceGuidance(characters, charBySlug);

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
            {characters.map((c) => {
              const pkg = characterPackages?.find((p) => p.characterSlug === c);
              return (
                <span
                  key={c}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-ube-purple/10 text-ube-purple font-semibold"
                >
                  {c}
                  {pkg && pkg.totalApprovedCount > 0 && (
                    <span className="ml-1 text-ube-purple/60">({pkg.totalApprovedCount})</span>
                  )}
                </span>
              );
            })}
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

export default function ReadAloudPromptBuilder({
  scenes,
  raw,
  tikiFlagged,
  charBySlug,
  characterPackages,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
  charBySlug?: Record<string, Character>;
  characterPackages?: CharacterReferencePackage[];
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
              charBySlug={charBySlug}
              characterPackages={characterPackages}
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
