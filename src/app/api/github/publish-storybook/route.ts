// POST /api/github/publish-storybook
// Publishes a storybook by marking it public-ready in the episode JSON.
// Optionally marks all non-archived storybookPages as approved + public.
//
// Does NOT require legacy approvedForSave — only validates title, about, and book images.
// Auth: Protected by proxy.ts — requires valid admin cookie.

import { buildStorybookPublishReadiness } from "@/lib/storybookPublishReadiness";

// ─── Types ────────────────────────────────────────────────────────────────────

type PublishResult =
  | {
      ok: true;
      published: true;
      slug: string;
      publicUrl: string;
      updatedPages: number;
      warnings: string[];
    }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "validation_error"
        | "storybook_not_found"
        | "missing_title"
        | "missing_about"
        | "missing_book_images"
        | "github_save_failed"
        | "setup_required";
      message: string;
      blockers?: string[];
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9-]+$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string")
    return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string")
    return commit.html_url;
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
      } satisfies PublishResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies PublishResult,
      { status: 400 }
    );
  }

  const { episodeSlug, makeAllBookImagesPublic } = body;

  if (typeof episodeSlug !== "string" || !SAFE_SLUG.test(episodeSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "A valid episodeSlug is required (lowercase letters, numbers, hyphens only).",
      } satisfies PublishResult,
      { status: 400 }
    );
  }

  // ── GitHub env ───────────────────────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured.",
      } satisfies PublishResult,
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

  // ── Fetch existing file from GitHub ──────────────────────────────────────────
  let existingSha: string;
  let episodeData: Record<string, unknown>;

  try {
    const getRes = await fetch(
      `${apiUrl}?ref=${encodeURIComponent(branch)}`,
      { method: "GET", headers: ghHeaders }
    );

    if (getRes.status === 404) {
      return Response.json(
        {
          ok: false,
          status: "storybook_not_found",
          message: `No storybook found for slug "${episodeSlug}".`,
        } satisfies PublishResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: `GitHub fetch failed (${getRes.status}).`,
        } satisfies PublishResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;

    if (typeof fileData.sha !== "string" || typeof fileData.content !== "string") {
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: "GitHub response was missing sha or content.",
        } satisfies PublishResult,
        { status: 502 }
      );
    }

    existingSha = fileData.sha;

    const rawJson = Buffer.from(
      fileData.content.replace(/\n/g, ""),
      "base64"
    ).toString("utf-8");

    try {
      const parsed: unknown = JSON.parse(rawJson);
      if (!isRecord(parsed)) throw new Error("not an object");
      episodeData = parsed;
    } catch {
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: "Episode file could not be parsed as JSON.",
        } satisfies PublishResult,
        { status: 422 }
      );
    }
  } catch (err) {
    console.error("[publish-storybook] GitHub fetch error:", err instanceof Error ? err.message : err);
    return Response.json(
      {
        ok: false,
        status: "github_save_failed",
        message: "Failed to reach the GitHub API.",
      } satisfies PublishResult,
      { status: 502 }
    );
  }

  // ── Run readiness check ───────────────────────────────────────────────────────
  const readiness = buildStorybookPublishReadiness(episodeData);

  if (!readiness.ready) {
    // Map first blocker to a specific status code for the client
    const firstBlocker = readiness.blockers[0] ?? "";
    const status = !readiness.stats.hasTitle
      ? "missing_title"
      : !readiness.stats.hasAbout
      ? "missing_about"
      : ("missing_book_images" as const);

    return Response.json(
      {
        ok: false,
        status,
        message: `Cannot publish: ${readiness.blockers.join(" ")}`,
        blockers: readiness.blockers,
      } satisfies PublishResult,
      { status: 422 }
    );
  }

  // ── Optionally make all book images public ────────────────────────────────────
  let updatedPages = 0;
  const now = new Date().toISOString();

  let storybookPages = Array.isArray(episodeData.storybookPages)
    ? [...(episodeData.storybookPages as unknown[])]
    : [];

  if (makeAllBookImagesPublic === true) {
    storybookPages = storybookPages.map((p) => {
      if (!isRecord(p)) return p;
      if (p.status === "archived") return p;
      const alreadyPublic = p.status === "approved" && p.visibility === "public";
      if (alreadyPublic) return p;
      updatedPages++;
      return {
        ...p,
        status: "approved",
        visibility: "public",
        updatedAt: now,
      };
    });
  }

  // ── Build updated episode ─────────────────────────────────────────────────────
  const existingPublishing = isRecord(episodeData.publishing)
    ? episodeData.publishing
    : {};

  const updatedEpisode: Record<string, unknown> = {
    ...episodeData,
    status: "published",
    storybookPages,
    publishing: {
      ...existingPublishing,
      publicStatus: "published",
      readyForPublicSite: true,
      publishedAt:
        typeof existingPublishing.publishedAt === "string"
          ? existingPublishing.publishedAt
          : now,
      storebookPublishedAt: now,
    },
    updatedAt: now,
  };

  // ── Commit back to GitHub ─────────────────────────────────────────────────────
  const title =
    typeof episodeData.title === "string" ? episodeData.title : episodeSlug;
  const commitMessage = `Publish storybook: ${title}`;
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
      console.error(`[publish-storybook] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: `GitHub commit failed (${putRes.status}).`,
        } satisfies PublishResult,
        { status: 502 }
      );
    }

    return Response.json(
      {
        ok: true,
        published: true,
        slug: episodeSlug,
        publicUrl: `/stories/${episodeSlug}`,
        updatedPages,
        warnings: readiness.warnings,
      } satisfies PublishResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[publish-storybook] GitHub commit error:", err instanceof Error ? err.message : err);
    return Response.json(
      {
        ok: false,
        status: "github_save_failed",
        message: "Failed to commit the updated file to GitHub.",
      } satisfies PublishResult,
      { status: 502 }
    );
  }
}
