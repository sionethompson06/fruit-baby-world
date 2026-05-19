// POST /api/final-video/render-and-save
// Route shell for future one-click final story video render and save.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not render video. Does not upload to Blob. Does not modify episode JSON.
//          Does not create fake video URLs. Returns not_implemented_yet always.
//          This is a foundation route. Real rendering will be enabled in a future phase.
// Phase:   15D — One-Click Final Video Foundation.

import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { buildFinalVideoAssemblyPackage } from "@/lib/finalVideoAssembly";
import { buildFinalVideoProductionPlan } from "@/lib/finalVideoProductionPlan";

// ─── Types ────────────────────────────────────────────────────────────────────

type RenderAndSaveResult =
  | {
      ok: false;
      status:
        | "not_implemented_yet"
        | "validation_error"
        | "episode_not_found"
        | "render_blocked";
      message: string;
      episodeSlug?: string;
      productionPlan?: Record<string, unknown>;
      notes: string[];
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG_RE.test(normalized);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
        notes: [
          "No final video was rendered.",
          "No media was saved.",
          "No episode JSON was changed.",
        ],
      } satisfies RenderAndSaveResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
        notes: [
          "No final video was rendered.",
          "No media was saved.",
          "No episode JSON was changed.",
        ],
      } satisfies RenderAndSaveResult,
      { status: 400 }
    );
  }

  const { episodeSlug } = body;

  if (!validateSlug(episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a valid slug.",
        notes: [
          "No final video was rendered.",
          "No media was saved.",
          "No episode JSON was changed.",
        ],
      } satisfies RenderAndSaveResult,
      { status: 400 }
    );
  }

  const result = loadEpisodeBySlug(episodeSlug as string);
  if (!result) {
    return Response.json(
      {
        ok: false,
        status: "episode_not_found",
        message: `Episode not found: ${episodeSlug}`,
        episodeSlug: episodeSlug as string,
        notes: [
          "No final video was rendered.",
          "No media was saved.",
          "No episode JSON was changed.",
        ],
      } satisfies RenderAndSaveResult,
      { status: 404 }
    );
  }

  const assemblyPackage = buildFinalVideoAssemblyPackage(result.raw);
  const productionPlan = buildFinalVideoProductionPlan(assemblyPackage, result.raw);

  if (productionPlan.status === "blocked") {
    return Response.json(
      {
        ok: false,
        status: "render_blocked",
        message: `Episode is not ready for rendering: ${productionPlan.blockers.join("; ")}`,
        episodeSlug: episodeSlug as string,
        productionPlan: {
          status: productionPlan.status,
          blockers: productionPlan.blockers,
          warnings: productionPlan.warnings,
        },
        notes: [
          "No final video was rendered.",
          "No media was saved.",
          "No episode JSON was changed.",
          "Resolve blockers before rendering.",
        ],
      } satisfies RenderAndSaveResult,
      { status: 422 }
    );
  }

  // Rendering is not yet implemented — return safe informational response.
  return Response.json(
    {
      ok: false,
      status: "not_implemented_yet",
      message: "Final video rendering is prepared but not enabled yet.",
      episodeSlug: episodeSlug as string,
      productionPlan: {
        status: productionPlan.status,
        canRenderAndSave: productionPlan.canRenderAndSave,
        summary: productionPlan.summary,
        futureSteps: productionPlan.futureSteps,
        warnings: productionPlan.warnings,
        blockers: productionPlan.blockers,
      },
      notes: [
        "No final video was rendered.",
        "No media was saved.",
        "No episode JSON was changed.",
        "A future phase will enable one-click render and save.",
      ],
    } satisfies RenderAndSaveResult,
    { status: 200 }
  );
}
