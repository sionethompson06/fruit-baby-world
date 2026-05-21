// POST /api/generate-story-panel-background
// Protected route: generates a background-only story scene layer using the
// Scene Assembly Plan from Phase 18D.9. No characters are included.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Background drafts are never saved, uploaded, or attached.
//          No secrets or stack traces are exposed.
// Phase:   18D.10 — Background-Only Scene Generation Foundation

import OpenAI from "openai";
import {
  buildBackgroundOnlyPrompt,
  compactBackgroundPromptIfNeeded,
} from "@/lib/storyPanelBackgroundPrompt";
import {
  getDraftModelId,
  useEnvironmentImageReference,
  type StoryPanelProvider,
} from "@/lib/storyPanelImageProvider";
import { validateSlug } from "@/lib/storyPanelImageGeneration";
import type { StoryPanelBackgroundDraft } from "@/lib/storyPanelBackgroundTypes";
import {
  loadReferenceAssets,
  buildSceneReferencePackage,
} from "@/lib/referenceAssetLoader";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import type { Character } from "@/lib/content";
import { fetchConditionedImages } from "@/lib/storyPanelImageConditioner";
import type { BundleAsset } from "@/lib/storyPanelReferenceBundle";
import {
  getEnvironmentReferencesForScene,
  selectBestEnvironmentReferenceForBackground,
  buildEnvironmentReferenceSummary,
  buildEnvironmentReferencePromptSection,
  type EnvironmentReferenceSummary,
  type SceneEnvironmentRef,
} from "@/lib/storyPanelEnvironmentReferences";

// ─── Types ────────────────────────────────────────────────────────────────────

