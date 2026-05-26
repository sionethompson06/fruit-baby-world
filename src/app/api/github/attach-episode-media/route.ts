// POST /api/github/attach-episode-media
// Saves an uploaded media URL (image, audio, or video) to the episode JSON.
//
// Supported fields:
//   type: "scene-image"  → episode.scenes[sceneNumber-1].imageUrl
//   type: "audio"        → episode.audioUrl
//   type: "video"        → episode.videoUrl
//   type: "cover-image"  → episode.coverImage

import { NextRequest } from "next/server";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachResult =
  | { ok: true; status: "attached"; message: string }
  | { ok: false; status: "validation_error" | "setup_required" | "not_found" | "github_error"; message: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SAFE_URL = /^https:\/\//;

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<Response> {

  const body = await req.json().catch(() => null);
  if (!isRecord(body)) {
    return Response.json({ ok: false, status: "validation_error", message: "JSON body required." } satisfies AttachResult, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json({ ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies AttachResult, { status: 503 });
  }

  const episodeSlug = body.episodeSlug;
  if (typeof episodeSlug !== "string" || !SAFE_SLUG.test(episodeSlug)) {
    return Response.json({ ok: false, status: "validation_error", message: "Valid episodeSlug required." } satisfies AttachResult, { status: 400 });
  }

  const mediaUrl = body.mediaUrl;
  if (typeof mediaUrl !== "string" || !SAFE_URL.test(mediaUrl)) {
    return Response.json({ ok: false, status: "validation_error", message: "Valid https mediaUrl required." } satisfies AttachResult, { status: 400 });
  }

  const mediaType = body.type;
  if (!["scene-image", "audio", "video", "cover-image"].includes(String(mediaType))) {
    return Response.json({ ok: false, status: "validation_error", message: "type must be scene-image, audio, video, or cover-image." } satisfies AttachResult, { status: 400 });
  }

  const sceneNumber = body.sceneNumber;
  if (mediaType === "scene-image" && (typeof sceneNumber !== "number" || sceneNumber < 1)) {
    return Response.json({ ok: false, status: "validation_error", message: "sceneNumber required for scene-image." } satisfies AttachResult, { status: 400 });
  }

  // ── Fetch current episode JSON from GitHub ────────────────────────────────
  const ghPath = `src/content/episodes/${episodeSlug}.json`;
  const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${ghPath}?ref=${branch}`;
  const getRes = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });

  if (getRes.status === 404) {
    return Response.json({ ok: false, status: "not_found", message: `Episode '${episodeSlug}' not found in GitHub.` } satisfies AttachResult, { status: 404 });
  }
  if (!getRes.ok) {
    return Response.json({ ok: false, status: "github_error", message: `GitHub GET failed: ${getRes.status}` } satisfies AttachResult, { status: 502 });
  }

  const ghFile = await getRes.json() as { content: string; sha: string };
  const episodeData = JSON.parse(Buffer.from(ghFile.content, "base64").toString("utf-8")) as Record<string, unknown>;

  // ── Apply the media URL ───────────────────────────────────────────────────
  let commitMsg = "";

  if (mediaType === "cover-image") {
    episodeData.coverImage = mediaUrl;
    commitMsg = `attach cover image to ${episodeSlug}`;
  } else if (mediaType === "audio") {
    episodeData.audioUrl = mediaUrl;
    commitMsg = `attach audio narration to ${episodeSlug}`;
  } else if (mediaType === "video") {
    episodeData.videoUrl = mediaUrl;
    commitMsg = `attach video to ${episodeSlug}`;
  } else if (mediaType === "scene-image") {
    const scenes = Array.isArray(episodeData.scenes) ? episodeData.scenes : [];
    if (Array.isArray(episodeData.sceneBreakdown) && episodeData.sceneBreakdown.length > 0) {
      const breakdown = episodeData.sceneBreakdown as Record<string, unknown>[];
      const idx = breakdown.findIndex((s) => s.sceneNumber === sceneNumber);
      if (idx === -1) {
        return Response.json({ ok: false, status: "not_found", message: `Scene ${sceneNumber} not found.` } satisfies AttachResult, { status: 404 });
      }
      breakdown[idx] = { ...breakdown[idx], imageUrl: mediaUrl };
      episodeData.sceneBreakdown = breakdown;
    } else {
      const idx = (scenes as Record<string, unknown>[]).findIndex((s) => s.sceneNumber === sceneNumber);
      if (idx === -1) {
        return Response.json({ ok: false, status: "not_found", message: `Scene ${sceneNumber} not found.` } satisfies AttachResult, { status: 404 });
      }
      (scenes as Record<string, unknown>[])[idx] = { ...(scenes as Record<string, unknown>[])[idx], imageUrl: mediaUrl };
      episodeData.scenes = scenes;
    }
    commitMsg = `attach scene ${sceneNumber} image to ${episodeSlug}`;
  }

  episodeData.updatedAt = new Date().toISOString();

  // ── Commit updated JSON ───────────────────────────────────────────────────
  const newContent = Buffer.from(JSON.stringify(episodeData, null, 2) + "\n").toString("base64");
  const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${ghPath}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message: commitMsg, content: newContent, sha: ghFile.sha, branch }),
  });

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({})) as Record<string, unknown>;
    return Response.json({ ok: false, status: "github_error", message: `GitHub PUT failed: ${putRes.status} — ${String(err.message ?? "")}` } satisfies AttachResult, { status: 502 });
  }

  return Response.json({ ok: true, status: "attached", message: commitMsg } satisfies AttachResult);
}
