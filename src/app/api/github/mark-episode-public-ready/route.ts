// POST /api/github/mark-episode-public-ready
// Fetches an existing saved episode JSON from GitHub, marks it public-ready
// by setting publishing metadata, and commits the updated file back.
//
// Not connected to any UI yet — Phase 3H.2 will add the Publish button.
//
// Security: GitHub token is server-side only. Never exposed to the browser.
// Auth:     Protected by proxy.ts — requires valid admin cookie.

// ─── Types ────────────────────────────────────────────────────────────────────

type PublishResult =
  | { ok: true; status: "public_ready"; path: string; commitMessage: string; htmlUrl: string }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "invalid_episode_json"
        | "not_approved_for_save"
        | "github_error";
      message: string;
      githubStatus?: number;
      targetPath?: string;
      branch?: string;
    };

// ─── Slug safety ──────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9-]+$/;

function validateSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length > 0 && SAFE_SLUG.test(slug);
}

// ─── Narrow helpers ───────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies PublishResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies PublishResult,
      { status: 400 }
    );
  }

  // ── Validate slug ────────────────────────────────────────────────────────────
  if (!validateSlug(body.slug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "A safe episode slug is required. Use only lowercase letters, numbers, and hyphens.",
      } satisfies PublishResult,
      { status: 400 }
    );
  }

  const slug = body.slug;

  // ── Check GitHub environment variables ───────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies PublishResult,
      { status: 503 }
    );
  }

  const filePath = `src/content/episodes/${slug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Fetch existing file from GitHub ──────────────────────────────────────────
  let existingSha: string;
  let episodeData: Record<string, unknown>;

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
        } satisfies PublishResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[mark-episode-public-ready] GitHub GET failed (${getRes.status}) for ${filePath}`);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to fetch the episode file from GitHub.",
          githubStatus: getRes.status,
          targetPath: filePath,
          branch,
        } satisfies PublishResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;

    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response was missing file sha." } satisfies PublishResult,
        { status: 502 }
      );
    }
    existingSha = fileData.sha;

    // GitHub returns content as base64
    if (typeof fileData.content !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response was missing file content." } satisfies PublishResult,
        { status: 502 }
      );
    }
    const rawJson = Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8");

    try {
      const parsed: unknown = JSON.parse(rawJson);
      if (!isRecord(parsed)) throw new Error("not an object");
      episodeData = parsed;
    } catch {
      return Response.json(
        {
          ok: false,
          status: "invalid_episode_json",
          message: "Episode file exists but could not be parsed as JSON.",
          targetPath: filePath,
        } satisfies PublishResult,
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[mark-episode-public-ready] Network error fetching file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies PublishResult,
      { status: 502 }
    );
  }

  // ── Validate approvedForSave ──────────────────────────────────────────────────
  if (!isRecord(episodeData.review) || episodeData.review.approvedForSave !== true) {
    return Response.json(
      {
        ok: false,
        status: "not_approved_for_save",
        message: "Episode must be approved for save before it can be marked public-ready.",
      } satisfies PublishResult,
      { status: 422 }
    );
  }

  // ── Build updated episode ─────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const existingPublishing = isRecord(episodeData.publishing) ? episodeData.publishing : {};

  const updatedEpisode: Record<string, unknown> = {
    ...episodeData,
    status: "published",
    publishing: {
      ...existingPublishing,
      publicStatus: "published",
      readyForPublicSite: true,
      publishedAt: now,
      // Only set reviewNotes if it doesn't already exist
      ...(!existingPublishing.reviewNotes
        ? { reviewNotes: "Marked public-ready from Fruit Baby Story Studio." }
        : {}),
    },
    updatedAt: now,
  };

  // ── Commit back to GitHub ─────────────────────────────────────────────────────
  const title = typeof episodeData.title === "string" ? episodeData.title : slug;
  const commitMessage = `Mark episode public-ready: ${title}`;
  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  const putBody = {
    message: commitMessage,
    content: contentBase64,
    branch,
    sha: existingSha,
  };

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[mark-episode-public-ready] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
          githubStatus: putRes.status,
          targetPath: filePath,
          branch,
        } satisfies PublishResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "public_ready",
        path: filePath,
        commitMessage,
        htmlUrl,
      } satisfies PublishResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[mark-episode-public-ready] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the updated file to GitHub." } satisfies PublishResult,
      { status: 502 }
    );
  }
}
