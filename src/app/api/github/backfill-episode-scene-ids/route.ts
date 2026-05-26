// POST /api/github/backfill-episode-scene-ids
// Adds stable sceneId fields to scenes and media panels that are missing them.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only adds missing sceneId fields. Does not renumber scenes, alter
//          content, or change any other field. Does not delete media.
// Phase:   9I — stable scene ID backfill.

// ─── Types ────────────────────────────────────────────────────────────────────

type BackfillResult =
  | {
      ok: true;
      status: "scene_ids_backfilled";
      path: string;
      commitMessage: string;
      scenesUpdated: number;
      panelsUpdated: number;
      clipsUpdated: number;
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
        | "no_scenes_found"
        | "nothing_to_backfill"
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

function isSafeSceneId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && SAFE_SLUG.test(v);
}

function makeSceneId(sceneNum: number): string {
  return `scene-${String(sceneNum).padStart(3, "0")}`;
}

function allocateSceneId(sceneNum: number, usedIds: Set<string>): string {
  const base = makeSceneId(sceneNum);
  if (!usedIds.has(base)) return base;
  for (const suffix of "abcdefghijklmnop") {
    const candidate = `${base}-${suffix}`;
    if (!usedIds.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies BackfillResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies BackfillResult,
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
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies BackfillResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ──────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must contain only lowercase letters, numbers, and hyphens.",
      } satisfies BackfillResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

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
        { ok: false, status: "episode_not_found", message: "Episode file was not found in GitHub content files.", targetPath: filePath, branch } satisfies BackfillResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[backfill-episode-scene-ids] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to fetch episode file from GitHub.", githubStatus: getRes.status, targetPath: filePath, branch } satisfies BackfillResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response was missing file SHA." } satisfies BackfillResult,
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
        { ok: false, status: "invalid_episode_json", message: "Episode file exists but could not be parsed as JSON.", targetPath: filePath } satisfies BackfillResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[backfill-episode-scene-ids] Network error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies BackfillResult,
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

  const rawSceneArr = episode[sceneKey];
  if (!Array.isArray(rawSceneArr) || rawSceneArr.length === 0) {
    return Response.json(
      { ok: false, status: "no_scenes_found", message: "No scene array was found in this episode." } satisfies BackfillResult,
      { status: 422 }
    );
  }

  const existingScenes: Record<string, unknown>[] = rawSceneArr.filter(isRecord);

  // ── Collect already-used sceneIds ─────────────────────────────────────────────
  const usedSceneIds = new Set<string>(
    existingScenes
      .filter((s) => isSafeSceneId(s.sceneId))
      .map((s) => s.sceneId as string)
  );

  // ── Backfill sceneId on scenes ────────────────────────────────────────────────
  let scenesUpdated = 0;
  const updatedScenes = existingScenes.map((scene, index) => {
    if (isSafeSceneId(scene.sceneId)) return scene; // already has valid sceneId
    const num = typeof scene.sceneNumber === "number" ? scene.sceneNumber : index + 1;
    const newId = allocateSceneId(num, usedSceneIds);
    usedSceneIds.add(newId);
    scenesUpdated++;
    return { ...scene, sceneId: newId };
  });

  // Build sceneNumber → sceneId map from updated scenes for panel/clip backfill
  const sceneIdByNumber = new Map<number, string>();
  for (const scene of updatedScenes) {
    if (typeof scene.sceneNumber === "number" && typeof scene.sceneId === "string") {
      sceneIdByNumber.set(scene.sceneNumber, scene.sceneId as string);
    }
  }

  // ── Backfill sceneId on story panel assets ────────────────────────────────────
  let panelsUpdated = 0;
  const existingMedia = isRecord(episode.media) ? episode.media : {};
  const existingSpm = isRecord(existingMedia.storyPanelMode) ? existingMedia.storyPanelMode : null;
  const existingPanels: unknown[] = existingSpm && Array.isArray(existingSpm.panels)
    ? existingSpm.panels
    : [];

  const updatedPanels = existingPanels.map((p) => {
    if (!isRecord(p)) return p;
    if (isSafeSceneId(p.sceneId)) return p; // already has valid sceneId
    const panelSceneNum = typeof p.sceneNumber === "number" ? p.sceneNumber : null;
    if (panelSceneNum === null) return p;
    const resolvedId = sceneIdByNumber.get(panelSceneNum);
    if (!resolvedId) return p;
    panelsUpdated++;
    return { ...p, sceneId: resolvedId };
  });

  // ── Backfill sceneId on animation clips ───────────────────────────────────────
  let clipsUpdated = 0;
  const existingAm = isRecord(existingMedia.animationMode) ? existingMedia.animationMode : null;
  const existingClips: unknown[] = existingAm && Array.isArray(existingAm.clips)
    ? existingAm.clips
    : [];

  const updatedClips = existingClips.map((c) => {
    if (!isRecord(c)) return c;
    if (isSafeSceneId(c.sceneId)) return c;
    const clipSceneNum = typeof c.sceneNumber === "number" ? c.sceneNumber : null;
    if (clipSceneNum === null) return c;
    const resolvedId = sceneIdByNumber.get(clipSceneNum);
    if (!resolvedId) return c;
    clipsUpdated++;
    return { ...c, sceneId: resolvedId };
  });

  // ── Check if anything changed ─────────────────────────────────────────────────
  if (scenesUpdated === 0 && panelsUpdated === 0 && clipsUpdated === 0) {
    return Response.json(
      { ok: false, status: "nothing_to_backfill", message: "All scenes and panels already have stable scene IDs." } satisfies BackfillResult,
      { status: 200 }
    );
  }

  // ── Build updated episode ─────────────────────────────────────────────────────
  const now = new Date().toISOString();

  const updatedSpm = existingSpm
    ? { ...existingSpm, panels: updatedPanels }
    : existingSpm;
  const updatedAm = existingAm
    ? { ...existingAm, clips: updatedClips }
    : existingAm;

  const updatedMedia: Record<string, unknown> = { ...existingMedia };
  if (updatedSpm) updatedMedia.storyPanelMode = updatedSpm;
  if (updatedAm) updatedMedia.animationMode = updatedAm;

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    [sceneKey]: updatedScenes,
    media: updatedMedia,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const commitMessage = `Backfill scene IDs: ${episodeTitle}`;
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
      console.error(`[backfill-episode-scene-ids] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status, targetPath: filePath, branch } satisfies BackfillResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "scene_ids_backfilled",
        path: filePath,
        commitMessage,
        scenesUpdated,
        panelsUpdated,
        clipsUpdated,
        htmlUrl,
        notes: [
          "Stable scene IDs were added where missing.",
          "Existing scene numbers were not changed.",
          "Vercel redeploy is required before the deployed app reflects the change.",
        ],
      } satisfies BackfillResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[backfill-episode-scene-ids] Network error committing:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the updated episode file to GitHub." } satisfies BackfillResult,
      { status: 502 }
    );
  }
}
