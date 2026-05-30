// POST /api/github/create-storybook
// Creates a minimal new storybook JSON record on GitHub AND on local disk.
// Generates slug from title, avoids collisions, commits file.

import fs from "fs";
import path from "path";

const EPISODES_DIR = path.join(process.cwd(), "src", "content", "episodes");

type CreateResult =
  | { ok: true; status: "created"; slug: string; path: string; commitMessage: string; htmlUrl: string }
  | {
      ok: false;
      status: "validation_error" | "setup_required" | "github_error" | "duplicate_slug";
      message: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies CreateResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies CreateResult,
      { status: 400 }
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const about = typeof body.about === "string" ? body.about.trim() : "";

  if (!title) {
    return Response.json(
      { ok: false, status: "validation_error", message: "title is required." } satisfies CreateResult,
      { status: 400 }
    );
  }
  if (!about) {
    return Response.json(
      { ok: false, status: "validation_error", message: "about is required." } satisfies CreateResult,
      { status: 400 }
    );
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies CreateResult,
      { status: 503 }
    );
  }

  const featuredCharacters = Array.isArray(body.featuredCharacters)
    ? (body.featuredCharacters as unknown[])
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter(Boolean)
    : [];
  const ageRange = typeof body.ageRange === "string" ? body.ageRange.trim() : "";
  const theme = typeof body.theme === "string" ? body.theme.trim() : "";

  const baseSlug = titleToSlug(title);
  if (!baseSlug) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Could not generate a valid slug from the title. Please use letters and numbers.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }

  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Find an available slug
  let slug = baseSlug;
  let suffix = 2;
  let foundAvailable = false;

  while (suffix <= 20) {
    const checkPath = `src/content/episodes/${slug}.json`;
    const checkUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${checkPath}`;
    try {
      const checkRes = await fetch(`${checkUrl}?ref=${encodeURIComponent(branch)}`, {
        method: "GET",
        headers: ghHeaders,
      });
      if (checkRes.status === 404) {
        foundAvailable = true;
        break;
      }
      if (checkRes.ok) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
        continue;
      }
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub check failed with status ${checkRes.status}.` } satisfies CreateResult,
        { status: 502 }
      );
    } catch {
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to reach GitHub API." } satisfies CreateResult,
        { status: 502 }
      );
    }
  }

  // First attempt always checks baseSlug without entering the loop
  if (!foundAvailable && suffix <= 2) foundAvailable = false;
  // Handle the edge case where the very first slug was available (loop exited at status 404)
  // This is covered by foundAvailable = true above

  if (!foundAvailable) {
    return Response.json(
      {
        ok: false,
        status: "duplicate_slug",
        message: `Could not find an available slug for "${title}". Please try a different title.`,
      } satisfies CreateResult,
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const newStorybook: Record<string, unknown> = {
    title,
    slug,
    shortDescription: about,
    ...(ageRange ? { targetAgeRange: ageRange } : {}),
    ...(theme ? { theme } : {}),
    featuredCharacters,
    status: "draft",
    productionStatus: "storybook-draft",
    sourceType: "admin-created-storybook",
    storybookPages: [],
    review: {
      status: "draft",
      approvedForSave: false,
    },
    publishing: {
      publicStatus: "not-published",
      readyForPublicSite: false,
    },
    createdAt: now,
    updatedAt: now,
  };

  const filePath = `src/content/episodes/${slug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const fileContent = JSON.stringify(newStorybook, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");
  const commitMessage = `Add storybook: ${title}`;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({ message: commitMessage, content: contentBase64, branch }),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[create-storybook] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.` } satisfies CreateResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;

    // Write to local disk so the running server can immediately load the new
    // storybook without waiting for a git pull or redeployment. Non-fatal on
    // read-only serverless filesystems.
    try {
      fs.mkdirSync(EPISODES_DIR, { recursive: true });
      fs.writeFileSync(path.join(EPISODES_DIR, `${slug}.json`), fileContent, "utf-8");
    } catch {
      // Read-only filesystem in production — GitHub is source of truth.
    }

    return Response.json(
      {
        ok: true,
        status: "created",
        slug,
        path: filePath,
        commitMessage,
        htmlUrl: getHtmlUrl(putData),
      } satisfies CreateResult,
      { status: 200 }
    );
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the storybook file to GitHub." } satisfies CreateResult,
      { status: 502 }
    );
  }
}
