// POST /api/generate-story-panel-image
// Protected route: validates request, loads approved reference assets, and
// generates a temporary story panel draft using image-conditioned generation
// (images.edit with input_fidelity:'high') when reference images are available,
// falling back to images.generate with the enriched prompt when they are not.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Generated images are never saved, uploaded, or written to JSON.
// Phase:   18C — strict reference-image conditioned generation pipeline.

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
} from "@/lib/storyPanelFidelityRules";
import {
  buildStoryPanelReferenceBundle,
  type ReferenceBundleCounts,
} from "@/lib/storyPanelReferenceBundle";
import { fetchConditionedImages } from "@/lib/storyPanelImageConditioner";
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
      referenceCharacters: string[];
      referenceMode: ReferenceModeValue;
      referenceCounts: ReferenceBundleCounts;
      referencesUsed: ReferenceMetaItem[];
      referencesOmitted: ReferenceMetaItem[];
      fidelityRulesSummary: string;
      usedImageConditioning: boolean;
      providerSupportsImageReferences: boolean;
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
      referenceCharacters?: string[];
      referenceMode?: ReferenceModeValue;
      referenceCounts?: ReferenceBundleCounts;
      referencesUsed?: ReferenceMetaItem[];
      referencesOmitted?: ReferenceMetaItem[];
      usedImageConditioning?: boolean;
      providerSupportsImageReferences?: boolean;
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

function parseProviderError(err: unknown) {
  let providerStatus: number | undefined;
  let providerMessage = "The image provider could not generate the story panel draft.";
  const troubleshooting = [
    "Confirm OPENAI_API_KEY is set in Vercel environment variables and the deployment was redeployed.",
    "Confirm the image model is valid.",
    "Try generating without reference images if reference mode is unsupported.",
    "Try a shorter prompt.",
  ];

  if (err instanceof Error) {
    providerMessage = err.message || providerMessage;
    const anyErr = err as { response?: unknown; status?: number };

    if (typeof anyErr.status === "number") {
      providerStatus = anyErr.status;
    }

    if (isRecord(anyErr.response)) {
      const response = anyErr.response as Record<string, unknown>;
      if (typeof response.status === "number") providerStatus = response.status;
      if (isRecord(response.data) && isRecord(response.data.error)) {
        const errData = response.data.error as Record<string, unknown>;
        if (typeof errData.message === "string") {
          providerMessage = errData.message;
        }
      }
    }

    if (
      providerStatus === 408 ||
      providerStatus === 429 ||
      providerStatus === 500 ||
      providerMessage.toLowerCase().includes("timeout")
    ) {
      return {
        status: "provider_timeout" as const,
        providerStatus,
        providerMessage,
        troubleshooting,
      };
    }
  }

  return {
    status: "provider_error" as const,
    providerStatus,
    providerMessage,
    troubleshooting,
  };
}

