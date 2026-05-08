// POST /api/github/attach-story-panel-asset
// Attaches an approved Vercel Blob story panel asset reference to a saved episode JSON in GitHub.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Requires review.characterFidelityApproved === true.
//          Requires episode.review.approvedForSave === true.
//          Does not publish. Does not change episode status or publishing flags.
//          Does not accept arbitrary file paths — slug is validated and path is server-controlled.
// Phase:   6H — foundation only. Not connected to UI yet.

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachResult =
  | {
      ok: true;
      status: "attached";
      path: string;
      commitMessage: string;
      panelAsset: unknown;
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
        | "not_approved_for_save"
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
  // Allow trailing hyphen (e.g. "words-have-consequences-")
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME)[number];

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME as readonly string[]).includes(v);
}

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 8;
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
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies AttachResult,
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
      } satisfies AttachResult,
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
          "episodeSlug is required and must contain only lowercase letters, numbers, and hyphens. Path separators, dots, and spaces are not allowed.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate panelAsset ──────────────────────────────────────────────────────
  const panelAsset = body.panelAsset;

  if (!isRecord(panelAsset)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset is required and must be an object.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (
    typeof panelAsset.sceneNumber !== "number" ||
    panelAsset.sceneNumber < 1 ||
    !Number.isFinite(panelAsset.sceneNumber)
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.sceneNumber must be a positive number.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  const asset = panelAsset.asset;
  if (!isRecord(asset)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.asset is required and must be an object.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (!isHttpsUrl(asset.url)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.asset.url must be a non-empty https URL.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (asset.storageProvider !== "vercel-blob") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: 'panelAsset.asset.storageProvider must be "vercel-blob".',
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (!isAllowedMime(asset.mimeType)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.asset.mimeType must be one of: image/png, image/jpeg, image/webp.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (typeof asset.alt !== "string" || asset.alt.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.asset.alt is required and must be a non-empty string.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  const review = panelAsset.review;
  if (!isRecord(review)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.review is required and must be an object.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (review.requiresHumanReview !== true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.review.requiresHumanReview must be true.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (review.characterFidelityApproved !== true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "panelAsset.review.characterFidelityApproved must be true before attaching a story panel asset.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  const publicUse = panelAsset.publicUse;
  if (!isRecord(publicUse)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.publicUse is required and must be an object.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (publicUse.allowed !== true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.publicUse.allowed must be true.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (publicUse.appearsOnPublicStoryPage !== true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.publicUse.appearsOnPublicStoryPage must be true.",
      } satisfies AttachResult,
      { status: 400 }
    );
  }

  if (panelAsset.referenceCharacters !== undefined && !Array.isArray(panelAsset.referenceCharacters)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "panelAsset.referenceCharacters must be an array if provided.",
      } satisfies AttachResult,
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
        } satisfies AttachResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[attach-story-panel-asset] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to fetch episode file from GitHub.",
          githubStatus: getRes.status,
          targetPath: filePath,
          branch,
        } satisfies AttachResult,
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
        } satisfies AttachResult,
        { status: 502 }
      );
    }
    existingSha = fileData.sha;

    // Decode base64 content
    const rawContent = typeof fileData.content === "string"
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
        } satisfies AttachResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err; // let Response.json responses pass through
    console.error("[attach-story-panel-asset] Network error fetching episode:", err instanceof Error ? err.message : err);
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies AttachResult,
      { status: 502 }
    );
  }

  // ── Require episode eligibility ───────────────────────────────────────────────
  const episodeReview = episode.review;
  if (!isRecord(episodeReview) || episodeReview.approvedForSave !== true) {
    return Response.json(
      {
        ok: false,
        status: "not_approved_for_save",
        message: "Episode must be approved for save before media assets can be attached.",
      } satisfies AttachResult,
      { status: 422 }
    );
  }

  // ── Infer sceneId from matching scene ────────────────────────────────────────
  const sceneArr = (() => {
    const sb = episode.sceneBreakdown;
    const sc = episode.scenes;
    const arr = Array.isArray(sb) && sb.length > 0 ? sb : Array.isArray(sc) ? sc : [];
    return arr.filter(isRecord);
  })();

  const matchingScene = sceneArr.find(
    (s) => typeof s.sceneNumber === "number" && s.sceneNumber === panelAsset.sceneNumber
  );
  const inferredSceneId =
    matchingScene &&
    typeof matchingScene.sceneId === "string" &&
    matchingScene.sceneId
      ? matchingScene.sceneId
      : null;

  // ── Build the updated panel asset (timestamps) ────────────────────────────────
  const now = new Date().toISOString();
  const sceneNumber = panelAsset.sceneNumber as number;

  const updatedAsset = {
    ...asset,
    createdAt: typeof asset.createdAt === "string" && asset.createdAt.length > 0
      ? asset.createdAt
      : now,
    approvedAt: typeof asset.approvedAt === "string" && asset.approvedAt.length > 0
      ? asset.approvedAt
      : now,
  };

  // Prefer sceneId from request body if present, else infer from matching scene
  const providedSceneId =
    typeof panelAsset.sceneId === "string" && panelAsset.sceneId
      ? panelAsset.sceneId
      : null;
  const resolvedSceneId = providedSceneId || inferredSceneId;

  const updatedPanelAsset: Record<string, unknown> = {
    ...panelAsset,
    asset: updatedAsset,
    ...(resolvedSceneId ? { sceneId: resolvedSceneId } : {}),
  };

  // ── Update episode.media.storyPanelMode.panels ────────────────────────────────
  const existingMedia = isRecord(episode.media) ? episode.media : {};
  const existingStoryPanelMode = isRecord(existingMedia.storyPanelMode)
    ? existingMedia.storyPanelMode
    : {};

  const existingPanels: unknown[] = Array.isArray(existingStoryPanelMode.panels)
    ? existingStoryPanelMode.panels
    : [];

  // Replace panel with matching sceneNumber, or append
  let replaced = false;
  const updatedPanels = existingPanels.map((p) => {
    if (isRecord(p) && p.sceneNumber === sceneNumber) {
      replaced = true;
      return updatedPanelAsset;
    }
    return p;
  });
  if (!replaced) updatedPanels.push(updatedPanelAsset);

  // Determine panel mode status
  const panelStatus = updatedPanels.length > 0 ? "assets-attached" : "in-progress";

  const updatedStoryPanelMode = {
    ...existingStoryPanelMode,
    status: panelStatus,
    panels: updatedPanels,
  };

  const updatedMedia = {
    ...existingMedia,
    storyPanelMode: updatedStoryPanelMode,
  };

  // ── Build updated episode (preserve all existing fields) ─────────────────────
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

  const commitMessage = `Attach story panel asset: ${episodeTitle} scene ${sceneNumber}`;

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
      console.error(`[attach-story-panel-asset] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
          githubStatus: putRes.status,
          targetPath: filePath,
          branch,
        } satisfies AttachResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "attached",
        path: filePath,
        commitMessage,
        panelAsset: updatedPanelAsset,
        htmlUrl,
        notes: [
          "Story panel asset reference was attached to episode JSON.",
          "Vercel redeploy is required before public pages can use the updated JSON.",
          "Public display is controlled by the episode publishing guardrails.",
        ],
      } satisfies AttachResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[attach-story-panel-asset] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the updated episode file to GitHub.",
      } satisfies AttachResult,
      { status: 502 }
    );
  }
}
