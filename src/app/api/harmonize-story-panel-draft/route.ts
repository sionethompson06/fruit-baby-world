// POST /api/harmonize-story-panel-draft
// Applies a preservation-first harmonization pass to an assembled story panel draft.
// Uses the assembled draft image as the base — does not regenerate from scratch.
// Improves edge blending, lighting, shadows, and color harmony while preserving
// character identity, placement, and scene composition.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Result is temporary. Nothing is saved, uploaded, or published automatically.
// Phase:   18D.13 — Final Harmonization Pass for Assembled Drafts

import { put } from "@vercel/blob";
import {
  buildHarmonizationPrompt,
  buildHarmonizationPreservationRules,
  compactHarmonizationPromptIfNeeded,
} from "@/lib/storyPanelHarmonizationPrompt";
import {
  loadGoldenReferences,
  selectGoldenReferencesForHarmonization,
  buildGoldenReferencePromptSection,
  buildGoldenReferenceReplayDiagnostics,
} from "@/lib/storyPanelGoldenReferences";
import {
  getFalRefineModelId,
  getFalApiKey,
  isProductionProviderConfigured,
  getDraftModelId,
  type StoryPanelProvider,
} from "@/lib/storyPanelImageProvider";
import type { HarmonizedStoryPanelDraft } from "@/lib/storyPanelBackgroundTypes";
import OpenAI from "openai";

// ─── Types ────────────────────────────────────────────────────────────────────

type HarmonizeResult =
  | {
      ok: true;
      status: "harmonized";
      draft: HarmonizedStoryPanelDraft;
      provider: StoryPanelProvider;
      modelId: string;
      harmonizationPromptLength: number;
      promptWasCompacted: boolean;
      goldenReferencesUsed: boolean;
      goldenReferenceCount: number;
      goldenReferenceTitles: string[];
      goldenReferenceMode: "none" | "prompt-guided" | "image-conditioned";
      goldenReferenceReplayEnabled: boolean;
      goldenReferenceDiagnostics: {
        enabled: boolean;
        consideredCount: number;
        selectedCount: number;
        skippedReason?: string;
        selected: Array<{ id: string; title: string; role: string; matchReason: string }>;
        warnings: string[];
      };
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "missing_assembled_draft"
        | "setup_required"
        | "provider_error"
        | "provider_timeout"
        | "image_upload_failed"
        | "image_download_failed"
        | "image_response_parse_error";
      message: string;
      troubleshooting?: string[];
    };

type AllowedMime = "image/png" | "image/jpeg" | "image/webp";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 8;
}

