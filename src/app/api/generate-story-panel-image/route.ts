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
      status: "generated_draft";
      image: { mimeType: string; base64: string };
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
      status: "validation_error" | "not_implemented_yet" | "generation_error";
      message: string;
      generationPrompt?: string;
      referenceCharacters?: string[];
      referenceMode?: "reference-images-attached" | "prompt-only-reference-summary" | "no-references-available";
      referencesUsed?: ReferenceMetaItem[];
      warnings?: string[];
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

  // ── Validate panelPrompt ──────────────────────────────────────────────────────
  if (typeof body.panelPrompt !== "string" || body.panelPrompt.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelPrompt is required and must be a non-empty string.",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }
  const panelPrompt = body.panelPrompt.trim();

  // ── Validate referenceCharacters ──────────────────────────────────────────────
  if (!Array.isArray(body.referenceCharacters) || body.referenceCharacters.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "referenceCharacters is required and must be a non-empty array.",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }

  const unsafeSlugs = (body.referenceCharacters as unknown[]).filter(
    (s) => !validateSlug(s)
  );
  if (unsafeSlugs.length > 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "All referenceCharacters must be safe slugs (lowercase letters, numbers, hyphens only).",
      } satisfies GenerateResult,
      { status: 400 }
    );
  }
  const referenceCharacters = body.referenceCharacters as string[];

  // ── Validate optional sceneNumber ─────────────────────────────────────────────
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

  // ── Validate optional episodeSlug ─────────────────────────────────────────────
  if (body.episodeSlug !== undefined && !validateSlug(body.episodeSlug)) {
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

  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "not_implemented_yet",
        message:
          "Story panel image generation route is prepared but generation is not active yet. " +
          "Set OPENAI_API_KEY to enable generation.",
        generationPrompt,
        referenceCharacters,
        referenceMode,
        referencesUsed,
        warnings: refWarnings,
      } satisfies GenerateResult,
      { status: 200 }
    );
  }

  try {
    const openai = new OpenAI({ apiKey });

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: generationPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json(
        {
          ok: false,
          status: "generation_error",
          message: "Image generation returned an empty response.",
          generationPrompt,
          referenceCharacters,
          referenceMode,
          referencesUsed,
          warnings: refWarnings,
        } satisfies GenerateResult,
        { status: 502 }
      );
    }

    return Response.json(
      {
        ok: true,
        status: "generated_draft",
        image: {
          mimeType: "image/png",
          base64: b64,
        },
        generationPrompt,
        referenceCharacters,
        referenceMode,
        referencesUsed,
        referencesOmitted,
        warnings: refWarnings,
        notes: [
          "Generated image is a draft only.",
          "Image is not saved.",
          "Human review is required before use.",
          "Reference context injected into prompt text (DALL-E 3 is text-only; image-reference inputs are a future upgrade).",
        ],
      } satisfies GenerateResult,
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed.";
    console.error("[generate-story-panel-image] OpenAI error:", message);
    return Response.json(
      {
        ok: false,
        status: "generation_error",
        message: "Image generation failed. See server logs for details.",
        generationPrompt,
        referenceCharacters,
        referenceMode,
        referencesUsed,
        warnings: refWarnings,
      } satisfies GenerateResult,
      { status: 502 }
    );
  }
}
