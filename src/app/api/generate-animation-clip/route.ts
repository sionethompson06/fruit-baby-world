// POST /api/generate-animation-clip
// Protected route that validates an animation clip generation request, loads
// canonical character data, and builds a strict reference-anchored animation
// generation package. Returns not_implemented_yet if no video provider is active.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  No video is generated, saved, uploaded, or written to JSON.
//          Does not accept arbitrary file paths — all character paths are server-controlled.
// Phase:   7A — foundation only. Not connected to UI yet.

import {
  validateSlug,
  loadCharacterRefs,
} from "@/lib/storyPanelImageGeneration";
import {
  buildAnimationPackage,
  type AnimationPackage,
} from "@/lib/animationClipGeneration";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateAnimationResult =
  | {
      ok: false;
      status: "not_implemented_yet";
      message: string;
      animationPackage: AnimationPackage;
      notes: string[];
    }
  | {
      ok: false;
      status: "validation_error";
      message: string;
    }
  | {
      ok: false;
      status: "generation_error";
      message: string;
      animationPackage?: AnimationPackage;
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
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }

  // ── Validate animationPrompt ─────────────────────────────────────────────────
  if (typeof body.animationPrompt !== "string" || body.animationPrompt.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "animationPrompt is required and must be a non-empty string.",
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }
  const animationPrompt = body.animationPrompt.trim();

  // ── Validate referenceCharacters ─────────────────────────────────────────────
  if (!Array.isArray(body.referenceCharacters) || body.referenceCharacters.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "referenceCharacters is required and must be a non-empty array.",
      } satisfies GenerateAnimationResult,
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
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }
  const referenceCharacters = body.referenceCharacters as string[];

  // ── Validate sceneNumber ─────────────────────────────────────────────────────
  if (
    typeof body.sceneNumber !== "number" ||
    body.sceneNumber < 1 ||
    !Number.isFinite(body.sceneNumber)
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "sceneNumber must be a positive number.",
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }
  const sceneNumber = body.sceneNumber as number;

  // ── Validate optional episodeSlug ────────────────────────────────────────────
  if (body.episodeSlug !== undefined && !validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episodeSlug must be a safe slug (lowercase letters, numbers, hyphens only) if provided.",
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }
  const episodeSlug = typeof body.episodeSlug === "string" ? body.episodeSlug : "";

  // ── Validate optional durationSeconds ────────────────────────────────────────
  let durationSeconds = 6;
  if (body.durationSeconds !== undefined) {
    if (
      typeof body.durationSeconds !== "number" ||
      !Number.isFinite(body.durationSeconds) ||
      body.durationSeconds < 3 ||
      body.durationSeconds > 15
    ) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "durationSeconds must be a number between 3 and 15 if provided.",
        } satisfies GenerateAnimationResult,
        { status: 400 }
      );
    }
    durationSeconds = body.durationSeconds as number;
  }

  // ── Load canonical character data ────────────────────────────────────────────
  const { refs, missing } = loadCharacterRefs(referenceCharacters);
  if (missing.length > 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `Unknown character slug(s): ${missing.join(", ")}. Use canonical character IDs.`,
      } satisfies GenerateAnimationResult,
      { status: 400 }
    );
  }

  // ── Build strict reference-anchored animation package ────────────────────────
  const animationPackage = buildAnimationPackage(
    episodeSlug,
    sceneNumber,
    durationSeconds,
    animationPrompt,
    refs
  );

  // ── Check video generation provider ──────────────────────────────────────────
  const videoProvider = process.env.VIDEO_GENERATION_PROVIDER;

  if (!videoProvider) {
    return Response.json(
      {
        ok: false,
        status: "not_implemented_yet",
        message:
          "Animation clip generation route is prepared but video generation is not active yet. " +
          "Set VIDEO_GENERATION_PROVIDER and VIDEO_GENERATION_API_KEY to enable generation.",
        animationPackage,
        notes: [
          "No video was generated.",
          "No video was saved.",
          "Human review will be required before any future video is used publicly.",
        ],
      } satisfies GenerateAnimationResult,
      { status: 200 }
    );
  }

  // ── Future: call video generation provider ───────────────────────────────────
  // When a provider is configured, generation will be implemented here in a
  // future phase. For now return not_implemented_yet regardless of provider value.
  return Response.json(
    {
      ok: false,
      status: "not_implemented_yet",
      message:
        "Animation clip generation route is prepared but video generation is not active yet.",
      animationPackage,
      notes: [
        "No video was generated.",
        "No video was saved.",
        "Human review will be required before any future video is used publicly.",
      ],
    } satisfies GenerateAnimationResult,
    { status: 200 }
  );
}
