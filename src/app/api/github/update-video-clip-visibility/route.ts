// POST /api/github/update-video-clip-visibility
// Updates only the visibility field on a specific attached video clip in a scene.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only updates visibility + visibilityUpdatedAt on one clip.
//          Does not delete clips, modify other clip fields, change scenes, or modify
//          any other episode data. Does not delete Blob assets.
// Phase:   14F — Public Animated Short Display.

// ─── Types ────────────────────────────────────────────────────────────────────

const ALLOWED_VISIBILITY = ["admin-only", "public-ready", "hidden"] as const;
type VideoVisibility = (typeof ALLOWED_VISIBILITY)[number];

type UpdateResult =
  | {
      ok: true;
      status: "visibility_updated";
      episodeSlug: string;
      sceneId: string;
      videoClipId: string;
      visibility: VideoVisibility;
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
        | "episode_not_found"
        | "invalid_episode_json"
        | "scene_not_found"
        | "clip_not_found"
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

function isAllowedVisibility(v: unknown): v is VideoVisibility {
  return typeof v === "string" && (ALLOWED_VISIBILITY as readonly string[]).includes(v);
}

function safeStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UpdateResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UpdateResult,
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
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies UpdateResult,
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
      } satisfies UpdateResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate sceneId ─────────────────────────────────────────────────────────
  const sceneId = safeStr(body.sceneId);
  if (!sceneId || !SAFE_ID_RE.test(sceneId)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "sceneId is required and must be a valid ID." } satisfies UpdateResult,
      { status: 400 }
    );
  }

  // ── Validate videoClipId ─────────────────────────────────────────────────────
  const videoClipId = safeStr(body.videoClipId);
  if (!videoClipId || !SAFE_ID_RE.test(videoClipId)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "videoClipId is required and must be a valid ID." } satisfies UpdateResult,
      { status: 400 }
    );
  }

  // ── Validate visibility ──────────────────────────────────────────────────────
  if (!isAllowedVisibility(body.visibility)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: 'visibility must be one of: "admin-only", "public-ready", "hidden".',
      } satisfies UpdateResult,
      { status: 400 }
    );
  }
  const newVisibility: VideoVisibility = body.visibility;

  // ── File path ────────────────────────────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Fetch episode JSON ────────────────────────────────────────────────────────
  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json(
        { ok: false, status: "episode_not_found", message: "Episode file was not found.", targetPath: filePath, branch } satisfies UpdateResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[update-video-clip-visibility] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to fetch episode file from GitHub.", githubStatus: getRes.status, targetPath: filePath, branch } satisfies UpdateResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response was missing file SHA." } satisfies UpdateResult,
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
        { ok: false, status: "invalid_episode_json", message: "Episode file could not be parsed as JSON.", targetPath: filePath } satisfies UpdateResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[update-video-clip-visibility] Network error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateResult,
      { status: 502 }
    );
  }

  // ── Find scene ───────────────────────────────────────────────────────────────
  const scenesKey = Array.isArray(episode.sceneBreakdown) ? "sceneBreakdown" : "scenes";
  const rawScenes = Array.isArray(episode[scenesKey]) ? (episode[scenesKey] as unknown[]) : [];
  const sceneIndex = rawScenes.findIndex(
    (s) => isRecord(s) && typeof s.sceneId === "string" && s.sceneId === sceneId
  );

  if (sceneIndex === -1) {
    return Response.json(
      { ok: false, status: "scene_not_found", message: `Scene with sceneId "${sceneId}" was not found in this episode.` } satisfies UpdateResult,
      { status: 404 }
    );
  }

  const scene = rawScenes[sceneIndex] as Record<string, unknown>;

  // ── Find clip ────────────────────────────────────────────────────────────────
  const existingClips = Array.isArray(scene.videoClips) ? (scene.videoClips as unknown[]) : [];
  const clipIndex = existingClips.findIndex(
    (c) => isRecord(c) && typeof c.id === "string" && c.id === videoClipId
  );

  if (clipIndex === -1) {
    return Response.json(
      { ok: false, status: "clip_not_found", message: `Video clip "${videoClipId}" was not found in scene "${sceneId}".` } satisfies UpdateResult,
      { status: 404 }
    );
  }

  // ── Update clip visibility only ───────────────────────────────────────────────
  const now = new Date().toISOString();
  const existingClip = existingClips[clipIndex] as Record<string, unknown>;
  const updatedClip = { ...existingClip, visibility: newVisibility, visibilityUpdatedAt: now };

  const updatedClips = existingClips.map((c, i) => (i === clipIndex ? updatedClip : c));
  const updatedScene = { ...scene, videoClips: updatedClips, updatedAt: now };
  const updatedScenes = rawScenes.map((s, i) => (i === sceneIndex ? updatedScene : s));

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    [scenesKey]: updatedScenes,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0 ? episode.title : episodeSlug;

  const commitMessage = `Update video clip visibility to ${newVisibility}: ${episodeTitle}`;
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
      console.error(`[update-video-clip-visibility] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status, targetPath: filePath, branch } satisfies UpdateResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    const notes: string[] = [`Video clip visibility updated to "${newVisibility}".`];
    if (newVisibility === "public-ready") {
      notes.push("This clip will appear on the public story page after Vercel redeploy.");
    } else if (newVisibility === "admin-only") {
      notes.push("Clip is now admin-only and will not appear on the public story page.");
    } else if (newVisibility === "hidden") {
      notes.push("Clip is now hidden and will not appear publicly or in standard admin views.");
    }

    return Response.json(
      {
        ok: true,
        status: "visibility_updated",
        episodeSlug,
        sceneId,
        videoClipId,
        visibility: newVisibility,
        path: filePath,
        commitMessage,
        htmlUrl,
        notes,
      } satisfies UpdateResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[update-video-clip-visibility] Network error committing:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the updated episode file to GitHub." } satisfies UpdateResult,
      { status: 502 }
    );
  }
}