type BackgroundResult =
  | {
      ok: true;
      status: "background_draft_generated";
      draft: StoryPanelBackgroundDraft;
      generationPrompt: string;
      provider: StoryPanelProvider;
      modelId: string;
      notes: string[];
      environmentReferenceMode: "image-reference" | "text-only" | "none";
      environmentReferenceCount: number;
      environmentReferenceIds: string[];
      environmentReferenceTitles: string[];
      environmentReferenceUrlsUsed: string[];
    }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "validation_error"
        | "setup_required"
        | "provider_error"
        | "provider_timeout"
        | "prompt_compaction_failed";
      message: string;
      troubleshooting?: string[];
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies BackgroundResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies BackgroundResult,
      { status: 400 }
    );
  }

  // ── Validate required field: backgroundPrompt ─────────────────────────────
  if (typeof body.backgroundPrompt !== "string" || body.backgroundPrompt.trim().length === 0) {
    return Response.json(
      { ok: false, status: "validation_error", message: "backgroundPrompt is required and must be a non-empty string." } satisfies BackgroundResult,
      { status: 400 }
    );
  }
  const backgroundPrompt = body.backgroundPrompt.trim();

  // ── Optional fields ────────────────────────────────────────────────────────
  let episodeSlug: string | undefined;
  if (body.episodeSlug !== undefined) {
    if (!validateSlug(body.episodeSlug)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "episodeSlug must be a safe slug if provided." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    episodeSlug = body.episodeSlug;
  }

  let sceneNumber: number | undefined;
  if (body.sceneNumber !== undefined) {
    if (typeof body.sceneNumber !== "number" || body.sceneNumber < 1 || !Number.isFinite(body.sceneNumber)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "sceneNumber must be a positive number if provided." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    sceneNumber = body.sceneNumber;
  }

  let sceneId: string | undefined;
  if (body.sceneId !== undefined) {
    if (typeof body.sceneId !== "string" || body.sceneId.trim().length === 0) {
      return Response.json(
        { ok: false, status: "validation_error", message: "sceneId must be a non-empty string if provided." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    sceneId = body.sceneId.trim();
  }

  // ── Admin scene direction ─────────────────────────────────────────────────
  let adminSceneDirection: string | undefined;
  if (body.adminSceneDirection !== undefined && body.adminSceneDirection !== "") {
    if (typeof body.adminSceneDirection !== "string") {
      return Response.json(
        { ok: false, status: "validation_error", message: "adminSceneDirection must be a string." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    const stripped = body.adminSceneDirection.replace(/<[^>]*>/g, "").trim();
    if (stripped.length > 1200) {
      return Response.json(
        { ok: false, status: "validation_error", message: "adminSceneDirection must be 1,200 characters or fewer." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    adminSceneDirection = stripped || undefined;
  }

  // ── Background direction (environment-specific notes) ─────────────────────
  let backgroundDirection: string | undefined;
  if (body.backgroundDirection !== undefined && body.backgroundDirection !== "") {
    if (typeof body.backgroundDirection !== "string") {
      return Response.json(
        { ok: false, status: "validation_error", message: "backgroundDirection must be a string." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    const stripped = body.backgroundDirection.replace(/<[^>]*>/g, "").trim();
    if (stripped.length > 600) {
      return Response.json(
        { ok: false, status: "validation_error", message: "backgroundDirection must be 600 characters or fewer." } satisfies BackgroundResult,
        { status: 400 }
      );
    }
    backgroundDirection = stripped || undefined;
  }

  // ── Provider selection ─────────────────────────────────────────────────────
  // Default: OpenAI for background generation (stronger scene/environment fidelity).
  // Fal.ai not yet supported for background-only (requires text-to-image model config).
  const provider: StoryPanelProvider = "openai";

  // ── Optional metadata from client ─────────────────────────────────────────
  const settingLabel = typeof body.settingLabel === "string" ? body.settingLabel : undefined;
  const mood = typeof body.mood === "string" ? body.mood : undefined;
  const assemblyPlanId = typeof body.assemblyPlanId === "string" ? body.assemblyPlanId : undefined;

  const referenceCharacters: string[] = Array.isArray(body.referenceCharacters)
    ? (body.referenceCharacters as unknown[]).filter(
        (s): s is string => typeof s === "string" && s.length > 0
      )
    : [];

  // ── Load environment references for scene characters ─────────────────────
  // Text-only mode: env ref titles/descriptions are injected into the prompt.
  // If configured, the selected env ref image is also fetched and passed to OpenAI images.edit.
  let envRefSummary: EnvironmentReferenceSummary = {
    count: 0,
    ids: [],
    titles: [],
    characterSlugs: [],
    selectedUrl: undefined,
    selectedTitle: undefined,
    selectedCharacterSlug: undefined,
    mode: "none",
  };
  let selectedEnvironmentReference: SceneEnvironmentRef | undefined;
  let environmentReferencePromptSection: string | undefined;
  let environmentReferenceUrlsUsed: string[] = [];
  const useEnvImageRef = useEnvironmentImageReference();

  if (referenceCharacters.length > 0) {
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
      const envRefs = getEnvironmentReferencesForScene(sceneRefPkg);
      const primarySlug = referenceCharacters[0];
      const selected = selectBestEnvironmentReferenceForBackground(
        envRefs,
        settingLabel,
        primarySlug
      );
      selectedEnvironmentReference = selected;
      const mode = envRefs.length > 0 ? (useEnvImageRef ? "image-reference" : "text-only") : "none";
      envRefSummary = buildEnvironmentReferenceSummary(envRefs, selected, mode);
      environmentReferencePromptSection = buildEnvironmentReferencePromptSection(
        envRefs,
        selected
      );
    } catch (refErr) {
      console.warn(
        "[generate-story-panel-background] Environment reference loading failed, continuing without refs:",
        refErr instanceof Error ? refErr.message : refErr
      );
    }
  }

  // ── Validate OpenAI setup ─────────────────────────────────────────────────
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Background generation requires OPENAI_API_KEY. Add it to Vercel environment variables and redeploy.",
        troubleshooting: [
          "Add OPENAI_API_KEY to Vercel environment variables.",
          "Redeploy after adding the key.",
        ],
      } satisfies BackgroundResult,
      { status: 503 }
    );
  }

  const modelId = getDraftModelId();

  // ── Build background prompt ────────────────────────────────────────────────
  const fullPrompt = buildBackgroundOnlyPrompt({
    backgroundPrompt,
    adminSceneDirection,
    backgroundDirection,
    settingLabel,
    mood,
    environmentReferenceSummary: environmentReferencePromptSection,
  });

  const compaction = compactBackgroundPromptIfNeeded(fullPrompt);
  const providerPrompt = compaction.prompt;

  console.log(
    `[generate-story-panel-background] provider=${provider}, model=${modelId}, promptLen=${providerPrompt.length}${compaction.wasCompacted ? ` (compacted from ${compaction.originalLength})` : ""}`
  );

  // ── Call OpenAI ────────────────────────────────────────────────────────────
  const openai = new OpenAI({ apiKey: openAiKey });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  let b64: string | undefined;
  let resultImageUrl: string | undefined;
  let imageReferenceWarnings: string[] = [];
  let usedImageReferenceConditioning = false;

  if (envRefSummary.mode === "image-reference" && selectedEnvironmentReference) {
    const selectedEnvRef = {
      id: selectedEnvironmentReference.id,
      characterSlug: selectedEnvironmentReference.characterSlug,
      characterName: selectedEnvironmentReference.characterName,
      title: selectedEnvironmentReference.title,
      assetType: selectedEnvironmentReference.assetType,
      url: selectedEnvironmentReference.url,
      role: "environment" as const,
      isOfficial: true,
    } satisfies BundleAsset;

    const conditioned = await fetchConditionedImages([selectedEnvRef]).catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[generate-story-panel-background] fetchConditionedImages threw:", msg);
      return {
        images: [] as import("@/lib/storyPanelImageConditioner").FetchedReferenceImage[],
        failedAssetIds: [] as string[],
        warnings: [`Fetch error: ${msg}`],
      };
    });

    imageReferenceWarnings.push(...conditioned.warnings);

    if (conditioned.images.length > 0) {
      try {
        console.log(`[generate-story-panel-background] images.edit with ${conditioned.images.length} File input(s)`);
        const resp = await openai.images.edit({
          model: modelId,
          image: conditioned.images.map((fi) => fi.file) as Parameters<typeof openai.images.edit>[0]["image"],
          prompt: providerPrompt,
          n: 1,
          size: "1024x1024",
          input_fidelity: "high",
        });
        clearTimeout(timeout);

        const data = resp.data?.[0] ?? {};
        b64 = typeof data.b64_json === "string" ? data.b64_json : undefined;
        resultImageUrl = typeof data.url === "string" ? data.url : undefined;

        if (b64 || resultImageUrl) {
          usedImageReferenceConditioning = true;
          environmentReferenceUrlsUsed = [selectedEnvironmentReference.url];
          envRefSummary.mode = "image-reference";
        } else {
          envRefSummary.mode = "text-only";
          imageReferenceWarnings.push("Environment image reference edit returned no image data. Falling back to text-only generation.");
        }
      } catch (err) {
        clearTimeout(timeout);
        const editMsg = err instanceof Error ? err.message : String(err);
        console.warn("[generate-story-panel-background] images.edit failed:", editMsg);
        envRefSummary.mode = "text-only";
        imageReferenceWarnings.push(`Environment image reference conditioning failed: ${editMsg}`);
      }
    } else {
      envRefSummary.mode = "text-only";
      imageReferenceWarnings.push("No valid environment reference image could be fetched. Falling back to text-only generation.");
    }
  }

  if (!usedImageReferenceConditioning) {
    try {
      const resp = await openai.images.generate({
        model: modelId,
        prompt: providerPrompt,
        n: 1,
        size: "1024x1024",
      });
      clearTimeout(timeout);

      const data = resp.data?.[0] ?? {};
      b64 = typeof data.b64_json === "string" ? data.b64_json : undefined;
      resultImageUrl = typeof data.url === "string" ? data.url : undefined;
    } catch (err) {
      clearTimeout(timeout);
      const isAbort = err instanceof Error && err.name === "AbortError";
      const msg = err instanceof Error ? err.message : String(err);

      console.error("[generate-story-panel-background] OpenAI error:", msg);

      return Response.json(
        {
          ok: false,
          status: isAbort ? "provider_timeout" : "provider_error",
          message: isAbort
            ? "Background generation timed out after 90 seconds. Try again."
            : `Background generation failed — OpenAI error: ${msg.slice(0, 200)}`,
          troubleshooting: [
            "Confirm OPENAI_API_KEY is valid.",
            "Try again — the provider may be temporarily unavailable.",
            "Try a simpler background direction.",
          ],
        } satisfies BackgroundResult,
        { status: 502 }
      );
    }
  }

  if (!b64 && !resultImageUrl) {
    return Response.json(
      {
        ok: false,
        status: "provider_error",
        message: "Background generation returned no image data.",
        troubleshooting: ["Try again.", "Check OpenAI API key and model availability."],
      } satisfies BackgroundResult,
      { status: 502 }
    );
  }

  const draft: StoryPanelBackgroundDraft = {
    id: `background-draft-${Date.now()}`,
    type: "background-only-draft",
    status: "temporary",
    episodeSlug,
    sceneId,
    sceneNumber,
    provider,
    modelId,
    imageBase64: b64,
    imageUrl: resultImageUrl,
    mimeType: "image/png",
    promptText: backgroundPrompt,
    providerPromptLength: providerPrompt.length,
    promptWasCompacted: compaction.wasCompacted,
    assemblyPlanId,
    settingLabel,
    environmentDescription: backgroundPrompt.slice(0, 200),
    createdAt: new Date().toISOString(),
    warnings: [
      ...(compaction.wasCompacted ? ["Background prompt was compacted to meet provider limits."] : []),
      ...imageReferenceWarnings,
    ],
  };

  return Response.json(
    {
      ok: true,
      status: "background_draft_generated",
      draft,
      generationPrompt: providerPrompt,
      provider,
      modelId,
      notes: [
        "This is a temporary background-only draft.",
        "It was not attached to the episode.",
        "Characters should be generated and assembled in future phases.",
        ...(envRefSummary.count > 0
          ? envRefSummary.mode === "image-reference"
            ? [
                `Environment reference image passed to provider for strict scene conditioning: ${envRefSummary.selectedTitle ?? "selected reference"}.`,
              ]
            : [
                `${envRefSummary.count} environment reference${envRefSummary.count !== 1 ? "s" : ""} used as text guidance: ${envRefSummary.titles.join(", ")}`,
              ]
          : []),
      ],
      environmentReferenceMode: envRefSummary.mode,
      environmentReferenceCount: envRefSummary.count,
      environmentReferenceIds: envRefSummary.ids,
      environmentReferenceTitles: envRefSummary.titles,
      environmentReferenceUrlsUsed: environmentReferenceUrlsUsed,
    } satisfies BackgroundResult,
    { status: 200 }
  );
}
