// POST /api/generate-episode-package
// Accepts a storyboard draft and AI prompt, calls OpenAI to produce an
// episode package draft. Returns JSON only — no data is saved.
// Not wired to the frontend yet (Phase 2E.3 will add the Generate button).

import OpenAI from "openai";
import {
  validatePayload,
  buildSystemInstructions,
  parseModelResponse,
  type GenerateResult,
} from "@/lib/episodeGeneration";

export async function POST(request: Request): Promise<Response> {
  // ── Parse request body ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // ── Validate payload ────────────────────────────────────────────────────────
  const validation = validatePayload(body);
  if (!validation.valid) {
    return Response.json(
      { ok: false, status: "validation_error", message: validation.message },
      { status: 400 }
    );
  }
  const { aiPrompt, selectedCharacters } = validation.payload;

  // ── Check for API key ───────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "OPENAI_API_KEY is not configured yet. Add it to your environment variables to enable generation.",
      } satisfies GenerateResult,
      { status: 503 }
    );
  }

  // ── Call OpenAI ─────────────────────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey });

    const systemInstructions = buildSystemInstructions(selectedCharacters);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "developer", content: systemInstructions },
        { role: "user", content: aiPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";

    // ── Parse model response ──────────────────────────────────────────────────
    const parsed = parseModelResponse(rawText);

    if (parsed.success) {
      return Response.json(
        {
          ok: true,
          status: "generated",
          episodePackage: parsed.episodePackage,
          rawText,
          notes: parsed.notes,
        } satisfies GenerateResult,
        { status: 200 }
      );
    } else {
      return Response.json(
        {
          ok: false,
          status: "parse_error",
          message:
            "Generation succeeded but the response could not be parsed as JSON. Raw text is included for manual review.",
          rawText,
        } satisfies GenerateResult,
        { status: 200 }
      );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred during generation.";

    // Do not expose stack traces or internal details
    return Response.json(
      {
        ok: false,
        status: "generation_error",
        message: `Generation failed: ${message}`,
      } satisfies GenerateResult,
      { status: 500 }
    );
  }
}
