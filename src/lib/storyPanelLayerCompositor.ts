// Phase 18D.12 — Sharp-based compositor for assembling background + character layers.
import sharp from "sharp";
import {
  AssembledStoryPanelDraft,
  EpisodeSceneBackgroundLayer,
  EpisodeSceneCharacterLayer,
} from "./storyPanelBackgroundTypes";

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 1024;

// Horizontal center (as fraction of canvas width) for each placement label.
const PLACEMENT_X_CENTERS: Record<string, number> = {
  left: 0.18,
  "center-left": 0.33,
  center: 0.5,
  "center-right": 0.67,
  right: 0.82,
};

// Character height as fraction of canvas height.
const RELATIVE_SIZE_HEIGHT_FRACTION: Record<string, number> = {
  large: 0.48,
  medium: 0.38,
  small: 0.3,
};

// Characters' feet land at this Y fraction.
const FOREGROUND_FEET_Y = 0.85;
// Background characters appear higher (smaller apparent Y).
const BACKGROUND_FEET_Y = 0.6;

export type CharacterPlacementResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function calculateCharacterPlacement(
  placement: string,
  relativeSize: string | undefined,
  roleInScene: "protagonist" | "supporting" | "background" | "unknown" | undefined
): CharacterPlacementResult {
  const feetYFraction =
    roleInScene === "background" ? BACKGROUND_FEET_Y : FOREGROUND_FEET_Y;

  const heightFraction =
    RELATIVE_SIZE_HEIGHT_FRACTION[relativeSize ?? ""] ??
    RELATIVE_SIZE_HEIGHT_FRACTION.medium;

  const xCenterFraction =
    PLACEMENT_X_CENTERS[placement] ?? PLACEMENT_X_CENTERS.center;

  const height = Math.round(heightFraction * CANVAS_HEIGHT);
  const width = Math.round(height * 0.55); // approximate portrait aspect ratio
  const x = Math.round(xCenterFraction * CANVAS_WIDTH - width / 2);
  const y = Math.round(feetYFraction * CANVAS_HEIGHT) - height;

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width,
    height,
  };
}

export async function loadImageForComposition(
  imageUrl: string
): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch image (${res.status}): ${imageUrl.slice(0, 80)}`
    );
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export function createCompositionWarnings(
  charLayers: EpisodeSceneCharacterLayer[]
): string[] {
  const warnings: string[] = [];
  if (charLayers.length === 0) {
    warnings.push("No character layers were composited — background only.");
  }
  for (const layer of charLayers) {
    warnings.push(
      `Character layer for "${layer.characterName}" may not have a transparent background — compositing may show a white box.`
    );
  }
  return warnings;
}

export type ComposeLayersInput = {
  backgroundLayer: EpisodeSceneBackgroundLayer;
  characterLayers: EpisodeSceneCharacterLayer[];
  episodeSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  assemblyPlanId?: string;
};

export async function composeStoryPanelLayers(
  input: ComposeLayersInput
): Promise<AssembledStoryPanelDraft> {
  const { backgroundLayer, characterLayers, episodeSlug, sceneId, sceneNumber, assemblyPlanId } =
    input;

  // Load background image and resize to canvas dimensions.
  const bgBuffer = await loadImageForComposition(backgroundLayer.imageUrl);
  let composition = sharp(bgBuffer).resize(CANVAS_WIDTH, CANVAS_HEIGHT, {
    fit: "cover",
    position: "center",
  });

  const placements: AssembledStoryPanelDraft["placements"] = [];
  const compositeInputs: sharp.OverlayOptions[] = [];

  for (const charLayer of characterLayers) {
    const placementStr = charLayer.placement ?? "center";
    const calc = calculateCharacterPlacement(placementStr, undefined, undefined);

    try {
      const charBuffer = await loadImageForComposition(charLayer.imageUrl);
      // Resize character to target dimensions.
      const resizedCharBuffer = await sharp(charBuffer)
        .resize(calc.width, calc.height, { fit: "fill" })
        .toBuffer();

      compositeInputs.push({
        input: resizedCharBuffer,
        top: calc.y,
        left: calc.x,
      });

      placements.push({
        characterLayerId: charLayer.id,
        characterSlug: charLayer.characterSlug,
        characterName: charLayer.characterName,
        x: calc.x,
        y: calc.y,
        width: calc.width,
        height: calc.height,
        placement: placementStr,
        facingDirection: charLayer.facingDirection,
      });
    } catch (err) {
      // Non-fatal — skip this character and note warning.
      placements.push({
        characterLayerId: charLayer.id,
        characterSlug: charLayer.characterSlug,
        characterName: charLayer.characterName,
        x: calc.x,
        y: calc.y,
        width: calc.width,
        height: calc.height,
        placement: placementStr,
        facingDirection: charLayer.facingDirection,
      });
    }
  }

  // Apply character overlays if any loaded successfully.
  let outputBuffer: Buffer;
  if (compositeInputs.length > 0) {
    outputBuffer = await composition.composite(compositeInputs).png().toBuffer();
  } else {
    outputBuffer = await composition.png().toBuffer();
  }

  const imageBase64 = outputBuffer.toString("base64");
  const warnings = createCompositionWarnings(characterLayers);

  const draft: AssembledStoryPanelDraft = {
    id: `assembled-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "assembled-story-panel-draft",
    status: "temporary",
    episodeSlug,
    sceneId,
    sceneNumber,
    backgroundLayerId: backgroundLayer.id,
    characterLayerIds: characterLayers.map((c) => c.id),
    imageBase64,
    mimeType: "image/png",
    assemblyPlanId,
    provider: "local-composite",
    modelId: "none",
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT,
    placements,
    createdAt: new Date().toISOString(),
    warnings,
  };

  return draft;
}
