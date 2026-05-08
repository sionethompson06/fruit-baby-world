// POST /api/reference-assets/upload-character-reference
// Admin-only: Upload a PNG/JPG/WebP reference guide image for a character.
// Stores file in Vercel Blob and records lightweight metadata in a GitHub JSON file.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Uploaded assets default to approvedForGeneration: false.
//          Does not publish or change generation behavior.
//          Does not modify official character files.

import { put, BlobError } from "@vercel/blob";
import fs from "fs";
import path from "path";

// ─── Constants ────────────────────────────────────────────────────────────────

// Safe slug: lowercase letters, numbers, hyphens only — no slashes, dots, or spaces.
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

const VALID_ASSET_TYPES = [
  "profile-sheet",
  "character-sheet",
  "expression-sheet",
  "reference-guide",
  "other",
] as const;
type AssetType = (typeof VALID_ASSET_TYPES)[number];

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const GITHUB_JSON_PATH =
  "src/content/reference-assets/character-reference-assets.json";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewStatus = "needs-review" | "approved-for-generation" | "rejected" | "archived";

export type UploadedReferenceAsset = {
  id: string;
  characterSlug: string;
  assetType: AssetType;
  title: string;
  description: string;
  notes: string;
  blobUrl: string;
  mimeType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  approvedForGeneration: boolean;
  requiresReview: boolean;
  reviewStatus: ReviewStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  generationUseAllowed?: boolean;
  publicUseAllowed?: boolean;
  isOfficialReference?: boolean;
  reviewNotes?: string;
  updatedAt?: string;
};

type UploadResult =
  | { ok: true; status: "uploaded"; asset: UploadedReferenceAsset }
  | {
      ok: false;
      status:
        | "validation_error"
        | "character_not_found"
        | "setup_required"
        | "blob_error"
        | "github_error";
      message: string;
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedMime(v: unknown): v is AllowedMime {
  return (
    typeof v === "string" &&
    (ALLOWED_MIME_TYPES as readonly string[]).includes(v)
  );
}

function isValidAssetType(v: unknown): v is AssetType {
  return (
    typeof v === "string" &&
    (VALID_ASSET_TYPES as readonly string[]).includes(v)
  );
}

function buildBlobPath(
  slug: string,
  mimeType: AllowedMime,
  rawFilename: string
): string {
  const ext = MIME_EXTENSIONS[mimeType];
  const safeName = rawFilename
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9-]/gi, "-")
    .toLowerCase()
    .slice(0, 60);
  return `reference-assets/characters/${slug}/${Date.now()}-${safeName}.${ext}`;
}

