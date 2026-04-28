// POST /api/github/save-episode
// Accepts an approved episode package draft and commits it as a JSON file
// to the configured GitHub repository branch.
//
// Not connected to the Storyboard Builder UI yet — Phase 3B will add
// the Save button after this route has been reviewed.
//
// Security: GitHub token is server-side only. Never exposed to the browser.
// Safety:   Only saves draft episode JSON. Does not publish public content.
//           Requires review.approvedForSave === true before saving.

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveResult =
  | { ok: true; status: "saved"; path: string; commitMessage: string; htmlUrl: string }
  | { ok: false; status: "validation_error" | "setup_required" | "github_error"; message: string };

// ─── Slug safety ──────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9-]+$/;

function validateSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length > 0 && SAFE_SLUG.test(slug);
}

// ─── Narrow helpers ──────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  // GitHub PUT /contents response: { content: { html_url }, commit: { html_url } }
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ──────────────────────────────────────────────────────────────
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

  const { episode } = body;

  if (!isRecord(episode)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "episode is required and must be an object." } satisfies SaveResult,
      { status: 400 }
    );
  }

  // ── Validate required fields ────────────────────────────────────────────────

  // Title
  if (!episode.title || typeof episode.title !== "string") {
    return Response.json(
      { ok: false, status: "validation_error", message: "episode.title is required." } satisfies SaveResult,
      { status: 400 }
    );
  }

  // Slug
  if (!validateSlug(episode.slug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episode.slug is required and must contain only lowercase letters, numbers, and hyphens. Path separators, dots, and spaces are not allowed.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  // Review: approvedForSave must be explicitly true
  if (!isRecord(episode.review)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "episode.review is required." } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (episode.review.approvedForSave !== true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Episode must be marked approvedForSave before it can be saved.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  // Publishing: readyForPublicSite must not be true — this route is drafts only
  if (isRecord(episode.publishing) && episode.publishing.readyForPublicSite === true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episode.publishing.readyForPublicSite must not be true. This route only saves draft episode content.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  // ── Check GitHub environment variables ──────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies SaveResult,
      { status: 503 }
    );
  }

  // ── Prepare episode content ─────────────────────────────────────────────────
  const now = new Date().toISOString();
  const episodeToSave: Record<string, unknown> = {
    ...episode,
    updatedAt: now,
    ...(episode.generatedAt ? {} : { generatedAt: now }),
  };

  const slug = episode.slug as string;
  const title = episode.title as string;
  const filePath = `src/content/episodes/${slug}.json`;
  const fileContent = JSON.stringify(episodeToSave, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  // ── GitHub API setup ────────────────────────────────────────────────────────
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Check if the file already exists ───────────────────────────────────────
  let existingSha: string | undefined;
  let isUpdate = false;

  try {
    const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (checkRes.ok) {
      const existing = (await checkRes.json()) as Record<string, unknown>;
      existingSha = typeof existing.sha === "string" ? existing.sha : undefined;
      isUpdate = true;
    } else if (checkRes.status !== 404) {
      console.error(`[save-episode] Unexpected status checking file: ${checkRes.status}`);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to check existing file on GitHub." } satisfies SaveResult,
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[save-episode] Network error checking file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies SaveResult,
      { status: 502 }
    );
  }

  // ── Commit the file ─────────────────────────────────────────────────────────
  const commitMessage = isUpdate ? `Update episode: ${title}` : `Add episode: ${title}`;

  const putBody: Record<string, unknown> = {
    message: commitMessage,
    content: contentBase64,
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  };

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[save-episode] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
        } satisfies SaveResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "saved",
        path: filePath,
        commitMessage,
        htmlUrl,
      } satisfies SaveResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[save-episode] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the file to GitHub." } satisfies SaveResult,
      { status: 502 }
    );
  }
}
