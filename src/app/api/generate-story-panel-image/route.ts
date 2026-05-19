// POST /api/generate-story-panel-image
// Protected route that validates a story panel generation request, loads canonical
// character data and approved reference assets, builds a reference-aware prompt,
// and — if OPENAI_API_KEY is present — calls DALL-E 3 and returns a base64 draft.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Generated images are never saved, uploaded, or written to JSON.
// Phase:   11D — reference-anchored prompt metadata added.
//
// NOTE: DALL-E 3 only accepts text prompts. Reference images are included in
// prompt text (as titles/descriptions) but cannot be passed as image inputs.
// referenceMode is always "prompt-only-reference-summary" when references exist.
// TODO: Upgrade to an image-input-capable provider and set
// referenceMode = "reference-images-attached" when that is available.

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
} from "@/lib/storyPanelGenerationPackage";
import type { Character } from "@/lib/content";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceMetaItem = {
  characterSlug: string;
  characterName: string;
  title: string;
  type: string;
  priority: string;
};

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
      referenceMode: "reference-images-attached" | "prompt-only-reference-summary" | "no-references-available";
      referencesUsed: ReferenceMetaItem[];
      referencesOmitted: ReferenceMetaItem[];
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
      referenceMode?: "reference-images-attached" | "prompt-only-reference-summary" | "no-references-available";
      referencesUsed?: ReferenceMetaItem[];
      referencesOmitted?: ReferenceMetaItem[];
      warnings?: string[];
    };

const ALLOWED_REFERENCE_MODES = [
  "reference-images-attached",
  "prompt-only-reference-summary",
  "no-references-available",
] as const;

type ReferenceMode = (typeof ALLOWED_REFERENCE_MODES)[number];

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
  let referenceMode: GenerateResult["referenceMode"] = "no-references-available";
  let referencesUsed: ReferenceMetaItem[] = [];
  let referencesOmitted: ReferenceMetaItem[] = [];
  let refWarnings: string[] = [];

  const requestedReferenceMode =
    typeof body.referenceMode === "string" && ALLOWED_REFERENCE_MODES.includes(body.referenceMode as ReferenceMode)
      ? (body.referenceMode as ReferenceMode)
      : undefined;

  if (requestedReferenceMode === "reference-images-attached") {
    refWarnings.push(
      "Reference images were requested, but the current provider only supports prompt-only reference guidance. The prompt still includes character reference context."
    );
  }

  if (Array.isArray(body.referenceImages) && body.referenceImages.length > 0) {
    refWarnings.push(
      "Reference image input was skipped because the current provider call does not support it. The prompt still includes character reference guidance."
    );
  }

  try {
    const allAssets = loadReferenceAssets();
    const allChars = loadAllCharactersFromDisk();
    const charBySlug = buildCharBySlug(allChars);

    const sceneRefPkg = buildSceneReferencePackage(
      sceneNumber ?? 1,
      referenceCharacters,
      allAssets,
      charBySlug
    );

    const genPkg = buildStoryPanelGenerationPackage(sceneRefPkg, panelPrompt, { sceneNumber });
    generationPrompt = buildFinalStoryPanelPrompt(genPkg);
    referenceMode = genPkg.referenceMode;
    referencesUsed = genPkg.referencesUsed;
    referencesOmitted = genPkg.referencesOmitted;
    refWarnings = genPkg.warnings;
  } catch {
    // Fall back to legacy prompt builder if reference loading fails
    generationPrompt = buildGenerationPrompt(panelPrompt, refs, sceneNumber);
    referenceMode = "no-references-available";
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

  try {
    const openai = new OpenAI({ apiKey });

    const imageResponse = await openai.images.generate({
      model: imageModel,
      prompt: generationPrompt,
      n: 1,
      size: "1024x1024",
    });

    const imageData = imageResponse.data?.[0] ?? {};
    const b64 = typeof imageData.b64_json === "string" ? imageData.b64_json : undefined;
    const url = typeof imageData.url === "string" ? imageData.url : undefined;

    if (!b64 && !url) {
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
          referencesUsed,
          referencesOmitted,
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
          imageUrl: url,
          promptText: panelPrompt,
          createdAt: new Date().toISOString(),
        },
        image: {
          mimeType: "image/png",
          base64: b64,
          url,
        },
        generationPrompt,
        referenceCharacters,
        referenceMode,
        referencesUsed,
        referencesOmitted,
        warnings: refWarnings,
        notes: [
          "This story panel draft has not been saved.",
          "Review it before approving and saving to the episode.",
        ],
      } satisfies GenerateResult,
      { status: 200 }
    );
  } catch (err) {
    const parsedError = parseProviderError(err);
    console.error("[generate-story-panel-image] OpenAI error:", parsedError.providerMessage);

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
        referencesUsed,
        referencesOmitted,
        warnings: refWarnings,
      } satisfies GenerateResult,
      { status: 502 }
    );
  }
}
