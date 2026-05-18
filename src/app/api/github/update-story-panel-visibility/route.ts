// POST /api/github/update-story-panel-visibility
// Hides or restores a story panel on the episode JSON without deleting the Blob asset.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only sets visibility/hiddenAt/hiddenReason/restoredAt on the panel object.
//          Does not delete, replace, upload, or modify image files.
//          Does not change approval status, publicUse rules, or any other fields.
// Phase:   12C — story panel visibility (hide/restore) controls.

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateVisibilityResult =
  | {
      ok: true;
      status: "updated";
      path: string;
      commitMessage: string;
      sceneNumber: number;
      visibility: "public" | "hidden";
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

const UNSAFE_TEXT = /<[^>]+>|\{[^}]+\}/;

function isSafeText(text: string): boolean {
  return !UNSAFE_TEXT.test(text);
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
      } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies UpdateVisibilityResult,
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
      } satisfies UpdateVisibilityResult,
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
      } satisfies UpdateVisibilityResult,
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
      } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  // ── Validate visibility ───────────────────────────────────────────────────────
  const visibility = body.visibility;
  if (visibility !== "public" && visibility !== "hidden") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: 'visibility must be either "public" or "hidden".',
      } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  // ── Validate hiddenReason (optional, only meaningful when hiding) ─────────────
  let hiddenReason = "";
  if (body.hiddenReason !== undefined && body.hiddenReason !== null && body.hiddenReason !== "") {
    if (typeof body.hiddenReason !== "string") {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "hiddenReason must be a string.",
        } satisfies UpdateVisibilityResult,
        { status: 400 }
      );
    }
    const trimmed = body.hiddenReason.trim();
    if (trimmed.length > 500) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "hiddenReason must be 500 characters or fewer.",
        } satisfies UpdateVisibilityResult,
        { status: 400 }
      );
    }
    if (trimmed.length > 0 && !isSafeText(trimmed)) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "hiddenReason contains disallowed content.",
        } satisfies UpdateVisibilityResult,
        { status: 400 }
      );
    }
    hiddenReason = trimmed;
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
        } satisfies UpdateVisibilityResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(
        `[update-story-panel-visibility] GitHub GET failed (${getRes.status}):`,
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
        } satisfies UpdateVisibilityResult,
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
        } satisfies UpdateVisibilityResult,
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
        } satisfies UpdateVisibilityResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error(
      "[update-story-panel-visibility] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies UpdateVisibilityResult,
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
      } satisfies UpdateVisibilityResult,
      { status: 404 }
    );
  }

  // ── Update only visibility fields ─────────────────────────────────────────────
  const now = new Date().toISOString();
  const existingPanel = panels[panelIndex];

  const updatedPanel: Record<string, unknown> = { ...existingPanel };

  if (visibility === "hidden") {
    updatedPanel.visibility = "hidden";
    updatedPanel.hiddenAt = now;
    if (hiddenReason) updatedPanel.hiddenReason = hiddenReason;
    // Clear any previous restoredAt when hiding again
    delete updatedPanel.restoredAt;
  } else {
    updatedPanel.visibility = "public";
    updatedPanel.restoredAt = now;
    // Preserve hiddenAt/hiddenReason for audit trail, but mark restored
  }

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

  const action = visibility === "hidden" ? "Hide" : "Restore";
  const commitMessage = `${action} story panel: ${episodeTitle} scene ${sceneNumber}`;

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
        `[update-story-panel-visibility] GitHub PUT failed (${putRes.status}):`,
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
        } satisfies UpdateVisibilityResult,
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
        visibility,
        htmlUrl,
        notes: [
          visibility === "hidden"
            ? "Panel is now hidden from public story display. The Blob asset is not deleted."
            : "Panel has been restored and will appear on the public story page.",
          "Vercel redeploy is required before public pages reflect the change.",
        ],
      } satisfies UpdateVisibilityResult,
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[update-story-panel-visibility] Network error committing:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies UpdateVisibilityResult,
      { status: 502 }
    );
  }
}
