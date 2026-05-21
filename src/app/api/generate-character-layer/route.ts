// POST /api/generate-character-layer
// Protected route: generates a single character layer draft for staged compositing.
// Uses only that character's own approved references (reference isolation).
// Scene-aware: renders the character in isolation with full story context so it
// is emotionally and physically prepared for the final assembled scene.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Generated images are temporary, never saved or published here.
// Phase:   18D.11 — Scene-Aware Per-Character Production Layer Rendering

import {
  loadReferenceAssets,
  buildSceneReferencePackage,
} from "@/lib/referenceAssetLoader";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { buildProductionReferenceSet } from "@/lib/storyPanelReferenceBundle";
import {
  getFalApiKey,
  getFalCharacterLayerModelId,
  isProductionProviderConfigured,
  getProductionSetupError,
  getCharacterLayerPayloadMode,
} from "@/lib/storyPanelImageProvider";
import {
  compactStoryPanelPrompt,
  PROVIDER_PROMPT_SOFT_LIMIT,
} from "@/lib/storyPanelPromptCompactor";
import { buildCharacterLayerPrompt } from "@/lib/storyPanelCharacterLayerPrompt";
import { extractSceneAssemblySignals } from "@/lib/storyPanelAssemblyPlanner";
import type { StoryPanelCharacterLayerPlan } from "@/lib/storyPanelAssemblyTypes";
import type { StoryPanelCharacterLayerDraft } from "@/lib/storyPanelBackgroundTypes";
import { validateSlug } from "@/lib/storyPanelImageGeneration";
import type { Character } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type CharLayerResult =
  | {
      ok: true;
      status: "character_layer_draft_generated";
      draft: StoryPanelCharacterLayerDraft;
      generationPrompt: string;
      providerPromptLength: number;
      promptWasCompacted: boolean;
      referenceUrl: string | null;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "provider_error"
        | "provider_timeout"
        | "image_response_parse_error";
      message: string;
      providerStatus?: number;
      providerMessage?: string;
      troubleshooting?: string[];
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function buildCharBySlug(chars: Character[]): Record<string, Character> {
  const map: Record<string, Character> = {};
  for (const c of chars) {
    map[c.slug] = c;
    if ((c as Character & { id?: string }).id) {
      map[(c as Character & { id?: string }).id!] = c;
    }
  }
  if (map["tiki"] && !map["tiki-trouble"]) map["tiki-trouble"] = map["tiki"];
  if (map["tiki-trouble"] && !map["tiki"]) map["tiki"] = map["tiki-trouble"];
  return map;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies CharLayerResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies CharLayerResult,
      { status: 400 }
    );
  }

  // ── Validate required fields ──────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "episodeSlug is required and must be a safe slug." } satisfies CharLayerResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  if (
    typeof body.sceneNumber !== "number" ||
    body.sceneNumber < 1 ||
    !Number.isFinite(body.sceneNumber)
  ) {
    return Response.json(
      { ok: false, status: "validation_error", message: "sceneNumber is required and must be a positive number." } satisfies CharLayerResult,
      { status: 400 }
    );
  }
  const sceneNumber = body.sceneNumber as number;

  const sceneId =
    typeof body.sceneId === "string" && body.sceneId.trim().length > 0
      ? body.sceneId.trim()
      : undefined;

  // ── Validate characterLayerPlan ───────────────────────────────────────────────
  if (!isRecord(body.characterLayerPlan)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "characterLayerPlan is required and must be an object." } satisfies CharLayerResult,
      { status: 400 }
    );
  }

  const plan = body.characterLayerPlan as unknown as StoryPanelCharacterLayerPlan;

  if (!validateSlug(plan.characterSlug) || typeof plan.characterName !== "string") {
    return Response.json(
      { ok: false, status: "validation_error", message: "characterLayerPlan must include a valid characterSlug and characterName." } satisfies CharLayerResult,
      { status: 400 }
    );
  }

  // ── panelPrompt (sceneText for signal extraction) ─────────────────────────────
  const panelPrompt =
    typeof body.panelPrompt === "string" && body.panelPrompt.trim().length > 0
      ? body.panelPrompt.trim()
      : "";

  // ── Optional admin scene direction ────────────────────────────────────────────
  const adminSceneDirection =
    typeof body.adminSceneDirection === "string" && body.adminSceneDirection.trim().length > 0
      ? body.adminSceneDirection.trim().replace(/<[^>]*>/g, "").slice(0, 1200)
      : undefined;

  // ── Check production provider config ─────────────────────────────────────────
  if (!isProductionProviderConfigured()) {
    const setupError = getProductionSetupError();
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: setupError ?? "Production image provider (Fal.ai) is not configured. Add FAL_KEY to Vercel environment variables.",
        troubleshooting: [
          "Add FAL_KEY to Vercel environment variables.",
          "Redeploy after adding the key.",
        ],
      } satisfies CharLayerResult,
      { status: 503 }
    );
  }

  const falApiKey = getFalApiKey()!;
  const modelId = getFalCharacterLayerModelId();
  const payloadMode = getCharacterLayerPayloadMode(modelId);

  // ── Load THIS character's references only (reference isolation) ───────────────
  let referenceUrl: string | null = null;

  try {
    const allAssets = loadReferenceAssets();
    const allChars = loadAllCharactersFromDisk();
    const charBySlug = buildCharBySlug(allChars);

    // Build a scene ref package for this single character only
    const singleCharRefPkg = buildSceneReferencePackage(
      sceneNumber,
      [plan.characterSlug],
      allAssets,
      charBySlug
    );

    const refSet = buildProductionReferenceSet(singleCharRefPkg, false);
    referenceUrl =
      refSet.characterRefs[0]?.canonicalUrl ?? refSet.allUrls[0] ?? null;
  } catch (refErr) {
    console.warn(
      "[generate-character-layer] Reference loading failed, continuing without ref:",
      refErr instanceof Error ? refErr.message : refErr
    );
  }

  // ── Validate reference URL before sending to Fal ─────────────────────────────
  if (referenceUrl) {
    try {
      new URL(referenceUrl);
    } catch {
      console.warn(
        `[generate-character-layer] Reference URL invalid, omitting: ${referenceUrl.slice(0, 80)}`
      );
      referenceUrl = null;
    }
  }

  // ── Build the character layer prompt ─────────────────────────────────────────
  const signals = extractSceneAssemblySignals(panelPrompt, [plan.characterSlug]);

  const fullPrompt = buildCharacterLayerPrompt({
    plan,
    settingLabel: signals.settingLabel,
    settingDescription: signals.settingDescription,
    mood: signals.mood,
    adminSceneDirection,
  });

  // Compact to provider-safe length
  const compaction = compactStoryPanelPrompt({
    fullPrompt,
    panelPrompt: fullPrompt,
    charPkgs: [],
    adminSceneDirection,
  });
  const providerPrompt = compaction.prompt;

  console.log(
    `[generate-character-layer] character=${plan.characterSlug}, model=${modelId}, promptLen=${providerPrompt.length}, hasRef=${referenceUrl !== null}`
  );

  // ── Call Fal.ai ───────────────────────────────────────────────────────────────
  // Single-image models (default fal-ai/flux-pro/kontext) require image_url as
  // a string. Multi-reference models (/multi) require image_urls as an array.
  const requestBody: Record<string, unknown> = {
    prompt: providerPrompt,
    num_images: 1,
  };
  if (referenceUrl) {
    if (payloadMode === "multi-reference") {
      requestBody.image_urls = [referenceUrl];
    } else {
      requestBody.image_url = referenceUrl;
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let falResp: Response;
  try {
    falResp = await fetch(`https://fal.run/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Key ${falApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!falResp.ok) {
    const errText = await falResp.text().catch(() => "");
    const is422 = falResp.status === 422;
    console.error(`[generate-character-layer] Fal.ai ${falResp.status}:`, errText.slice(0, 200));

    const troubleshooting: string[] = [];
    if (is422) {
      troubleshooting.push(
        referenceUrl
          ? `Payload mode is "${payloadMode}" — reference sent as ${payloadMode === "multi-reference" ? "image_urls (array)" : "image_url (string)"}. If 422 persists, the reference URL may be unreachable by Fal.ai.`
          : "No reference image was sent. 422 may indicate an invalid prompt field or model constraint."
      );
      troubleshooting.push(
        `Model: ${modelId}. To avoid payload mismatches, set STORY_PANEL_CHARACTER_LAYER_MODEL_ID=fal-ai/flux-pro/kontext in env vars.`
      );
    }
    troubleshooting.push(
      `Confirm model ID is correct: ${modelId}`,
      "Confirm FAL_KEY is valid and has sufficient credits.",
      "Try again — Fal.ai may be temporarily unavailable."
    );

    return Response.json(
      {
        ok: false,
        status: falResp.status === 408 || falResp.status === 504 ? "provider_timeout" : "provider_error",
        message: `Character layer generation failed — Fal.ai error ${falResp.status}${is422 ? " (payload validation error — check model and reference URL)" : ""}.`,
        providerStatus: falResp.status,
        providerMessage: errText.slice(0, 300),
        troubleshooting,
      } satisfies CharLayerResult,
      { status: 502 }
    );
  }

  const falData = (await falResp.json()) as Record<string, unknown>;

  const firstImage =
    (Array.isArray(falData.images) ? falData.images[0] : null) ??
    (isRecord(falData.image) ? falData.image : null);

  const falImageUrl =
    typeof (firstImage as Record<string, unknown> | null)?.url === "string"
      ? ((firstImage as Record<string, unknown>).url as string)
      : typeof falData.url === "string"
      ? falData.url
      : undefined;

  if (!falImageUrl) {
    return Response.json(
      {
        ok: false,
        status: "image_response_parse_error",
        message: "Fal.ai returned no image URL for the character layer.",
        troubleshooting: ["Try again — the provider may have returned an unexpected response."],
      } satisfies CharLayerResult,
      { status: 502 }
    );
  }

  // Download and convert to base64
  const isAbort = false;
  let b64: string | undefined;
  try {
    const imgResp = await fetch(falImageUrl);
    if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}`);
    b64 = Buffer.from(await imgResp.arrayBuffer()).toString("base64");
  } catch (dlErr) {
    const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
    console.error("[generate-character-layer] Image download failed:", msg);
    // Return URL-only draft when download fails
  }

  void isAbort;

  const draft: StoryPanelCharacterLayerDraft = {
    id: `char-layer-draft-${Date.now()}`,
    type: "character-layer-draft",
    status: "temporary",
    characterSlug: plan.characterSlug,
    characterName: plan.characterName,
    episodeSlug,
    sceneId,
    sceneNumber,
    provider: "fal",
    modelId,
    imageBase64: b64,
    imageUrl: falImageUrl,
    mimeType: "image/png",
    promptText: providerPrompt,
    providerPromptLength: providerPrompt.length,
    promptWasCompacted: compaction.wasCompacted,
    placement: plan.placement,
    emotion: plan.emotion,
    action: plan.action,
    facingDirection: plan.facingDirection,
    interactionTargetSlug: plan.interactionTargetSlug,
    createdAt: new Date().toISOString(),
    warnings: compaction.warnings,
  };

  return Response.json(
    {
      ok: true,
      status: "character_layer_draft_generated",
      draft,
      generationPrompt: providerPrompt,
      providerPromptLength: providerPrompt.length,
      promptWasCompacted: compaction.wasCompacted,
      referenceUrl,
      notes: [
        `Character layer draft for ${plan.characterName} — temporary, not saved.`,
        `Rendered in scene-aware isolation: ${plan.assemblyIntent}`,
        "Review before saving to episode.",
      ],
    } satisfies CharLayerResult,
    { status: 200 }
  );
}
