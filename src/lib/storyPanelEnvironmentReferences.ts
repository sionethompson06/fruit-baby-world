// Environment/home reference helpers for background layer generation (Phase 18D.11.1).
// Selects approved environment refs from scene characters to use as visual source of
// truth for background generation. Only environment/home role refs — never character
// pose, profile, or supporting images.
// Server-safe — do NOT import in client components.

import type { SceneReferencePackage } from "@/lib/referenceAssetLoader";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SceneEnvironmentRef = {
  id: string;
  characterSlug: string;
  characterName: string;
  title: string;
  url: string;
  assetType: string;
};

export type EnvironmentReferenceSummary = {
  count: number;
  ids: string[];
  titles: string[];
  characterSlugs: string[];
  selectedUrl: string | undefined;
  selectedTitle: string | undefined;
  selectedCharacterSlug: string | undefined;
  mode: "image-reference" | "text-only" | "none";
};

// ─── Constants ────────────────────────────────────────────────────────────────

// Matches MAX_ENV_PER_CHAR in storyPanelReferenceBundle.ts
const MAX_ENV_PER_CHAR = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Collects environment/home reference assets for all characters in the scene.
// Caps at MAX_ENV_PER_CHAR per character — never returns pose, profile, or
// supporting assets.
export function getEnvironmentReferencesForScene(
  sceneRefPkg: SceneReferencePackage
): SceneEnvironmentRef[] {
  const refs: SceneEnvironmentRef[] = [];
  for (const charPkg of sceneRefPkg.characterPackages) {
    for (const asset of charPkg.environmentReferences.slice(0, MAX_ENV_PER_CHAR)) {
      if (asset.blobUrl) {
        refs.push({
          id: asset.id,
          characterSlug: charPkg.characterSlug,
          characterName: charPkg.characterName,
          title: asset.title || asset.description || asset.assetType,
          url: asset.blobUrl,
          assetType: asset.assetType,
        });
      }
    }
  }
  return refs;
}

// Selects the single best environment reference for background generation.
// Priority order:
//   1. Primary character's env ref (first character slug in the scene)
//   2. Setting-label keyword match in title/assetType
//   3. Any scene character's env ref (first available)
export function selectBestEnvironmentReferenceForBackground(
  envRefs: SceneEnvironmentRef[],
  settingLabel: string | undefined,
  primaryCharacterSlug: string | undefined
): SceneEnvironmentRef | undefined {
  if (envRefs.length === 0) return undefined;

  // 1. Primary character match
  if (primaryCharacterSlug) {
    const primaryRef = envRefs.find(
      (r) => r.characterSlug === primaryCharacterSlug
    );
    if (primaryRef) return primaryRef;
  }

  // 2. Setting keyword match
  if (settingLabel) {
    const label = settingLabel.toLowerCase();
    const settingMatch = envRefs.find(
      (r) =>
        r.title.toLowerCase().includes(label) ||
        r.assetType.toLowerCase().includes(label)
    );
    if (settingMatch) return settingMatch;
  }

  // 3. First available
  return envRefs[0];
}

// Builds a structured summary for route responses and UI display.
export function buildEnvironmentReferenceSummary(
  envRefs: SceneEnvironmentRef[],
  selected: SceneEnvironmentRef | undefined,
  mode: "image-reference" | "text-only" | "none"
): EnvironmentReferenceSummary {
  return {
    count: envRefs.length,
    ids: envRefs.map((r) => r.id),
    titles: envRefs.map((r) => r.title),
    characterSlugs: [...new Set(envRefs.map((r) => r.characterSlug))],
    selectedUrl: selected?.url,
    selectedTitle: selected?.title,
    selectedCharacterSlug: selected?.characterSlug,
    mode,
  };
}

// Builds the text block to inject into the background generation prompt.
// Returns undefined when no env refs are available (text-only fallback not needed).
export function buildEnvironmentReferencePromptSection(
  envRefs: SceneEnvironmentRef[],
  selected: SceneEnvironmentRef | undefined
): string | undefined {
  if (envRefs.length === 0 || !selected) return undefined;

  const lines: string[] = [
    "=== E. OFFICIAL ENVIRONMENT REFERENCES ===",
    "The following approved environment/home reference images are provided for this scene.",
    "Use them as the PRIMARY visual source of truth for the setting.",
    "Match their visual style, color palette, spatial layout, and atmosphere exactly.",
    "",
    "Scene environment references:",
  ];

  for (const ref of envRefs) {
    lines.push(`  - "${ref.title}" (${ref.characterName})`);
  }

  lines.push("");
  lines.push(
    `Primary selected reference: "${selected.title}" (${selected.characterName})`
  );
  lines.push(
    "This reference is the authoritative visual anchor for the scene's environment."
  );
  lines.push(
    "Reproduce its setting faithfully — do not invent a new environment."
  );

  return lines.join("\n");
}
