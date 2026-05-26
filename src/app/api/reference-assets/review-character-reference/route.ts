// POST /api/reference-assets/review-character-reference
// Admin-only: Save review decision for an uploaded character reference asset.
// Updates reviewStatus, approvedForGeneration, and related fields in GitHub JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not delete Blob files. Does not modify official character image files.
//          Does not change character approval/status fields.
//          Only updates review metadata in character-reference-assets.json on GitHub.

import type { UploadedReferenceAsset, ReviewStatus } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const GITHUB_JSON_PATH =
  "src/content/reference-assets/character-reference-assets.json";

const VALID_REVIEW_STATUSES: ReviewStatus[] = [
  "needs-review",
  "approved-for-generation",
  "rejected",
  "archived",
];

// Safe asset id: lowercase letters, numbers, hyphens only
const SAFE_ASSET_ID = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewResult =
  | {
      ok: true;
      status: "reference_asset_reviewed";
      path: string;
      commitMessage: string;
      asset: UploadedReferenceAsset;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "reference_assets_not_found"
        | "invalid_reference_assets_json"
        | "asset_not_found"
        | "github_error";
      message: string;
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isReviewStatus(v: unknown): v is ReviewStatus {
  return (
    typeof v === "string" &&
    (VALID_REVIEW_STATUSES as string[]).includes(v)
  );
}

function hasDangerousContent(s: string): boolean {
  return /<[a-z/]/i.test(s) || /javascript\s*:/i.test(s);
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
      } satisfies ReviewResult,
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
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  // ── Validate assetId ─────────────────────────────────────────────────────────
  const assetId = body.assetId;
  if (
    typeof assetId !== "string" ||
    assetId.trim().length === 0 ||
    !SAFE_ASSET_ID.test(assetId.trim()) ||
    assetId.length > 120
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "assetId must be a non-empty string with only lowercase letters, numbers, and hyphens.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  const cleanAssetId = assetId.trim();

  // ── Validate reviewStatus ────────────────────────────────────────────────────
  const reviewStatus = body.reviewStatus;
  if (!isReviewStatus(reviewStatus)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `reviewStatus must be one of: ${VALID_REVIEW_STATUSES.join(", ")}.`,
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  // ── Validate boolean fields ──────────────────────────────────────────────────
  const approvedForGeneration = body.approvedForGeneration;
  if (typeof approvedForGeneration !== "boolean") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "approvedForGeneration must be a boolean.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  const generationUseAllowed = body.generationUseAllowed;
  if (typeof generationUseAllowed !== "boolean") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "generationUseAllowed must be a boolean.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  const publicUseAllowed = body.publicUseAllowed;
  if (typeof publicUseAllowed !== "boolean") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "publicUseAllowed must be a boolean.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  const isOfficialReference = body.isOfficialReference;
  if (typeof isOfficialReference !== "boolean") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "isOfficialReference must be a boolean.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  // ── Validate reviewNotes ─────────────────────────────────────────────────────
  const rawNotes = body.reviewNotes;
  const reviewNotes =
    typeof rawNotes === "string" ? rawNotes.trim().slice(0, 1000) : "";
  if (reviewNotes && hasDangerousContent(reviewNotes)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "reviewNotes contains invalid content.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  // ── Enforce consistency rules ────────────────────────────────────────────────
  if (reviewStatus !== "approved-for-generation" && approvedForGeneration) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "approvedForGeneration must be false unless reviewStatus is approved-for-generation.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  if (reviewStatus !== "approved-for-generation" && generationUseAllowed) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "generationUseAllowed must be false unless reviewStatus is approved-for-generation.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  if (!approvedForGeneration && generationUseAllowed) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "generationUseAllowed must be false when approvedForGeneration is false.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  if (publicUseAllowed && reviewStatus !== "approved-for-generation") {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "publicUseAllowed must be false unless reviewStatus is approved-for-generation.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }
  if (publicUseAllowed && (!approvedForGeneration || !generationUseAllowed)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "publicUseAllowed requires approvedForGeneration and generationUseAllowed to both be true.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  // ── Read reference assets JSON from GitHub ───────────────────────────────────
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_JSON_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string;
  let existingAssets: UploadedReferenceAsset[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.status === 404) {
      return Response.json(
        {
          ok: false,
          status: "reference_assets_not_found",
          message: "Reference assets metadata file was not found.",
        } satisfies ReviewResult,
        { status: 404 }
      );
    }

    if (!getRes.ok) {
      const errText = await getRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to read reference assets JSON from GitHub (${getRes.status}): ${errText.slice(0, 200)}`,
        } satisfies ReviewResult,
        { status: 502 }
      );
    }

    const getData = (await getRes.json()) as Record<string, unknown>;
    if (typeof getData.sha !== "string") {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Could not read file SHA from GitHub.",
        } satisfies ReviewResult,
        { status: 502 }
      );
    }
    existingSha = getData.sha;

    if (typeof getData.content !== "string") {
      return Response.json(
        {
          ok: false,
          status: "invalid_reference_assets_json",
          message: "Reference assets metadata file could not be parsed.",
        } satisfies ReviewResult,
        { status: 422 }
      );
    }

    try {
      const decoded = Buffer.from(
        getData.content.replace(/\n/g, ""),
        "base64"
      ).toString("utf8");
      const parsed = JSON.parse(decoded) as Record<string, unknown>;
      if (Array.isArray(parsed.assets)) {
        existingAssets = parsed.assets.filter(
          (a): a is UploadedReferenceAsset =>
            isRecord(a) && typeof a.id === "string"
        );
      }
    } catch {
      return Response.json(
        {
          ok: false,
          status: "invalid_reference_assets_json",
          message: "Reference assets metadata file could not be parsed.",
        } satisfies ReviewResult,
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
      } satisfies ReviewResult,
      { status: 502 }
    );
  }

  // ── Find asset by id ─────────────────────────────────────────────────────────
  const assetIndex = existingAssets.findIndex((a) => a.id === cleanAssetId);
  if (assetIndex === -1) {
    return Response.json(
      {
        ok: false,
        status: "asset_not_found",
        message: "Reference asset was not found.",
      } satisfies ReviewResult,
      { status: 404 }
    );
  }

  // ── Build updated asset ──────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const existing = existingAssets[assetIndex];
  const updatedAsset: UploadedReferenceAsset = {
    ...existing,
    approvedForGeneration,
    requiresReview: reviewStatus === "needs-review",
    reviewStatus,
    reviewedAt: now,
    reviewedBy: typeof body.reviewedBy === "string" ? body.reviewedBy.slice(0, 50) : "admin",
    generationUseAllowed,
    publicUseAllowed,
    isOfficialReference,
    reviewNotes: reviewNotes || undefined,
    updatedAt: now,
  };

  const updatedAssets = [
    ...existingAssets.slice(0, assetIndex),
    updatedAsset,
    ...existingAssets.slice(assetIndex + 1),
  ];

  // ── Build commit message ──────────────────────────────────────────────────────
  const assetTitle = existing.title || existing.id;
  let action: string;
  if (reviewStatus === "approved-for-generation") action = "Approve";
  else if (reviewStatus === "rejected") action = "Reject";
  else if (reviewStatus === "archived") action = "Archive";
  else action = "Review";
  const commitMessage = `${action} character reference asset: ${assetTitle}`;

  // ── Commit updated JSON to GitHub ────────────────────────────────────────────
  const updatedJson = JSON.stringify({ assets: updatedAssets }, null, 2) + "\n";
  const updatedBase64 = Buffer.from(updatedJson, "utf8").toString("base64");

  const commitBody = {
    message: commitMessage,
    content: updatedBase64,
    branch,
    sha: existingSha,
  };

  let htmlUrl = "";
  try {
    const putRes = await fetch(apiUrl, {
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
          message: `Failed to commit review metadata to GitHub (${putRes.status}): ${errText.slice(0, 200)}`,
        } satisfies ReviewResult,
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
      } satisfies ReviewResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "reference_asset_reviewed",
      path: GITHUB_JSON_PATH,
      commitMessage,
      asset: updatedAsset,
      htmlUrl,
      notes: [
        "Reference asset review metadata was updated.",
        "The asset is not connected to generation yet.",
        "Vercel redeploy is required before updated review status appears everywhere.",
      ],
    } satisfies ReviewResult,
    { status: 200 }
  );
}
