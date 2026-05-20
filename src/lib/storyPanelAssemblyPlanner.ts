// Story panel assembly planner (Phase 18D.9).
// Deterministic decomposition of a scene into background + per-character layer plans.
// No AI provider calls — keyword heuristics only.
// Server-safe — do NOT import in client components.

import type {
  StoryPanelAssemblyPlan,
  StoryPanelCharacterLayerPlan,
  AssemblyPlanUiSummary,
  CharacterPlacement,
  CharacterFacingDirection,
} from "@/lib/storyPanelAssemblyTypes";

const PLANNER_VERSION = "1.0.0";

// ─── Per-character canonical data ─────────────────────────────────────────────

type CharacterCanonicalData = {
  name: string;
  mustShow: string[];
  mustAvoid: string[];
  officialFeatureLocks: string[];
};

const CHARACTER_CANONICAL: Record<string, CharacterCanonicalData> = {
  "pineapple-baby": {
    name: "Pineapple Baby",
    mustShow: [
      "warm golden-yellow plump pineapple oval body",
      "pineapple diamond/crosshatch texture on body",
      "layered green spiky pineapple crown leaves on top",
      "two short rounded baby arms",
      "baby-like proportions with cute round face",
    ],
    mustAvoid: [
      "green body color — crown leaves are green, body is golden-yellow",
      "purple or lavender body — that belongs to Ube Baby",
      "mango orange/green gradient body — that belongs to Mango Baby",
      "heart-shaped leaf cluster — that belongs to Ube Baby",
      "small brown stem with single leaf — that belongs to Mango Baby",
      "smooth body without pineapple crosshatch texture",
    ],
    officialFeatureLocks: [
      "body: warm golden-yellow pineapple oval",
      "texture: pineapple diamond/crosshatch pattern",
      "top: layered multi-leaf green spiky pineapple crown",
      "arms: two short rounded baby arms",
    ],
  },
  "ube-baby": {
    name: "Ube Baby",
    mustShow: [
      "soft purple/lavender smooth round body — no pineapple texture",
      "green heart-shaped leaf cluster on top",
      "two short rounded baby arms",
      "baby-like proportions with cute round face",
    ],
    mustAvoid: [
      "pineapple diamond/crosshatch body texture — body must be smooth purple",
      "golden-yellow or orange body — that belongs to Pineapple Baby",
      "mango orange/green gradient — that belongs to Mango Baby",
      "layered spiky pineapple crown — that belongs to Pineapple Baby",
      "small brown stem with single leaf — that belongs to Mango Baby",
    ],
    officialFeatureLocks: [
      "body: soft purple/lavender smooth oval",
      "texture: smooth, no crosshatch",
      "top: green heart-shaped leaf cluster",
      "arms: two short rounded baby arms",
    ],
  },
  "mango-baby": {
    name: "Mango Baby",
    mustShow: [
      "mango yellow/orange/green gradient smooth body",
      "small brown mango stem with single green mango leaf on top",
      "two short rounded baby arms — must be visible in standing or sitting poses",
      "baby-like proportions with cute round face",
    ],
    mustAvoid: [
      "pineapple diamond/crosshatch body texture — body must be smooth mango",
      "purple or lavender body — that belongs to Ube Baby",
      "golden-yellow flat body — body must have mango gradient tones",
      "layered spiky pineapple crown — that belongs to Pineapple Baby",
      "heart-shaped leaf cluster — that belongs to Ube Baby",
      "hiding or omitting both arms in standing/sitting poses",
    ],
    officialFeatureLocks: [
      "body: mango yellow/orange/green gradient smooth oval",
      "texture: smooth, no crosshatch",
      "top: small brown mango stem with single green leaf",
      "arms: two short rounded baby arms, visible in normal poses",
    ],
  },
};

