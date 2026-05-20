// POST /api/media/save-character-layer
// Uploads a character layer draft image to Vercel Blob and attaches the
// metadata to the episode scene's characterLayers[] in GitHub JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Character layers are admin-only and never public.
//          They are NOT story panel assets and do not affect story panel display.
// Phase:   18D.11 — Scene-Aware Per-Character Production Layer Rendering

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";
import type { EpisodeSceneCharacterLayer } from "@/lib/storyPanelBackgroundTypes";
import { validateSlug } from "@/lib/storyPanelImageGeneration";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveResult =
  | {
      ok: true;
      status: "character_layer_saved";
      characterLayer: EpisodeSceneCharacterLayer;
      path: string;
      commitMessage: string;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "missing_character_image"
        | "blob_upload_failed"
        | "github_save_failed"
        | "episode_not_found"
        | "scene_not_found"
        | "invalid_episode_json";
      message: string;
      details?: Record<string, unknown>;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME as readonly string[]).includes(v);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies SaveResult,
      { status: 400 }
    );
  }

  // ── Check env config ──────────────────────────────────────────────────────────
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Media storage is not configured. Add BLOB_READ_WRITE_TOKEN to Vercel environment variables.",
      } satisfies SaveResult,
      { status: 503 }
    );
  }

  const ghToken = process.env.GITHUB_TOKEN;
  const ghOwner = process.env.GITHUB_OWNER;
  const ghRepo = process.env.GITHUB_REPO;
  const ghBranch = process.env.GITHUB_BRANCH;

  if (!ghToken || !ghOwner || !ghRepo || !ghBranch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH to Vercel environment variables.",
      } satisfies SaveResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ──────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies SaveResult,
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
      } satisfies SaveResult,
      { status: 400 }
    );
  }
  const sceneNumber = body.sceneNumber as number;

  // ── Validate characterSlug ────────────────────────────────────────────────────
  if (!validateSlug(body.characterSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "characterSlug is required and must be a safe slug.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug as string;

  const characterName =
    typeof body.characterName === "string" && body.characterName.trim().length > 0
      ? body.characterName.trim()
      : characterSlug;

  const sceneId =
    typeof body.sceneId === "string" && body.sceneId.trim().length > 0
      ? body.sceneId.trim()
      : undefined;

  // ── Resolve MIME type ──────────────────────────────────────────────────────────
  const rawMime = body.mimeType ?? "image/png";
  const mimeType: AllowedMime = isAllowedMime(rawMime) ? rawMime : "image/png";
  const ext = MIME_EXTENSIONS[mimeType];

  // ── Resolve image bytes from base64 or URL ────────────────────────────────────
  let imageBuffer: Buffer | null = null;
  let sourceType: "base64" | "url-fetch" = "base64";

  if (typeof body.imageBase64 === "string" && body.imageBase64.trim().length > 0) {
    const raw = body.imageBase64.trim();
    const stripped = raw.startsWith("data:") ? raw.split(",")[1] ?? raw : raw;
    try {
      imageBuffer = Buffer.from(stripped, "base64");
    } catch {
      return Response.json(
        {
          ok: false,
          status: "missing_character_image",
          message: "imageBase64 could not be decoded. Regenerate the character layer draft and try again.",
        } satisfies SaveResult,
        { status: 400 }
      );
    }
    if (imageBuffer.length === 0) {
      return Response.json(
        {
          ok: false,
          status: "missing_character_image",
          message: "imageBase64 decoded to an empty buffer. Regenerate and try again.",
        } satisfies SaveResult,
        { status: 400 }
      );
    }
  } else if (typeof body.imageUrl === "string" && body.imageUrl.startsWith("https://")) {
    sourceType = "url-fetch";
    try {
      const fetchRes = await fetch(body.imageUrl);
      if (!fetchRes.ok) {
        return Response.json(
          {
            ok: false,
            status: "missing_character_image",
            message: `Could not fetch character image from provider URL (HTTP ${fetchRes.status}). Regenerate and try again.`,
          } satisfies SaveResult,
          { status: 400 }
        );
      }
      imageBuffer = Buffer.from(await fetchRes.arrayBuffer());
    } catch {
      return Response.json(
        {
          ok: false,
          status: "missing_character_image",
          message: "Could not fetch character image from provider URL. The URL may have expired — regenerate and try again.",
        } satisfies SaveResult,
        { status: 400 }
      );
    }
  } else {
    return Response.json(
      {
        ok: false,
        status: "missing_character_image",
        message: "Either imageBase64 or imageUrl must be provided.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  // ── Upload image to Vercel Blob ────────────────────────────────────────────────
  const storagePath = `episodes/${episodeSlug}/character-layers/scene-${sceneNumber}/${characterSlug}-${Date.now()}.${ext}`;

  console.info(
    `[save-character-layer] Uploading ${mimeType} (~${Math.round(imageBuffer.length / 1024)}KB) via ${sourceType} to ${storagePath}`
  );

  let blobUrl: string;
  let blobPathname: string;

  try {
    const blob = await put(storagePath, imageBuffer, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
  } catch (err) {
    const safeMsg = (() => {
      if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError)
        return "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN.";
      if (err instanceof BlobStoreNotFoundError)
        return "Vercel Blob store not found. Recreate it in the Vercel dashboard.";
      if (err instanceof BlobStoreSuspendedError)
        return "Vercel Blob store is suspended. Check Vercel account status.";
      if (err instanceof BlobFileTooLargeError)
        return "Character layer image is too large for Vercel Blob. Try regenerating.";
      if (err instanceof BlobError) return `Vercel Blob error: ${err.message}`;
      return "Blob upload failed. Check storage configuration.";
    })();
    console.error("[save-character-layer] Blob upload failed:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "blob_upload_failed", message: safeMsg } satisfies SaveResult,
      { status: 502 }
    );
  }

  // ── Load episode JSON from GitHub ─────────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string;
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
        } satisfies SaveResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[save-character-layer] GitHub GET failed (${getRes.status})`);
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: `Failed to fetch episode from GitHub (HTTP ${getRes.status}).`,
        } satisfies SaveResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: "GitHub response was missing file SHA.",
        } satisfies SaveResult,
        { status: 502 }
      );
    }
    existingSha = fileData.sha;

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
        } satisfies SaveResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Error && (err as unknown as Record<string, unknown>).body) throw err;
    console.error("[save-character-layer] Network error fetching episode:", err instanceof Error ? err.message : err);
    return Response.json(
      {
        ok: false,
        status: "github_save_failed",
        message: "Failed to reach the GitHub API.",
      } satisfies SaveResult,
      { status: 502 }
    );
  }

  // ── Find scene and add characterLayer ─────────────────────────────────────────
  const sceneArr = (() => {
    const sb = episode.sceneBreakdown;
    const sc = episode.scenes;
    const arr = Array.isArray(sb) && sb.length > 0 ? sb : Array.isArray(sc) ? sc : [];
    return arr.filter(isRecord);
  })();

  const sceneIdx = sceneArr.findIndex((s) => {
    if (sceneId && typeof s.sceneId === "string" && s.sceneId === sceneId) return true;
    return typeof s.sceneNumber === "number" && s.sceneNumber === sceneNumber;
  });

  if (sceneIdx === -1) {
    return Response.json(
      {
        ok: false,
        status: "scene_not_found",
        message: `Scene ${sceneNumber} was not found in episode ${episodeSlug}.`,
      } satisfies SaveResult,
      { status: 404 }
    );
  }

  const now = new Date().toISOString();

  const characterLayer: EpisodeSceneCharacterLayer = {
    id: `char-layer-${Date.now()}`,
    type: "character-layer",
    status: "saved",
    visibility: "admin-only",
    characterSlug,
    characterName,
    imageUrl: blobUrl,
    pathname: blobPathname,
    mimeType,
    provider: typeof body.provider === "string" ? body.provider : undefined,
    modelId: typeof body.modelId === "string" ? body.modelId : undefined,
    promptText: typeof body.promptText === "string" ? body.promptText.slice(0, 2000) : undefined,
    placement: typeof body.placement === "string" ? body.placement : undefined,
    emotion: typeof body.emotion === "string" ? body.emotion : undefined,
    action: typeof body.action === "string" ? body.action : undefined,
    facingDirection: typeof body.facingDirection === "string" ? body.facingDirection : undefined,
    interactionTargetSlug:
      body.interactionTargetSlug === null || typeof body.interactionTargetSlug === "string"
        ? (body.interactionTargetSlug as string | null)
        : undefined,
    assemblyPlanId: typeof body.assemblyPlanId === "string" ? body.assemblyPlanId : undefined,
    createdAt: now,
    updatedAt: now,
  };

  // Mutate the scene in the array
  const updatedScene = { ...sceneArr[sceneIdx] };
  const existingLayers: unknown[] = Array.isArray(updatedScene.characterLayers)
    ? updatedScene.characterLayers
    : [];
  updatedScene.characterLayers = [...existingLayers, characterLayer];

  // Rebuild the scene array
  const sceneKey = Array.isArray(episode.sceneBreakdown) ? "sceneBreakdown" : "scenes";
  const updatedSceneArr = [...sceneArr];
  updatedSceneArr[sceneIdx] = updatedScene;

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    [sceneKey]: updatedSceneArr,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0 ? episode.title : episodeSlug;

  const commitMessage = `Add character layer: ${episodeTitle} scene ${sceneNumber} — ${characterName}`;

  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch: ghBranch,
        sha: existingSha,
      }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[save-character-layer] GitHub PUT failed (${putRes.status}):`, errBody.slice(0, 200));
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: `GitHub commit failed with status ${putRes.status}.`,
        } satisfies SaveResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    console.info(
      `[save-character-layer] Saved character layer for ${characterSlug} to ${filePath}, scene ${sceneNumber}`
    );

    return Response.json(
      {
        ok: true,
        status: "character_layer_saved",
        characterLayer,
        path: filePath,
        commitMessage,
        htmlUrl,
        notes: [
          `Character layer for ${characterName} saved as admin-only scene asset.`,
          "It is not a story panel and will not appear publicly.",
          "Future phases will composite character layers onto the background.",
        ],
      } satisfies SaveResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[save-character-layer] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      {
        ok: false,
        status: "github_save_failed",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies SaveResult,
      { status: 502 }
    );
  }
}
