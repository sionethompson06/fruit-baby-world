// POST /api/generate-story-panel-image/refine
// Protected route: applies a small edit to the current temporary story panel draft.
// Uses the current draft image as the base and applies only the admin's edit instruction.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not save, upload, attach, or publish automatically.
//          Does not expose secrets or stack traces.

import OpenAI from "openai";
import { put } from "@vercel/blob";
import { buildRefineCurrentDraftPrompt } from "@/lib/storyPanelFidelityRules";
import {
  getFalRefineModelId,
  getFalApiKey,
  isProductionProviderConfigured,
  getDraftModelId,
  type StoryPanelProvider,
} from "@/lib/storyPanelImageProvider";
import { PROVIDER_PROMPT_HARD_LIMIT } from "@/lib/storyPanelPromptCompactor";

// ─── Constants ────────────────────────────────────────────────────────────────

const REFINE_INSTRUCTION_MAX = 800;

// ─── Types ────────────────────────────────────────────────────────────────────

type RefineResult =
  | {
      ok: true;
      status: "refined";
      image: { mimeType: string; base64?: string; url?: string };
      refineInstruction: string;
      refineInstructionPreview: string;
      provider: StoryPanelProvider;
      modelId: string;
      refinedFromPreviousDraft: true;
      refinementCreatedAt: string;
      refinePromptLength: number;
      wasCompacted: boolean;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "missing_current_draft"
        | "setup_required"
        | "provider_error"
        | "provider_timeout"
        | "image_upload_failed"
        | "image_download_failed"
        | "image_response_parse_error";
      message: string;
      troubleshooting?: string[];
      provider?: StoryPanelProvider;
      modelId?: string;
    };

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 8;
}

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME as readonly string[]).includes(v);
}