const GENERIC_FRUIT_BABY_CANONICAL: CharacterCanonicalData = {
  name: "Fruit Baby",
  mustShow: [
    "cute baby-like proportions — plump, short, round",
    "signature fruit body shape and color",
    "signature top feature (leaf, crown, or stem)",
    "two short rounded baby arms",
  ],
  mustAvoid: [
    "realistic or adult proportions",
    "borrowing features from other Fruit Baby characters",
    "redesigning or reinterpreting the official character design",
  ],
  officialFeatureLocks: [
    "baby-like plump proportions",
    "fruit-specific body color and shape",
    "character-specific top feature",
  ],
};

// ─── Scene signal extraction ───────────────────────────────────────────────────

export type SceneAssemblySignals = {
  settingLabel: string;
  settingDescription: string;
  mood: string;
  timeOfDay: string | null;
  locationKeywords: string[];
  emotionCues: Record<string, string>;
  actionCues: Record<string, string>;
  placementCues: Record<string, CharacterPlacement>;
  signalKeywordsFound: string[];
};

const SETTING_KEYWORDS: Array<{ keywords: string[]; label: string; description: string }> = [
  { keywords: ["classroom", "school", "desk", "teacher", "lesson", "blackboard", "whiteboard"], label: "Classroom", description: "indoor school classroom setting" },
  { keywords: ["playground", "slide", "swing", "jungle gym", "recess"], label: "Playground", description: "outdoor playground setting" },
  { keywords: ["garden", "flowers", "plants", "outdoor", "nature", "park", "trees"], label: "Garden / Outdoor", description: "outdoor garden or park setting" },
  { keywords: ["kitchen", "cooking", "baking", "stove", "oven", "fridge"], label: "Kitchen", description: "indoor kitchen setting" },
  { keywords: ["bedroom", "bed", "pillow", "sleeping", "nighttime", "dream"], label: "Bedroom", description: "cozy bedroom setting" },
  { keywords: ["beach", "ocean", "sand", "waves", "tropical", "island"], label: "Beach / Tropical", description: "tropical beach or island setting" },
  { keywords: ["library", "books", "reading", "bookshelf"], label: "Library", description: "indoor library setting" },
  { keywords: ["market", "store", "shop", "fruit stand", "stall"], label: "Market / Store", description: "market or store setting" },
  { keywords: ["forest", "woods", "trees", "path", "trail"], label: "Forest", description: "forest or wooded setting" },
  { keywords: ["stage", "performance", "show", "audience", "theater"], label: "Stage / Performance", description: "performance stage setting" },
];

const MOOD_KEYWORDS: Array<{ keywords: string[]; mood: string }> = [
  { keywords: ["happy", "joy", "laugh", "smile", "celebrate", "cheer", "excited", "fun"], mood: "joyful" },
  { keywords: ["sad", "cry", "upset", "tears", "unhappy", "disappointed"], mood: "melancholic" },
  { keywords: ["worried", "nervous", "anxious", "scared", "afraid", "unsure"], mood: "anxious" },
  { keywords: ["angry", "mad", "frustrated", "grumpy"], mood: "frustrated" },
  { keywords: ["calm", "peaceful", "quiet", "serene", "gentle"], mood: "calm" },
  { keywords: ["curious", "wonder", "explore", "discover", "question"], mood: "curious" },
  { keywords: ["brave", "confident", "proud", "strong", "determined"], mood: "determined" },
  { keywords: ["silly", "funny", "goofy", "wacky", "mischievous"], mood: "playful" },
  { keywords: ["kind", "caring", "helping", "sharing", "loving", "sweet"], mood: "heartwarming" },
  { keywords: ["surprised", "shocked", "amazed", "wow"], mood: "surprised" },
];

const EMOTION_KEYWORDS: Record<string, string[]> = {
  happy: ["happy", "joyful", "excited", "smiling", "grinning", "laugh", "delight"],
  sad: ["sad", "crying", "tears", "upset", "unhappy"],
  worried: ["worried", "nervous", "anxious", "scared", "afraid"],
  angry: ["angry", "mad", "frustrated", "grumpy"],
  curious: ["curious", "wonder", "thinking", "pondering", "questioning"],
  proud: ["proud", "confident", "brave", "determined"],
  surprised: ["surprised", "shocked", "amazed", "gasp"],
  calm: ["calm", "relaxed", "peaceful", "content"],
};

