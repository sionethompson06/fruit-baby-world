// POST /api/assemble-story-panel-layers
// Loads saved background + character layers for an episode scene and composites
// them into a temporary AssembledStoryPanelDraft using sharp.
//
// Auth:   Protected by proxy.ts — requires valid admin cookie.
// Safety: Result is temporary only. Nothing is saved, uploaded, or published.
// Phase:  18D.12 — Assemble Background + Character Layers Into Draft Panel

import { composeStoryPanelLayers } from "@/lib/storyPanelLayerCompositor";
import type {
  EpisodeSceneBackgroundLayer,
  EpisodeSceneCharacterLayer,
} from "@/lib/storyPanelBackgroundTypes";
import { validateSlug } from "@/lib/storyPanelImageGeneration";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssembleResult =
  | {
      ok: true;
      status: "assembled";
      draft: import("@/lib/storyPanelBackgroundTypes").AssembledStoryPanelDraft;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "scene_not_found"
        | "invalid_episode_json"
        | "no_background_layer"
        | "composition_failed";
      message: string;
      details?: Record<string, unknown>;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function latestByCreatedAt<T extends { createdAt: string }>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

// Pick the latest character layer per unique characterSlug.
function latestCharLayerPerSlug(
  layers: EpisodeSceneCharacterLayer[]
): EpisodeSceneCharacterLayer[] {
  const bySlug = new Map<string, EpisodeSceneCharacterLayer>();
  for (const layer of layers) {
    const existing = bySlug.get(layer.characterSlug);
    if (!existing || layer.createdAt > existing.createdAt) {
      bySlug.set(layer.characterSlug, layer);
    }
  }
  return Array.from(bySlug.values());
}

function isEpisodeSceneBackgroundLayer(v: unknown): v is EpisodeSceneBackgroundLayer {
  return (
    isRecord(v) &&
    v.type === "background-layer" &&
    v.status === "saved" &&
    typeof v.id === "string" &&
    typeof v.imageUrl === "string" &&
    typeof v.createdAt === "string"
  );
}

function isEpisodeSceneCharacterLayer(v: unknown): v is EpisodeSceneCharacterLayer {
  return (
    isRecord(v) &&
    v.type === "character-layer" &&
    v.status === "saved" &&
    typeof v.id === "string" &&
    typeof v.characterSlug === "string" &&
    typeof v.characterName === "string" &&
    typeof v.imageUrl === "string" &&
    typeof v.createdAt === "string"
  );
}

// ─── Route handler ─────────────────────────────────────────────────────────────

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
      } satisfies AssembleResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies AssembleResult,
      { status: 400 }
    );
  }

  // ── Check env config ──────────────────────────────────────────────────────────
  const ghToken = process.env.GITHUB_TOKEN;
  const ghOwner = process.env.GITHUB_OWNER;
  const ghRepo = process.env.GITHUB_REPO;
  const ghBranch = process.env.GITHUB_BRANCH;

  if (!ghToken || !ghOwner || !ghRepo || !ghBranch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "GitHub is not configured. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH to Vercel environment variables.",
      } satisfies AssembleResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ──────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies AssembleResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate sceneNumber ──────────────────────────────────────────────────────
  if (
    typeof body.sceneNumber !== "number" ||
    body.sceneNumber < 1 ||
    !Number.isFinite(body.sceneNumber)
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "sceneNumber is required and must be a positive number.",
      } satisfies AssembleResult,
      { status: 400 }
    );
  }
  const sceneNumber = body.sceneNumber as number;

  const sceneId =
    typeof body.sceneId === "string" && body.sceneId.trim().length > 0
      ? body.sceneId.trim()
      : undefined;

  const assemblyPlanId =
    typeof body.assemblyPlanId === "string" ? body.assemblyPlanId : undefined;

  // ── Load episode JSON from GitHub ─────────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(ghBranch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json(
        {
          ok: false,
          status: "episode_not_found",
          message: "Episode file was not found in GitHub.",
        } satisfies AssembleResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[assemble-story-panel-layers] GitHub GET failed (${getRes.status})`);
      return Response.json(
        {
          ok: false,
          status: "setup_required",
          message: `Failed to fetch episode from GitHub (HTTP ${getRes.status}).`,
        } satisfies AssembleResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    const rawContent =
      typeof fileData.content === "string"
        ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8")
        : "";

    try {
      const parsed: unknown = JSON.parse(rawContent);
      if (!isRecord(parsed)) throw new Error("not an object");
      episode = parsed;
    } catch {
      return Response.json(
        {
          ok: false,
          status: "invalid_episode_json",
          message: "Episode file exists but could not be parsed as JSON.",
        } satisfies AssembleResult,
        { status: 422 }
      );
    }
  } catch (err) {
    console.error(
      "[assemble-story-panel-layers] Network error fetching episode:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Failed to reach the GitHub API.",
      } satisfies AssembleResult,
      { status: 502 }
    );
  }

  // ── Find scene ────────────────────────────────────────────────────────────────
  const sceneArr = (() => {
    const sb = episode.sceneBreakdown;
    const sc = episode.scenes;
    const arr = Array.isArray(sb) && sb.length > 0 ? sb : Array.isArray(sc) ? sc : [];
    return arr.filter(isRecord);
  })();

  const scene = sceneArr.find((s) => {
    if (sceneId && typeof s.sceneId === "string" && s.sceneId === sceneId) return true;
    return typeof s.sceneNumber === "number" && s.sceneNumber === sceneNumber;
  });

  if (!scene) {
    return Response.json(
      {
        ok: false,
        status: "scene_not_found",
        message: `Scene ${sceneNumber} was not found in episode ${episodeSlug}.`,
      } satisfies AssembleResult,
      { status: 404 }
    );
  }

  // ── Collect background layers ─────────────────────────────────────────────────
  const rawBgLayers: unknown[] = Array.isArray(scene.backgroundLayers)
    ? scene.backgroundLayers
    : [];
  const bgLayers = rawBgLayers.filter(isEpisodeSceneBackgroundLayer);
  const backgroundLayer = latestByCreatedAt(bgLayers);

  if (!backgroundLayer) {
    return Response.json(
      {
        ok: false,
        status: "no_background_layer",
        message:
          "No saved background layer found for this scene. Generate and save a background layer first.",
      } satisfies AssembleResult,
      { status: 422 }
    );
  }

  // ── Collect character layers (latest per slug) ─────────────────────────────────
  const rawCharLayers: unknown[] = Array.isArray(scene.characterLayers)
    ? scene.characterLayers
    : [];
  const charLayers = latestCharLayerPerSlug(rawCharLayers.filter(isEpisodeSceneCharacterLayer));

  // ── Compose layers ────────────────────────────────────────────────────────────
  try {
    console.info(
      `[assemble-story-panel-layers] Compositing scene ${sceneNumber} of ${episodeSlug}: 1 bg layer + ${charLayers.length} char layer(s)`
    );

    const draft = await composeStoryPanelLayers({
      backgroundLayer,
      characterLayers: charLayers,
      episodeSlug,
      sceneId: typeof scene.sceneId === "string" ? scene.sceneId : sceneId,
      sceneNumber,
      assemblyPlanId,
    });

    const notes: string[] = [
      `Assembled ${charLayers.length} character layer(s) onto background layer.`,
      "This is a temporary draft — nothing has been saved or published.",
      "Use Approve & Save Panel to commit the assembled panel to the episode.",
    ];

    return Response.json(
      { ok: true, status: "assembled", draft, notes } satisfies AssembleResult,
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[assemble-story-panel-layers] Composition failed:", msg);
    return Response.json(
      {
        ok: false,
        status: "composition_failed",
        message: `Image composition failed: ${msg.slice(0, 200)}`,
      } satisfies AssembleResult,
      { status: 500 }
    );
  }
}
