// POST /api/github/update-narration-audio-visibility
// Updates only the audioNarration.visibility field on a saved episode JSON in GitHub.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only updates visibility. Does not modify scenes, panels, characters, or
//          any other episode field. Does not delete Blob assets.
// Phase:   13F — Public Audio Story Player.

// ─── Types ────────────────────────────────────────────────────────────────────

const ALLOWED_VISIBILITY = ["admin-only", "public-ready", "hidden"] as const;
type AudioVisibility = (typeof ALLOWED_VISIBILITY)[number];

type UpdateVisibilityResult =
  | {
      ok: true;
      status: "visibility_updated";
      episodeSlug: string;
      visibility: AudioVisibility;
      path: string;
      commitMessage: string;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "no_audio_narration"
        | "invalid_episode_json"
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

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG_RE.test(normalized);
}

function isAllowedVisibility(v: unknown): v is AudioVisibility {
  return typeof v === "string" && (ALLOWED_VISIBILITY as readonly string[]).includes(v);
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  // ── GitHub config ────────────────────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies UpdateVisibilityResult,
      { status: 503 }
    );
  }

  // ── Validate episodeSlug ─────────────────────────────────────────────────────
  if (!validateSlug(body.episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a safe slug (lowercase letters, numbers, hyphens only).",
      } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate visibility ──────────────────────────────────────────────────────
  if (!isAllowedVisibility(body.visibility)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: 'visibility must be one of: "admin-only", "public-ready", "hidden".',
      } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }
  const newVisibility: AudioVisibility = body.visibility;

  // ── File path ────────────────────────────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Fetch episode JSON ────────────────────────────────────────────────────────
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
      console.error(`[update-narration-audio-visibility] GitHub GET failed (${getRes.status}):`, filePath);
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
        { ok: false, status: "github_error", message: "GitHub response was missing file SHA." } satisfies UpdateVisibilityResult,
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
    console.error("[update-narration-audio-visibility] Network error fetching episode:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateVisibilityResult,
      { status: 502 }
    );
  }

  // ── Require existing audioNarration ──────────────────────────────────────────
  if (!isRecord(episode.audioNarration)) {
    return Response.json(
      {
        ok: false,
        status: "no_audio_narration",
        message: "No audioNarration metadata found on this episode. Attach audio first.",
      } satisfies UpdateVisibilityResult,
      { status: 422 }
    );
  }

  // ── Update only visibility field ─────────────────────────────────────────────
  const now = new Date().toISOString();

  const updatedAudioNarration = {
    ...episode.audioNarration,
    visibility: newVisibility,
    visibilityUpdatedAt: now,
  };

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    audioNarration: updatedAudioNarration,
    updatedAt: now,
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const visibilityLabel =
    newVisibility === "public-ready"
      ? "public-ready"
      : newVisibility === "hidden"
      ? "hidden"
      : "admin-only";

  const commitMessage = `Update narration audio visibility to ${visibilityLabel}: ${episodeTitle}`;
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
      console.error(`[update-narration-audio-visibility] GitHub PUT failed (${putRes.status}):`, errBody);
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

    const notes: string[] = [
      `Narration audio visibility updated to "${visibilityLabel}".`,
    ];
    if (newVisibility === "public-ready") {
      notes.push("Public audio playback will appear on the public story page after Vercel redeploy.");
    } else if (newVisibility === "admin-only") {
      notes.push("Audio is now admin-only and will not appear on the public story page.");
    } else if (newVisibility === "hidden") {
      notes.push("Audio is now hidden and will not appear publicly or in standard admin views.");
    }

    return Response.json(
      {
        ok: true,
        status: "visibility_updated",
        episodeSlug,
        visibility: newVisibility,
        path: filePath,
        commitMessage,
        htmlUrl,
        notes,
      } satisfies UpdateVisibilityResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[update-narration-audio-visibility] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the updated episode file to GitHub." } satisfies UpdateVisibilityResult,
      { status: 502 }
    );
  }
}
