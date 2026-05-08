// POST /api/github/update-character-approval
// Admin-only: Update character approval metadata in GitHub JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only updates approval metadata fields. Does not change character identity,
//          visual data, image paths, or official asset files.
//          Generation approval requires at least one approved generation reference asset.

import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const CHARACTERS_PATH = "src/content/characters";
const REFERENCE_ASSETS_PATH =
  "src/content/reference-assets/character-reference-assets.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalData = {
  status: "draft" | "approved";
  canonStatus: string;
  publicStatus: string;
  approvedForStories: boolean;
  approvedForGeneration: boolean;
  referenceAssetsReviewed: boolean;
  generationUseAllowed: boolean;
  publicUseAllowed: boolean;
  approvalNotes?: string;
};

type ApprovalResult =
  | {
      ok: true;
      status: "character_approval_updated";
      path: string;
      commitMessage: string;
      character: Record<string, unknown>;
      approvedReferenceCount: number;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "character_not_found"
        | "invalid_character_json"
        | "missing_approved_references"
        | "github_error";
      message: string;
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidSlug(slug: unknown): slug is string {
  return (
    typeof slug === "string" &&
    SAFE_SLUG.test(slug) &&
    slug.length <= 80 &&
    !slug.includes("/") &&
    !slug.includes(".")
  );
}

function decodeGitHubContent(content: string): string {
  return Buffer.from(content.replace(/\n/g, ""), "base64").toString("utf8");
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
  // ── Check GitHub configuration ───────────────────────────────────────────────
  const ghToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!ghToken || !owner || !repo || !branch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured yet.",
      } satisfies ApprovalResult,
      { status: 503 }
    );
  }

  // ── Parse request body ───────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }

  // ── Validate characterSlug ───────────────────────────────────────────────────
  if (!isValidSlug(body.characterSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "characterSlug must be lowercase letters, numbers, and hyphens only.",
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug as string;

  // ── Validate approval object ─────────────────────────────────────────────────
  const approval = body.approval;
  if (!isRecord(approval)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "approval must be an object.",
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }

  const {
    status: apStatus,
    canonStatus,
    publicStatus,
    approvedForStories,
    approvedForGeneration,
    referenceAssetsReviewed,
    generationUseAllowed,
    publicUseAllowed,
    approvalNotes,
  } = approval as Record<string, unknown>;

  if (apStatus !== "draft" && apStatus !== "approved") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: 'approval.status must be "draft" or "approved".',
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }
  for (const [key, val] of [
    ["approvedForStories", approvedForStories],
    ["approvedForGeneration", approvedForGeneration],
    ["referenceAssetsReviewed", referenceAssetsReviewed],
    ["generationUseAllowed", generationUseAllowed],
    ["publicUseAllowed", publicUseAllowed],
  ] as [string, unknown][]) {
    if (typeof val !== "boolean") {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: `approval.${key} must be a boolean.`,
        } satisfies ApprovalResult,
        { status: 400 }
      );
    }
  }

  // Consistency: public requires stories approval
  if (publicUseAllowed === true && approvedForStories !== true) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "approvedForStories must be true before a character can be made public.",
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }

  // ── GitHub API setup ─────────────────────────────────────────────────────────
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const ref = `?ref=${encodeURIComponent(branch)}`;

  // ── Fetch reference assets from GitHub ───────────────────────────────────────
  let approvedReferenceCount = 0;

  try {
    const refAssetsUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${REFERENCE_ASSETS_PATH}${ref}`;
    const refRes = await fetch(refAssetsUrl, {
      method: "GET",
      headers: ghHeaders,
    });

    if (refRes.ok) {
      const refData = (await refRes.json()) as Record<string, unknown>;
      if (typeof refData.content === "string") {
        const decoded = decodeGitHubContent(refData.content);
        const parsed = JSON.parse(decoded) as Record<string, unknown>;
        if (Array.isArray(parsed.assets)) {
          approvedReferenceCount = (
            parsed.assets as UploadedReferenceAsset[]
          ).filter(
            (a) =>
              a.characterSlug === characterSlug &&
              a.reviewStatus === "approved" &&
              a.approvedForGeneration === true &&
              a.generationUseAllowed === true
          ).length;
        }
      }
    }
    // If reference assets file doesn't exist, count stays at 0
  } catch {
    // Non-fatal — treat as 0 approved references
  }

  // ── Gate generation approval on approved references ──────────────────────────
  if (
    (approvedForGeneration === true || generationUseAllowed === true) &&
    approvedReferenceCount === 0
  ) {
    return Response.json(
      {
        ok: false,
        status: "missing_approved_references",
        message:
          "This character needs at least one approved generation reference asset before generation approval.",
      } satisfies ApprovalResult,
      { status: 422 }
    );
  }

  // ── Fetch character JSON from GitHub ─────────────────────────────────────────
  const charPath = `${CHARACTERS_PATH}/${characterSlug}.json`;
  const charUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${charPath}${ref}`;

  let charSha: string;
  let existingChar: Record<string, unknown>;

  try {
    const charRes = await fetch(charUrl, { method: "GET", headers: ghHeaders });

    if (charRes.status === 404) {
      return Response.json(
        {
          ok: false,
          status: "character_not_found",
          message: "Character file was not found.",
        } satisfies ApprovalResult,
        { status: 404 }
      );
    }
    if (!charRes.ok) {
      const errText = await charRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to read character JSON from GitHub (${charRes.status}): ${errText.slice(0, 200)}`,
        } satisfies ApprovalResult,
        { status: 502 }
      );
    }

    const charData = (await charRes.json()) as Record<string, unknown>;
    if (typeof charData.sha !== "string") {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Could not read character file SHA from GitHub.",
        } satisfies ApprovalResult,
        { status: 502 }
      );
    }
    charSha = charData.sha;

    if (typeof charData.content !== "string") {
      return Response.json(
        {
          ok: false,
          status: "invalid_character_json",
          message: "Character file could not be parsed.",
        } satisfies ApprovalResult,
        { status: 422 }
      );
    }

    try {
      existingChar = JSON.parse(decodeGitHubContent(charData.content)) as Record<string, unknown>;
    } catch {
      return Response.json(
        {
          ok: false,
          status: "invalid_character_json",
          message: "Character file could not be parsed.",
        } satisfies ApprovalResult,
        { status: 422 }
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub read failed: ${msg}`,
      } satisfies ApprovalResult,
      { status: 502 }
    );
  }

  // ── Merge approval fields into existing character ─────────────────────────────
  const now = new Date().toISOString();
  const isMovingToApproved = existingChar.status === "draft" && apStatus === "approved";

  const updatedChar: Record<string, unknown> = {
    ...existingChar,
    status: apStatus,
    canonStatus: typeof canonStatus === "string" ? canonStatus : apStatus,
    publicStatus: typeof publicStatus === "string" ? publicStatus : (publicUseAllowed ? "public" : "private"),
    approvedForStories,
    approvedForGeneration,
    referenceAssetsReviewed,
    generationUseAllowed,
    publicUseAllowed,
    approvalNotes:
      typeof approvalNotes === "string" && (approvalNotes as string).trim()
        ? (approvalNotes as string).trim().slice(0, 500)
        : existingChar.approvalNotes ?? undefined,
    updatedAt: now,
  };

  if (isMovingToApproved) {
    updatedChar.approvedAt = now;
  }

  // ── Build commit message ──────────────────────────────────────────────────────
  const charName = typeof existingChar.name === "string" ? existingChar.name : characterSlug;
  let commitMessage: string;
  if (apStatus === "draft") {
    commitMessage = `Set character private: ${charName}`;
  } else if (publicUseAllowed === true) {
    commitMessage = `Publish character: ${charName}`;
  } else if (approvedForGeneration === true) {
    commitMessage = `Approve character for stories + generation: ${charName}`;
  } else if (approvedForStories === true) {
    commitMessage = `Approve character for stories: ${charName}`;
  } else {
    commitMessage = `Update character approval: ${charName}`;
  }

  // ── Commit updated character JSON to GitHub ───────────────────────────────────
  const updatedJson = JSON.stringify(updatedChar, null, 2) + "\n";
  const updatedBase64 = Buffer.from(updatedJson, "utf8").toString("base64");

  const charApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${charPath}`;
  const commitBody = {
    message: commitMessage,
    content: updatedBase64,
    branch,
    sha: charSha,
  };

  let htmlUrl = "";
  try {
    const putRes = await fetch(charApiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(commitBody),
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to commit character approval to GitHub (${putRes.status}): ${errText.slice(0, 200)}`,
        } satisfies ApprovalResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    htmlUrl = getHtmlUrl(putData);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub commit failed: ${msg}`,
      } satisfies ApprovalResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "character_approval_updated",
      path: charPath,
      commitMessage,
      character: updatedChar,
      approvedReferenceCount,
      htmlUrl,
      notes: [
        "Character approval metadata was updated.",
        "Vercel redeploy is required before character availability updates across the app.",
      ],
    } satisfies ApprovalResult,
    { status: 200 }
  );
}