const PLACEMENT_KEYWORDS: Array<{ keywords: string[]; placement: CharacterPlacement }> = [
  { keywords: ["on the left", "to the left", "left side", "far left"], placement: "left" },
  { keywords: ["on the right", "to the right", "right side", "far right"], placement: "right" },
  { keywords: ["center", "middle", "in the center", "in the middle"], placement: "center" },
  { keywords: ["background", "in the back", "behind", "in the distance"], placement: "background-center" },
  { keywords: ["foreground", "in front", "closest"], placement: "foreground" },
];

const TIME_OF_DAY_KEYWORDS: Array<{ keywords: string[]; time: string }> = [
  { keywords: ["morning", "sunrise", "dawn", "early"], time: "morning" },
  { keywords: ["afternoon", "midday", "noon"], time: "afternoon" },
  { keywords: ["evening", "sunset", "dusk", "golden hour"], time: "evening" },
  { keywords: ["night", "nighttime", "dark", "moon", "stars"], time: "night" },
];

export function extractSceneAssemblySignals(
  text: string,
  characterSlugs: string[] = []
): SceneAssemblySignals {
  const lower = text.toLowerCase();
  const signalKeywordsFound: string[] = [];

  // Setting
  let settingLabel = "General Scene";
  let settingDescription = "unspecified scene setting";
  for (const entry of SETTING_KEYWORDS) {
    const found = entry.keywords.find((k) => lower.includes(k));
    if (found) {
      settingLabel = entry.label;
      settingDescription = entry.description;
      signalKeywordsFound.push(`setting:${found}`);
      break;
    }
  }

  // Mood
  let mood = "warm and playful";
  for (const entry of MOOD_KEYWORDS) {
    const found = entry.keywords.find((k) => lower.includes(k));
    if (found) {
      mood = entry.mood;
      signalKeywordsFound.push(`mood:${found}`);
      break;
    }
  }

  // Time of day
  let timeOfDay: string | null = null;
  for (const entry of TIME_OF_DAY_KEYWORDS) {
    const found = entry.keywords.find((k) => lower.includes(k));
    if (found) {
      timeOfDay = entry.time;
      signalKeywordsFound.push(`time:${found}`);
      break;
    }
  }

  // Location keywords
  const locationKeywords: string[] = [];
  for (const entry of SETTING_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (lower.includes(kw) && !locationKeywords.includes(kw)) {
        locationKeywords.push(kw);
      }
    }
  }

  // Per-character emotion cues
  const emotionCues: Record<string, string> = {};
  const actionCues: Record<string, string> = {};
  const placementCues: Record<string, CharacterPlacement> = {};

  for (const slug of characterSlugs) {
    // Emotion
    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      const found = keywords.find((k) => lower.includes(k));
      if (found) {
        emotionCues[slug] = emotion;
        signalKeywordsFound.push(`emotion:${found}`);
        break;
      }
    }

    // Placement — try to find character name mention near placement keyword
    const canonical = CHARACTER_CANONICAL[slug];
    const nameParts = (canonical?.name ?? slug)
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3);
    for (const entry of PLACEMENT_KEYWORDS) {
      const placementFound = entry.keywords.find((k) => lower.includes(k));
      if (placementFound) {
        const nameNearby = nameParts.some((part) => {
          const idx = lower.indexOf(part);
          if (idx === -1) return false;
          const pkIdx = lower.indexOf(placementFound);
          return Math.abs(idx - pkIdx) < 80;
        });
        if (nameNearby) {
          placementCues[slug] = entry.placement;
          signalKeywordsFound.push(`placement:${placementFound}`);
          break;
        }
      }
    }
  }

  return {
    settingLabel,
    settingDescription,
    mood,
    timeOfDay,
    locationKeywords,
    emotionCues,
    actionCues,
    placementCues,
    signalKeywordsFound,
  };
}

// ─── Character layer plan builder ─────────────────────────────────────────────

