// POST /api/generate-story-panel-image
// Protected route: validates request, loads approved reference assets, and
// generates a temporary story panel draft.
//
// generationMode "draft"      → OpenAI images.edit (reference-conditioned) with
//                               images.generate fallback. Concept quality.
// generationMode "production" → Fal.ai with strict production fidelity prompt and
//                               primary reference image URL. Production quality target.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Generated images are never saved, uploaded, or written to JSON.
// Phase:   18D — production provider adapter (Fal.ai).

import OpenAI from "openai";
import {
  validateSlug,
  loadCharacterRefs,
  buildGenerationPrompt,
} from "@/lib/storyPanelImageGeneration";
import {
  loadReferenceAssets,
  buildSceneReferencePackage,
} from "@/lib/referenceAssetLoader";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import {
  buildStoryPanelGenerationPackage,
  buildFinalStoryPanelPrompt,
  type StoryPanelGenerationPackage,
} from "@/lib/storyPanelGenerationPackage";
import {
  getFidelityRulesSummary,
  buildImageConditionedEditPrompt,
  buildProductionFidelityPrompt,
} from "@/lib/storyPanelFidelityRules";
import {
  buildStoryPanelReferenceBundle,
  buildProductionReferenceSet,
  type ReferenceBundleCounts,
  type ProductionReferenceSet,
} from "@/lib/storyPanelReferenceBundle";
import { fetchConditionedImages } from "@/lib/storyPanelImageConditioner";
import {
  type StoryPanelGenerationMode,
  type StoryPanelProvider,
  getProductionProvider,
  getProductionModelId,
  getFalApiKey,
  isProductionProviderConfigured,
  getProductionSetupError,
  getDraftModelId,
} from "@/lib/storyPanelImageProvider";
import type { Character } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceMetaItem = {
  characterSlug: string;
  characterName: string;
  title: string;
  type: string;
  priority: string;
};

type ReferenceModeValue =
  | "image-conditioned-reference-bundle"
  | "prompt-only-reference-bundle"
  | "no-references"
  | "reference-images-attached"
  | "strict-reference-bundle"
  | "prompt-only-reference-summary"
  | "no-references-available";

type GenerateResult =
  | {
      ok: true;
      status: "story_panel_draft_generated";
      draft: {
        id: string;
        episodeSlug?: string;
        sceneId?: string;
        sceneNumber?: number;
        mimeType: string;
        imageBase64?: string;
        imageUrl?: string;
        promptText: string;
        createdAt: string;
      };
      image: { mimeType: string; base64?: string; url?: string };
      generationPrompt: string;
      generationMode: StoryPanelGenerationMode;
      provider: StoryPanelProvider;
      modelId: string;
      referenceCharacters: string[];
      referenceMode: ReferenceModeValue;
      referenceCounts: ReferenceBundleCounts;
      referencesUsed: ReferenceMetaItem[];
      referencesOmitted: ReferenceMetaItem[];
      fidelityRulesSummary: string;
      usedImageConditioning: boolean;
      providerSupportsImageReferences: boolean;
      selectedReferenceAssetCount: number;
      conditionedImageCount: number;
      skippedReferenceAssetCount: number;
      imageConditioningWarnings: string[];
      sceneCharacterCount: number;
      characterReferenceCount: number;
      supportingReferenceCount: number;
      environmentReferenceCount: number;
      passedToProviderCount: number;
      fallbackUsed: boolean;
      fallbackReason?: string;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "provider_error"
        | "provider_timeout"
        | "unsupported_reference_mode"
        | "image_response_parse_error";
      message: string;
      providerStatus?: number;
      providerMessage?: string;
      troubleshooting?: string[];
      generationPrompt?: string;
      generationMode?: StoryPanelGenerationMode;
      provider?: StoryPanelProvider;
      modelId?: string;
      referenceCharacters?: string[];
      referenceMode?: ReferenceModeValue;
      referenceCounts?: ReferenceBundleCounts;
      referencesUsed?: ReferenceMetaItem[];
      referencesOmitted?: ReferenceMetaItem[];
      usedImageConditioning?: boolean;
      providerSupportsImageReferences?: boolean;
      selectedReferenceAssetCount?: number;
      conditionedImageCount?: number;
      skippedReferenceAssetCount?: number;
      imageConditioningWarnings?: string[];
      sceneCharacterCount?: number;
      characterReferenceCount?: number;
      supportingReferenceCount?: number;
      environmentReferenceCount?: number;
      passedToProviderCount?: number;
      fallbackUsed?: boolean;
      fallbackReason?: string;
      warnings?: string[];
    };

