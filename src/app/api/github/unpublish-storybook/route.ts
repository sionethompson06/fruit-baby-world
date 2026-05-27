// POST /api/github/unpublish-storybook
// Reverts a storybook to draft status by clearing publishing flags.
// Does not alter storybookPages visibility or delete any assets.
// Auth: Protected by proxy.ts — requires valid admin cookie.

// ─── Types ────────────────────────────────────────────────────────────────────

type UnpublishResult =
  | { ok: true; unpublished: true; slug: string }
  | {
      ok: false;
      status:
        | "validation_error"
        | "storybook_not_found"
        | "github_save_failed"
        | "setup_required";
      message: string;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9-]+$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UnpublishResult,
      { status: 400 }
    );
  }

  if (!isRecord(body) || typeof body.episodeSlug !== "string" || !SAFE_SLUG.test(body.episodeSlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "A valid episodeSlug is required." } satisfies UnpublishResult,
      { status: 400 }
    );
  }

  const episodeSlug = body.episodeSlug;

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies UnpublishResult,
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

  // ── Fetch current file ────────────────────────────────────────────────────────
  let existingSha: string;
  let episodeData: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json(
        { ok: false, status: "storybook_not_found", message: `No storybook found for slug "${episodeSlug}".` } satisfies UnpublishResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      return Response.json(
        { ok: false, status: "github_save_failed", message: `GitHub fetch failed (${getRes.status}).` } satisfies UnpublishResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string" || typeof fileData.content !== "string") {
      return Response.json(
        { ok: false, status: "github_save_failed", message: "GitHub response missing sha or content." } satisfies UnpublishResult,
        { status: 502 }
      );
    }

    existingSha = fileData.sha;
    const rawJson = Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8");

    try {
      const parsed: unknown = JSON.parse(rawJson);
      if (!isRecord(parsed)) throw new Error("not an object");
      episodeData = parsed;
    } catch {
      return Response.json(
        { ok: false, status: "github_save_failed", message: "Episode file could not be parsed." } satisfies UnpublishResult,
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[unpublish-storybook] GitHub fetch error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Failed to reach the GitHub API." } satisfies UnpublishResult,
      { status: 502 }
    );
  }

  // ── Build updated episode (clear publish flags, keep everything else) ─────────
  const now = new Date().toISOString();
  const existingPublishing = isRecord(episodeData.publishing) ? episodeData.publishing : {};

  const updatedEpisode: Record<string, unknown> = {
    ...episodeData,
    status: "draft",
    publishing: {
      ...existingPublishing,
      publicStatus: "not-published",
      readyForPublicSite: false,
      unpublishedAt: now,
    },
    updatedAt: now,
  };

  // ── Commit back ───────────────────────────────────────────────────────────────
  const title = typeof episodeData.title === "string" ? episodeData.title : episodeSlug;
  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: `Unpublish storybook: ${title}`,
        content: contentBase64,
        branch,
        sha: existingSha,
      }),
    });

    if (!putRes.ok) {
      console.error(`[unpublish-storybook] GitHub PUT failed (${putRes.status})`);
      return Response.json(
        { ok: false, status: "github_save_failed", message: `GitHub commit failed (${putRes.status}).` } satisfies UnpublishResult,
        { status: 502 }
      );
    }

    return Response.json(
      { ok: true, unpublished: true, slug: episodeSlug } satisfies UnpublishResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[unpublish-storybook] GitHub commit error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Failed to commit to GitHub." } satisfies UnpublishResult,
      { status: 502 }
    );
  }
}