function buildImageDraftResponse(
  episodeSlug: string | undefined,
  sceneId: string | undefined,
  sceneNumber: number | undefined,
  promptText: string,
  mimeType: string,
  payload: { base64?: string; url?: string }
) {
  const draft = {
    id: `story-panel-draft-${Date.now()}`,
    episodeSlug,
    sceneId,
    sceneNumber,
    mimeType,
    imageBase64: payload.base64,
    imageUrl: payload.url,
    promptText,
    createdAt: new Date().toISOString(),
  };

  return {
    ok: true,
    status: "story_panel_draft_generated" as const,
    draft,
    image: { mimeType, base64: payload.base64, url: payload.url },
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
  // tiki alias — both slugs resolve to the same character
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
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  const panelPrompt = normalizePromptBody(body);
  if (!panelPrompt) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "A story panel prompt is required before generating an image.",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  if (panelPrompt.length > 5000) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "The story panel prompt is too long. Shorten it to 5000 characters or less and try again.",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  const referenceCharacters = extractReferenceSlugs(body);
  const unsafeSlugs = referenceCharacters.filter((slug) => !validateSlug(slug));

  if (unsafeSlugs.length > 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "All reference characters must be safe slugs (lowercase letters, numbers, hyphens only).",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  let sceneNumber: number | undefined;
  if (body.sceneNumber !== undefined) {
    if (
      typeof body.sceneNumber !== "number" ||
      body.sceneNumber < 1 ||
      !Number.isFinite(body.sceneNumber)
    ) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "sceneNumber must be a positive number if provided.",
        } satisfies GenerateResult,
        { status: 400 }
      );
    }
    sceneNumber = body.sceneNumber;
  }

  let sceneId: string | undefined;
  if (body.sceneId !== undefined) {
    if (typeof body.sceneId !== "string" || body.sceneId.trim().length === 0) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "sceneId must be a non-empty string if provided.",
        } satisfies GenerateResult,
        { status: 400 }
      );
    }
    sceneId = body.sceneId.trim();
  }

  let episodeSlug: string | undefined;
  if (body.episodeSlug !== undefined) {
    if (!validateSlug(body.episodeSlug)) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message:
            "episodeSlug must be a safe slug (lowercase letters, numbers, hyphens only) if provided.",
        } satisfies GenerateResult,
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
          message:
            "The requested reference mode is not supported by the current story panel generator.",
          troubleshooting: [
            "Use prompt-only reference mode instead of attaching image references.",
            "Leave referenceMode unset or use prompt-only-reference-summary.",
          ],
        } satisfies GenerateResult,
        { status: 400 }
      );
    }
  }

  // ── Load canonical character data (slug validation) ───────────────────────────
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
  // Attempt to load approved reference assets and build scene reference package.
  // On failure, fall back to the legacy prompt builder gracefully.
  let generationPrompt: string;
  let referenceMode: ReferenceModeValue = "no-references";
  let referenceCounts: ReferenceBundleCounts = EMPTY_REF_COUNTS;
  let referencesUsed: ReferenceMetaItem[] = [];
  let referencesOmitted: ReferenceMetaItem[] = [];
  let fidelityRulesSummary = "";
  let refWarnings: string[] = [];
  let genPkg: StoryPanelGenerationPackage | null = null;
  let sceneRefPkg: ReturnType<typeof buildSceneReferencePackage> | null = null;

  try {
    const allAssets = loadReferenceAssets();
    const allChars = loadAllCharactersFromDisk();
    const charBySlug = buildCharBySlug(allChars);

    sceneRefPkg = buildSceneReferencePackage(
      sceneNumber ?? 1,
      referenceCharacters,
      allAssets,
      charBySlug
    );

    genPkg = buildStoryPanelGenerationPackage(sceneRefPkg, panelPrompt, { sceneNumber });
    generationPrompt = buildFinalStoryPanelPrompt(genPkg);
    referenceCounts = genPkg.referenceCounts;
    referencesUsed = genPkg.referencesUsed;
    referencesOmitted = genPkg.referencesOmitted;
    fidelityRulesSummary = getFidelityRulesSummary(sceneRefPkg);
    refWarnings = genPkg.warnings;
    // referenceMode is set later based on whether image conditioning succeeds
  } catch {
    // Fall back to legacy prompt builder if reference loading fails
    generationPrompt = buildGenerationPrompt(panelPrompt, refs, sceneNumber);
    referenceMode = "no-references";
    refWarnings = ["Reference asset loading failed — using legacy prompt builder as fallback."];
  }

  // ── Image generation ──────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  const imageModel = process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-1";

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "OpenAI image generation is not configured. Add OPENAI_API_KEY in Vercel environment variables and redeploy.",
        providerMessage: "Missing OPENAI_API_KEY.",
        troubleshooting: [
          "Add OPENAI_API_KEY to your Vercel environment variables.",
          "Redeploy after updating environment variables.",
        ],
      } satisfies GenerateResult,
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey });

  // ── Try image-conditioned generation (images.edit) when bundle has assets ────
  let b64: string | undefined;
  let resultImageUrl: string | undefined;
  let usedImageConditioning = false;
  let fallbackReason: string | undefined;

  const hasBundle = referenceCounts.total > 0 && genPkg !== null && sceneRefPkg !== null;

  if (hasBundle && genPkg && sceneRefPkg) {
    const bundleAssets = buildStoryPanelReferenceBundle(sceneRefPkg).assets;

    if (bundleAssets.length > 0) {
      const conditioned = await fetchConditionedImages(bundleAssets).catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[generate-story-panel-image] fetchConditionedImages threw:", msg);
        return { images: [], failedAssetIds: [] as string[], warnings: [`Fetch error: ${msg}`] };
      });
      refWarnings.push(...conditioned.warnings);

      if (conditioned.images.length > 0) {
        const editPrompt = buildImageConditionedEditPrompt(sceneRefPkg, panelPrompt);

        try {
          const editResponse = await openai.images.edit({
            model: imageModel,
            image: conditioned.images.map((fi) => fi.response) as Parameters<typeof openai.images.edit>[0]["image"],
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
          } else {
            fallbackReason = "Image edit returned no image data — falling back to prompt-only generation.";
          }
        } catch (editErr) {
          const editMsg = editErr instanceof Error ? editErr.message : String(editErr);
          fallbackReason = `Image edit failed (${editMsg}) — falling back to prompt-only generation.`;
          console.warn("[generate-story-panel-image] images.edit failed, will fall back:", editMsg);
        }
      } else {
        fallbackReason = "No reference images could be fetched — falling back to prompt-only generation.";
      }
    } else {
      fallbackReason = "Bundle has no assets for image conditioning — falling back to prompt-only generation.";
    }

    if (!usedImageConditioning) {
      referenceMode = "prompt-only-reference-bundle";
    }
  }

  // ── Fall back to images.generate when edit was not used ──────────────────────
  if (!usedImageConditioning) {
    try {
      const generateResponse = await openai.images.generate({
        model: imageModel,
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
          message:
            "The image provider could not generate the story panel draft. See the provider message for details.",
          providerStatus: parsedError.providerStatus,
          providerMessage: parsedError.providerMessage,
          troubleshooting: parsedError.troubleshooting,
          generationPrompt,
          referenceCharacters,
          referenceMode,
          referenceCounts,
          referencesUsed,
          referencesOmitted,
          usedImageConditioning: false,
          providerSupportsImageReferences: true,
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
        troubleshooting: [
          "Confirm the image model is valid.",
          "Try generating with a shorter prompt.",
          "Try again later in case the image provider is temporarily unavailable.",
        ],
        generationPrompt,
        referenceCharacters,
        referenceMode,
        referenceCounts,
        referencesUsed,
        referencesOmitted,
        usedImageConditioning,
        providerSupportsImageReferences: true,
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
      image: {
        mimeType: "image/png",
        base64: b64,
        url: resultImageUrl,
      },
      generationPrompt,
      referenceCharacters,
      referenceMode,
      referenceCounts,
      referencesUsed,
      referencesOmitted,
      fidelityRulesSummary,
      usedImageConditioning,
      providerSupportsImageReferences: true,
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
