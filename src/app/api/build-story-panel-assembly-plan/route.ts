// POST /api/build-story-panel-assembly-plan
// Builds a story panel assembly plan (background prompt + per-character layer plans)
// without calling any image provider.
//
// Auth:   Protected by proxy.ts — requires valid admin cookie.
// Safety: Read-only — no writes, no image generation.
// Phase:  18D.12A — Image Generation Workflow Unification

import {
  buildStoryPanelAssemblyPlan,
  summarizeAssemblyPlanForUi,
} from "@/lib/storyPanelAssemblyPlanner";
import { validateSlug } from "@/lib/storyPanelImageGeneration";

// ─── Types ────────────────────────────────────────────────────────────────────

type BuildPlanResult =
  | {
      ok: true;
      status: "built";
      assemblyPlanSummary: ReturnType<typeof summarizeAssemblyPlanForUi>;
      assemblyPlanCharacterLayerPlans: ReturnType<
        typeof buildStoryPanelAssemblyPlan
      >["cast"];
      assemblyPlanBackgroundPrompt: string;
      assemblyPlanSetting: string;
      assemblyPlanMood: string;
      assemblyPlanWarnings: string[];
    }
  | {
      ok: false;
      status: "validation_error" | "plan_error";
      message: string;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies BuildPlanResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies BuildPlanResult,
      { status: 400 }
    );
  }

  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a safe slug.",
      } satisfies BuildPlanResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

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
      } satisfies BuildPlanResult,
      { status: 400 }
    );
  }
  const sceneNumber = body.sceneNumber as number;

  const sceneId =
    typeof body.sceneId === "string" && body.sceneId.trim().length > 0
      ? body.sceneId.trim()
      : undefined;

  const panelPrompt =
    typeof body.panelPrompt === "string" ? body.panelPrompt : "";

  const referenceCharacters: string[] = Array.isArray(body.referenceCharacters)
    ? (body.referenceCharacters as unknown[]).filter(
        (s): s is string => typeof s === "string" && s.length > 0
      )
    : [];

  const adminSceneDirection =
    typeof body.adminSceneDirection === "string" && body.adminSceneDirection.trim().length > 0
      ? body.adminSceneDirection.trim()
      : null;

  try {
    const plan = buildStoryPanelAssemblyPlan({
      episodeSlug,
      sceneId: sceneId ?? null,
      sceneNumber,
      panelId: null,
      mode: "production",
      characterSlugs: referenceCharacters,
      sceneText: panelPrompt,
      adminSceneDirection,
      referenceAssetIds: [],
    });

    const summary = summarizeAssemblyPlanForUi(plan);

    return Response.json(
      {
        ok: true,
        status: "built",
        assemblyPlanSummary: summary,
        assemblyPlanCharacterLayerPlans: plan.cast,
        assemblyPlanBackgroundPrompt: plan.layout.backgroundPrompt,
        assemblyPlanSetting: plan.scene.settingLabel,
        assemblyPlanMood: plan.scene.mood,
        assemblyPlanWarnings: plan.metadata.warnings,
      } satisfies BuildPlanResult,
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[build-story-panel-assembly-plan] Error:", msg);
    return Response.json(
      {
        ok: false,
        status: "plan_error",
        message: `Assembly plan failed: ${msg.slice(0, 200)}`,
      } satisfies BuildPlanResult,
      { status: 500 }
    );
  }
}
