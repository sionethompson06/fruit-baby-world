// POST /api/github/attach-video-clip
// Attaches approved video clip metadata to a scene in an episode JSON in GitHub.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not publish video. Does not generate video. Does not delete Blob assets.
//          Does not modify scene text, panels, audio narration, or publishing flags.
//          Does not accept arbitrary file paths — slug is validated, path is server-controlled.
// Phase:   14E — Attach Approved Video Clip to Episode Scene.

import type { AttachedVideoClipAsset } from "@/lib/videoGenerationTypes";
import { getEpisodeScenes } from "@/lib/episodeScenes";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachVideoResult =
  | {
      ok: true;
      status: "video_clip_attached";
      episodeSlug: string;
      sceneId: string;
      sceneNumber: number;
      path: string;
      commitMessage: string;
      videoClip: AttachedVideoClipAsset;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "invalid_episode_json"
        | "scene_not_found"
        | "archived_scene"
        | "github_error";
      message: string;
      githubStatus?: number;
      targetPath?: string;
      branch?: string;
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

const SAFE_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

const ALLOWED_VIDEO_MIME = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/mpeg",
] as const;

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 8;
}

function safeStr(v: unknown, max = 0): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return max > 0 ? s.slice(0, max) : s;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").slice(0, 1000);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies AttachVideoResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies AttachVideoResult,
      { status: 400 }
    );
  }

  // ── GitHub config ────────────────────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies AttachVideoResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ─────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies AttachVideoResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate scene identifier ────────────────────────────────────────────────
  const sceneIdInput = safeStr(body.sceneId);
  const sceneNumberInput =
    typeof body.sceneNumber === "number" && Number.isFinite(body.sceneNumber) && body.sceneNumber >= 1
      ? Math.floor(body.sceneNumber as number)
      : undefined;

  const hasSceneId = Boolean(sceneIdInput && SAFE_ID_RE.test(sceneIdInput));
  if (!hasSceneId && !sceneNumberInput) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "At least one of sceneId or sceneNumber must be provided.",
      } satisfies AttachVideoResult,
      { status: 400 }
    );
  }

  // ── Validate video object ────────────────────────────────────────────────────
  const video = body.video;
  if (!isRecord(video)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "video is required and must be an object." } satisfies AttachVideoResult,
      { status: 400 }
    );
  }

  if (!isHttpsUrl(video.url)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "video.url must be a non-empty https URL." } satisfies AttachVideoResult,
      { status: 400 }
    );
  }

  const mimeTypeRaw = safeStr(video.mimeType);
  if (!mimeTypeRaw.startsWith("video/")) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `video.mimeType must start with "video/". Got: ${mimeTypeRaw || "(empty)"}`,
      } satisfies AttachVideoResult,
      { status: 400 }
    );
  }
  const mimeType = (ALLOWED_VIDEO_MIME as readonly string[]).includes(mimeTypeRaw)
    ? mimeTypeRaw
    : "video/mp4";

  const rawId = safeStr(video.id);
  const videoId = rawId && SAFE_ID_RE.test(rawId) ? rawId : `video-${Date.now()}`;

  const reviewNotes = video.reviewNotes ? stripHtml(safeStr(video.reviewNotes, 1000)) : "";
  const promptText = safeStr(video.promptText, 4000);

  // ── Build server-controlled file path ────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Fetch existing episode JSON from GitHub ───────────────────────────────────
  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json(
        {
          ok: false,
          status: "episode_not_found",
          message: "Episode file was not found in GitHub content files.",
          targetPath: filePath,
          branch,
        } satisfies AttachVideoResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[attach-video-clip] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to fetch episode file from GitHub.",
          githubStatus: getRes.status,
          targetPath: filePath,
          branch,
        } satisfies AttachVideoResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response was missing file SHA." } satisfies AttachVideoResult,
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
          targetPath: filePath,
        } satisfies AttachVideoResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[attach-video-clip] Network error fetching episode:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies AttachVideoResult,
      { status: 502 }
    );
  }

  // ── Find target scene ────────────────────────────────────────────────────────
  const allScenes = getEpisodeScenes(episode);

  let targetSceneIndex = -1;
  if (hasSceneId) {
    targetSceneIndex = allScenes.findIndex(
      (s) => typeof s.sceneId === "string" && s.sceneId === sceneIdInput
    );
  }
  if (targetSceneIndex === -1 && sceneNumberInput !== undefined) {
    targetSceneIndex = allScenes.findIndex(
      (s) => typeof s.sceneNumber === "number" && s.sceneNumber === sceneNumberInput
    );
  }

  if (targetSceneIndex === -1) {
    return Response.json(
      {
        ok: false,
        status: "scene_not_found",
        message: "Scene was not found for this episode.",
      } satisfies AttachVideoResult,
      { status: 404 }
    );
  }

  const targetScene = allScenes[targetSceneIndex];

  if (typeof targetScene.status === "string" && targetScene.status === "archived") {
    return Response.json(
      {
        ok: false,
        status: "archived_scene",
        message: "Video clips cannot be attached to archived scenes unless the scene is restored.",
      } satisfies AttachVideoResult,
      { status: 422 }
    );
  }

  const resolvedSceneId =
    typeof targetScene.sceneId === "string" ? targetScene.sceneId : sceneIdInput || "";
  const resolvedSceneNumber =
    typeof targetScene.sceneNumber === "number" ? targetScene.sceneNumber : sceneNumberInput ?? 0;

  // ── Build new video clip asset ────────────────────────────────────────────────
  const now = new Date().toISOString();

  const newClip: AttachedVideoClipAsset = {
    id: videoId,
    type: "animated-clip",
    status: "approved",
    provider: safeStr(video.provider) || "fal",
    providerJobId: safeStr(video.providerJobId),
    modelId: safeStr(video.modelId),
    videoStyle: safeStr(video.videoStyle) || "storybook-cartoon",
    durationSeconds:
      typeof video.durationSeconds === "number" ? video.durationSeconds : 6,
    url: video.url as string,
    pathname: safeStr(video.pathname),
    thumbnailUrl: safeStr(video.thumbnailUrl),
    mimeType,
    sizeBytes: typeof video.sizeBytes === "number" ? video.sizeBytes : 0,
    promptText,
    referenceMode: safeStr(video.referenceMode),
    reviewNotes,
    approvedBy: safeStr(video.approvedBy) || "admin",
    approvedAt: safeStr(video.approvedAt) || now,
    attachedAt: now,
    visibility: "admin-only",
  };

  // ── Append to scene.videoClips (preserve existing) ───────────────────────────
  const existingClips = Array.isArray(targetScene.videoClips) ? targetScene.videoClips : [];
  const updatedScene = {
    ...targetScene,
    videoClips: [...existingClips, newClip],
    updatedAt: now,
  };

  // ── Rebuild scenes array with updated scene ───────────────────────────────────
  const updatedScenes = allScenes.map((s, i) => (i === targetSceneIndex ? updatedScene : s));

  // ── Build updated episode (preserve all other fields) ────────────────────────
  const scenesKey = Array.isArray(episode.sceneBreakdown) ? "sceneBreakdown" : "scenes";
  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    [scenesKey]: updatedScenes,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const commitMessage = `Attach video clip to scene ${resolvedSceneNumber}: ${episodeTitle}`;
  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch,
        sha: existingSha,
      }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[attach-video-clip] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
          githubStatus: putRes.status,
          targetPath: filePath,
          branch,
        } satisfies AttachVideoResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "video_clip_attached",
        episodeSlug,
        sceneId: resolvedSceneId,
        sceneNumber: resolvedSceneNumber,
        path: filePath,
        commitMessage,
        videoClip: newClip,
        htmlUrl,
        notes: [
          "Approved video clip metadata was attached to the episode scene.",
          "The video is not public yet.",
          "Public video playback will be added in a future phase.",
          "Vercel redeploy is required before the attached video appears everywhere.",
        ],
      } satisfies AttachVideoResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[attach-video-clip] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the updated episode file to GitHub." } satisfies AttachVideoResult,
      { status: 502 }
    );
  }
}
