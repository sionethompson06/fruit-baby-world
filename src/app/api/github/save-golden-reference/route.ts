// POST /api/github/save-golden-reference
// Saves a new Golden Reference to src/content/golden-references.json in GitHub.
// Only stable, already-saved image URLs should be sent — not temporary base64.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Admin-only. Never exposes images publicly. Metadata only (no raw image data).

import {
  createGoldenReferenceFromSource,
  GOLDEN_REFS_FILE_PATH,
  type GoldenReferenceRole,
  type GoldenReferenceSourceType,
  type StoryPanelGoldenReference,
} from "@/lib/storyPanelGoldenReferences";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveGoldenReferenceResult =
  | {
      ok: true;
      status: "golden_reference_saved";
      goldenReference: StoryPanelGoldenReference;
      path: string;
      commitMessage: string;
      htmlUrl: string;
      totalCount: number;
    }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "validation_error"
        | "setup_required"
        | "github_save_failed"
        | "duplicate_reference"
        | "invalid_reference_role"
        | "storage_missing";
      message: string;
    };

// ─── Validation constants ─────────────────────────────────────────────────────

const VALID_SOURCE_TYPES: GoldenReferenceSourceType[] = [
  "story-panel",
  "harmonized-panel",
  "assembled-panel",
  "background-layer",
  "character-layer",
];