function generateId(): string {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
  // ── Check Vercel Blob config ─────────────────────────────────────────────────
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "Media storage is not configured. Add BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
      } satisfies UploadResult,
      { status: 503 }
    );
  }

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
      } satisfies UploadResult,
      { status: 503 }
    );
  }

  // ── Parse multipart form data ────────────────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request must be multipart/form-data.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Validate characterSlug ───────────────────────────────────────────────────
  const characterSlug = formData.get("characterSlug");

  // Format check first: lowercase, numbers, hyphens only, no path traversal
  if (
    typeof characterSlug !== "string" ||
    !SAFE_SLUG.test(characterSlug) ||
    characterSlug.length > 80
  ) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "characterSlug must contain only lowercase letters, numbers, and hyphens.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // Existence check: character JSON must exist on disk (covers both official and draft characters)
  const charFilePath = path.join(
    process.cwd(),
    "src/content/characters",
    `${characterSlug}.json`
  );
  if (!fs.existsSync(charFilePath)) {
    return Response.json(
      {
        ok: false,
        status: "character_not_found",
        message:
          "Character was not found. Create the character draft before uploading reference assets.",
      } satisfies UploadResult,
      { status: 404 }
    );
  }

  // ── Validate assetType ───────────────────────────────────────────────────────
  const assetType = formData.get("assetType");
  if (!isValidAssetType(assetType)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `assetType must be one of: ${VALID_ASSET_TYPES.join(", ")}.`,
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Validate title ───────────────────────────────────────────────────────────
  const titleRaw = formData.get("title");
  if (typeof titleRaw !== "string" || titleRaw.trim().length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "title is required.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const title = titleRaw.trim().slice(0, 200);

  // ── Optional text fields ─────────────────────────────────────────────────────
  const descriptionRaw = formData.get("description");
  const description =
    typeof descriptionRaw === "string"
      ? descriptionRaw.trim().slice(0, 500)
      : "";

  const notesRaw = formData.get("notes");
  const notes =
    typeof notesRaw === "string" ? notesRaw.trim().slice(0, 500) : "";

  // ── Validate file ────────────────────────────────────────────────────────────
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "file is required and must be an image file.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (!isAllowedMime(fileEntry.type)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "File must be a PNG, JPEG, or WebP image.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }
  const mimeType: AllowedMime = fileEntry.type;

  if (fileEntry.size === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "File must not be empty.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (fileEntry.size > MAX_FILE_BYTES) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "File must be 10 MB or smaller.",
      } satisfies UploadResult,
      { status: 400 }
    );
  }

  // ── Upload to Vercel Blob ────────────────────────────────────────────────────
  const blobPath = buildBlobPath(characterSlug, mimeType, fileEntry.name);

  let blobUrl: string;
  try {
    const blob = await put(blobPath, fileEntry, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });
    blobUrl = blob.url;
  } catch (err) {
    const msg =
      err instanceof BlobError ? err.message : "Unexpected blob storage error";
    return Response.json(
      {
        ok: false,
        status: "blob_error",
        message: `Blob upload failed: ${msg}`,
      } satisfies UploadResult,
      { status: 502 }
    );
  }

  // ── Build metadata entry ─────────────────────────────────────────────────────
  const newAsset: UploadedReferenceAsset = {
    id: generateId(),
    characterSlug,
    assetType,
    title,
    description,
    notes,
    blobUrl,
    mimeType,
    fileSizeBytes: fileEntry.size,
    uploadedAt: new Date().toISOString(),
    approvedForGeneration: false,
    requiresReview: true,
    reviewStatus: "needs-review",
    reviewedAt: null,
    reviewedBy: null,
  };

  // ── Read existing GitHub JSON (or initialize empty) ──────────────────────────
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${GITHUB_JSON_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string | null = null;
  let existingAssets: unknown[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.ok) {
      const getData = (await getRes.json()) as Record<string, unknown>;
      if (typeof getData.sha === "string") existingSha = getData.sha;
      if (typeof getData.content === "string") {
        try {
          const decoded = Buffer.from(
            getData.content.replace(/\n/g, ""),
            "base64"
          ).toString("utf8");
          const parsed = JSON.parse(decoded) as Record<string, unknown>;
          if (Array.isArray(parsed.assets)) existingAssets = parsed.assets;
        } catch {
          // Corrupt JSON — start fresh
        }
      }
    } else if (getRes.status !== 404) {
      const errText = await getRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to read reference assets JSON from GitHub (${getRes.status}): ${errText.slice(0, 200)}`,
        } satisfies UploadResult,
        { status: 502 }
      );
    }
    // 404 = file not yet created; existingAssets stays []
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub read failed: ${msg}`,
      } satisfies UploadResult,
      { status: 502 }
    );
  }

  // ── Commit updated JSON to GitHub ────────────────────────────────────────────
  const updatedJson =
    JSON.stringify({ assets: [...existingAssets, newAsset] }, null, 2) + "\n";
  const updatedBase64 = Buffer.from(updatedJson, "utf8").toString("base64");

  const commitBody: Record<string, unknown> = {
    message: `Add reference asset: ${characterSlug} — ${title}`,
    content: updatedBase64,
    branch,
  };
  if (existingSha) commitBody.sha = existingSha;

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
          message: `Failed to commit reference asset metadata to GitHub (${putRes.status}): ${errText.slice(0, 200)}`,
        } satisfies UploadResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    void getHtmlUrl(putData); // parsed but not returned — metadata commit only
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub commit failed: ${msg}`,
      } satisfies UploadResult,
      { status: 502 }
    );
  }

  return Response.json(
    { ok: true, status: "uploaded", asset: newAsset } satisfies UploadResult,
    { status: 200 }
  );
}
