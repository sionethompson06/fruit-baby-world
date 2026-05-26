// POST /api/story-panel/selectable-backgrounds
// Lists all approved Environment / Home Reference assets for the scene's characters.
// Returns items formatted for admin selection in the Layered Assembly Pipeline UI.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not write anything. Returns metadata only.
// Phase:   18E.4 — Select Official Environment Background Layer

import { validateSlug } from "@/lib/storyPanelImageGeneration";
import {
  getSelectableEnvironmentBackgroundsForScene,
  type SelectableEnvironmentBackground,
} from "@/lib/storyPanelEnvironmentReferences";
import {
  loadReferenceAssets,
  buildSceneReferencePackage,
} from "@/lib/referenceAssetLoader";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectableBackgroundsResult =
  | {
      ok: true;
      status: "backgrounds_listed";
      backgrounds: SelectableEnvironmentBackground[];
      count: number;
      warnings: string[];
    }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "validation_error"
        | "scene_not_found"
        | "no_characters"
        | "no_selectable_backgrounds"
        | "reference_assets_not_available";
      message: string;
      details?: Record<string, unknown>;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
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
      } satisfies SelectableBackgroundsResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies SelectableBackgroundsResult,
      { status: 400 }
    );
  }

  // ── Validate episodeSlug ──────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a safe slug.",
      } satisfies SelectableBackgroundsResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate referenceCharacters ──────────────────────────────────────────────
  if (!isStringArray(body.referenceCharacters) || body.referenceCharacters.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "referenceCharacters is required and must be a non-empty array of strings.",
      } satisfies SelectableBackgroundsResult,
      { status: 400 }
    );
  }
  const referenceCharacters = body.referenceCharacters as string[];

  // ── Load reference assets ─────────────────────────────────────────────────────
  let refAssets;
  try {
    refAssets = loadReferenceAssets();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "reference_assets_not_available",
        message: "Could not load reference assets.",
      } satisfies SelectableBackgroundsResult,
      { status: 503 }
    );
  }

  // ── Load characters ───────────────────────────────────────────────────────────
  let characters;
  try {
    characters = loadAllCharactersFromDisk();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "reference_assets_not_available",
        message: "Could not load character data.",
      } satisfies SelectableBackgroundsResult,
      { status: 503 }
    );
  }

  // ── Build character map ───────────────────────────────────────────────────────
  const charBySlug: Record<string, (typeof characters)[0]> = {};
  for (const char of characters) {
    charBySlug[char.slug] = char;
  }

  // ── Build scene reference package ─────────────────────────────────────────────
  let sceneRefPkg;
  try {
    sceneRefPkg = buildSceneReferencePackage(
      1, // sceneNumber (not used for filtering here)
      referenceCharacters,
      refAssets,
      charBySlug
    );
  } catch (err) {
    return Response.json(
      {
        ok: false,
        status: "scene_not_found",
        message: `Could not build scene reference package: ${err instanceof Error ? err.message : "unknown error"}`,
      } satisfies SelectableBackgroundsResult,
      { status: 400 }
    );
  }

  // ── Get selectable backgrounds ────────────────────────────────────────────────
  let backgrounds: SelectableEnvironmentBackground[];
  try {
    backgrounds = getSelectableEnvironmentBackgroundsForScene(sceneRefPkg);
  } catch (err) {
    return Response.json(
      {
        ok: false,
        status: "reference_assets_not_available",
        message: `Could not get selectable backgrounds: ${err instanceof Error ? err.message : "unknown error"}`,
      } satisfies SelectableBackgroundsResult,
      { status: 500 }
    );
  }

  // ── Build warnings ────────────────────────────────────────────────────────────
  const warnings: string[] = [];
  if (backgrounds.length === 0) {
    warnings.push(
      "No official environment/home backgrounds found for the scene characters. Upload environment/home references in the character profile or use Generate Background Draft."
    );
  }

  // ── Success ───────────────────────────────────────────────────────────────────
  return Response.json(
    {
      ok: true,
      status: "backgrounds_listed",
      backgrounds,
      count: backgrounds.length,
      warnings,
    } satisfies SelectableBackgroundsResult,
    { status: 200 }
  );
}
