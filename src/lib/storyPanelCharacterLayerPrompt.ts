// Character layer prompt builder (Phase 18D.11).
// Builds the 6-section prompt for rendering a single character in scene-aware isolation.
// Server-safe — do NOT import in client components.

import type { StoryPanelCharacterLayerPlan } from "@/lib/storyPanelAssemblyTypes";

export type CharacterLayerPromptOptions = {
  plan: StoryPanelCharacterLayerPlan;
  settingLabel: string;
  settingDescription: string;
  mood: string;
  adminSceneDirection?: string;
};

export function buildCharacterLayerPrompt(opts: CharacterLayerPromptOptions): string {
  const { plan, settingLabel, settingDescription, mood, adminSceneDirection } = opts;

  const directionLabel =
    plan.facingDirection === "toward-another-character"
      ? `facing toward ${plan.interactionTargetName ?? "another character"}${plan.interactionTargetPlacement ? ` (${plan.interactionTargetPlacement} position)` : ""}`
      : plan.facingDirection === "facing-right"
      ? "facing right"
      : plan.facingDirection === "facing-left"
      ? "facing left"
      : plan.facingDirection === "facing-viewer"
      ? "facing the viewer"
      : plan.facingDirection === "facing-away"
      ? "facing away from the viewer"
      : "three-quarter facing";

  const featureLocks = plan.officialFeatureLocks.map((f) => `  - ${f}`).join("\n");
  const mustShow = plan.mustShow.slice(0, 4).map((m) => `  - ${m}`).join("\n");
  const mustAvoid = plan.mustAvoid.slice(0, 4).map((m) => `  - ${m}`).join("\n");

  const lines: string[] = [];

  // Section A: Single Character Only
  lines.push(`[CHARACTER LAYER — ${plan.characterName.toUpperCase()}]`);
  lines.push(
    `Generate an isolated character layer of ${plan.characterName} only.` +
    ` This is an admin-only production asset for staged compositing.`
  );
  lines.push(`Do NOT include any other Fruit Baby characters in this layer.`);
  lines.push("");

  // Section B: Full Story Context
  lines.push(`[STORY CONTEXT]`);
  lines.push(plan.storyContextSummary);
  lines.push(`Setting: ${settingLabel} — ${settingDescription}. Mood: ${mood}.`);
  lines.push(plan.sceneRelationshipSummary);
  lines.push("");

  // Section C: Assembly Intent
  lines.push(`[ASSEMBLY INTENT]`);
  lines.push(plan.assemblyIntent);
  lines.push("");

  // Section D: Character Performance
  lines.push(`[CHARACTER PERFORMANCE]`);
  lines.push(`Emotion: ${plan.emotion}. Action: ${plan.action}. Pose: ${plan.pose}.`);
  lines.push(`Facing: ${directionLabel}.`);
  if (plan.interactionInstruction) {
    lines.push(`Interaction: ${plan.interactionInstruction}`);
  }
  lines.push("");

  // Section E: Official Character Fidelity
  lines.push(`[OFFICIAL FIDELITY]`);
  lines.push(`Official feature locks — match exactly:`);
  lines.push(featureLocks);
  lines.push(`Must show:`);
  lines.push(mustShow);
  lines.push(`Must avoid:`);
  lines.push(mustAvoid);
  lines.push(
    `Character must be immediately recognizable as official ${plan.characterName}.` +
    ` Cute baby-like proportions.`
  );
  lines.push("");

  // Section F: Clean Layer Output
  lines.push(`[CLEAN LAYER OUTPUT]`);
  lines.push(
    `White or transparent background — no environment. Full character body visible with padding.`
  );
  lines.push(
    `No other characters, no other Fruit Baby characters. ${plan.characterName} only.`
  );

  if (adminSceneDirection) {
    lines.push("");
    lines.push(`[ADMIN DIRECTION]`);
    lines.push(adminSceneDirection);
  }

  return lines.join("\n");
}