export function buildCharacterLayerPlan(options: {
  characterSlug: string;
  signals: SceneAssemblySignals;
  indexInCast: number;
  castSize: number;
  referenceAssetIds?: string[];
  sceneText?: string;
}): StoryPanelCharacterLayerPlan {
  const { characterSlug, signals, indexInCast, castSize, referenceAssetIds = [], sceneText = "" } = options;

  const canonical = CHARACTER_CANONICAL[characterSlug] ?? GENERIC_FRUIT_BABY_CANONICAL;
  const name = canonical.name !== "Fruit Baby" ? canonical.name : characterSlug;

  const emotion = signals.emotionCues[characterSlug] ?? "warm and expressive";
  const action = signals.actionCues[characterSlug] ?? inferDefaultAction(signals.settingLabel);

  // Placement: use cue if present, else spread by index
  let placement: CharacterPlacement =
    signals.placementCues[characterSlug] ??
    defaultPlacementByIndex(indexInCast, castSize);

  const roleInScene: StoryPanelCharacterLayerPlan["roleInScene"] =
    indexInCast === 0 ? "protagonist" : indexInCast <= 2 ? "supporting" : "background";

  const facingDirection: CharacterFacingDirection =
    placement === "left" || placement === "background-left"
      ? "facing-right"
      : placement === "right" || placement === "background-right"
      ? "facing-left"
      : "facing-viewer";

  const relativeSize: StoryPanelCharacterLayerPlan["relativeSize"] =
    roleInScene === "protagonist" ? "large" : roleInScene === "supporting" ? "medium" : "small";

  const placementDetail = describePlacement(placement, name);

  const cleanRenderPrompt = buildCleanRenderPrompt({
    name,
    characterSlug,
    emotion,
    action,
    placement,
    placementDetail,
    relativeSize,
    facingDirection,
    mustShow: canonical.mustShow,
    officialFeatureLocks: canonical.officialFeatureLocks,
    settingDescription: signals.settingDescription,
  });

  return {
    characterSlug,
    characterName: name,
    roleInScene,
    emotion,
    action,
    pose: inferPose(action, signals.settingLabel),
    placement,
    placementDetail,
    relativeSize,
    facingDirection,
    interactionTargetSlug: null,
    mustShow: canonical.mustShow,
    mustAvoid: canonical.mustAvoid,
    officialFeatureLocks: canonical.officialFeatureLocks,
    referenceAssetIds,
    cleanRenderPrompt,
  };
}

function defaultPlacementByIndex(index: number, total: number): CharacterPlacement {
  if (total === 1) return "center";
  if (total === 2) return index === 0 ? "center-left" : "center-right";
  if (total === 3) return (["left", "center", "right"] as CharacterPlacement[])[index] ?? "center";
  const placements: CharacterPlacement[] = ["left", "center-left", "center-right", "right"];
  return placements[index % placements.length] ?? "center";
}

function inferDefaultAction(settingLabel: string): string {
  const map: Record<string, string> = {
    Classroom: "sitting attentively",
    Playground: "playing happily",
    "Garden / Outdoor": "exploring and looking around",
    Kitchen: "helping with cooking",
    Bedroom: "getting ready for rest",
    "Beach / Tropical": "playing near the water",
    Library: "reading or browsing books",
    "Market / Store": "looking at items",
    Forest: "walking along the path",
    "Stage / Performance": "performing on stage",
  };
  return map[settingLabel] ?? "standing and looking at the scene";
}

function inferPose(action: string, settingLabel: string): string {
  const lower = action.toLowerCase();
  if (lower.includes("sit")) return "seated pose";
  if (lower.includes("run") || lower.includes("jump")) return "active dynamic pose";
  if (lower.includes("read") || lower.includes("look")) return "attentive pose";
  if (lower.includes("cook") || lower.includes("help")) return "engaged active pose";
  if (lower.includes("sleep")) return "resting pose";
  if (lower.includes("walk")) return "walking pose";
  return "relaxed standing pose";
}

