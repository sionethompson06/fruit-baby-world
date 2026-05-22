// POST /api/media/save-selected-background-layer
// Saves a selected official Environment/Home Reference asset as a background layer.
// Duplicates/copies the official reference image into the episode's background layer storage.
// 
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not modify the original reference asset. Creates a duplicate in episode storage.
//          Background layers are admin-only and never public.
// Phase:   18E.4 — Select Official Environment Background Layer

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";
import type { EpisodeSceneBackgroundLayer } from "@/lib/storyPanelBackgroundTypes";
import { validateSlug } from "@/lib/storyPanelImageGeneration";
import type { SelectableEnvironmentBackground } from "@/lib/storyPanelEnvironmentReferences";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveResult =
  | {
      ok: true;
      status: "selected_background_saved";
      backgroundLayer: EpisodeSceneBackgroundLayer;
      path: string;
      commitMessage: string;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "validation_error"
        | "setup_required"
        | "invalid_background_data"
        | "invalid_image_url"
        | "image_copy_failed"
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
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies SaveResult,
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
        message:
          "GitHub saving is not configured. Add GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH to Vercel environment variables.",
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
        message:
          "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
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

  // ── Optional sceneId ──────────────────────────────────────────────────────────
  const sceneId =
    typeof body.sceneId === "string" && body.sceneId.trim().length > 0
      ? body.sceneId.trim()
      : undefined;

  // ── Validate selectedBackground ──────────────────────────────────────────────
  const selectedBg = body.selectedBackground;
  if (
    !isRecord(selectedBg) ||
    typeof selectedBg.id !== "string" ||
    typeof selectedBg.imageUrl !== "string" ||
    !selectedBg.imageUrl.startsWith("https://")
  ) {
    return Response.json(
      {
        ok: false,
        status: "invalid_background_data",
        message:
          "selectedBackground must have valid id and imageUrl (https:// URL) fields.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  const backgroundId = selectedBg.id as string;
  const backgroundImageUrl = selectedBg.imageUrl as string;
  const backgroundTitle =
    typeof selectedBg.title === "string" ? selectedBg.title : "Official Environment Reference";
  const characterSlug = typeof selectedBg.characterSlug === "string" ? selectedBg.characterSlug : undefined;
  const characterName = typeof selectedBg.characterName === "string" ? selectedBg.characterName : undefined;
  const role = typeof selectedBg.role === "string" ? selectedBg.role : "environment";

  // ── Fetch and copy the official reference image ─────────────────────────────
  console.info(
    `[save-selected-background-layer] Fetching official background from ${backgroundImageUrl}`
  );

  let imageBuffer: Buffer;
  let detectedMimeType: AllowedMime = "image/png";

  try {
    const fetchRes = await fetch(backgroundImageUrl);
    if (!fetchRes.ok) {
      return Response.json(
        {
          ok: false,
          status: "image_copy_failed",
          message: `Could not fetch official background image (HTTP ${fetchRes.status}). The reference URL may have expired.`,
        } satisfies SaveResult,
        { status: 400 }
      );
    }

    // Detect MIME type from response headers
    const contentType = fetchRes.headers.get("content-type");
    if (isAllowedMime(contentType)) {
      detectedMimeType = contentType;
    }

    imageBuffer = Buffer.from(await fetchRes.arrayBuffer());

    if (imageBuffer.length === 0) {
      return Response.json(
        {
          ok: false,
          status: "image_copy_failed",
          message: "Official background image could not be fetched or is empty.",
        } satisfies SaveResult,
        { status: 400 }
      );
    }
  } catch (err) {
    console.error(
      "[save-selected-background-layer] Failed to fetch background:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "image_copy_failed",
        message: "Failed to fetch the official background image. The URL may have expired.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  // ── Upload duplicated image to Vercel Blob ─────────────────────────────────
  const ext = MIME_EXTENSIONS[detectedMimeType];
  const storagePath = `episodes/${episodeSlug}/background-layers/scene-${sceneNumber}/official-background-${Date.now()}.${ext}`;

  console.info(
    `[save-selected-background-layer] Uploading duplicated image (~${Math.round(imageBuffer.length / 1024)}KB) to ${storagePath}`
  );

  let blobUrl: string;
  let blobPathname: string;

  try {
    const blob = await put(storagePath, imageBuffer, {
      access: "public",
      contentType: detectedMimeType,
      token: blobToken,
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
  } catch (err) {
    const safeMsg = (() => {
      if (
        err instanceof BlobAccessError ||
        err instanceof BlobClientTokenExpiredError
      )
        return "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN.";
      if (err instanceof BlobStoreNotFoundError)
        return "Vercel Blob store not found. Recreate it in the Vercel dashboard.";
      if (err instanceof BlobStoreSuspendedError)
        return "Vercel Blob store is suspended. Check Vercel account status.";
      if (err instanceof BlobFileTooLargeError)
        return "Background image is too large for Vercel Blob.";
      if (err instanceof BlobError) return `Vercel Blob error: ${err.message}`;
      return "Blob upload failed. Check storage configuration.";
    })();
    console.error(
      "[save-selected-background-layer] Blob upload failed:",
      err instanceof Error ? err.message : err
    );
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
      console.error(
        `[save-selected-background-layer] GitHub GET failed (${getRes.status})`
      );
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
        ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString(
            "utf-8"
          )
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
    if (err instanceof Error && (err as unknown as Record<string, unknown>).body)
      throw err;
    console.error(
      "[save-selected-background-layer] Network error fetching episode:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_save_failed",
        message: "Failed to reach the GitHub API.",
      } satisfies SaveResult,
      { status: 502 }
    );
  }

  // ── Find scene and add backgroundLayer ───────────────────────────────────────
  const sceneArr = (() => {
    const sb = episode.sceneBreakdown;
    const sc = episode.scenes;
    const arr =
      Array.isArray(sb) && sb.length > 0 ? sb : Array.isArray(sc) ? sc : [];
    return arr.filter(isRecord);
  })();

  const sceneIdx = sceneArr.findIndex((s) => {
    if (sceneId && typeof s.sceneId === "string" && s.sceneId === sceneId)
      return true;
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

  const backgroundLayer: EpisodeSceneBackgroundLayer & {
    sourceType?: string;
    originalReferenceId?: string;
    originalReferenceTitle?: string;
    originalReferenceCharacterSlug?: string;
    originalReferenceImageUrl?: string;
  } = {
    id: `bg-layer-${Date.now()}`,
    type: "background-layer",
    status: "saved",
    visibility: "admin-only",
    imageUrl: blobUrl,
    pathname: blobPathname,
    mimeType: detectedMimeType,
    createdAt: now,
    updatedAt: now,
    sourceType: "selected-official-environment-reference",
    originalReferenceId: backgroundId,
    originalReferenceTitle: backgroundTitle,
    originalReferenceCharacterSlug: characterSlug,
    originalReferenceImageUrl: backgroundImageUrl,
  };

  // Mutate the scene in the array
  const updatedScene = { ...sceneArr[sceneIdx] };
  const existingLayers: unknown[] = Array.isArray(updatedScene.backgroundLayers)
    ? updatedScene.backgroundLayers
    : [];
  updatedScene.backgroundLayers = [...existingLayers, backgroundLayer];

  // Rebuild the scene array
  const sceneKey = Array.isArray(episode.sceneBreakdown)
    ? "sceneBreakdown"
    : "scenes";
  const updatedSceneArr = [...sceneArr];
  updatedSceneArr[sceneIdx] = updatedScene;

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    [sceneKey]: updatedSceneArr,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const commitMessage = `Select official background: ${episodeTitle} scene ${sceneNumber} (${backgroundTitle})`;

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
      console.error(
        `[save-selected-background-layer] GitHub PUT failed (${putRes.status}):`,
        errBody.slice(0, 200)
      );
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
      `[save-selected-background-layer] Saved selected background to ${filePath}, scene ${sceneNumber}`
    );

    return Response.json(
      {
        ok: true,
        status: "selected_background_saved",
        backgroundLayer: backgroundLayer as EpisodeSceneBackgroundLayer,
        path: filePath,
        commitMessage,
        htmlUrl,
        notes: [
          "Official background duplicated and saved as admin-only scene asset.",
          `Original reference "${backgroundTitle}" preserved.`,
          "Background layer is not a story panel and will not appear publicly.",
          "Future phases will generate character layers and assemble them onto this background.",
        ],
      } satisfies SaveResult,
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[save-selected-background-layer] Network error committing file:",
      err instanceof Error ? err.message : err
    );
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