const VALID_ROLES: GoldenReferenceRole[] = [
  "character-fidelity",
  "environment",
  "pose-expression",
  "scene-composition",
  "multi-character-interaction",
  "style-polish",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isHttpsUrl(v: unknown): boolean {
  return typeof v === "string" && v.startsWith("https://") && v.length > 8;
}

function getHtmlUrl(putData: Record<string, unknown>): string {
  const content = putData.content;
  if (isRecord(content) && typeof content.html_url === "string") return content.html_url;
  const commit = putData.commit;
  if (isRecord(commit) && typeof commit.html_url === "string") return commit.html_url;
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  // ── GitHub config ─────────────────────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies SaveGoldenReferenceResult,
      { status: 503 }
    );
  }

  // ── Validate required fields ─────────────────────────────────────────────────
  if (!isHttpsUrl(body.imageUrl)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "imageUrl is required and must be an https URL. Save the panel to media storage first before saving as a Golden Reference.",
      } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  if (typeof body.title !== "string" || body.title.trim().length === 0) {
    return Response.json(
      { ok: false, status: "validation_error", message: "title is required." } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  if (!VALID_ROLES.includes(body.referenceRole as GoldenReferenceRole)) {
    return Response.json(
      {
        ok: false,
        status: "invalid_reference_role",
        message: `referenceRole must be one of: ${VALID_ROLES.join(", ")}.`,
      } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  if (!VALID_SOURCE_TYPES.includes(body.sourceType as GoldenReferenceSourceType)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `sourceType must be one of: ${VALID_SOURCE_TYPES.join(", ")}.`,
      } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  if (
    body.characterSlugs !== undefined &&
    (!Array.isArray(body.characterSlugs) || body.characterSlugs.some((s) => typeof s !== "string"))
  ) {
    return Response.json(
      { ok: false, status: "validation_error", message: "characterSlugs must be an array of strings." } satisfies SaveGoldenReferenceResult,
      { status: 400 }
    );
  }

  const characterSlugs: string[] = Array.isArray(body.characterSlugs)
    ? (body.characterSlugs as string[])
    : [];

  const tags: string[] =
    Array.isArray(body.tags) && body.tags.every((t) => typeof t === "string")
      ? (body.tags as string[])
      : [];

  // ── Fetch existing golden-references.json from GitHub ─────────────────────────
  const filePath = GOLDEN_REFS_FILE_PATH;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string | undefined;
  let existingRefs: StoryPanelGoldenReference[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.ok) {
      const fileData = (await getRes.json()) as Record<string, unknown>;
      existingSha = typeof fileData.sha === "string" ? fileData.sha : undefined;

      const rawContent =
        typeof fileData.content === "string"
          ? Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8")
          : '{"goldenReferences":[]}';

      try {
        const parsed = JSON.parse(rawContent) as { goldenReferences?: unknown };
        if (Array.isArray(parsed.goldenReferences)) {
          existingRefs = parsed.goldenReferences as StoryPanelGoldenReference[];
        }
      } catch {
        existingRefs = [];
      }
    } else if (getRes.status !== 404) {
      console.error(`[save-golden-reference] GitHub GET failed (${getRes.status})`);
      return Response.json(
        { ok: false, status: "github_save_failed", message: "Failed to fetch existing golden references from GitHub." } satisfies SaveGoldenReferenceResult,
        { status: 502 }
      );
    }
    // 404 = file doesn't exist yet, that's OK — we'll create it
  } catch (err) {
    console.error("[save-golden-reference] Network error fetching from GitHub:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Failed to reach the GitHub API." } satisfies SaveGoldenReferenceResult,
      { status: 502 }
    );
  }

  // ── Check for duplicate (same imageUrl + referenceRole) ───────────────────────
  const imageUrl = body.imageUrl as string;
  const referenceRole = body.referenceRole as GoldenReferenceRole;

  const isDuplicate = existingRefs.some(
    (r) => r.imageUrl === imageUrl && r.referenceRole === referenceRole
  );
  if (isDuplicate) {
    return Response.json(
      {
        ok: false,
        status: "duplicate_reference",
        message: "A golden reference with this imageUrl and referenceRole already exists.",
      } satisfies SaveGoldenReferenceResult,
      { status: 409 }
    );
  }

  // ── Create and append new golden reference ────────────────────────────────────
  const newRef = createGoldenReferenceFromSource({
    sourceType: body.sourceType as GoldenReferenceSourceType,
    sourceId: typeof body.sourceId === "string" ? body.sourceId : undefined,
    episodeSlug: typeof body.episodeSlug === "string" ? body.episodeSlug : undefined,
    sceneId: typeof body.sceneId === "string" ? body.sceneId : undefined,
    sceneNumber: typeof body.sceneNumber === "number" ? body.sceneNumber : undefined,
    panelId: typeof body.panelId === "string" ? body.panelId : undefined,
    characterSlugs,
    primaryCharacterSlug: typeof body.primaryCharacterSlug === "string" ? body.primaryCharacterSlug : undefined,
    referenceRole,
    title: (body.title as string).trim(),
    description: typeof body.description === "string" && body.description.trim() ? body.description.trim() : undefined,
    imageUrl,
    pathname: typeof body.pathname === "string" ? body.pathname : undefined,
    mimeType: typeof body.mimeType === "string" ? body.mimeType : undefined,
    tags,
    qualityNotes: typeof body.qualityNotes === "string" && body.qualityNotes.trim() ? body.qualityNotes.trim() : undefined,
  });

  const updatedRefs = [...existingRefs, newRef];
  const updatedFileContent = JSON.stringify({ goldenReferences: updatedRefs }, null, 2);
  const contentBase64 = Buffer.from(updatedFileContent, "utf-8").toString("base64");

  // ── Commit to GitHub ──────────────────────────────────────────────────────────
  const commitMessage = `Add golden reference: ${newRef.title} [${referenceRole}]`;

  const putBody: Record<string, unknown> = {
    message: commitMessage,
    content: contentBase64,
    branch,
  };
  if (existingSha) putBody.sha = existingSha;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[save-golden-reference] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_save_failed",
          message: `GitHub commit failed with status ${putRes.status}.`,
        } satisfies SaveGoldenReferenceResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "golden_reference_saved",
        goldenReference: newRef,
        path: filePath,
        commitMessage,
        htmlUrl,
        totalCount: updatedRefs.length,
      } satisfies SaveGoldenReferenceResult,
      { status: 200 }
    );
  } catch (err) {
    console.error("[save-golden-reference] Network error during PUT:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Network error while committing to GitHub." } satisfies SaveGoldenReferenceResult,
      { status: 502 }
    );
  }
}