const ALLOWED_REFERENCE_MODES = [
  "image-conditioned-reference-bundle",
  "prompt-only-reference-bundle",
  "no-references",
  "reference-images-attached",
  "strict-reference-bundle",
  "prompt-only-reference-summary",
  "no-references-available",
] as const;

type ReferenceMode = (typeof ALLOWED_REFERENCE_MODES)[number];

const EMPTY_REF_COUNTS: ReferenceBundleCounts = {
  total: 0, profileSheets: 0, mainReferences: 0, supporting: 0, environment: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizePromptBody(body: Record<string, unknown>): string | null {
  const maybePrompt = [
    body.finalPrompt,
    body.panelPrompt,
    body.promptText,
    body.prompt,
  ].find((value) => typeof value === "string" && value.trim().length > 0);
  return typeof maybePrompt === "string" ? maybePrompt.trim() : null;
}

function extractReferenceSlugs(body: Record<string, unknown>): string[] {
  if (Array.isArray(body.referenceCharacters)) {
    return body.referenceCharacters.filter((item): item is string => typeof item === "string");
  }
  if (Array.isArray(body.references)) {
    return body.references.filter((item): item is string => typeof item === "string");
  }
  if (Array.isArray(body.referenceImages)) {
    return body.referenceImages
      .map((item) => {
        if (!isRecord(item)) return undefined;
        if (typeof item.characterSlug === "string") return item.characterSlug;
        if (typeof item.slug === "string") return item.slug;
        return undefined;
      })
      .filter((item): item is string => typeof item === "string");
  }
  return [];
}

function parseProviderError(err: unknown, isTimeout?: boolean) {
  let providerStatus: number | undefined;
  let providerMessage = "The image provider could not generate the story panel draft.";
  const troubleshooting = [
    "Confirm the provider API key is set in Vercel environment variables.",
    "Confirm the image model ID is valid.",
    "Try a shorter or simpler prompt.",
    "Try again — the provider may be temporarily unavailable.",
  ];

  if (err instanceof Error) {
    providerMessage = err.message || providerMessage;
    const anyErr = err as { response?: unknown; status?: number };
    if (typeof anyErr.status === "number") providerStatus = anyErr.status;
    if (isRecord(anyErr.response)) {
      const response = anyErr.response as Record<string, unknown>;
      if (typeof response.status === "number") providerStatus = response.status;
      if (isRecord(response.data) && isRecord(response.data.error)) {
        const errData = response.data.error as Record<string, unknown>;
        if (typeof errData.message === "string") providerMessage = errData.message;
      }
    }
  }

  const isTimeoutSignal =
    isTimeout ||
    providerStatus === 408 ||
    providerStatus === 429 ||
    providerStatus === 504 ||
    (providerMessage.toLowerCase().includes("timeout")) ||
    (err instanceof Error && err.name === "AbortError");

  return {
    status: isTimeoutSignal ? ("provider_timeout" as const) : ("provider_error" as const),
    providerStatus,
    providerMessage,
    troubleshooting,
  };
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

// ─── Fal.ai production generator ─────────────────────────────────────────────

type FalImageResult = {
  b64: string | undefined;
  imageUrl: string | undefined;
  referenceMode: ReferenceModeValue;
  sceneCharacterCount: number;
  characterReferenceCount: number;
  supportingReferenceCount: number;
  environmentReferenceCount: number;
  passedToProviderCount: number;
};

async function generateWithFal(
  falApiKey: string,
  modelId: string,
  productionPrompt: string,
  productionRefSet: ProductionReferenceSet | null
): Promise<FalImageResult> {
  const {
    allUrls = [],
    sceneCharacterCount = 0,
    characterReferenceCount = 0,
    supportingReferenceCount = 0,
    environmentReferenceCount = 0,
    passedToProviderCount = 0,
  } = productionRefSet ?? {};

  const referenceMode: ReferenceModeValue =
    passedToProviderCount > 0
      ? "image-conditioned-reference-bundle"
      : "prompt-only-reference-bundle";

  console.log(
    `[generate-story-panel-image] production: model=${modelId}, chars=${characterReferenceCount}, env=${environmentReferenceCount}, total=${passedToProviderCount}`
  );

  const requestBody: Record<string, unknown> = {
    prompt: productionPrompt,
    num_images: 1,
  };

  if (allUrls.length === 1) {
    requestBody.image_url = allUrls[0];
  } else if (allUrls.length > 1) {
    requestBody.image_url = allUrls;
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
    throw new Error(`Fal.ai ${falResp.status}: ${errText.slice(0, 300)}`);
  }

  const falData = (await falResp.json()) as Record<string, unknown>;

  // Normalise across model response shapes
  const firstImage =
    (Array.isArray(falData.images) ? falData.images[0] : null) ??
    (isRecord(falData.image) ? falData.image : null);

  const falImageUrl =
    typeof firstImage?.url === "string" ? firstImage.url :
    typeof falData.url === "string" ? falData.url : undefined;

  if (!falImageUrl) {
    throw new Error("Fal.ai returned no image URL");
  }

  // Download and convert to base64 so the upload flow stays unchanged
  const imgResp = await fetch(falImageUrl);
  if (!imgResp.ok) throw new Error(`Could not download Fal.ai result: HTTP ${imgResp.status}`);
  const imgBuffer = await imgResp.arrayBuffer();
  const b64 = Buffer.from(imgBuffer).toString("base64");

  return {
    b64,
    imageUrl: falImageUrl,
    referenceMode,
    sceneCharacterCount,
    characterReferenceCount,
    supportingReferenceCount,
    environmentReferenceCount,
    passedToProviderCount,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies GenerateResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies GenerateResult,
      { status: 400 }
    );
  }

  const panelPrompt = normalizePromptBody(body);
  if (!panelPrompt) {
    return Response.json(
      { ok: false, status: "validation_error", message: "A story panel prompt is required before generating an image." } satisfies GenerateResult,
      { status: 400 }
    );
  }

  if (panelPrompt.length > 5000) {
    return Response.json(
      { ok: false, status: "validation_error", message: "The story panel prompt is too long. Shorten it to 5000 characters or less and try again." } satisfies GenerateResult,
      { status: 400 }
    );
  }

  // ── Generation mode ───────────────────────────────────────────────────────────
  const generationMode: StoryPanelGenerationMode =
    body.generationMode === "production" ? "production" : "draft";

  const referenceCharacters = extractReferenceSlugs(body);
  const unsafeSlugs = referenceCharacters.filter((slug) => !validateSlug(slug));

  if (unsafeSlugs.length > 0) {
    return Response.json(
      { ok: false, status: "validation_error", message: "All reference characters must be safe slugs (lowercase letters, numbers, hyphens only)." } satisfies GenerateResult,
      { status: 400 }
    );
  }

  let sceneNumber: number | undefined;
  if (body.sceneNumber !== undefined) {
    if (typeof body.sceneNumber !== "number" || body.sceneNumber < 1 || !Number.isFinite(body.sceneNumber)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "sceneNumber must be a positive number if provided." } satisfies GenerateResult,
        { status: 400 }
      );
    }
    sceneNumber = body.sceneNumber;
  }

  let sceneId: string | undefined;
  if (body.sceneId !== undefined) {
    if (typeof body.sceneId !== "string" || body.sceneId.trim().length === 0) {
      return Response.json(
        { ok: false, status: "validation_error", message: "sceneId must be a non-empty string if provided." } satisfies GenerateResult,
        { status: 400 }
      );
    }
    sceneId = body.sceneId.trim();
  }

  let episodeSlug: string | undefined;
  if (body.episodeSlug !== undefined) {
    if (!validateSlug(body.episodeSlug)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "episodeSlug must be a safe slug if provided." } satisfies GenerateResult,
        { status: 400 }
      );
    }
    episodeSlug = body.episodeSlug;
  }

  if (body.referenceMode !== undefined) {
    if (typeof body.referenceMode !== "string" || !ALLOWED_REFERENCE_MODES.includes(body.referenceMode as ReferenceMode)) {
      return Response.json(
        {
          ok: false,
          status: "unsupported_reference_mode",
          message: "The requested reference mode is not supported by the current story panel generator.",
          troubleshooting: ["Leave referenceMode unset to use the default for the selected generation mode."],
        } satisfies GenerateResult,
        { status: 400 }
      );
    }
  }

  // ── Load canonical character data ─────────────────────────────────────────────
  const { refs, missing } = loadCharacterRefs(referenceCharacters);
  if (missing.length > 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `Unknown character slug(s): ${missing.join(", ")}. Use canonical character IDs.`,
        referenceCharacters,
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  // ── Load reference assets and build generation package ────────────────────────
  let generationPrompt: string;
  let referenceMode: ReferenceModeValue = "no-references";
  let referenceCounts: ReferenceBundleCounts = EMPTY_REF_COUNTS;
  let referencesUsed: ReferenceMetaItem[] = [];
  let referencesOmitted: ReferenceMetaItem[] = [];
  let fidelityRulesSummary = "";
  let refWarnings: string[] = [];
  let genPkg: StoryPanelGenerationPackage | null = null;
  let sceneRefPkg: ReturnType<typeof buildSceneReferencePackage> | null = null;
  let charBySlug: Record<string, Character> = {};

  try {
    const allAssets = loadReferenceAssets();
    const allChars = loadAllCharactersFromDisk();
    charBySlug = buildCharBySlug(allChars);

    sceneRefPkg = buildSceneReferencePackage(sceneNumber ?? 1, referenceCharacters, allAssets, charBySlug);
    genPkg = buildStoryPanelGenerationPackage(sceneRefPkg, panelPrompt, { sceneNumber });
    generationPrompt = buildFinalStoryPanelPrompt(genPkg);
    referenceCounts = genPkg.referenceCounts;
    referencesUsed = genPkg.referencesUsed;
    referencesOmitted = genPkg.referencesOmitted;
    fidelityRulesSummary = getFidelityRulesSummary(sceneRefPkg);
    refWarnings = genPkg.warnings;
  } catch {
    generationPrompt = buildGenerationPrompt(panelPrompt, refs, sceneNumber);
    referenceMode = "no-references";
    refWarnings = ["Reference asset loading failed — using legacy prompt builder as fallback."];
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRODUCTION MODE — Fal.ai
  // ══════════════════════════════════════════════════════════════════════════════

  if (generationMode === "production") {
    const provider = getProductionProvider();
    const modelId = getProductionModelId();

    // Check setup
    if (!isProductionProviderConfigured()) {
      const setupError = getProductionSetupError();
      return Response.json(
        {
          ok: false,
          status: "setup_required",
          message: setupError ?? "Production image provider is not configured.",
          generationMode,
          provider,
          modelId,
          troubleshooting: [
            "Add FAL_KEY to Vercel environment variables.",
            "Redeploy after adding the key.",
            "Use Draft Mode if Production Mode is not yet configured.",
          ],
          referenceCharacters,
          referenceMode,
          referenceCounts,
          referencesUsed,
          referencesOmitted,
          warnings: refWarnings,
        } satisfies GenerateResult,
        { status: 503 }
      );
    }

    const falApiKey = getFalApiKey()!;
    const hasBundle = referenceCounts.total > 0 && sceneRefPkg !== null;
    const productionRefSet = hasBundle && sceneRefPkg
      ? buildProductionReferenceSet(sceneRefPkg)
      : null;

    const productionPrompt = sceneRefPkg
      ? buildProductionFidelityPrompt(sceneRefPkg, panelPrompt, charBySlug)
      : panelPrompt;

    console.log(
      `[generate-story-panel-image] production mode: provider=${provider}, model=${modelId}, chars=${productionRefSet?.characterReferenceCount ?? 0}, total=${productionRefSet?.passedToProviderCount ?? 0}`
    );

    try {
      const falResult = await generateWithFal(falApiKey, modelId, productionPrompt, productionRefSet);

      return Response.json(
        {
          ok: true,
          status: "story_panel_draft_generated",
          draft: {
            id: `story-panel-draft-${Date.now()}`,
            episodeSlug,
            sceneId,
            sceneNumber,
            mimeType: "image/png",
            imageBase64: falResult.b64,
            imageUrl: falResult.imageUrl,
            promptText: panelPrompt,
            createdAt: new Date().toISOString(),
          },
          image: { mimeType: "image/png", base64: falResult.b64, url: falResult.imageUrl },
          generationPrompt: productionPrompt,
          generationMode,
          provider,
          modelId,
          referenceCharacters,
          referenceMode: falResult.referenceMode,
          referenceCounts,
          referencesUsed,
          referencesOmitted,
          fidelityRulesSummary,
          usedImageConditioning: falResult.passedToProviderCount > 0,
          providerSupportsImageReferences: true,
          selectedReferenceAssetCount: falResult.passedToProviderCount,
          conditionedImageCount: falResult.passedToProviderCount,
          skippedReferenceAssetCount: 0,
          imageConditioningWarnings: [...(productionRefSet?.warnings ?? [])],
          sceneCharacterCount: falResult.sceneCharacterCount,
          characterReferenceCount: falResult.characterReferenceCount,
          supportingReferenceCount: falResult.supportingReferenceCount,
          environmentReferenceCount: falResult.environmentReferenceCount,
          passedToProviderCount: falResult.passedToProviderCount,
          fallbackUsed: false,
          warnings: refWarnings,
          notes: [
            "This story panel draft has not been saved.",
            "Production Mode — Fal.ai — strict reference fidelity target.",
            "Review it before approving and saving to the episode.",
          ],
        } satisfies GenerateResult,
        { status: 200 }
      );
    } catch (falErr) {
      const isAbort = falErr instanceof Error && falErr.name === "AbortError";
      const errMsg = falErr instanceof Error ? falErr.message : String(falErr);
      console.error("[generate-story-panel-image] Fal.ai production error:", errMsg);

      return Response.json(
        {
          ok: false,
          status: isAbort ? "provider_timeout" : "provider_error",
          message: isAbort
            ? "Production Mode timed out — Fal.ai took longer than 120 seconds. Try again or switch to Draft Mode."
            : `Production Mode failed — Fal.ai error: ${errMsg}`,
          providerMessage: errMsg,
          generationMode,
          provider,
          modelId,
          referenceCharacters,
          referenceMode,
          referenceCounts,
          referencesUsed,
          referencesOmitted,
          usedImageConditioning: false,
          providerSupportsImageReferences: true,
          selectedReferenceAssetCount: productionRefSet?.passedToProviderCount ?? 0,
          conditionedImageCount: 0,
          skippedReferenceAssetCount: 0,
          imageConditioningWarnings: [],
          sceneCharacterCount: productionRefSet?.sceneCharacterCount ?? 0,
          characterReferenceCount: productionRefSet?.characterReferenceCount ?? 0,
          supportingReferenceCount: productionRefSet?.supportingReferenceCount ?? 0,
          environmentReferenceCount: productionRefSet?.environmentReferenceCount ?? 0,
          passedToProviderCount: productionRefSet?.passedToProviderCount ?? 0,
          fallbackUsed: false,
          troubleshooting: [
            "Confirm FAL_KEY is valid and has sufficient credits.",
            `Confirm model ID is correct: ${modelId}`,
            "Try again — Fal.ai may be temporarily unavailable.",
            "Switch to Draft Mode to continue with OpenAI generation.",
          ],
          warnings: refWarnings,
        } satisfies GenerateResult,
        { status: 502 }
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DRAFT MODE — OpenAI (existing path, unchanged)
  // ══════════════════════════════════════════════════════════════════════════════

  const provider: StoryPanelProvider = "openai";
  const modelId = getDraftModelId();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "OpenAI image generation is not configured. Add OPENAI_API_KEY in Vercel environment variables and redeploy.",
        providerMessage: "Missing OPENAI_API_KEY.",
        generationMode,
        provider,
        modelId,
        troubleshooting: [
          "Add OPENAI_API_KEY to your Vercel environment variables.",
          "Redeploy after updating environment variables.",
        ],
      } satisfies GenerateResult,
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey });
  let b64: string | undefined;
  let resultImageUrl: string | undefined;
  let usedImageConditioning = false;
  let fallbackReason: string | undefined;
  let selectedReferenceAssetCount = 0;
  let conditionedImageCount = 0;
  let skippedReferenceAssetCount = 0;
  let imageConditioningWarnings: string[] = [];

  const hasBundle = referenceCounts.total > 0 && genPkg !== null && sceneRefPkg !== null;

  if (hasBundle && genPkg && sceneRefPkg) {
    const bundleAssets = buildStoryPanelReferenceBundle(sceneRefPkg).assets;
    selectedReferenceAssetCount = bundleAssets.length;

    console.log(`[generate-story-panel-image] draft: bundle ${selectedReferenceAssetCount} assets, model: ${modelId}`);

    if (bundleAssets.length > 0) {
      const conditioned = await fetchConditionedImages(bundleAssets).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[generate-story-panel-image] fetchConditionedImages threw:", msg);
        return {
          images: [] as import("@/lib/storyPanelImageConditioner").FetchedReferenceImage[],
          failedAssetIds: [] as string[],
          warnings: [`Fetch error: ${msg}`],
        };
      });

      conditionedImageCount = conditioned.images.length;
      skippedReferenceAssetCount = conditioned.failedAssetIds.length;
      imageConditioningWarnings = conditioned.warnings;

      console.log(`[generate-story-panel-image] conditioned: ${conditionedImageCount} valid, ${skippedReferenceAssetCount} skipped`);
      if (conditioned.warnings.length > 0) {
        console.log("[generate-story-panel-image] conditioning warnings:", conditioned.warnings);
      }

      refWarnings.push(...conditioned.warnings);

      if (conditioned.images.length > 0) {
        const editPrompt = buildImageConditionedEditPrompt(sceneRefPkg, panelPrompt);
        try {
          console.log(`[generate-story-panel-image] images.edit with ${conditionedImageCount} File inputs`);
          const editResponse = await openai.images.edit({
            model: modelId,
            image: conditioned.images.map((fi) => fi.file) as Parameters<typeof openai.images.edit>[0]["image"],
            prompt: editPrompt,
            n: 1,
            size: "1024x1024",
            input_fidelity: "high",
          });

          const editData = editResponse.data?.[0] ?? {};
          b64 = typeof editData.b64_json === "string" ? editData.b64_json : undefined;
          resultImageUrl = typeof editData.url === "string" ? editData.url : undefined;

          if (b64 || resultImageUrl) {
            usedImageConditioning = true;
            referenceMode = "image-conditioned-reference-bundle";
            generationPrompt = editPrompt;
            console.log("[generate-story-panel-image] images.edit succeeded");
          } else {
            fallbackReason = "Image edit returned no data — fell back to prompt-only generation.";
          }
        } catch (editErr) {
          const editMsg = editErr instanceof Error ? editErr.message : String(editErr);
          fallbackReason = `Image edit failed (${editMsg}) — fell back to prompt-only generation.`;
          console.warn("[generate-story-panel-image] images.edit failed:", editMsg);
        }
      } else {
        fallbackReason = "No valid reference images could be prepared — fell back to prompt-only generation.";
      }
    }

    if (!usedImageConditioning) referenceMode = "prompt-only-reference-bundle";
  }

  if (!usedImageConditioning) {
    try {
      const generateResponse = await openai.images.generate({
        model: modelId,
        prompt: generationPrompt,
        n: 1,
        size: "1024x1024",
      });
      const generateData = generateResponse.data?.[0] ?? {};
      b64 = typeof generateData.b64_json === "string" ? generateData.b64_json : undefined;
      resultImageUrl = typeof generateData.url === "string" ? generateData.url : undefined;
    } catch (generateErr) {
      const parsedError = parseProviderError(generateErr);
      console.error("[generate-story-panel-image] OpenAI generate error:", parsedError.providerMessage);
      return Response.json(
        {
          ok: false,
          status: parsedError.status,
          message: "Draft Mode generation failed. See provider message for details.",
          providerStatus: parsedError.providerStatus,
          providerMessage: parsedError.providerMessage,
          troubleshooting: parsedError.troubleshooting,
          generationPrompt,
          generationMode,
          provider,
          modelId,
          referenceCharacters,
          referenceMode,
          referenceCounts,
          referencesUsed,
          referencesOmitted,
          usedImageConditioning: false,
          providerSupportsImageReferences: true,
          selectedReferenceAssetCount,
          conditionedImageCount,
          skippedReferenceAssetCount,
          imageConditioningWarnings,
          fallbackUsed: fallbackReason !== undefined,
          fallbackReason,
          warnings: refWarnings,
        } satisfies GenerateResult,
        { status: 502 }
      );
    }
  }

  if (!b64 && !resultImageUrl) {
    return Response.json(
      {
        ok: false,
        status: "image_response_parse_error",
        message: "Image provider responded but did not return a usable image.",
        providerMessage: "No base64 or URL image data was returned.",
        troubleshooting: ["Confirm the model is valid.", "Try a shorter prompt.", "Try again later."],
        generationPrompt,
        generationMode,
        provider,
        modelId,
        referenceCharacters,
        referenceMode,
        referenceCounts,
        referencesUsed,
        referencesOmitted,
        usedImageConditioning,
        providerSupportsImageReferences: true,
        selectedReferenceAssetCount,
        conditionedImageCount,
        skippedReferenceAssetCount,
        imageConditioningWarnings,
        fallbackUsed: fallbackReason !== undefined,
        fallbackReason,
        warnings: refWarnings,
      } satisfies GenerateResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "story_panel_draft_generated",
      draft: {
        id: `story-panel-draft-${Date.now()}`,
        episodeSlug,
        sceneId,
        sceneNumber,
        mimeType: "image/png",
        imageBase64: b64,
        imageUrl: resultImageUrl,
        promptText: panelPrompt,
        createdAt: new Date().toISOString(),
      },
      image: { mimeType: "image/png", base64: b64, url: resultImageUrl },
      generationPrompt,
      generationMode,
      provider,
      modelId,
      referenceCharacters,
      referenceMode,
      referenceCounts,
      referencesUsed,
      referencesOmitted,
      fidelityRulesSummary,
      usedImageConditioning,
      providerSupportsImageReferences: true,
      selectedReferenceAssetCount,
      conditionedImageCount,
      skippedReferenceAssetCount,
      imageConditioningWarnings,
      sceneCharacterCount: 0,
      characterReferenceCount: 0,
      supportingReferenceCount: 0,
      environmentReferenceCount: 0,
      passedToProviderCount: conditionedImageCount,
      fallbackUsed: fallbackReason !== undefined,
      fallbackReason,
      warnings: refWarnings,
      notes: [
        "This story panel draft has not been saved.",
        "Review it before approving and saving to the episode.",
      ],
    } satisfies GenerateResult,
    { status: 200 }
  );
}
