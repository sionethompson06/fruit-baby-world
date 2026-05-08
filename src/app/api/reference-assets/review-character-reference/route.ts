// POST /api/reference-assets/review-character-reference
// Admin-only: Save review decision (approve/reject/archive) for an uploaded reference asset.
// Updates reviewStatus, approvedForGeneration, and related fields in GitHub JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not delete Blob files. Does not modify official character image files.
//          Only updates metadata in character-reference-assets.json on GitHub.

import type { UploadedReferenceAsset, ReviewStatus } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const GITHUB_JSON_PATH =
  "src/content/reference-assets/character-reference-assets.json";

const VALID_REVIEW_STATUSES: ReviewStatus[] = [
  "needs-review",
  "approved",
  "rejected",
  "archived",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewBody = {
  assetId: string;
  reviewStatus: ReviewStatus;
  approvedForGeneration: boolean;
  generationUseAllowed: boolean;
  publicUseAllowed: boolean;
  isOfficialReference: boolean;
  reviewNotes: string;
};

type ReviewResult =
  | { ok: true; status: "reviewed"; asset: UploadedReferenceAsset }
  | {
      ok: false;
      status:
        | "validation_error"
        | "not_found"
        | "setup_required"
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
        message: "GitHub saving is not configured.",
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
  if (typeof assetId !== "string" || assetId.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "assetId is required.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

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
  const reviewNotes =
    typeof body.reviewNotes === "string"
      ? body.reviewNotes.trim().slice(0, 1000)
      : "";

  // ── Enforce consistency rules ────────────────────────────────────────────────
  if (
    (reviewStatus === "rejected" || reviewStatus === "archived") &&
    approvedForGeneration
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "approvedForGeneration must be false when reviewStatus is rejected or archived.",
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
  if (!approvedForGeneration && publicUseAllowed) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "publicUseAllowed must be false when approvedForGeneration is false.",
      } satisfies ReviewResult,
      { status: 400 }
    );
  }

  // ── Read existing GitHub JSON ────────────────────────────────────────────────
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_JSON_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string | null = null;
  let existingAssets: UploadedReferenceAsset[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

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
    if (typeof getData.sha === "string") existingSha = getData.sha;
    if (typeof getData.content === "string") {
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
            status: "github_error",
            message: "Failed to parse reference assets JSON from GitHub.",
          } satisfies ReviewResult,
          { status: 502 }
        );
      }
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
  const assetIndex = existingAssets.findIndex((a) => a.id === assetId);
  if (assetIndex === -1) {
    return Response.json(
      {
        ok: false,
        status: "not_found",
        message: `Asset with id "${assetId}" not found.`,
      } satisfies ReviewResult,
      { status: 404 }
    );
  }

  // ── Build updated asset ──────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const updatedAsset: UploadedReferenceAsset = {
    ...existingAssets[assetIndex],
    approvedForGeneration,
    requiresReview: reviewStatus === "needs-review",
    reviewStatus,
    reviewedAt: now,
    reviewedBy: "admin",
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

  // ── Commit updated JSON to GitHub ────────────────────────────────────────────
  const updatedJson =
    JSON.stringify({ assets: updatedAssets }, null, 2) + "\n";
  const updatedBase64 = Buffer.from(updatedJson, "utf8").toString("base64");

  const action = reviewStatus === "approved" ? "Approve" : reviewStatus === "rejected" ? "Reject" : reviewStatus === "archived" ? "Archive" : "Update";
  const commitBody: Record<string, unknown> = {
    message: `${action} reference asset: ${updatedAsset.characterSlug} — ${updatedAsset.title}`,
    content: updatedBase64,
    branch,
    sha: existingSha,
  };

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
    { ok: true, status: "reviewed", asset: updatedAsset } satisfies ReviewResult,
    { status: 200 }
  );
}
