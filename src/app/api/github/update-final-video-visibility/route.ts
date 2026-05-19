// POST /api/github/update-final-video-visibility
// Updates only the finalVideo.visibility field on a saved episode JSON in GitHub.
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only updates visibility. Does not modify scenes, panels, characters, or
//          any other episode field. Does not delete Blob assets.
// Phase:   15F — Final Video Visibility Controls + Public Full Video Story Display.

const ALLOWED_VISIBILITY = ["admin-only", "public-ready", "hidden"] as const;
type FinalVideoVisibility = (typeof ALLOWED_VISIBILITY)[number];

type UpdateResult =
  | {
      ok: true;
      status: "final_video_visibility_updated";
      episodeSlug: string;
      visibility: FinalVideoVisibility;
      finalVideo: Record<string, unknown>;
      path: string;
      commitMessage: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "final_video_not_found"
        | "github_save_failed";
      message: string;
      githubStatus?: number;
      targetPath?: string;
      branch?: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG_RE.test(normalized);
}

function isAllowedVisibility(v: unknown): v is FinalVideoVisibility {
  return typeof v === "string" && (ALLOWED_VISIBILITY as readonly string[]).includes(v);
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
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UpdateResult, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UpdateResult, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json({ ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies UpdateResult, { status: 503 });
  }

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
  const newVisibility = body.visibility as FinalVideoVisibility;

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
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json({ ok: false, status: "episode_not_found", message: "Episode file was not found in GitHub content files.", targetPath: filePath, branch } satisfies UpdateResult, { status: 404 });
    }

    if (!getRes.ok) {
      console.error(`[update-final-video-visibility] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json({ ok: false, status: "github_save_failed", message: "Failed to fetch episode file from GitHub.", githubStatus: getRes.status, targetPath: filePath, branch } satisfies UpdateResult, { status: 502 });
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json({ ok: false, status: "github_save_failed", message: "GitHub response was missing file SHA." } satisfies UpdateResult, { status: 502 });
    }
    existingSha = fileData.sha as string;

    const rawContent = typeof fileData.content === "string" ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8") : "";
    try {
      const parsed: unknown = JSON.parse(rawContent);
      if (!isRecord(parsed)) throw new Error("not an object");
      episode = parsed as Record<string, unknown>;
    } catch {
      return Response.json({ ok: false, status: "validation_error", message: "Episode file exists but could not be parsed as JSON.", targetPath: filePath } satisfies UpdateResult, { status: 422 });
    }
  } catch (err) {
    console.error("[update-final-video-visibility] Network error fetching episode:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, status: "github_save_failed", message: "Failed to reach the GitHub API." } satisfies UpdateResult, { status: 502 });
  }

  // Require existing finalVideo
  if (!isRecord(episode.finalVideo)) {
    return Response.json({ ok: false, status: "final_video_not_found", message: "No finalVideo metadata found on this episode. Attach a final video first." } satisfies UpdateResult, { status: 422 });
  }

  const now = new Date().toISOString();
  const updatedFinalVideo = {
    ...(episode.finalVideo as Record<string, unknown>),
    visibility: newVisibility,
    visibilityUpdatedAt: now,
  };

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    finalVideo: updatedFinalVideo,
    updatedAt: now,
  };

  const episodeTitle = typeof episode.title === "string" && episode.title.length > 0 ? episode.title : episodeSlug;
  const visibilityLabel = newVisibility === "public-ready" ? "public-ready" : newVisibility === "hidden" ? "hidden" : "admin-only";
  const commitMessage = `Update final video visibility to ${visibilityLabel}: ${episodeTitle}`;

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
      console.error(`[update-final-video-visibility] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json({ ok: false, status: "github_save_failed", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status, targetPath: filePath, branch } satisfies UpdateResult, { status: 502 });
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    const notes: string[] = ["Final video visibility was updated."];
    if (newVisibility === "public-ready") {
      notes.push("Public Ready final videos appear on public story pages after redeploy.");
    } else if (newVisibility === "admin-only") {
      notes.push("Final video is now admin-only and will not appear on the public story page.");
    } else if (newVisibility === "hidden") {
      notes.push("Final video is now hidden and will not appear publicly or in standard admin views.");
    }

    return Response.json({ ok: true, status: "final_video_visibility_updated", episodeSlug, visibility: newVisibility, finalVideo: updatedFinalVideo, path: filePath, commitMessage, notes } satisfies UpdateResult, { status: 200 });
  } catch (err) {
    console.error("[update-final-video-visibility] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json({ ok: false, status: "github_save_failed", message: "Failed to commit the updated episode file to GitHub." } satisfies UpdateResult, { status: 502 });
  }
}
