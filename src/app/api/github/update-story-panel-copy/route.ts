// POST /api/github/update-story-panel-copy
// Updates panel.asset.alt and panel.asset.caption / panel.publicCaption in episode JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only changes public copy fields on an existing saved panel.
//          Does not delete, replace, upload, or modify image files.
//          Does not change approval status, publicUse rules, or displayOrder.
// Phase:   9D — controlled panel alt text and caption update workflow.

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateCopyResult =
  | {
      ok: true;
      status: "updated";
      path: string;
      commitMessage: string;
      sceneNumber: number;
      alt: string;
      caption: string;
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
        | "panel_not_found"
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

const ADMIN_BLOCKED = /prompt|debug|admin|<[^>]+>|\{[^}]+\}/i;

function isSafePublicText(text: string): boolean {
  return !ADMIN_BLOCKED.test(text);
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
  // ── Parse body ────────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies UpdateCopyResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies UpdateCopyResult,
      { status: 400 }
    );
  }

  // ── Check GitHub configuration ────────────────────────────────────────────────
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
      } satisfies UpdateCopyResult,
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
          "episodeSlug is required and must contain only lowercase letters, numbers, and hyphens.",
      } satisfies UpdateCopyResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate sceneNumber ──────────────────────────────────────────────────────
  const sceneNumber = body.sceneNumber;
  if (
    typeof sceneNumber !== "number" ||
    !Number.isFinite(sceneNumber) ||
    sceneNumber < 1
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "sceneNumber is required and must be a positive finite number.",
      } satisfies UpdateCopyResult,
      { status: 400 }
    );
  }

  // ── Validate alt ──────────────────────────────────────────────────────────────
  const rawAlt = body.alt;
  if (
    typeof rawAlt !== "string" ||
    rawAlt.trim().length < 20 ||
    rawAlt.trim().length > 300
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "alt is required and must be between 20 and 300 characters.",
      } satisfies UpdateCopyResult,
      { status: 400 }
    );
  }
  const alt = rawAlt.trim();
  if (!isSafePublicText(alt)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "alt text contains language that is not suitable for public display.",
      } satisfies UpdateCopyResult,
      { status: 400 }
    );
  }

  // ── Validate caption (optional) ───────────────────────────────────────────────
  let caption = "";
  if (body.caption !== undefined && body.caption !== null && body.caption !== "") {
    if (typeof body.caption !== "string") {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "caption must be a string.",
        } satisfies UpdateCopyResult,
        { status: 400 }
      );
    }
    const trimmedCaption = body.caption.trim();
    if (trimmedCaption.length > 240) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "caption must be 240 characters or fewer.",
        } satisfies UpdateCopyResult,
        { status: 400 }
      );
    }
    if (trimmedCaption.length > 0 && !isSafePublicText(trimmedCaption)) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "caption contains language that is not suitable for public display.",
        } satisfies UpdateCopyResult,
        { status: 400 }
      );
    }
    caption = trimmedCaption;
  }

  // ── Build server-controlled file path ─────────────────────────────────────────
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
        } satisfies UpdateCopyResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(
        `[update-story-panel-copy] GitHub GET failed (${getRes.status}):`,
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
        } satisfies UpdateCopyResult,
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
        } satisfies UpdateCopyResult,
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
        } satisfies UpdateCopyResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error(
      "[update-story-panel-copy] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies UpdateCopyResult,
      { status: 502 }
    );
  }

  // ── Locate the panel ──────────────────────────────────────────────────────────
  const existingMedia = isRecord(episode.media) ? episode.media : null;
  const spm =
    existingMedia && isRecord(existingMedia.storyPanelMode)
      ? existingMedia.storyPanelMode
      : null;
  const panels =
    spm && Array.isArray(spm.panels)
      ? (spm.panels as unknown[]).filter(
          (p): p is Record<string, unknown> =>
            typeof p === "object" && p !== null && !Array.isArray(p)
        )
      : [];

  const panelIndex = panels.findIndex(
    (p) => typeof p.sceneNumber === "number" && p.sceneNumber === sceneNumber
  );

  if (panelIndex === -1) {
    return Response.json(
      {
        ok: false,
        status: "panel_not_found",
        message: "No saved story panel asset was found for this scene.",
      } satisfies UpdateCopyResult,
      { status: 404 }
    );
  }

  // ── Update only copy fields ───────────────────────────────────────────────────
  const now = new Date().toISOString();
  const existingPanel = panels[panelIndex];
  const existingAsset = isRecord(existingPanel.asset) ? existingPanel.asset : {};

  const updatedAsset = {
    ...existingAsset,
    alt,
    caption,
    updatedAt: now,
  };

  const updatedPanel = {
    ...existingPanel,
    asset: updatedAsset,
    publicCaption: caption,
  };

  const updatedPanels = [
    ...panels.slice(0, panelIndex),
    updatedPanel,
    ...panels.slice(panelIndex + 1),
  ];

  const updatedSpm = { ...(spm ?? {}), panels: updatedPanels };
  const updatedMedia = { ...(existingMedia ?? {}), storyPanelMode: updatedSpm };
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

  const commitMessage = `Update story panel copy: ${episodeTitle} scene ${sceneNumber}`;

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
        `[update-story-panel-copy] GitHub PUT failed (${putRes.status}):`,
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
        } satisfies UpdateCopyResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "updated",
        path: filePath,
        commitMessage,
        sceneNumber,
        alt,
        caption,
        htmlUrl,
        notes: [
          "Story panel copy was updated in episode JSON.",
          "Vercel redeploy is required before public pages reflect the change.",
        ],
      } satisfies UpdateCopyResult,
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[update-story-panel-copy] Network error committing:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies UpdateCopyResult,
      { status: 502 }
    );
  }
}
