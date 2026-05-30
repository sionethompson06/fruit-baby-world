// POST /api/github/save-storybook-page
// Saves or updates a storybook page in the episode JSON on GitHub AND local disk.
// Auth: Protected by proxy.ts — requires valid admin cookie.

import fs from "fs";
import path from "path";
import type { StorybookPage } from "@/lib/storybookPageTypes";

const LOCAL_EPISODES_DIR = path.join(process.cwd(), "src", "content", "episodes");

type SaveResult =
  | {
      ok: true;
      status: "saved";
      path: string;
      commitMessage: string;
      page: StorybookPage;
      htmlUrl: string;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "invalid_episode_json"
        | "github_error";
      message: string;
      githubStatus?: number;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
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
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies SaveResult, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies SaveResult, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json({ ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies SaveResult, { status: 503 });
  }

  if (!validateSlug(body.episodeSlug)) {
    return Response.json({ ok: false, status: "validation_error", message: "episodeSlug is required and must be a safe slug." } satisfies SaveResult, { status: 400 });
  }
  const episodeSlug = body.episodeSlug as string;

  const pageData = body.page;
  if (!isRecord(pageData)) {
    return Response.json({ ok: false, status: "validation_error", message: "page is required and must be an object." } satisfies SaveResult, { status: 400 });
  }

  if (typeof pageData.imageUrl !== "string" || !pageData.imageUrl.startsWith("https://")) {
    return Response.json({ ok: false, status: "validation_error", message: "page.imageUrl must be a valid https URL." } satisfies SaveResult, { status: 400 });
  }

  if (typeof pageData.altText !== "string" || !pageData.altText.trim()) {
    return Response.json({ ok: false, status: "validation_error", message: "page.altText is required." } satisfies SaveResult, { status: 400 });
  }

  const now = new Date().toISOString();
  const pageId = typeof pageData.id === "string" && pageData.id
    ? pageData.id
    : `storybook-page-${Date.now()}`;

  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Fetch existing episode JSON
  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json({ ok: false, status: "episode_not_found", message: "Episode file not found in GitHub." } satisfies SaveResult, { status: 404 });
    }
    if (!getRes.ok) {
      return Response.json({ ok: false, status: "github_error", message: "Failed to fetch episode from GitHub.", githubStatus: getRes.status } satisfies SaveResult, { status: 502 });
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json({ ok: false, status: "github_error", message: "GitHub response missing file SHA." } satisfies SaveResult, { status: 502 });
    }
    existingSha = fileData.sha;

    const rawContent = typeof fileData.content === "string"
      ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8")
      : "";

    try {
      const parsed: unknown = JSON.parse(rawContent);
      if (!isRecord(parsed)) throw new Error("not an object");
      episode = parsed;
    } catch {
      return Response.json({ ok: false, status: "invalid_episode_json", message: "Episode file could not be parsed." } satisfies SaveResult, { status: 422 });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json({ ok: false, status: "github_error", message: "Failed to reach GitHub API." } satisfies SaveResult, { status: 502 });
  }

  // Build the page entry
  const existingPages: unknown[] = Array.isArray(episode.storybookPages) ? episode.storybookPages : [];

  // Determine page number for new pages
  let maxPageNumber = 0;
  for (const p of existingPages) {
    if (isRecord(p) && typeof p.pageNumber === "number" && p.pageNumber > maxPageNumber) {
      maxPageNumber = p.pageNumber;
    }
  }

  const isUpdate = existingPages.some((p) => isRecord(p) && p.id === pageId);
  const pageNumber = isUpdate
    ? (existingPages.find((p) => isRecord(p) && p.id === pageId) as Record<string, unknown>)?.pageNumber ?? maxPageNumber + 1
    : (typeof pageData.pageNumber === "number" ? pageData.pageNumber : maxPageNumber + 1);

  const PAGE_ROLES = [
    "front-cover", "title-page", "publication-page", "acknowledgement-page",
    "introduction-page", "inside-cover", "story-page", "story-spread", "end-page", "back-cover",
  ];
  const LAYOUT_TYPES = ["single-page", "two-page-spread", "cover", "back-cover"];

  const newPage: StorybookPage = {
    id: pageId,
    pageNumber: pageNumber as number,
    title: typeof pageData.title === "string" ? pageData.title : undefined,
    caption: typeof pageData.caption === "string" ? pageData.caption : undefined,
    readAloudText: typeof pageData.readAloudText === "string" ? pageData.readAloudText : undefined,
    imageUrl: pageData.imageUrl,
    pathname: typeof pageData.pathname === "string" ? pageData.pathname : undefined,
    mimeType: typeof pageData.mimeType === "string" ? pageData.mimeType : "image/png",
    altText: (pageData.altText as string).trim(),
    sceneNumber: typeof pageData.sceneNumber === "number" ? pageData.sceneNumber : undefined,
    characters: Array.isArray(pageData.characters)
      ? (pageData.characters as unknown[]).filter((c): c is string => typeof c === "string")
      : undefined,
    status: pageData.status === "approved" || pageData.status === "archived" ? pageData.status : "draft",
    visibility: pageData.visibility === "public" ? "public" : "admin-only",
    sourceType: "admin-uploaded",
    createdAt: typeof pageData.createdAt === "string" ? pageData.createdAt : now,
    updatedAt: now,
    pageRole: PAGE_ROLES.includes(pageData.pageRole as string) ? pageData.pageRole as StorybookPage["pageRole"] : undefined,
    layoutType: LAYOUT_TYPES.includes(pageData.layoutType as string) ? pageData.layoutType as StorybookPage["layoutType"] : undefined,
    spreadNumber: typeof pageData.spreadNumber === "number" ? pageData.spreadNumber : undefined,
    leftPageLabel: typeof pageData.leftPageLabel === "string" ? pageData.leftPageLabel : undefined,
    rightPageLabel: typeof pageData.rightPageLabel === "string" ? pageData.rightPageLabel : undefined,
    displayMode: pageData.displayMode === "spread" ? "spread" : pageData.displayMode === "single" ? "single" : undefined,
    originalFilename: typeof pageData.originalFilename === "string" && pageData.originalFilename
      ? pageData.originalFilename
      : undefined,
  };

  // Replace existing entry or append
  let replaced = false;
  const updatedPages = existingPages.map((p) => {
    if (isRecord(p) && p.id === pageId) {
      replaced = true;
      return newPage;
    }
    return p;
  });
  if (!replaced) updatedPages.push(newPage);

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    storybookPages: updatedPages,
    updatedAt: now,
  };

  const episodeTitle = typeof episode.title === "string" ? episode.title : episodeSlug;
  const commitMessage = `${isUpdate ? "Update" : "Add"} storybook page ${newPage.pageNumber}: ${episodeTitle}`;

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
      console.error(`[save-storybook-page] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json({ ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status } satisfies SaveResult, { status: 502 });
    }

    const putData = (await putRes.json()) as Record<string, unknown>;

    // Write to local disk so the running server reflects the save immediately
    // without waiting for a git pull or redeployment. Non-fatal on serverless.
    try {
      fs.mkdirSync(LOCAL_EPISODES_DIR, { recursive: true });
      fs.writeFileSync(path.join(LOCAL_EPISODES_DIR, `${episodeSlug}.json`), fileContent, "utf-8");
    } catch {
      // Read-only filesystem in production — GitHub is source of truth.
    }

    return Response.json({
      ok: true,
      status: "saved",
      path: filePath,
      commitMessage,
      page: newPage,
      htmlUrl: getHtmlUrl(putData),
    } satisfies SaveResult, { status: 200 });
  } catch {
    return Response.json({ ok: false, status: "github_error", message: "Failed to commit updated episode to GitHub." } satisfies SaveResult, { status: 502 });
  }
}
