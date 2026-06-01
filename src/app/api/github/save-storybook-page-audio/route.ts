// POST /api/github/save-storybook-page-audio
// Saves storybookPageAudio on the episode JSON in GitHub.
// Auth: Protected by proxy.ts — requires valid admin cookie.
// Only updates the storybookPageAudio field; all other episode data is preserved.

import type { StorybookPageAudioConfig } from "@/lib/storybookPageAudioTypes";
import { normalizeStorybookPageAudio } from "@/lib/storybookPageAudio";
import { getStorybookPages } from "@/lib/storybookPages";
import fs from "fs";
import path from "path";

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
    return Response.json({ ok: false, message: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ ok: false, message: "Request body must be a JSON object." }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json({ ok: false, message: "GitHub saving is not configured." }, { status: 503 });
  }

  if (!validateSlug(body.slug)) {
    return Response.json(
      { ok: false, message: "slug is required and must be a safe slug." },
      { status: 400 }
    );
  }
  const episodeSlug = body.slug as string;

  if (!isRecord(body.storybookPageAudio)) {
    return Response.json(
      { ok: false, message: "storybookPageAudio is required and must be an object." },
      { status: 400 }
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

  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json({ ok: false, message: "Episode file not found in GitHub." }, { status: 404 });
    }
    if (!getRes.ok) {
      return Response.json(
        { ok: false, message: "Failed to fetch episode from GitHub.", githubStatus: getRes.status },
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json({ ok: false, message: "GitHub response missing file SHA." }, { status: 502 });
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
      return Response.json({ ok: false, message: "Episode file could not be parsed." }, { status: 422 });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json({ ok: false, message: "Failed to reach GitHub API." }, { status: 502 });
  }

  const storybookPages = getStorybookPages(episode);
  const now = new Date().toISOString();

  const normalizedConfig: StorybookPageAudioConfig = normalizeStorybookPageAudio(
    body.storybookPageAudio,
    storybookPages
  );
  normalizedConfig.updatedAt = now;

  const episodeTitle = typeof episode.title === "string" ? episode.title : episodeSlug;
  const commitMessage = `Update page audio: ${episodeTitle}`;

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    storybookPageAudio: normalizedConfig,
    updatedAt: now,
  };

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
      console.error(`[save-storybook-page-audio] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, message: `GitHub commit failed with status ${putRes.status}.` },
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;

    // Write local disk (non-fatal fallback for local dev)
    try {
      const localPath = path.join(
        process.cwd(),
        "src",
        "content",
        "episodes",
        `${episodeSlug}.json`
      );
      fs.writeFileSync(localPath, fileContent, "utf-8");
    } catch {
      // Non-fatal
    }

    return Response.json(
      {
        ok: true,
        storybookPageAudio: normalizedConfig,
        path: filePath,
        commitMessage,
        htmlUrl: getHtmlUrl(putData),
      },
      { status: 200 }
    );
  } catch {
    return Response.json(
      { ok: false, message: "Failed to commit page audio to GitHub." },
      { status: 502 }
    );
  }
}
