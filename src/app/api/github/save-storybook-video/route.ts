// POST /api/github/save-storybook-video
// Saves (or replaces) storybookVideo on the episode JSON in GitHub.
// Auth: Protected by proxy.ts — requires valid admin cookie.
// Does not delete Blob assets. Does not break existing video/finalVideo fields.

import type { StorybookVideoAsset } from "@/lib/storybookVideoTypes";

type SaveResult =
  | {
      ok: true;
      status: "saved";
      path: string;
      commitMessage: string;
      video: StorybookVideoAsset;
      htmlUrl: string;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "storybook_not_found"
        | "invalid_episode_json"
        | "github_save_failed";
      message: string;
      githubStatus?: number;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

export async function POST(request: Request): Promise<Response> {
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

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies SaveResult,
      { status: 503 }
    );
  }

  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "episodeSlug is required and must be a safe slug." } satisfies SaveResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  const videoData = body.video;
  if (!isRecord(videoData)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "video is required and must be an object." } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (typeof videoData.videoUrl !== "string" || !videoData.videoUrl.startsWith("https://")) {
    return Response.json(
      { ok: false, status: "validation_error", message: "video.videoUrl must be a valid https URL." } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (typeof videoData.mimeType !== "string" || !videoData.mimeType.startsWith("video/")) {
    return Response.json(
      { ok: false, status: "validation_error", message: "video.mimeType must be a video MIME type." } satisfies SaveResult,
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const videoId = (typeof videoData.id === "string" && videoData.id)
    ? videoData.id
    : `storybook-video-${Date.now()}`;

  const video: StorybookVideoAsset = {
    id: videoId,
    title: typeof videoData.title === "string" ? videoData.title : undefined,
    description: typeof videoData.description === "string" ? videoData.description : undefined,
    videoUrl: videoData.videoUrl,
    posterImageUrl: typeof videoData.posterImageUrl === "string" ? videoData.posterImageUrl : undefined,
    pathname: typeof videoData.pathname === "string" ? videoData.pathname : undefined,
    posterPathname: typeof videoData.posterPathname === "string" ? videoData.posterPathname : undefined,
    mimeType: videoData.mimeType,
    sizeBytes: typeof videoData.sizeBytes === "number" ? videoData.sizeBytes : undefined,
    durationSeconds: typeof videoData.durationSeconds === "number" ? videoData.durationSeconds : undefined,
    sourceType: videoData.sourceType === "legacy-generated" || videoData.sourceType === "external-url"
      ? videoData.sourceType
      : "admin-uploaded",
    status: videoData.status === "approved" || videoData.status === "archived" ? videoData.status : "draft",
    visibility: videoData.visibility === "public" ? "public" : "hidden",
    createdAt: typeof videoData.createdAt === "string" ? videoData.createdAt : now,
    updatedAt: now,
  };

  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { method: "GET", headers: ghHeaders });

    if (getRes.status === 404) {
      return Response.json(
        { ok: false, status: "storybook_not_found", message: "Episode file not found in GitHub." } satisfies SaveResult,
        { status: 404 }
      );
    }
    if (!getRes.ok) {
      return Response.json(
        { ok: false, status: "github_save_failed", message: "Failed to fetch episode from GitHub.", githubStatus: getRes.status } satisfies SaveResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_save_failed", message: "GitHub response missing file SHA." } satisfies SaveResult,
        { status: 502 }
      );
    }
    existingSha = fileData.sha;

    const rawContent = typeof fileData.content === "string"
      ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8")
      : "";

    try {
      const parsed: unknown = JSON.parse(rawContent);
      if (!isRecord(parsed)) throw new Error("not an object");
      episode = parsed;
    } catch {
      return Response.json(
        { ok: false, status: "invalid_episode_json", message: "Episode file could not be parsed." } satisfies SaveResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Failed to reach GitHub API." } satisfies SaveResult,
      { status: 502 }
    );
  }

  const episodeTitle = typeof episode.title === "string" ? episode.title : episodeSlug;
  const isReplace = isRecord(episode.storybookVideo);
  const commitMessage = `${isReplace ? "Update" : "Add"} storybook cartoon video: ${episodeTitle}`;

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    storybookVideo: video,
    updatedAt: now,
  };

  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({ message: commitMessage, content: contentBase64, branch, sha: existingSha }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[save-storybook-video] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, status: "github_save_failed", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status } satisfies SaveResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;

    return Response.json(
      {
        ok: true,
        status: "saved",
        path: filePath,
        commitMessage,
        video,
        htmlUrl: getHtmlUrl(putData),
      } satisfies SaveResult,
      { status: 200 }
    );
  } catch {
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Failed to commit video to GitHub." } satisfies SaveResult,
      { status: 502 }
    );
  }
}
