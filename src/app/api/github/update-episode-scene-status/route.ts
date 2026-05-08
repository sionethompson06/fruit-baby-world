// POST /api/github/update-episode-scene-status
// Archives or restores a scene in a saved episode JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only changes status-related fields. Does not alter scene content,
//          saved media, assets, or scene numbers.
// Phase:   9H — controlled scene archive/restore workflow.

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateSceneStatusResult =
  | {
      ok: true;
      status: "scene_archived" | "scene_restored";
      path: string;
      commitMessage: string;
      sceneNumber: number;
      scene: Record<string, unknown>;
      htmlUrl: string;
      hasSavedMediaForScene: boolean;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "invalid_episode_json"
        | "no_scenes_found"
        | "scene_not_found"
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

const ALLOWED_STATUSES = new Set(["active", "archived"]);

const HTML_SCRIPT = /<[^>]+>|javascript:/i;

function isSafeText(s: string): boolean {
  return !HTML_SCRIPT.test(s);
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
      } satisfies UpdateSceneStatusResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies UpdateSceneStatusResult,
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
      } satisfies UpdateSceneStatusResult,
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
      } satisfies UpdateSceneStatusResult,
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
      } satisfies UpdateSceneStatusResult,
      { status: 400 }
    );
  }

  // ── Validate status ───────────────────────────────────────────────────────────
  const newStatus = body.status;
  if (typeof newStatus !== "string" || !ALLOWED_STATUSES.has(newStatus)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: 'status must be "active" or "archived".',
      } satisfies UpdateSceneStatusResult,
      { status: 400 }
    );
  }

  // ── Validate reason (optional) ────────────────────────────────────────────────
  let reason = "";
  if (body.reason !== undefined) {
    if (typeof body.reason !== "string") {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "reason must be a string if provided.",
        } satisfies UpdateSceneStatusResult,
        { status: 400 }
      );
    }
    reason = body.reason.trim().slice(0, 300);
    if (reason && !isSafeText(reason)) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "reason contains disallowed content.",
        } satisfies UpdateSceneStatusResult,
        { status: 400 }
      );
    }
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
        } satisfies UpdateSceneStatusResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(
        `[update-episode-scene-status] GitHub GET failed (${getRes.status}):`,
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
        } satisfies UpdateSceneStatusResult,
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
        } satisfies UpdateSceneStatusResult,
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
        } satisfies UpdateSceneStatusResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error(
      "[update-episode-scene-status] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies UpdateSceneStatusResult,
      { status: 502 }
    );
  }

  // ── Determine scene array ─────────────────────────────────────────────────────
  const sceneKey: "sceneBreakdown" | "scenes" =
    Array.isArray(episode.sceneBreakdown) && episode.sceneBreakdown.length > 0
      ? "sceneBreakdown"
      : Array.isArray(episode.scenes) && episode.scenes.length > 0
      ? "scenes"
      : "sceneBreakdown";

  if (!Array.isArray(episode[sceneKey]) || (episode[sceneKey] as unknown[]).length === 0) {
    return Response.json(
      {
        ok: false,
        status: "no_scenes_found",
        message: "No scene array was found in this episode.",
      } satisfies UpdateSceneStatusResult,
      { status: 422 }
    );
  }

  const existingScenes: Record<string, unknown>[] = (
    episode[sceneKey] as unknown[]
  ).filter((s): s is Record<string, unknown> => isRecord(s));

  // ── Locate the scene ──────────────────────────────────────────────────────────
  const sceneIndex = existingScenes.findIndex(
    (s) => typeof s.sceneNumber === "number" && s.sceneNumber === sceneNumber
  );

  if (sceneIndex === -1) {
    return Response.json(
      {
        ok: false,
        status: "scene_not_found",
        message: "No scene was found with this scene number.",
      } satisfies UpdateSceneStatusResult,
      { status: 404 }
    );
  }

  // ── Build updated scene (preserve all existing fields) ───────────────────────
  const existingScene = existingScenes[sceneIndex];
  const now = new Date().toISOString();

  let updatedScene: Record<string, unknown>;
  if (newStatus === "archived") {
    updatedScene = {
      ...existingScene,
      status: "archived",
      archivedAt: now,
      archiveReason: reason,
      updatedAt: now,
    };
  } else {
    // Restore: set active, keep archivedAt/archiveReason as historical note
    updatedScene = {
      ...existingScene,
      status: "active",
      updatedAt: now,
    };
  }

  const updatedScenes = [
    ...existingScenes.slice(0, sceneIndex),
    updatedScene,
    ...existingScenes.slice(sceneIndex + 1),
  ];

  // ── Check for saved media ─────────────────────────────────────────────────────
  const mediaRaw = isRecord(episode.media) ? episode.media : null;
  const spm = mediaRaw && isRecord(mediaRaw.storyPanelMode) ? mediaRaw.storyPanelMode : null;
  const savedPanels = spm && Array.isArray(spm.panels)
    ? (spm.panels as unknown[]).filter(isRecord)
    : [];
  const hasSavedMediaForScene = savedPanels.some(
    (p) => typeof p.sceneNumber === "number" && p.sceneNumber === sceneNumber
  );

  // ── Update episode ────────────────────────────────────────────────────────────
  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    [sceneKey]: updatedScenes,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const isArchiving = newStatus === "archived";
  const commitMessage = isArchiving
    ? `Archive episode scene: ${episodeTitle} scene ${sceneNumber}`
    : `Restore episode scene: ${episodeTitle} scene ${sceneNumber}`;

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
        `[update-episode-scene-status] GitHub PUT failed (${putRes.status}):`,
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
        } satisfies UpdateSceneStatusResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    const notes: string[] = [
      "Scene status was updated in episode JSON.",
      "Vercel redeploy is required before the deployed app reflects the change.",
    ];
    if (hasSavedMediaForScene) {
      notes.push(
        "This scene has saved media assets. Archiving the scene does not delete or remove those assets."
      );
    }

    return Response.json(
      {
        ok: true,
        status: isArchiving ? "scene_archived" : "scene_restored",
        path: filePath,
        commitMessage,
        sceneNumber,
        scene: updatedScene,
        htmlUrl,
        hasSavedMediaForScene,
        notes,
      } satisfies UpdateSceneStatusResult,
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[update-episode-scene-status] Network error committing:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies UpdateSceneStatusResult,
      { status: 502 }
    );
  }
}
