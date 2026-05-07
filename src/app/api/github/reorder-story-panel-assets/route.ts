// POST /api/github/reorder-story-panel-assets
// Updates the display order of saved story panel assets in episode JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only changes panel order and displayOrder metadata.
//          Does not delete, replace, or modify asset files.
//          Does not accept arbitrary file paths — slug is validated, path is server-controlled.
// Phase:   9C — controlled panel reorder workflow.

// ─── Types ────────────────────────────────────────────────────────────────────

type ReorderResult =
  | {
      ok: true;
      status: "reordered";
      path: string;
      commitMessage: string;
      orderedSceneNumbers: number[];
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
        | "no_panels"
        | "panel_order_mismatch"
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

// ─── Route handler ────────────────────────────────────────────────────────────

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
      } satisfies ReorderResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies ReorderResult,
      { status: 400 }
    );
  }

  // ── Check GitHub configuration ───────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured yet.",
      } satisfies ReorderResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ─────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "episodeSlug is required and must contain only lowercase letters, numbers, and hyphens.",
      } satisfies ReorderResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate orderedSceneNumbers ─────────────────────────────────────────────
  if (!Array.isArray(body.orderedSceneNumbers) || body.orderedSceneNumbers.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "orderedSceneNumbers is required and must be a non-empty array.",
      } satisfies ReorderResult,
      { status: 400 }
    );
  }

  const rawNums = body.orderedSceneNumbers as unknown[];
  if (rawNums.some((n) => typeof n !== "number" || !Number.isFinite(n) || n < 1)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "orderedSceneNumbers must contain only positive finite numbers.",
      } satisfies ReorderResult,
      { status: 400 }
    );
  }

  const orderedSceneNumbers = rawNums as number[];
  const uniqueNums = new Set(orderedSceneNumbers);
  if (uniqueNums.size !== orderedSceneNumbers.length) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "orderedSceneNumbers must not contain duplicates.",
      } satisfies ReorderResult,
      { status: 400 }
    );
  }

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
        } satisfies ReorderResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(
        `[reorder-story-panel-assets] GitHub GET failed (${getRes.status}):`,
        filePath
      );
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to fetch episode file from GitHub.",
          githubStatus: getRes.status,
          targetPath: filePath,
          branch,
        } satisfies ReorderResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "GitHub response was missing file SHA.",
        } satisfies ReorderResult,
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
        } satisfies ReorderResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error(
      "[reorder-story-panel-assets] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies ReorderResult,
      { status: 502 }
    );
  }

  // ── Locate panels ─────────────────────────────────────────────────────────────
  const existingMedia = isRecord(episode.media) ? episode.media : null;
  const spm = existingMedia && isRecord(existingMedia.storyPanelMode)
    ? existingMedia.storyPanelMode
    : null;
  const existingPanels = spm && Array.isArray(spm.panels)
    ? (spm.panels as unknown[]).filter(isRec)
    : [];

  if (existingPanels.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "no_panels",
        message: "No saved story panel assets were found for this episode.",
      } satisfies ReorderResult,
      { status: 422 }
    );
  }

  // ── Validate order matches saved panels exactly ───────────────────────────────
  const savedSceneNumbers = new Set(
    existingPanels
      .map((p) => (typeof p.sceneNumber === "number" ? p.sceneNumber : null))
      .filter((n): n is number => n !== null)
  );

  const requestedSet = new Set(orderedSceneNumbers);
  const setsMatch =
    savedSceneNumbers.size === requestedSet.size &&
    [...savedSceneNumbers].every((n) => requestedSet.has(n));

  if (!setsMatch) {
    return Response.json(
      {
        ok: false,
        status: "panel_order_mismatch",
        message: "Panel order must include each saved panel exactly once.",
      } satisfies ReorderResult,
      { status: 422 }
    );
  }

  // ── Build panel lookup and reorder ────────────────────────────────────────────
  const panelByScene = new Map<number, Record<string, unknown>>();
  for (const p of existingPanels) {
    if (typeof p.sceneNumber === "number") panelByScene.set(p.sceneNumber, p);
  }

  const reorderedPanels = orderedSceneNumbers.map((sceneNum, index) => ({
    ...(panelByScene.get(sceneNum) as Record<string, unknown>),
    displayOrder: index + 1,
  }));

  // ── Build updated episode ─────────────────────────────────────────────────────
  const now = new Date().toISOString();

  const updatedSpm = {
    ...(spm ?? {}),
    panels: reorderedPanels,
    updatedAt: now,
  };

  const updatedMedia = {
    ...(existingMedia ?? {}),
    storyPanelMode: updatedSpm,
  };

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    media: updatedMedia,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const commitMessage = `Reorder story panels: ${episodeTitle}`;

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
      console.error(
        `[reorder-story-panel-assets] GitHub PUT failed (${putRes.status}):`,
        errBody
      );
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
          githubStatus: putRes.status,
          targetPath: filePath,
          branch,
        } satisfies ReorderResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "reordered",
        path: filePath,
        commitMessage,
        orderedSceneNumbers,
        htmlUrl,
        notes: [
          "Story panel order was updated in episode JSON.",
          "Vercel redeploy is required before the public page reflects the new order.",
        ],
      } satisfies ReorderResult,
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[reorder-story-panel-assets] Network error committing:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies ReorderResult,
      { status: 502 }
    );
  }
}

// Local alias to avoid shadowing outer isRecord
function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
