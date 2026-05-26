// POST /api/github/update-storybook-details
// Updates the title and about/description of an existing storybook JSON.

type UpdateResult =
  | { ok: true; status: "updated"; path: string; commitMessage: string; htmlUrl: string }
  | {
      ok: false;
      status: "validation_error" | "setup_required" | "not_found" | "github_error";
      message: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG = /^[a-z0-9-]+$/;

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

  const episodeSlug = typeof body.episodeSlug === "string" ? body.episodeSlug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const about = typeof body.about === "string" ? body.about.trim() : "";

  if (!episodeSlug || !SAFE_SLUG.test(episodeSlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "episodeSlug is required and must be a valid slug." } satisfies UpdateResult,
      { status: 400 }
    );
  }
  if (!title) {
    return Response.json(
      { ok: false, status: "validation_error", message: "title is required." } satisfies UpdateResult,
      { status: 400 }
    );
  }
  if (!about) {
    return Response.json(
      { ok: false, status: "validation_error", message: "about is required." } satisfies UpdateResult,
      { status: 400 }
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies UpdateResult,
      { status: 503 }
    );
  }

  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Fetch existing file
  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });
    if (getRes.status === 404) {
      return Response.json(
        { ok: false, status: "not_found", message: "Storybook file not found on GitHub." } satisfies UpdateResult,
        { status: 404 }
      );
    }
    if (!getRes.ok) {
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub fetch failed with status ${getRes.status}.` } satisfies UpdateResult,
        { status: 502 }
      );
    }
    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response missing file SHA." } satisfies UpdateResult,
        { status: 502 }
      );
    }
    existingSha = fileData.sha;
    const rawContent =
      typeof fileData.content === "string"
        ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8")
        : "";
    const parsed: unknown = JSON.parse(rawContent);
    if (!isRecord(parsed)) {
      return Response.json(
        { ok: false, status: "github_error", message: "Episode file could not be parsed." } satisfies UpdateResult,
        { status: 422 }
      );
    }
    episode = parsed;
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach GitHub API." } satisfies UpdateResult,
      { status: 502 }
    );
  }

  const now = new Date().toISOString();
  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    title,
    shortDescription: about,
    updatedAt: now,
  };

  const commitMessage = `Update storybook details: ${title}`;
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
      console.error(`[update-storybook-details] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.` } satisfies UpdateResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;

    return Response.json(
      {
        ok: true,
        status: "updated",
        path: filePath,
        commitMessage,
        htmlUrl: getHtmlUrl(putData),
      } satisfies UpdateResult,
      { status: 200 }
    );
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit updated storybook to GitHub." } satisfies UpdateResult,
      { status: 502 }
    );
  }
}
