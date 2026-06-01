// POST /api/github/publish-storybook-audio-sequence
// Builds a StorybookNarrationSequence from the approved audio script and writes
// it to storybookNarration on the episode JSON in GitHub.
// Auth: Protected by proxy.ts — requires valid admin cookie.
// Does not modify storybookAudioScript, delete Blob assets, or touch any other field.

import type { StorybookNarrationAudio } from "@/lib/storybookAudioTypes";
import { buildNarrationSequenceFromAudioScript } from "@/lib/storybookAudio";
import { normalizeStorybookAudioScript } from "@/lib/storybookAudioScript";
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
    return Response.json({ ok: false, message: "slug is required and must be a safe slug." }, { status: 400 });
  }
  const episodeSlug = body.slug as string;

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
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { method: "GET", headers: ghHeaders });

    if (getRes.status === 404) {
      return Response.json({ ok: false, message: "Episode file not found in GitHub." }, { status: 404 });
    }
    if (!getRes.ok) {
      return Response.json({ ok: false, message: "Failed to fetch episode from GitHub.", githubStatus: getRes.status }, { status: 502 });
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json({ ok: false, message: "GitHub response missing file SHA." }, { status: 502 });
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
      return Response.json({ ok: false, message: "Episode file could not be parsed." }, { status: 422 });
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json({ ok: false, message: "Failed to reach GitHub API." }, { status: 502 });
  }

  // Parse storybookAudioScript and storybookPages from episode
  const storybookPages = getStorybookPages(episode);
  const featuredCharacters = Array.isArray(episode.featuredCharacters)
    ? (episode.featuredCharacters as unknown[]).filter((c): c is string => typeof c === "string")
    : [];

  const script = normalizeStorybookAudioScript(
    episode.storybookAudioScript,
    storybookPages,
    featuredCharacters
  );

  // Build narration sequence from script
  const sequence = buildNarrationSequenceFromAudioScript(script, storybookPages);

  if (!sequence || sequence.blocks.length === 0) {
    return Response.json({
      ok: false,
      message: "No generated audio blocks with audio found. Generate audio for script blocks before publishing.",
    }, { status: 422 });
  }

  const now = new Date().toISOString();
  const episodeTitle = typeof episode.title === "string" ? episode.title : episodeSlug;

  // Preserve existing narration id and createdAt if available
  const existingNarration = isRecord(episode.storybookNarration) ? episode.storybookNarration : null;
  const existingId = existingNarration && typeof existingNarration.id === "string" ? existingNarration.id : null;
  const existingCreatedAt = existingNarration && typeof existingNarration.createdAt === "string" ? existingNarration.createdAt : null;

  // First block URL as backward-compat fallback for anything that reads narration.audioUrl
  const firstBlockUrl = sequence.blocks[0].audioUrl;

  const updatedNarration: StorybookNarrationAudio = {
    id: existingId ?? `storybook-narration-${Date.now()}`,
    mode: "sequence",
    title: `${episodeTitle} Audio Reader`,
    status: "approved",
    visibility: "public",
    sourceType: "admin-uploaded",
    audioUrl: firstBlockUrl,
    mimeType: "audio/mpeg",
    sequence,
    approvedAt: now,
    createdAt: existingCreatedAt ?? now,
    updatedAt: now,
  };

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    storybookNarration: updatedNarration,
    updatedAt: now,
  };

  const commitMessage = `Publish generated audio reader sequence: ${episodeTitle}`;
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
      console.error(`[publish-storybook-audio-sequence] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json({ ok: false, message: `GitHub commit failed with status ${putRes.status}.` }, { status: 502 });
    }

    await putRes.json();

    // Write to local disk (non-fatal)
    try {
      const localPath = path.join(process.cwd(), "src", "content", "episodes", `${episodeSlug}.json`);
      fs.writeFileSync(localPath, fileContent, "utf-8");
    } catch {
      // Non-fatal
    }

    return Response.json({
      ok: true,
      storybookNarration: updatedNarration,
      sequenceBlockCount: sequence.blocks.length,
    }, { status: 200 });
  } catch {
    return Response.json({ ok: false, message: "Failed to commit audio sequence to GitHub." }, { status: 502 });
  }
}
