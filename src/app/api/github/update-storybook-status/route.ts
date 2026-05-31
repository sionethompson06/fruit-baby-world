// POST /api/github/update-storybook-status
// Sets story-level status to draft, coming-soon, hidden, or archived.
// Does not alter storybookPages, images, audio, or video.
// Auth: Protected by proxy.ts — requires valid admin cookie.
//
// For publishing, use /api/github/publish-storybook (has page-marking logic).

import fs from "fs";
import path from "path";

const LOCAL_EPISODES_DIR = path.join(process.cwd(), "src", "content", "episodes");

type TargetStatus = "draft" | "coming-soon" | "hidden" | "archived";

type UpdateStatusResult =
  | { ok: true; status: TargetStatus; slug: string }
  | {
      ok: false;
      error:
        | "validation_error"
        | "not_found"
        | "parse_error"
        | "github_error"
        | "setup_required";
      message: string;
    };

const SAFE_SLUG = /^[a-z0-9-]+$/;
const VALID_STATUSES: TargetStatus[] = ["draft", "coming-soon", "hidden", "archived"];

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, error: "validation_error", message: "Request body must be valid JSON." } satisfies UpdateStatusResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, error: "validation_error", message: "Body must be a JSON object." } satisfies UpdateStatusResult,
      { status: 400 }
    );
  }

  const { episodeSlug, status } = body;

  if (typeof episodeSlug !== "string" || !SAFE_SLUG.test(episodeSlug)) {
    return Response.json(
      { ok: false, error: "validation_error", message: "A valid episodeSlug is required." } satisfies UpdateStatusResult,
      { status: 400 }
    );
  }

  if (!VALID_STATUSES.includes(status as TargetStatus)) {
    return Response.json(
      { ok: false, error: "validation_error", message: `status must be one of: ${VALID_STATUSES.join(", ")}` } satisfies UpdateStatusResult,
      { status: 400 }
    );
  }

  const newStatus = status as TargetStatus;

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, error: "setup_required", message: "GitHub saving is not configured." } satisfies UpdateStatusResult,
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

  // ── Fetch current file ─────────────────────────────────────────────────────────
  let existingSha: string;
  let episodeData: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json(
        { ok: false, error: "not_found", message: `Storybook "${episodeSlug}" not found.` } satisfies UpdateStatusResult,
        { status: 404 }
      );
    }
    if (!getRes.ok) {
      return Response.json(
        { ok: false, error: "github_error", message: `GitHub fetch failed (${getRes.status}).` } satisfies UpdateStatusResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string" || typeof fileData.content !== "string") {
      return Response.json(
        { ok: false, error: "github_error", message: "GitHub response missing sha or content." } satisfies UpdateStatusResult,
        { status: 502 }
      );
    }

    existingSha = fileData.sha;
    const rawJson = Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return Response.json(
        { ok: false, error: "parse_error", message: "Episode file could not be parsed." } satisfies UpdateStatusResult,
        { status: 422 }
      );
    }
    if (!isRecord(parsed)) {
      return Response.json(
        { ok: false, error: "parse_error", message: "Episode file is not a valid JSON object." } satisfies UpdateStatusResult,
        { status: 422 }
      );
    }
    episodeData = parsed;
  } catch (err) {
    console.error("[update-storybook-status] GitHub fetch error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, error: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateStatusResult,
      { status: 502 }
    );
  }

  // ── Build updated publishing flags ─────────────────────────────────────────────
  const now = new Date().toISOString();
  const existingPublishing = isRecord(episodeData.publishing) ? episodeData.publishing : {};

  let publishingUpdate: Record<string, unknown>;
  let commitVerb: string;

  if (newStatus === "draft") {
    publishingUpdate = {
      ...existingPublishing,
      publicStatus: "not-published",
      readyForPublicSite: false,
      unpublishedAt: now,
    };
    commitVerb = "Unpublish";
  } else if (newStatus === "coming-soon") {
    publishingUpdate = {
      ...existingPublishing,
      publicStatus: "coming-soon",
      readyForPublicSite: false,
      comingSoonAt: now,
    };
    commitVerb = "Mark coming soon";
  } else if (newStatus === "hidden") {
    publishingUpdate = {
      ...existingPublishing,
      publicStatus: "hidden",
      readyForPublicSite: false,
      hiddenAt: now,
    };
    commitVerb = "Hide";
  } else {
    // archived
    publishingUpdate = {
      ...existingPublishing,
      publicStatus: "archived",
      readyForPublicSite: false,
      archivedAt: now,
    };
    commitVerb = "Archive";
  }

  const updatedEpisode: Record<string, unknown> = {
    ...episodeData,
    status: newStatus,
    publishing: publishingUpdate,
    updatedAt: now,
  };

  const title = typeof episodeData.title === "string" ? episodeData.title : episodeSlug;
  const commitMessage = `${commitVerb} storybook: ${title}`;

  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  // ── Commit to GitHub ───────────────────────────────────────────────────────────
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
      console.error(`[update-storybook-status] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, error: "github_error", message: `GitHub commit failed (${putRes.status}).` } satisfies UpdateStatusResult,
        { status: 502 }
      );
    }

    // Write to local disk for immediate in-process effect (non-fatal on serverless)
    try {
      fs.mkdirSync(LOCAL_EPISODES_DIR, { recursive: true });
      fs.writeFileSync(path.join(LOCAL_EPISODES_DIR, `${episodeSlug}.json`), fileContent, "utf-8");
    } catch {
      // Read-only filesystem in production — GitHub is source of truth.
    }

    return Response.json(
      { ok: true, status: newStatus, slug: episodeSlug } satisfies UpdateStatusResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[update-storybook-status] GitHub commit error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, error: "github_error", message: "Failed to commit to GitHub." } satisfies UpdateStatusResult,
      { status: 502 }
    );
  }
}
