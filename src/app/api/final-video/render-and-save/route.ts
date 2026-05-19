// POST /api/final-video/render-and-save
// One-click render & save final story video.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not generate new scene clips, images, or audio.
//          Renders from already-public-ready media only.
//          Sets visibility: admin-only by default. Does not publish publicly.
//          Does not delete Blob assets.
//          Does not expose tokens, stack traces, or internal secrets.
// Phase:   15E — One-Click Render & Save Final Video.

import { put, BlobError } from "@vercel/blob";
import { loadEpisodeBySlug } from "@/lib/savedEpisodes";
import { buildFinalVideoAssemblyPackage } from "@/lib/finalVideoAssembly";
import { buildFinalVideoRenderReadiness } from "@/lib/finalVideoRenderReadiness";
import { renderFinalVideo, cleanupPath, RENDER_WIDTH, RENDER_HEIGHT, RENDER_FPS } from "@/lib/finalVideoRenderer";
import type { FinalVideoAsset } from "@/lib/finalVideoAssetTypes";

// ─── Route config ─────────────────────────────────────────────────────────────

export const runtime = "nodejs";
export const maxDuration = 180; // 3 minutes — requires Vercel Pro plan

// ─── Types ────────────────────────────────────────────────────────────────────

type RenderAndSaveResult =
  | {
      ok: true;
      status: "final_video_rendered_and_saved";
      episodeSlug: string;
      finalVideo: FinalVideoAsset;
      path: string;
      commitMessage: string;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "episode_not_found"
        | "invalid_episode_json"
        | "render_blocked"
        | "render_failed"
        | "blob_upload_failed"
        | "github_save_failed"
        | "blob_saved_not_attached";
      message: string;
      episodeSlug?: string;
      blobUrl?: string;
      notes: string[];
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

function positiveInt(v: unknown, fallback: number, max: number): number {
  if (typeof v === "number" && Number.isInteger(v) && v > 0 && v <= max) return v;
  return fallback;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
        notes: ["No video was rendered or saved."],
      } satisfies RenderAndSaveResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
        notes: ["No video was rendered or saved."],
      } satisfies RenderAndSaveResult,
      { status: 400 }
    );
  }

  const { episodeSlug: rawSlug, width: rawWidth, height: rawHeight, fps: rawFps } = body;

  if (!validateSlug(rawSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "episodeSlug is required and must be a valid slug.",
        notes: ["No video was rendered or saved."],
      } satisfies RenderAndSaveResult,
      { status: 400 }
    );
  }
  const episodeSlug = rawSlug as string;

  const width = positiveInt(rawWidth, RENDER_WIDTH, 3840);
  const height = positiveInt(rawHeight, RENDER_HEIGHT, 2160);
  const fps = positiveInt(rawFps, RENDER_FPS, 60);

  // ── Check env vars ──────────────────────────────────────────────────────────
  const githubToken = process.env.GITHUB_TOKEN;
  const githubOwner = process.env.GITHUB_OWNER;
  const githubRepo = process.env.GITHUB_REPO;
  const githubBranch = process.env.GITHUB_BRANCH;
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

  if (!githubToken || !githubOwner || !githubRepo || !githubBranch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured. Set GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH.",
        notes: ["No video was rendered or saved."],
      } satisfies RenderAndSaveResult,
      { status: 503 }
    );
  }

  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Media storage is not configured. Set BLOB_READ_WRITE_TOKEN.",
        notes: ["No video was rendered or saved."],
      } satisfies RenderAndSaveResult,
      { status: 503 }
    );
  }

  // ── Load episode ────────────────────────────────────────────────────────────
  const result = loadEpisodeBySlug(episodeSlug);
  if (!result) {
    return Response.json(
      {
        ok: false,
        status: "episode_not_found",
        message: `Episode not found: ${episodeSlug}`,
        episodeSlug,
        notes: ["No video was rendered or saved."],
      } satisfies RenderAndSaveResult,
      { status: 404 }
    );
  }

  // ── Build assembly package & check readiness ────────────────────────────────
  const assemblyPkg = buildFinalVideoAssemblyPackage(result.raw);
  const readiness = buildFinalVideoRenderReadiness(assemblyPkg);

  if (readiness.status === "blocked") {
    return Response.json(
      {
        ok: false,
        status: "render_blocked",
        message: `Episode is not ready for rendering: ${readiness.blockers.join("; ")}`,
        episodeSlug,
        notes: ["No video was rendered or saved.", "Resolve blockers before rendering."],
      } satisfies RenderAndSaveResult,
      { status: 422 }
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  console.info(`[render-and-save] Starting render for episode: ${episodeSlug}`);

  const renderResult = await renderFinalVideo(assemblyPkg, { width, height, fps });

  if (!renderResult.ok) {
    return Response.json(
      {
        ok: false,
        status: "render_failed",
        message: renderResult.error,
        episodeSlug,
        notes: ["No video was saved.", "No episode JSON was changed."],
      } satisfies RenderAndSaveResult,
      { status: 500 }
    );
  }

  // ── Upload to Blob ──────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const timestamp = Date.now();
  const blobPath = `final-videos/${episodeSlug}/${timestamp}-final-story-video.mp4`;

  let blobUrl: string;
  let blobPathname: string;

  try {
    const blob = await put(blobPath, renderResult.outputStream(), {
      access: "public",
      contentType: "video/mp4",
      token: blobToken,
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
    console.info(`[render-and-save] Uploaded to Blob: ${blobPathname}`);
  } catch (err) {
    await cleanupPath(renderResult.outputPath);
    const message =
      err instanceof BlobError
        ? `Blob upload failed: ${err.message}`
        : "Blob upload failed due to an unexpected error.";
    return Response.json(
      {
        ok: false,
        status: "blob_upload_failed",
        message,
        episodeSlug,
        notes: ["No episode JSON was changed.", "The rendered video was not saved."],
      } satisfies RenderAndSaveResult,
      { status: 502 }
    );
  } finally {
    // Clean up temp file regardless of upload outcome
    await cleanupPath(renderResult.outputPath);
  }

  // ── Build final video metadata ──────────────────────────────────────────────
  const finalVideoId = `final-video-${timestamp}`;
  const finalVideo: FinalVideoAsset = {
    id: finalVideoId,
    type: "final-story-video",
    status: "saved",
    visibility: "admin-only",
    url: blobUrl,
    pathname: blobPathname,
    mimeType: "video/mp4",
    sizeBytes: renderResult.sizeBytes,
    durationSeconds: renderResult.durationSeconds,
    width,
    height,
    fps,
    renderEngine: "ffmpeg-static",
    sourceAssemblySummary: {
      totalSegments: readiness.summary.totalSegments,
      animatedClipSegments: readiness.summary.animatedClipSegments,
      storyPanelSegments: readiness.summary.storyPanelSegments,
      textOnlySegments: readiness.summary.textOnlySegments,
      hasNarrationAudio: readiness.summary.hasPublicReadyNarration,
    },
    createdAt: now,
    attachedAt: now,
  };

  // ── Fetch episode from GitHub ───────────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string;
  let episode: Record<string, unknown>;

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(githubBranch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (!getRes.ok) {
      return Response.json(
        {
          ok: false,
          status: "blob_saved_not_attached",
          message: `Video was saved to Blob but GitHub fetch failed (${getRes.status}). The episode JSON was not updated.`,
          episodeSlug,
          blobUrl,
          notes: [
            "Final video was saved to Blob storage.",
            "Episode JSON was NOT updated. Attach manually if needed.",
          ],
        } satisfies RenderAndSaveResult,
        { status: 207 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        {
          ok: false,
          status: "blob_saved_not_attached",
          message: "Video saved to Blob but GitHub response was missing file SHA.",
          episodeSlug,
          blobUrl,
          notes: ["Final video was saved to Blob storage.", "Episode JSON was NOT updated."],
        } satisfies RenderAndSaveResult,
        { status: 207 }
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
          status: "blob_saved_not_attached",
          message: "Video saved to Blob but episode JSON could not be parsed.",
          episodeSlug,
          blobUrl,
          notes: ["Final video was saved to Blob storage.", "Episode JSON was NOT updated."],
        } satisfies RenderAndSaveResult,
        { status: 207 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json(
      {
        ok: false,
        status: "blob_saved_not_attached",
        message: "Video saved to Blob but could not reach the GitHub API.",
        episodeSlug,
        blobUrl,
        notes: ["Final video was saved to Blob storage.", "Episode JSON was NOT updated."],
      } satisfies RenderAndSaveResult,
      { status: 207 }
    );
  }

  // ── Update episode JSON ─────────────────────────────────────────────────────
  // Preserve previous finalVideo in history (max 3 entries)
  const prevFinalVideo = isRecord(episode.finalVideo) ? episode.finalVideo : null;
  const existingHistory = Array.isArray(episode.finalVideoHistory)
    ? (episode.finalVideoHistory as unknown[]).slice(-2) // keep last 2
    : [];
  const finalVideoHistory = prevFinalVideo
    ? [...existingHistory, prevFinalVideo]
    : existingHistory.length > 0
    ? existingHistory
    : undefined;

  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0 ? episode.title : episodeSlug;

  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    finalVideo,
    updatedAt: now,
    ...(finalVideoHistory && finalVideoHistory.length > 0 ? { finalVideoHistory } : {}),
  };

  const commitMessage = `Render and save final story video: ${episodeTitle}`;
  const fileContent = JSON.stringify(updatedEpisode, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  // ── Commit to GitHub ────────────────────────────────────────────────────────
  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch: githubBranch,
        sha: existingSha,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      console.error(`[render-and-save] GitHub PUT failed (${putRes.status}):`, errText);
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: `Video saved to Blob but GitHub commit failed (${putRes.status}).`,
          episodeSlug,
          blobUrl,
          notes: [
            "Final video was saved to Blob storage.",
            "Episode JSON was NOT updated. Commit failed.",
          ],
        } satisfies RenderAndSaveResult,
        { status: 207 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    return Response.json(
      {
        ok: false,
        status: "github_save_failed",
        message: "Video saved to Blob but GitHub commit failed due to a network error.",
        episodeSlug,
        blobUrl,
        notes: [
          "Final video was saved to Blob storage.",
          "Episode JSON was NOT updated.",
        ],
      } satisfies RenderAndSaveResult,
      { status: 207 }
    );
  }

  // ── Success ─────────────────────────────────────────────────────────────────
  console.info(`[render-and-save] Done. Episode: ${episodeSlug}, video: ${blobUrl}`);

  return Response.json(
    {
      ok: true,
      status: "final_video_rendered_and_saved",
      episodeSlug,
      finalVideo,
      path: filePath,
      commitMessage,
      warnings: renderResult.warnings,
      notes: [
        "Final story video was rendered and saved to media storage.",
        "Final video metadata was attached to the episode JSON.",
        "Visibility is admin-only by default.",
        "Public final video display will be added in a future phase.",
      ],
    } satisfies RenderAndSaveResult,
    { status: 200 }
  );
}
