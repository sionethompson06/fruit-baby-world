// POST /api/github/update-episode-scene
// Updates editable text/planning fields on an existing saved episode scene.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only updates specified text fields. Preserves sceneNumber, sceneId,
//          status, createdAt, and any other existing scene fields.
//          Does not generate, upload, or attach media.
//          Does not renumber scenes.
// Phase:   9G — controlled scene text edit workflow.

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateSceneResult =
  | {
      ok: true;
      status: "scene_updated";
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

const KNOWN_CHARACTER_SLUGS = new Set([
  "pineapple-baby",
  "ube-baby",
  "kiwi-baby",
  "coconut-baby",
  "mango-baby",
  "tiki",
  "tiki-trouble",
]);

function isSafeCharacterValue(c: string): boolean {
  if (KNOWN_CHARACTER_SLUGS.has(c)) return true;
  return !/[<>"'`{}]/.test(c) && c.trim().length > 0 && c.trim().length <= 60;
}

const HTML_SCRIPT = /<[^>]+>|javascript:/i;

function isSafeText(s: string): boolean {
  return !HTML_SCRIPT.test(s);
}

function sanitize(s: unknown, maxLen: number): string {
  if (typeof s !== "string") return "";
  return s.trim().slice(0, maxLen);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

function buildImagePromptFallback(sceneNum: number, title: string, characters: string[]): string {
  const chars = characters.length > 0 ? characters.join(", ") : "the characters";
  return (
    `Create a kid-friendly still storybook panel for Scene ${sceneNum}, ${title}. ` +
    `Show ${chars} in the episode setting. ` +
    `Preserve official Fruit Baby character designs exactly to very close to the uploaded references. ` +
    `Do not redesign characters.`
  );
}

function buildAnimationPromptFallback(sceneNum: number, title: string, characters: string[]): string {
  const chars = characters.length > 0 ? characters.join(", ") : "the characters";
  return (
    `Create a short kid-friendly animated cartoon clip for Scene ${sceneNum}, ${title}. ` +
    `Show ${chars} with gentle movement and warm expressions. ` +
    `Preserve official Fruit Baby character designs exactly to very close to the uploaded references. ` +
    `Do not redesign characters.`
  );
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
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies UpdateSceneResult,
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
      } satisfies UpdateSceneResult,
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
      } satisfies UpdateSceneResult,
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
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }

  // ── Validate scene input ──────────────────────────────────────────────────────
  const rawScene = body.scene;
  if (!isRecord(rawScene)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene is required and must be an object.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }

  const title = sanitize(rawScene.title, 120);
  if (title.length < 2) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene.title is required and must be at least 2 characters.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }
  if (!isSafeText(title)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene.title contains disallowed content.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }

  const summary = sanitize(rawScene.summary, 800);
  if (summary.length < 10) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene.summary is required and must be at least 10 characters.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }
  if (!isSafeText(summary)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene.summary contains disallowed content.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }

  if (!Array.isArray(rawScene.characters) || rawScene.characters.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene.characters is required and must be a non-empty array.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }
  const characters = (rawScene.characters as unknown[])
    .filter((c): c is string => typeof c === "string")
    .map((c) => c.trim())
    .filter(Boolean);
  if (characters.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "scene.characters must contain at least one non-empty string.",
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }
  const invalidChar = characters.find((c) => !isSafeCharacterValue(c));
  if (invalidChar) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `scene.characters contains an invalid value: "${invalidChar}".`,
      } satisfies UpdateSceneResult,
      { status: 400 }
    );
  }

  const visualNotes = sanitize(rawScene.visualNotes, 800);
  const emotionalBeat = sanitize(rawScene.emotionalBeat, 400);
  const dialogueDraft = sanitize(rawScene.dialogueDraft, 1200);
  const voiceoverNotes = sanitize(rawScene.voiceoverNotes, 1200);
  const imagePromptDraftInput = sanitize(rawScene.imagePromptDraft, 1500);
  const animationPromptDraftInput = sanitize(rawScene.animationPromptDraft, 1500);

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
        } satisfies UpdateSceneResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[update-episode-scene] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to fetch episode file from GitHub.",
          githubStatus: getRes.status,
          targetPath: filePath,
          branch,
        } satisfies UpdateSceneResult,
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
        } satisfies UpdateSceneResult,
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
        } satisfies UpdateSceneResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error(
      "[update-episode-scene] Network error:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies UpdateSceneResult,
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
      } satisfies UpdateSceneResult,
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
      } satisfies UpdateSceneResult,
      { status: 404 }
    );
  }

  // ── Build updated scene (preserve all existing fields) ───────────────────────
  const existingScene = existingScenes[sceneIndex];
  const now = new Date().toISOString();

  const imagePromptDraft =
    imagePromptDraftInput ||
    buildImagePromptFallback(sceneNumber, title, characters);

  const animationPromptDraft =
    animationPromptDraftInput ||
    buildAnimationPromptFallback(sceneNumber, title, characters);

  const updatedScene: Record<string, unknown> = {
    ...existingScene,
    // Overwrite only editable fields
    title,
    summary,
    characters,
    visualNotes,
    emotionalBeat,
    dialogueDraft,
    voiceoverNotes,
    imagePromptDraft,
    animationPromptDraft,
    updatedAt: now,
  };

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

  const commitMessage = `Update episode scene: ${episodeTitle} scene ${sceneNumber}`;
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
      console.error(`[update-episode-scene] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
          githubStatus: putRes.status,
          targetPath: filePath,
          branch,
        } satisfies UpdateSceneResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    const notes = [
      "Scene was updated in episode JSON.",
      "Vercel redeploy is required before the updated scene appears in the deployed app.",
    ];
    if (hasSavedMediaForScene) {
      notes.push(
        "If this scene has saved media, review whether the existing panel still matches the updated scene."
      );
    }

    return Response.json(
      {
        ok: true,
        status: "scene_updated",
        path: filePath,
        commitMessage,
        sceneNumber,
        scene: updatedScene,
        htmlUrl,
        hasSavedMediaForScene,
        notes,
      } satisfies UpdateSceneResult,
      { status: 200 }
    );
  } catch (err) {
    console.error(
      "[update-episode-scene] Network error committing:",
      err instanceof Error ? err.message : err
    );
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies UpdateSceneResult,
      { status: 502 }
    );
  }
}