function mimeToExt(mime: AllowedMime): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return "png";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies RefineResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies RefineResult,
      { status: 400 }
    );
  }

  // ── Validate refineInstruction ───────────────────────────────────────────────
  const rawInstruction = body.refineInstruction;
  if (typeof rawInstruction !== "string" || !rawInstruction.trim()) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Enter a short edit instruction before refining the current draft.",
      } satisfies RefineResult,
      { status: 400 }
    );
  }

  const refineInstruction = rawInstruction.replace(/<[^>]*>/g, "").trim();
  if (refineInstruction.length > REFINE_INSTRUCTION_MAX) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `Edit instruction must be ${REFINE_INSTRUCTION_MAX} characters or fewer.`,
      } satisfies RefineResult,
      { status: 400 }
    );
  }

  // ── Extract image inputs ─────────────────────────────────────────────────────
  const currentDraftImageBase64 =
    typeof body.currentDraftImageBase64 === "string" && body.currentDraftImageBase64.length > 10
      ? body.currentDraftImageBase64
      : null;

  const currentDraftImageUrl = isHttpsUrl(body.currentDraftImageUrl)
    ? (body.currentDraftImageUrl as string)
    : null;

  const mimeType: AllowedMime = isAllowedMime(body.currentDraftMimeType)
    ? body.currentDraftMimeType
    : "image/png";

  if (!currentDraftImageBase64 && !currentDraftImageUrl) {
    return Response.json(
      {
        ok: false,
        status: "missing_current_draft",
        message: "No current draft image is available to refine. Generate a panel draft first.",
      } satisfies RefineResult,
      { status: 400 }
    );
  }

  // ── Character slugs ───────────────────────────────────────────────────────────
  const characterSlugs: string[] = Array.isArray(body.characterSlugs)
    ? (body.characterSlugs as unknown[]).filter((s): s is string => typeof s === "string")
    : [];

  // ── Build refine prompt ───────────────────────────────────────────────────────
  const fullRefinePrompt = buildRefineCurrentDraftPrompt({ refineInstruction, characterSlugs });
  const wasCompacted = fullRefinePrompt.length > PROVIDER_PROMPT_HARD_LIMIT;
  const refinePrompt = wasCompacted
    ? fullRefinePrompt.slice(0, PROVIDER_PROMPT_HARD_LIMIT - 40) + "\nPreserve image. Apply edit only."
    : fullRefinePrompt;

  // ── Provider selection ────────────────────────────────────────────────────────
  const falApiKey = getFalApiKey();
  const falConfigured = isProductionProviderConfigured();
  const openAiKey = process.env.OPENAI_API_KEY;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  // Resolve image URL for Fal — prefers existing HTTPS URL, then Blob upload
  let imageUrlForFal: string | null = currentDraftImageUrl;

  if (falConfigured && !imageUrlForFal && currentDraftImageBase64 && blobToken) {
    try {
      const imageBuffer = Buffer.from(currentDraftImageBase64, "base64");
      const blob = await put(
        `refine-temp/${Date.now()}.${mimeToExt(mimeType)}`,
        imageBuffer,
        { access: "public", contentType: mimeType, token: blobToken }
      );
      imageUrlForFal = blob.url;
      console.log("[refine] Uploaded draft to Blob for Fal:", imageUrlForFal);
    } catch (uploadErr) {
      const msg = uploadErr instanceof Error ? uploadErr.message : String(uploadErr);
      console.warn("[refine] Blob upload failed, will fall through to OpenAI:", msg);
      imageUrlForFal = null;
    }
  }

  const useFal = falConfigured && Boolean(falApiKey) && imageUrlForFal !== null;
  const useOpenAI = !useFal && Boolean(openAiKey) && currentDraftImageBase64 !== null;

  // ══════════════════════════════════════════════════════════════════════════════
  // FAL.AI PATH
  // ══════════════════════════════════════════════════════════════════════════════
  if (useFal && falApiKey && imageUrlForFal) {
    const modelId = getFalRefineModelId();
    const provider: StoryPanelProvider = "fal";

    console.log(`[refine] Fal path: model=${modelId}, promptLen=${refinePrompt.length}`);

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
          prompt: refinePrompt,
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
            ? "Refinement timed out — Fal.ai took too long. Try again."
            : "Refinement failed — could not reach Fal.ai.",
          provider,
          modelId,
          troubleshooting: ["Try again — the provider may be temporarily unavailable."],
        } satisfies RefineResult,
        { status: 502 }
      );
    }
    clearTimeout(timeout);

    if (!falResp.ok) {
      const errText = await falResp.text().catch(() => "");
      console.error(`[refine] Fal error (${falResp.status}):`, errText.slice(0, 200));
      return Response.json(
        {
          ok: false,
          status: "provider_error",
          message: `Refinement failed — Fal.ai returned ${falResp.status}.`,
          provider,
          modelId,
          troubleshooting: [
            "Try a simpler edit instruction.",
            "Try again — Fal.ai may be temporarily unavailable.",
          ],
        } satisfies RefineResult,
        { status: 502 }
      );
    }

    const falData = (await falResp.json()) as Record<string, unknown>;
    const firstImage =
      (Array.isArray(falData.images) ? falData.images[0] : null) ??
      (isRecord(falData.image) ? falData.image : null);
    const falImageUrl =
      typeof (firstImage as Record<string, unknown> | null)?.url === "string"
        ? (firstImage as Record<string, unknown>).url as string
        : typeof falData.url === "string"
        ? falData.url
        : undefined;

    if (!falImageUrl) {
      return Response.json(
        {
          ok: false,
          status: "image_response_parse_error",
          message: "Fal.ai returned a response but no refined image URL was found.",
          provider,
          modelId,
        } satisfies RefineResult,
        { status: 502 }
      );
    }

    // Download and convert to base64
    let b64: string;
    try {
      const imgResp = await fetch(falImageUrl);
      if (!imgResp.ok) throw new Error(`HTTP ${imgResp.status}`);
      const imgBuffer = await imgResp.arrayBuffer();
      b64 = Buffer.from(imgBuffer).toString("base64");
    } catch (dlErr) {
      const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
      console.error("[refine] Failed to download Fal result:", msg);
      return Response.json(
        {
          ok: false,
          status: "image_download_failed",
          message: "Refinement image was generated but could not be downloaded from Fal.ai.",
          provider,
          modelId,
        } satisfies RefineResult,
        { status: 502 }
      );
    }

    return Response.json(
      {
        ok: true,
        status: "refined",
        image: { mimeType, base64: b64, url: falImageUrl },
        refineInstruction,
        refineInstructionPreview: refineInstruction.slice(0, 120),
        provider,
        modelId,
        refinedFromPreviousDraft: true,
        refinementCreatedAt: new Date().toISOString(),
        refinePromptLength: refinePrompt.length,
        wasCompacted,
      } satisfies RefineResult,
      { status: 200 }
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // OPENAI PATH
  // ══════════════════════════════════════════════════════════════════════════════
  if (!useOpenAI || !openAiKey || !currentDraftImageBase64) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: falConfigured
          ? "Production Mode is configured but the current draft image URL is not available for refinement. Add BLOB_READ_WRITE_TOKEN to enable base64→URL upload, or generate a Production Mode draft first."
          : "No image provider is configured for refinement. Add FAL_KEY for Production Mode or OPENAI_API_KEY for Draft Mode in Vercel environment variables.",
        troubleshooting: [
          "Add FAL_KEY for Fal.ai Production Mode refinement.",
          "Add OPENAI_API_KEY for OpenAI Draft Mode refinement.",
          "Redeploy after adding environment variables.",
        ],
      } satisfies RefineResult,
      { status: 503 }
    );
  }

  const openai = new OpenAI({ apiKey: openAiKey });
  const draftModelId = getDraftModelId();
  const provider: StoryPanelProvider = "openai";

  console.log(`[refine] OpenAI path: model=${draftModelId}, promptLen=${refinePrompt.length}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const imageBuffer = Buffer.from(currentDraftImageBase64, "base64");
    const imageFile = new File(
      [imageBuffer],
      `draft.${mimeToExt(mimeType)}`,
      { type: mimeType }
    );

    const editResponse = await openai.images.edit({
      model: draftModelId,
      image: imageFile,
      prompt: refinePrompt,
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
          message: "OpenAI returned a response but no refined image data was found.",
          provider,
          modelId: draftModelId,
        } satisfies RefineResult,
        { status: 502 }
      );
    }

    return Response.json(
      {
        ok: true,
        status: "refined",
        image: { mimeType, base64: b64, url: resultUrl },
        refineInstruction,
        refineInstructionPreview: refineInstruction.slice(0, 120),
        provider,
        modelId: draftModelId,
        refinedFromPreviousDraft: true,
        refinementCreatedAt: new Date().toISOString(),
        refinePromptLength: refinePrompt.length,
        wasCompacted,
      } satisfies RefineResult,
      { status: 200 }
    );
  } catch (err) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[refine] OpenAI edit error:", errMsg);
    return Response.json(
      {
        ok: false,
        status: isAbort ? "provider_timeout" : "provider_error",
        message: isAbort
          ? "Refinement timed out — OpenAI took too long. Try again."
          : `Refinement failed — OpenAI error: ${errMsg.slice(0, 200)}`,
        provider,
        modelId: draftModelId,
        troubleshooting: [
          "Try a simpler or shorter edit instruction.",
          "Try again — the provider may be temporarily unavailable.",
        ],
      } satisfies RefineResult,
      { status: 502 }
    );
  }
}
