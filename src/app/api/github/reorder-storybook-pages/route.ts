// POST /api/github/reorder-storybook-pages
// Reorders the storybookPages[] array in the episode JSON on GitHub.
// Auth: Protected by proxy.ts — requires valid admin cookie.

type ReorderResult =
  | {
      ok: true;
      status: "reordered";
      path: string;
      commitMessage: string;
      pageCount: number;
      htmlUrl: string;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "invalid_episode_json"
        | "github_error";
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
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies ReorderResult, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies ReorderResult, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json({ ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies ReorderResult, { status: 503 });
  }

  if (!validateSlug(body.episodeSlug)) {
    return Response.json({ ok: false, status: "validation_error", message: "episodeSlug is required and must be a safe slug." } satisfies ReorderResult, { status: 400 });
  }
  const episodeSlug = body.episodeSlug as string;

  if (!Array.isArray(body.orderedIds) || body.orderedIds.length === 0) {
    return Response.json({ ok: false, status: "validation_error", message: "orderedIds must be a non-empty array of page IDs." } satisfies ReorderResult, { status: 400 });
  }
  const orderedIds = (body.orderedIds as unknown[]).filter((id): id is string => typeof id === "string");

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
      return Response.json({ ok: false, status: "episode_not_found", message: "Episode file not found in GitHub." } satisfies ReorderResult, { status: 404 });
    }
    if (!getRes.ok) {
      return Response.json({ ok: false, status: "github_error", message: "Failed to fetch episode from GitHub.", githubStatus: getRes.status } satisfies ReorderResult, { status: 502 });
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json({ ok: false, status: "github_error", message: "GitHub response missing file SHA." } satisfies ReorderResult, { status: 502 });
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
      return Response.json({ ok: false, status: "invalid_episode_json", message: "Episode file could not be parsed." } satisfies ReorderResult, { status: 422 });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json({ ok: false, status: "github_error", message: "Failed to reach GitHub API." } satisfies ReorderResult, { status: 502 });
  }

  const existingPages: unknown[] = Array.isArray(episode.storybookPages) ? episode.storybookPages : [];
  const pageMap = new Map<string, unknown>();
  for (const p of existingPages) {
    if (isRecord(p) && typeof p.id === "string") pageMap.set(p.id, p);
  }

  // Reorder according to orderedIds, reassigning pageNumber
  const reordered: Record<string, unknown>[] = [];
  orderedIds.forEach((id, idx) => {
    const page = pageMap.get(id);
    if (!page || !isRecord(page)) return;
    reordered.push({ ...page, pageNumber: idx + 1 });
  });

  // Append any pages not in orderedIds at the end (preserving them)
  const reorderedIds = new Set(orderedIds);
  let appendIdx = reordered.length + 1;
  for (const p of existingPages) {
    if (isRecord(p) && typeof p.id === "string" && !reorderedIds.has(p.id)) {
      reordered.push({ ...p, pageNumber: appendIdx++ });
    }
  }

  const now = new Date().toISOString();
  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    storybookPages: reordered,
    updatedAt: now,
  };

  const episodeTitle = typeof episode.title === "string" ? episode.title : episodeSlug;
  const commitMessage = `Reorder storybook pages: ${episodeTitle}`;

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
      console.error(`[reorder-storybook-pages] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json({ ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status } satisfies ReorderResult, { status: 502 });
    }

    const putData = (await putRes.json()) as Record<string, unknown>;

    return Response.json({
      ok: true,
      status: "reordered",
      path: filePath,
      commitMessage,
      pageCount: reordered.length,
      htmlUrl: getHtmlUrl(putData),
    } satisfies ReorderResult, { status: 200 });
  } catch {
    return Response.json({ ok: false, status: "github_error", message: "Failed to commit updated episode to GitHub." } satisfies ReorderResult, { status: 502 });
  }
}
