// POST /api/generate-story-panel-image
// Protected route that validates a story panel generation request, loads canonical
// character data, builds a strict reference-anchored prompt, and — if OPENAI_API_KEY
// is present — calls DALL-E 3 and returns a base64 draft image in the response.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Generated images are never saved, uploaded, or written to JSON.
// Phase:   6A — foundation only. Not connected to frontend yet.

import OpenAI from "openai";
import {
  validateSlug,
  loadCharacterRefs,
  buildGenerationPrompt,
} from "@/lib/storyPanelImageGeneration";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateResult =
  | {
      ok: true;
      status: "generated_draft";
      image: { mimeType: string; base64: string };
      generationPrompt: string;
      referenceCharacters: string[];
      notes: string[];
    }
  | {
      ok: false;
      status: "validation_error" | "not_implemented_yet" | "generation_error";
      message: string;
      generationPrompt?: string;
      referenceCharacters?: string[];
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
    if (typeof body.sceneNumber !== "number" || body.sceneNumber < 1 || !Number.isFinite(body.sceneNumber)) {
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

  // ── Build strict generation prompt ────────────────────────────────────────────
  const generationPrompt = buildGenerationPrompt(panelPrompt, refs, sceneNumber);

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
        notes: [
          "Generated image is a draft only.",
          "Image is not saved.",
          "Human review is required before use.",
          "Reference-image anchoring via uploaded profile sheets is planned for a future phase.",
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
      } satisfies GenerateResult,
      { status: 502 }
    );
  }
}
