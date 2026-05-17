import type { Character } from "@/lib/content";
import { characterHasPrimaryReference } from "@/lib/characterEligibility";
import { str, strArr } from "./helpers";
import { GLOBAL_FIDELITY_RULES, getCharacterFidelityNotes } from "./characterFidelityHelpers";
import PanelDraftGenerator from "./PanelDraftGenerator";
import type { CharacterReferencePackage, SceneReferencePackage } from "@/lib/referenceAssetLoader";
import { buildStoryPanelPromptContext } from "@/lib/storyBuilderContext";

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

function ReferenceAwareContextBlock({
  scenePkg,
  charBySlug,
  setting,
  mood,
  summary,
}: {
  scenePkg: SceneReferencePackage;
  charBySlug: Record<string, Character>;
  setting?: string;
  mood?: string;
  summary?: string;
}) {
  const contextText = buildStoryPanelPromptContext(scenePkg, charBySlug, {
    setting,
    mood,
    summary,
  });

  return (
    <details className="group mt-1">
      <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-bold text-tiki-brown/50 uppercase tracking-wide select-none py-1">
        <span className="text-tiki-brown/35 group-open:rotate-90 transition-transform inline-block">▶</span>
        Reference-Aware Context
        <span className="ml-auto text-xs font-semibold text-ube-purple/60 normal-case tracking-normal">
          {scenePkg.characterPackages.length} character{scenePkg.characterPackages.length !== 1 ? "s" : ""}
          {" · "}
          {scenePkg.characterPackages.reduce((s, p) => s + p.totalApprovedCount, 0)} approved assets
        </span>
      </summary>

      <div className="mt-3 flex flex-col gap-3">
        {/* Characters */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-1.5">Characters</p>
          <div className="flex flex-col gap-2">
            {scenePkg.characterPackages.map((charPkg) => {
              const char = charBySlug[charPkg.characterSlug];
              return (
                <div key={charPkg.characterSlug} className="bg-ube-purple/5 rounded-xl px-3 py-2 flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-tiki-brown/70">{charPkg.characterName}</span>
                    {charPkg.isGenerationReady ? (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-tropical-green/12 text-tropical-green font-bold">
                        Ref-Ready
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-warm-coral/12 text-warm-coral/80 font-bold">
                        No Refs
                      </span>
                    )}
                    {charPkg.environmentReferences.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-sky-blue/12 text-tiki-brown/60 font-semibold">
                        {charPkg.environmentReferences.length} env refs
                      </span>
                    )}
                  </div>
                  {char?.shortDescription && (
                    <p className="text-xs text-tiki-brown/55 leading-relaxed">{char.shortDescription}</p>
                  )}
                  {char && (() => {
                    const rules = (charPkg.characterSlug === "tiki" || charPkg.characterSlug === "tiki-trouble")
                      ? ["Mischievous, funny, dramatic, and kid-friendly.", "Do not make Tiki scary, violent, or too intense."]
                      : [];
                    return rules.length > 0 ? (
                      <p className="text-xs text-warm-coral/70 leading-relaxed">{rules.join(" ")}</p>
                    ) : null;
                  })()}
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Rules */}
        <div>
          <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-1.5">Visual Rules</p>
          <div className="flex flex-wrap gap-1">
            {[
              "Preserve body shape",
              "Preserve color palette",
              "Baby-like proportions",
              "No redesign",
              "Kid-friendly",
            ].map((rule) => (
              <span key={rule} className="text-xs px-2 py-0.5 rounded-full bg-tiki-brown/6 text-tiki-brown/55 font-semibold">
                {rule}
              </span>
            ))}
          </div>
        </div>

        {/* Supporting + Environment Reference Counts */}
        {scenePkg.characterPackages.some(
          (p) => p.supportingReferences.length > 0 || p.mainReferences.length > 0
        ) && (
          <div>
            <p className="text-xs font-bold text-tiki-brown/40 uppercase tracking-wide mb-1.5">
              Supporting References
            </p>
            <div className="flex flex-col gap-1">
              {scenePkg.characterPackages.map((charPkg) => {
                const counts: string[] = [];
                if (charPkg.mainReferences.length > 0) counts.push(`${charPkg.mainReferences.length} main`);
                if (charPkg.profileSheets.length > 0) counts.push(`${charPkg.profileSheets.length} profile`);
                if (charPkg.supportingReferences.length > 0) counts.push(`${charPkg.supportingReferences.length} supporting`);
                if (counts.length === 0) return null;
                return (
                  <div key={charPkg.characterSlug} className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-tiki-brown/60">{charPkg.characterName}:</span>
                    <span className="text-tiki-brown/45">{counts.join(", ")}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full context text (collapsible again) */}
        <details>
          <summary className="cursor-pointer list-none text-xs text-tiki-brown/35 italic select-none">
            View full context text ▸
          </summary>
          <pre className="mt-2 bg-tiki-brown/4 rounded-xl px-3 py-2 text-xs text-tiki-brown/55 whitespace-pre-wrap break-words font-sans leading-relaxed select-all">
            {contextText}
          </pre>
        </details>
      </div>
    </details>
  );
}

function PanelPromptCard({
  scene,
  index,
  episodeSetting,
  episodeTone,
  episodeSlug,
  episodeFeaturedCharacters,
  charBySlug,
  characterPackages,
  scenePkg,
}: {
  scene: Record<string, unknown>;
  index: number;
  episodeSetting: string;
  episodeTone: string;
  episodeSlug: string;
  episodeFeaturedCharacters: string[];
  charBySlug: Record<string, Character>;
  characterPackages?: CharacterReferencePackage[];
  scenePkg?: SceneReferencePackage;
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

  const fidelityNotes = getCharacterFidelityNotes(characters, charBySlug);

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

      {/* Reference-aware context block */}
      {scenePkg && (
        <div className="border border-ube-purple/15 rounded-xl px-4 py-3 bg-ube-purple/3">
          <ReferenceAwareContextBlock
            scenePkg={scenePkg}
            charBySlug={charBySlug}
            setting={episodeSetting}
            mood={episodeTone}
            summary={summary}
          />
        </div>
      )}

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

export default function StoryPanelPromptBuilder({
  scenes,
  raw,
  tikiFlagged,
  episodeSlug,
  charBySlug,
  characterPackages,
  sceneRefPackages,
}: {
  scenes: Record<string, unknown>[];
  raw: Record<string, unknown>;
  tikiFlagged: boolean;
  episodeSlug: string;
  charBySlug: Record<string, Character>;
  characterPackages?: CharacterReferencePackage[];
  sceneRefPackages?: SceneReferencePackage[];
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
          {scenes.map((scene, i) => {
            const sceneNum = typeof scene.sceneNumber === "number" ? scene.sceneNumber : i + 1;
            const scenePkg = sceneRefPackages?.find((p) => p.sceneNumber === sceneNum);
            return (
              <PanelPromptCard
                key={i}
                scene={scene}
                index={i}
                episodeSetting={setting}
                episodeTone={tone}
                episodeSlug={episodeSlug}
                episodeFeaturedCharacters={featuredCharacters}
                charBySlug={charBySlug}
                characterPackages={characterPackages}
                scenePkg={scenePkg}
              />
            );
          })}
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