function describePlacement(placement: CharacterPlacement, name: string): string {
  const map: Record<CharacterPlacement, string> = {
    left: `${name} positioned on the left side of the panel`,
    "center-left": `${name} positioned left of center`,
    center: `${name} positioned in the center of the panel`,
    "center-right": `${name} positioned right of center`,
    right: `${name} positioned on the right side of the panel`,
    "background-left": `${name} in the background, left side`,
    "background-center": `${name} in the background, center`,
    "background-right": `${name} in the background, right side`,
    foreground: `${name} in the foreground, prominently placed`,
    unknown: `${name} placement to be determined by composition`,
  };
  return map[placement] ?? `${name} placed in the scene`;
}

function buildCleanRenderPrompt(opts: {
  name: string;
  characterSlug: string;
  emotion: string;
  action: string;
  placement: CharacterPlacement;
  placementDetail: string;
  relativeSize: string;
  facingDirection: CharacterFacingDirection;
  mustShow: string[];
  officialFeatureLocks: string[];
  settingDescription: string;
}): string {
  const {
    name,
    emotion,
    action,
    placementDetail,
    relativeSize,
    facingDirection,
    mustShow,
    officialFeatureLocks,
    settingDescription,
  } = opts;

  const directionLabel =
    facingDirection === "facing-right"
      ? "facing right"
      : facingDirection === "facing-left"
      ? "facing left"
      : facingDirection === "facing-viewer"
      ? "facing the viewer"
      : "facing three-quarter";

  const featureLockBlock = officialFeatureLocks.map((f) => `  - ${f}`).join("\n");
  const mustShowBlock = mustShow.slice(0, 3).map((m) => `  - ${m}`).join("\n");

  return [
    `Render ${name} as a clean isolated character layer for compositing.`,
    `Setting context: ${settingDescription}.`,
    `Emotion: ${emotion}. Action: ${action}.`,
    `${placementDetail}, ${directionLabel}, ${relativeSize} scale.`,
    `Official feature locks (must match exactly):`,
    featureLockBlock,
    `Must show:`,
    mustShowBlock,
    `Character must be immediately recognizable as official ${name}.`,
    `Cute baby-like proportions. No background — isolated character only.`,
  ].join("\n");
}

// ─── Background prompt builder ─────────────────────────────────────────────────

function buildBackgroundPrompt(signals: SceneAssemblySignals, adminDirection: string | null): string {
  const { settingLabel, settingDescription, mood, timeOfDay, locationKeywords } = signals;

  const timePhrase = timeOfDay ? ` during ${timeOfDay}` : "";
  const locPhrase =
    locationKeywords.length > 0
      ? ` with elements: ${locationKeywords.slice(0, 4).join(", ")}`
      : "";
  const directionPhrase = adminDirection ? ` Scene direction: ${adminDirection}.` : "";

  return [
    `Background layer for a Fruit Baby story panel.`,
    `Setting: ${settingLabel} — ${settingDescription}${timePhrase}${locPhrase}.`,
    `Mood: ${mood}. Style: flat digital illustration, warm color palette, kid-friendly.`,
    `No characters in this layer — background environment only.`,
    `Consistent with the Fruit Baby brand aesthetic: tropical warmth, bold colors, clean lines.`,
    directionPhrase,
  ]
    .filter(Boolean)
    .join(" ");
}

// ─── Assembly direction prompt ─────────────────────────────────────────────────

function buildAssemblyDirectionPrompt(
  cast: StoryPanelCharacterLayerPlan[],
  signals: SceneAssemblySignals,
  adminDirection: string | null
): string {
  const characterList = cast
    .map((c) => `${c.characterName} (${c.placement}, ${c.emotion})`)
    .join(", ");

  const directionPhrase = adminDirection ? ` Admin direction: ${adminDirection}.` : "";

  return [
    `Composite panel assembly.`,
    `Characters: ${characterList}.`,
    `Setting: ${signals.settingLabel}, mood: ${signals.mood}.`,
    `Place each character at their assigned position. Maintain depth and overlap naturally.`,
    `Every character must retain their official design — no redesign or blending between characters.`,
    directionPhrase,
  ]
    .filter(Boolean)
    .join(" ");
}

// ─── Main plan builder ─────────────────────────────────────────────────────────

