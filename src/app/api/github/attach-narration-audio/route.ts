// POST /api/github/attach-narration-audio
// Attaches approved narration audio metadata to a saved episode JSON in GitHub.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not publish audio. Does not generate audio. Does not delete Blob assets.
//          Does not modify scenes, characters, panels, or publishing flags.
//          Does not accept arbitrary file paths — slug is validated, path is server-controlled.
// Phase:   13E — Attach Approved Narration Audio to Episode JSON.

import type { EpisodeAudioNarration } from "@/lib/audioNarrationTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type AttachAudioResult =
  | {
      ok: true;
      status: "narration_audio_attached";
      episodeSlug: string;
      path: string;
      commitMessage: string;
      audioNarration: EpisodeAudioNarration;
      htmlUrl: string;
      notes: string[];
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

const ALLOWED_AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
] as const;

function isAllowedAudioMime(v: unknown): boolean {
  return typeof v === "string" && (ALLOWED_AUDIO_MIME as readonly string[]).includes(v);
}

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 8;
}

function safeStr(v: unknown, max = 0): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return max > 0 ? s.slice(0, max) : s;
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
  return "";
}

// Strip any HTML/script from a string — just in case review notes contain markup
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, "").slice(0, 1000);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies AttachAudioResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies AttachAudioResult,
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
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies AttachAudioResult,
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
      } satisfies AttachAudioResult,
      { status: 400 }
    );
  }
  const episodeSlug = body.episodeSlug as string;

  // ── Validate audio object ────────────────────────────────────────────────────
  const audio = body.audio;
  if (!isRecord(audio)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "audio is required and must be an object." } satisfies AttachAudioResult,
      { status: 400 }
    );
  }

  if (!isHttpsUrl(audio.url)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "audio.url must be a non-empty https URL." } satisfies AttachAudioResult,
      { status: 400 }
    );
  }

  if (!isAllowedAudioMime(audio.mimeType)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "audio.mimeType must be one of: audio/mpeg, audio/mp3, audio/wav, audio/webm, audio/ogg.",
      } satisfies AttachAudioResult,
      { status: 400 }
    );
  }

  const audioProvider = safeStr(audio.provider) || "elevenlabs";
  if (!/^[a-z0-9_-]{1,64}$/.test(audioProvider)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "audio.provider contains invalid characters." } satisfies AttachAudioResult,
      { status: 400 }
    );
  }

  const rawId = safeStr(audio.id);
  const audioId = rawId && /^[a-zA-Z0-9_-]{1,128}$/.test(rawId)
    ? rawId
    : `audio-${Date.now()}`;

  const reviewNotes = audio.reviewNotes ? stripHtml(safeStr(audio.reviewNotes, 1000)) : "";
  const scriptText = safeStr(audio.scriptText, 10000);

  // ── Build server-controlled file path ────────────────────────────────────────
  const filePath = `src/content/episodes/${episodeSlug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Fetch existing episode JSON from GitHub ───────────────────────────────────
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
        } satisfies AttachAudioResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      console.error(`[attach-narration-audio] GitHub GET failed (${getRes.status}):`, filePath);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to fetch episode file from GitHub.",
          githubStatus: getRes.status,
          targetPath: filePath,
          branch,
        } satisfies AttachAudioResult,
        { status: 502 }
      );
    }

    const fileData = (await getRes.json()) as Record<string, unknown>;
    if (typeof fileData.sha !== "string") {
      return Response.json(
        { ok: false, status: "github_error", message: "GitHub response was missing file SHA." } satisfies AttachAudioResult,
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
        } satisfies AttachAudioResult,
        { status: 422 }
      );
    }
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[attach-narration-audio] Network error fetching episode:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies AttachAudioResult,
      { status: 502 }
    );
  }

  // ── Build updated audioNarration field ────────────────────────────────────────
  const now = new Date().toISOString();

  const audioNarration: EpisodeAudioNarration = {
    id: audioId,
    type: "episode-narration",
    status: "approved",
    provider: audioProvider,
    voiceId: safeStr(audio.voiceId) || undefined,
    modelId: safeStr(audio.modelId) || undefined,
    voiceStyle: safeStr(audio.voiceStyle) || undefined,
    url: audio.url as string,
    pathname: safeStr(audio.pathname) || undefined,
    mimeType: audio.mimeType as string,
    sizeBytes: typeof audio.sizeBytes === "number" ? audio.sizeBytes : undefined,
    scriptText: scriptText || undefined,
    reviewNotes: reviewNotes || undefined,
    approvedBy: safeStr(audio.approvedBy) || "admin",
    approvedAt: safeStr(audio.approvedAt) || now,
    attachedAt: now,
    visibility: "admin-only",
  };

  // ── Preserve history if previous audioNarration exists ────────────────────────
  const previousAudioNarration = isRecord(episode.audioNarration) ? episode.audioNarration : null;
  const existingHistory = Array.isArray(episode.audioNarrationHistory)
    ? episode.audioNarrationHistory
    : [];

  const audioNarrationHistory = previousAudioNarration
    ? [...existingHistory, previousAudioNarration]
    : existingHistory.length > 0
    ? existingHistory
    : undefined;

  // ── Build updated episode (preserve all other fields) ────────────────────────
  const updatedEpisode: Record<string, unknown> = {
    ...episode,
    audioNarration,
    updatedAt: now,
    ...(audioNarrationHistory && audioNarrationHistory.length > 0
      ? { audioNarrationHistory }
      : {}),
  };

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const episodeTitle =
    typeof episode.title === "string" && episode.title.length > 0
      ? episode.title
      : episodeSlug;

  const commitMessage = `Attach narration audio to episode: ${episodeTitle}`;
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
      console.error(`[attach-narration-audio] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
          githubStatus: putRes.status,
          targetPath: filePath,
          branch,
        } satisfies AttachAudioResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "narration_audio_attached",
        episodeSlug,
        path: filePath,
        commitMessage,
        audioNarration,
        htmlUrl,
        notes: [
          "Approved narration audio metadata was attached to the episode JSON.",
          "The audio is not public yet.",
          "Public audio playback will be added in a future phase.",
          "Vercel redeploy is required before the attached audio appears everywhere.",
        ],
      } satisfies AttachAudioResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[attach-narration-audio] Network error committing file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit the updated episode file to GitHub." } satisfies AttachAudioResult,
      { status: 502 }
    );
  }
}