function mimeToExt(mime: AllowedMime): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies HarmonizeResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies HarmonizeResult,
      { status: 400 }
    );
  }

  // ── Extract assembled draft image ────────────────────────────────────────────
  const assembledDraftImageBase64 =
    typeof body.assembledDraftImageBase64 === "string" &&
    body.assembledDraftImageBase64.length > 10
      ? body.assembledDraftImageBase64
      : null;

  const assembledDraftImageUrl = isHttpsUrl(body.assembledDraftImageUrl)
    ? (body.assembledDraftImageUrl as string)
    : null;

  const mimeType: AllowedMime =
    typeof body.mimeType === "string" &&
    ["image/png", "image/jpeg", "image/webp"].includes(body.mimeType)
      ? (body.mimeType as AllowedMime)
      : "image/png";

  if (!assembledDraftImageBase64 && !assembledDraftImageUrl) {
    return Response.json(
      {
        ok: false,
        status: "missing_assembled_draft",
        message: "No assembled draft image provided. Assemble a draft panel first.",
      } satisfies HarmonizeResult,
      { status: 400 }
    );
  }

  // ── Optional metadata passed through from assembled draft ─────────────────────
  const episodeSlug =
    typeof body.episodeSlug === "string" && body.episodeSlug.length > 0
      ? body.episodeSlug
      : undefined;

  const sceneId =
    typeof body.sceneId === "string" && body.sceneId.trim().length > 0
      ? body.sceneId.trim()
      : undefined;

  const sceneNumber =
    typeof body.sceneNumber === "number" && body.sceneNumber >= 1
      ? body.sceneNumber
      : undefined;

  const baseDraftId =
    typeof body.baseDraftId === "string" ? body.baseDraftId : undefined;

  const backgroundLayerId =
    typeof body.backgroundLayerId === "string" ? body.backgroundLayerId : undefined;

  const characterLayerIds: string[] = Array.isArray(body.characterLayerIds)
    ? (body.characterLayerIds as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];

  const characterSlugs: string[] = Array.isArray(body.characterSlugs)
    ? (body.characterSlugs as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];

  const assembledDraftWarnings: string[] = Array.isArray(body.assembledDraftWarnings)
    ? (body.assembledDraftWarnings as unknown[]).filter(
        (s): s is string => typeof s === "string"
      )
    : [];

  const settingLabel =
    typeof body.settingLabel === "string" && body.settingLabel.length > 0
      ? body.settingLabel
      : undefined;

  const mood =
    typeof body.mood === "string" && body.mood.length > 0 ? body.mood : undefined;

  const sceneCharacterCount =
    characterLayerIds.length > 0
      ? characterLayerIds.length
      : characterSlugs.length > 0
      ? characterSlugs.length
      : undefined;

  // ── Golden Reference toggle ────────────────────────────────────────────────
  const useGoldenReferences: boolean =
    body.useGoldenReferences === false ? false : true;

  // ── Load golden harmonization references ──────────────────────────────────
  let goldenHarmonizeSection: string | undefined;
  let goldenReferencesUsed = false;
  let goldenReferenceCount = 0;
  let goldenReferenceTitles: string[] = [];
  let goldenReferenceMode: "none" | "prompt-guided" | "image-conditioned" = "none";
  let goldenReferenceDiagnostics: ReturnType<typeof buildGoldenReferenceReplayDiagnostics> = {
    enabled: useGoldenReferences,
    consideredCount: 0,
    selectedCount: 0,
    skippedReason: useGoldenReferences ? undefined : "disabled by admin",
    selected: [],
    warnings: [],
  };

  try {
    const allGoldenRefs = loadGoldenReferences();
    const goldenResult = selectGoldenReferencesForHarmonization({
      all: allGoldenRefs,
      characterSlugs,
      useGoldenReferences,
    });
    goldenReferencesUsed = goldenResult.count > 0;
    goldenReferenceCount = goldenResult.count;
    goldenReferenceTitles = goldenResult.titles;
    goldenReferenceMode = goldenResult.mode;
    goldenReferenceDiagnostics = buildGoldenReferenceReplayDiagnostics(goldenResult, useGoldenReferences);
    if (goldenResult.count > 0) {
      goldenHarmonizeSection = buildGoldenReferencePromptSection(goldenResult.references, "harmonize");
    }
  } catch (goldenErr) {
    console.warn("[harmonize] Golden reference loading failed:", goldenErr instanceof Error ? goldenErr.message : goldenErr);
  }

  // ── Build harmonization prompt ─────────────────────────────────────────────
  const basePrompt = buildHarmonizationPrompt({ sceneCharacterCount, settingLabel, mood });
  const preservationRules = buildHarmonizationPreservationRules({ characterSlugs });
  const promptParts = [basePrompt, "", preservationRules];
  if (goldenHarmonizeSection) promptParts.push("", goldenHarmonizeSection);
  const fullPrompt = promptParts.join("\n");
  const compaction = compactHarmonizationPromptIfNeeded(fullPrompt);
  const harmonizationPrompt = compaction.prompt;

  // ── Provider setup ────────────────────────────────────────────────────────────
  const falApiKey = getFalApiKey();
  const falConfigured = isProductionProviderConfigured();
  const openAiKey = process.env.OPENAI_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  // For Fal we need an HTTPS URL — upload base64 to temp Blob if needed
  let imageUrlForFal: string | null = assembledDraftImageUrl;

  if (falConfigured && !imageUrlForFal && assembledDraftImageBase64 && blobToken) {
    try {
      const imageBuffer = Buffer.from(assembledDraftImageBase64, "base64");
      const blob = await put(
        `harmonize-temp/${Date.now()}.${mimeToExt(mimeType)}`,
        imageBuffer,
        { access: "public", contentType: mimeType, token: blobToken }
      );
      imageUrlForFal = blob.url;
      console.log("[harmonize] Uploaded assembled draft to Blob for Fal:", imageUrlForFal);
    } catch (uploadErr) {
      const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.warn("[harmonize] Blob upload failed, will fall through to OpenAI:", msg);
      imageUrlForFal = null;
    }
  }

  const useFal = falConfigured && Boolean(falApiKey) && imageUrlForFal !== null;
  const useOpenAI = !useFal && Boolean(openAiKey) && assembledDraftImageBase64 !== null;

  // ══════════════════════════════════════════════════════════════════════════════
  // FAL.AI PATH — preferred for harmonization
  // Sends the assembled draft as image_url (string, never array).
  // Does not send character reference bundle — base image IS the source of truth.
  // ══════════════════════════════════════════════════════════════════════════════
  if (useFal && falApiKey && imageUrlForFal) {
    const modelId = getFalRefineModelId();
    const provider: StoryPanelProvider = "fal";

    console.log(
      `[harmonize] Fal path: model=${modelId}, promptLen=${harmonizationPrompt.length}`
    );

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    let falResp: Response;
    try {
      falResp = await fetch(`https://fal.run/${modelId}`, {
        method: "POST",
        headers: {
          Authorization: `Key ${falApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: harmonizationPrompt,
          image_url: imageUrlForFal,
          num_images: 1,
        }),
        signal: controller.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeout);
      const isAbort = fetchErr instanceof Error && fetchErr.name === "AbortError";
      return Response.json(
        {
          ok: false,
          status: isAbort ? "provider_timeout" : "provider_error",
          message: isAbort
            ? "Harmonization timed out — Fal.ai took too long. Try again."
            : "Harmonization failed — could not reach Fal.ai.",
          troubleshooting: ["Try again — the provider may be temporarily unavailable."],
        } satisfies HarmonizeResult,
        { status: 502 }
      );
    }
    clearTimeout(timeout);

    if (!falResp.ok) {
      const errText = await falResp.text().catch(() => "");
      console.error(`[harmonize] Fal error (${falResp.status}):`, errText.slice(0, 200));
      return Response.json(
        {
          ok: false,
          status: "provider_error",
          message: `Harmonization failed — Fal.ai returned ${falResp.status}.`,
          troubleshooting: [
            "Try again — Fal.ai may be temporarily unavailable.",
            `Model: ${modelId}. Override with STORY_PANEL_REFINE_MODEL_ID env var.`,
          ],
        } satisfies HarmonizeResult,
        { status: 502 }
      );
    }

    const falData = (await falResp.json()) as Record<string, unknown>;
    const firstImage =
      (Array.isArray(falData.images) ? falData.images[0] : null) ??
      (isRecord(falData.image) ? falData.image : null);
    const falImageUrl =
      typeof (firstImage as Record<string, unknown> | null)?.url === "string"
        ? ((firstImage as Record<string, unknown>).url as string)
        : typeof falData.url === "string"
        ? falData.url
        : undefined;

    if (!falImageUrl) {
      return Response.json(
        {
          ok: false,
          status: "image_response_parse_error",
          message: "Fal.ai returned a response but no harmonized image URL was found.",
        } satisfies HarmonizeResult,
        { status: 502 }
      );
    }

    // Download harmonized image and convert to base64
    let b64: string;
    try {
      const imgResp = await fetch(falImageUrl);
      if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}`);
      b64 = Buffer.from(await imgResp.arrayBuffer()).toString("base64");
    } catch (dlErr) {
      const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
      console.error("[harmonize] Failed to download Fal result:", msg);
      return Response.json(
        {
          ok: false,
          status: "image_download_failed",
          message: "Harmonized image was generated but could not be downloaded from Fal.ai.",
        } satisfies HarmonizeResult,
        { status: 502 }
      );
    }

    const draft: HarmonizedStoryPanelDraft = {
      id: `harmonized-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "harmonized-story-panel-draft",
      status: "temporary",
      episodeSlug,
      sceneId,
      sceneNumber,
      baseDraftId,
      baseDraftType: "assembled-story-panel-draft",
      backgroundLayerId,
      characterLayerIds: characterLayerIds.length > 0 ? characterLayerIds : undefined,
      assembledDraftWarnings: assembledDraftWarnings.length > 0 ? assembledDraftWarnings : undefined,
      imageBase64: b64,
      imageUrl: falImageUrl,
      mimeType: "image/png",
      provider,
      modelId,
      harmonizationPrompt,
      promptWasCompacted: compaction.wasCompacted,
      providerPromptLength: harmonizationPrompt.length,
      preserveComposition: true,
      preserveCharacterIdentity: true,
      preservePlacement: true,
      createdAt: new Date().toISOString(),
      warnings: compaction.wasCompacted
        ? ["Harmonization prompt was compacted to meet provider limits."]
        : [],
    };

    return Response.json(
      {
        ok: true,
        status: "harmonized",
        draft,
        provider,
        modelId,
        harmonizationPromptLength: harmonizationPrompt.length,
        promptWasCompacted: compaction.wasCompacted,
        goldenReferencesUsed,
        goldenReferenceCount,
        goldenReferenceTitles,
        goldenReferenceMode,
        goldenReferenceReplayEnabled: useGoldenReferences,
        goldenReferenceDiagnostics,
        notes: [
          "This is a temporary harmonized draft — not saved or published.",
          "Use Approve & Save Panel to commit this image to the episode.",
          "Composition, characters, and placement are preserved from the assembled draft.",
        ],
      } satisfies HarmonizeResult,
      { status: 200 }
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // OPENAI PATH — fallback when Fal is not configured or base64-only + no blob
  // ══════════════════════════════════════════════════════════════════════════════
  if (!useOpenAI || !openAiKey || !assembledDraftImageBase64) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: falConfigured
          ? "Harmonization requires an HTTPS image URL for Fal.ai. Add BLOB_READ_WRITE_TOKEN to enable temporary upload, or provide an existing image URL."
          : "No image provider is configured for harmonization. Add FAL_KEY (preferred) or OPENAI_API_KEY in Vercel environment variables.",
        troubleshooting: [
          "Add FAL_KEY for Fal.ai harmonization (recommended).",
          "Add BLOB_READ_WRITE_TOKEN to allow temporary base64 upload.",
          "Add OPENAI_API_KEY for OpenAI fallback.",
          "Redeploy after adding environment variables.",
        ],
      } satisfies HarmonizeResult,
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: openAiKey });
  const draftModelId = getDraftModelId();
  const provider: StoryPanelProvider = "openai";

  console.log(
    `[harmonize] OpenAI path: model=${draftModelId}, promptLen=${harmonizationPrompt.length}`
  );

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const imageBuffer = Buffer.from(assembledDraftImageBase64, "base64");
    const imageFile = new File([imageBuffer], `assembled.${mimeToExt(mimeType)}`, {
      type: mimeType,
    });

    const editResponse = await openai.images.edit({
      model: draftModelId,
      image: imageFile,
      prompt: harmonizationPrompt,
      n: 1,
      size: "1024x1024",
    });
    clearTimeout(timeout);

    const editData = editResponse.data?.[0] ?? {};
    const b64 = typeof editData.b64_json === "string" ? editData.b64_json : undefined;
    const resultUrl = typeof editData.url === "string" ? editData.url : undefined;

    if (!b64 && !resultUrl) {
      return Response.json(
        {
          ok: false,
          status: "image_response_parse_error",
          message: "OpenAI returned a response but no harmonized image data was found.",
        } satisfies HarmonizeResult,
        { status: 502 }
      );
    }

    const draft: HarmonizedStoryPanelDraft = {
      id: `harmonized-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: "harmonized-story-panel-draft",
      status: "temporary",
      episodeSlug,
      sceneId,
      sceneNumber,
      baseDraftId,
      baseDraftType: "assembled-story-panel-draft",
      backgroundLayerId,
      characterLayerIds: characterLayerIds.length > 0 ? characterLayerIds : undefined,
      assembledDraftWarnings: assembledDraftWarnings.length > 0 ? assembledDraftWarnings : undefined,
      imageBase64: b64,
      imageUrl: resultUrl,
      mimeType: "image/png",
      provider,
      modelId: draftModelId,
      harmonizationPrompt,
      promptWasCompacted: compaction.wasCompacted,
      providerPromptLength: harmonizationPrompt.length,
      preserveComposition: true,
      preserveCharacterIdentity: true,
      preservePlacement: true,
      createdAt: new Date().toISOString(),
      warnings: compaction.wasCompacted
        ? ["Harmonization prompt was compacted to meet provider limits."]
        : [],
    };

    return Response.json(
      {
        ok: true,
        status: "harmonized",
        draft,
        provider,
        modelId: draftModelId,
        harmonizationPromptLength: harmonizationPrompt.length,
        promptWasCompacted: compaction.wasCompacted,
        goldenReferencesUsed,
        goldenReferenceCount,
        goldenReferenceTitles,
        goldenReferenceMode,
        goldenReferenceReplayEnabled: useGoldenReferences,
        goldenReferenceDiagnostics,
        notes: [
          "This is a temporary harmonized draft — not saved or published.",
          "Use Approve & Save Panel to commit this image to the episode.",
          "Composition, characters, and placement are preserved from the assembled draft.",
        ],
      } satisfies HarmonizeResult,
      { status: 200 }
    );
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[harmonize] OpenAI edit error:", errMsg);
    return Response.json(
      {
        ok: false,
        status: isAbort ? "provider_timeout" : "provider_error",
        message: isAbort
          ? "Harmonization timed out — OpenAI took too long. Try again."
          : `Harmonization failed — OpenAI error: ${errMsg.slice(0, 200)}`,
        troubleshooting: [
          "Try again — the provider may be temporarily unavailable.",
          "Add FAL_KEY to use Fal.ai instead (recommended for harmonization).",
        ],
      } satisfies HarmonizeResult,
      { status: 502 }
    );
  }
}