export function buildStoryPanelAssemblyPlan(options: {
  episodeSlug: string;
  sceneId?: string | null;
  sceneNumber?: number | null;
  panelId?: string | null;
  mode: import("@/lib/storyPanelImageProvider").StoryPanelGenerationMode;
  characterSlugs: string[];
  sceneText?: string;
  adminSceneDirection?: string | null;
  referenceAssetIds?: string[];
}): StoryPanelAssemblyPlan {
  const {
    episodeSlug,
    sceneId = null,
    sceneNumber = null,
    panelId = null,
    mode,
    characterSlugs,
    sceneText = "",
    adminSceneDirection = null,
    referenceAssetIds = [],
  } = options;

  const warnings: string[] = [];
  const signals = extractSceneAssemblySignals(sceneText, characterSlugs);

  if (characterSlugs.length === 0) {
    warnings.push("No characters provided — cast will be empty.");
  }
  if (!sceneText || sceneText.trim().length < 10) {
    warnings.push("Scene text is very short — setting and mood signals may be inaccurate.");
  }

  const cast: StoryPanelCharacterLayerPlan[] = characterSlugs.map((slug, i) =>
    buildCharacterLayerPlan({
      characterSlug: slug,
      signals,
      indexInCast: i,
      castSize: characterSlugs.length,
      referenceAssetIds: referenceAssetIds,
      sceneText,
    })
  );

  const backgroundPrompt = buildBackgroundPrompt(signals, adminSceneDirection);
  const assemblyDirectionPrompt = buildAssemblyDirectionPrompt(cast, signals, adminSceneDirection);

  const id = `assembly-${episodeSlug}-${sceneNumber ?? "unknown"}-${Date.now()}`;

  return {
    id,
    episodeSlug,
    sceneId,
    sceneNumber,
    panelId,
    mode,
    status: "planned",

    scene: {
      settingLabel: signals.settingLabel,
      settingDescription: signals.settingDescription,
      mood: signals.mood,
      timeOfDay: signals.timeOfDay,
      locationKeywords: signals.locationKeywords,
    },

    cast,

    layout: {
      compositionStyle: "landscape",
      characterCount: cast.length,
      primaryCharacterSlug: cast[0]?.characterSlug ?? null,
      depthLayers: Math.min(3, cast.length + 1),
      backgroundDescription: signals.settingDescription,
      backgroundPrompt,
    },

    references: {
      characterSlugs,
      referenceAssetIds,
      totalReferenceCount: referenceAssetIds.length,
    },

    prompts: {
      backgroundPrompt,
      assemblyDirectionPrompt,
      adminDirectionUsed: adminSceneDirection,
    },

    metadata: {
      plannedAt: new Date().toISOString(),
      plannerVersion: PLANNER_VERSION,
      sourceSceneTextLength: sceneText ? sceneText.length : null,
      warnings,
      signalKeywordsFound: signals.signalKeywordsFound,
    },
  };
}

// ─── UI summary builder ────────────────────────────────────────────────────────

export function summarizeAssemblyPlanForUi(plan: StoryPanelAssemblyPlan): AssemblyPlanUiSummary {
  return {
    available: true,
    settingLabel: plan.scene.settingLabel,
    mood: plan.scene.mood,
    characterCount: plan.cast.length,
    characters: plan.cast.map((c) => ({
      slug: c.characterSlug,
      name: c.characterName,
      placement: c.placement,
      emotion: c.emotion,
      action: c.action,
    })),
    backgroundSummary: plan.layout.backgroundDescription,
    warnings: plan.metadata.warnings,
    adminDirectionUsed: plan.prompts.adminDirectionUsed,
  };
}

export function summarizeAssemblyPlanForPrompt(plan: StoryPanelAssemblyPlan): string {
  const characterLines = plan.cast
    .map((c) => `${c.characterName}: ${c.placement}, ${c.emotion}, ${c.action}`)
    .join("; ");
  return `Scene: ${plan.scene.settingLabel}, mood: ${plan.scene.mood}. Cast: ${characterLines}.`;
}
