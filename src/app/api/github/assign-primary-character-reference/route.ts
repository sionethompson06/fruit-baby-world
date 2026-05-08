// POST /api/github/assign-primary-character-reference
// Admin-only: Assign an approved uploaded reference asset as a character's
// primary official profile reference. Updates character JSON image.profileSheet
// (or image.main) with the asset Blob URL.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Does not change approval mode, status, or generation settings.
//          Only updates image reference fields.

import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const CHARACTERS_PATH = "src/content/characters";
const REFERENCE_ASSETS_PATH =
  "src/content/reference-assets/character-reference-assets.json";

const VALID_ROLES = ["primary-profile", "primary-main"] as const;
type ReferenceRole = (typeof VALID_ROLES)[number];

// ─── Types ────────────────────────────────────────────────────────────────────

type AssignResult =
  | {
      ok: true;
      status: "primary_reference_assigned";
      path: string;
      commitMessage: string;
      character: Record<string, unknown>;
      asset: Record<string, unknown>;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "character_not_found"
        | "asset_not_found"
        | "asset_not_approved"
        | "invalid_asset_url"
        | "invalid_character_json"
        | "github_error";
      message: string;
    };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidSlug(s: unknown): s is string {
  return (
    typeof s === "string" &&
    SAFE_SLUG.test(s) &&
    s.length <= 100 &&
    !s.includes("/") &&
    !s.includes(".")
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
      } satisfies AssignResult,
      { status: 503 }
    );
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies AssignResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies AssignResult,
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
      } satisfies AssignResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug as string;

  // ── Validate assetId ─────────────────────────────────────────────────────────
  if (!isValidSlug(body.assetId)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "assetId must be lowercase letters, numbers, and hyphens only.",
      } satisfies AssignResult,
      { status: 400 }
    );
  }
  const assetId = body.assetId as string;

  // ── Validate referenceRole ───────────────────────────────────────────────────
  if (!(VALID_ROLES as readonly string[]).includes(body.referenceRole as string)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `referenceRole must be one of: ${VALID_ROLES.join(", ")}.`,
      } satisfies AssignResult,
      { status: 400 }
    );
  }
  const referenceRole = body.referenceRole as ReferenceRole;

  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const refParam = `?ref=${encodeURIComponent(branch)}`;

  // ── Fetch reference assets JSON from GitHub ──────────────────────────────────
  let selectedAsset: UploadedReferenceAsset | undefined;
  try {
    const refUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${REFERENCE_ASSETS_PATH}${refParam}`;
    const refRes = await fetch(refUrl, { method: "GET", headers: ghHeaders });
    if (!refRes.ok) {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to read reference assets (${refRes.status}).`,
        } satisfies AssignResult,
        { status: 502 }
      );
    }
    const refData = (await refRes.json()) as Record<string, unknown>;
    if (typeof refData.content !== "string") {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Could not read reference asset file from GitHub.",
        } satisfies AssignResult,
        { status: 502 }
      );
    }
    const decoded = decodeGitHubContent(refData.content);
    const parsed = JSON.parse(decoded) as Record<string, unknown>;
    if (!Array.isArray(parsed.assets)) {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Reference asset file has invalid format.",
        } satisfies AssignResult,
        { status: 502 }
      );
    }
    selectedAsset = (parsed.assets as UploadedReferenceAsset[]).find(
      (a) => a.id === assetId && a.characterSlug === characterSlug
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub read failed: ${msg}`,
      } satisfies AssignResult,
      { status: 502 }
    );
  }

  // ── Asset must exist ─────────────────────────────────────────────────────────
  if (!selectedAsset) {
    return Response.json(
      {
        ok: false,
        status: "asset_not_found",
        message: "Reference asset was not found for this character.",
      } satisfies AssignResult,
      { status: 404 }
    );
  }

  // ── Asset must be approved ───────────────────────────────────────────────────
  if (
    selectedAsset.reviewStatus !== "approved-for-generation" ||
    selectedAsset.approvedForGeneration !== true ||
    selectedAsset.generationUseAllowed !== true
  ) {
    return Response.json(
      {
        ok: false,
        status: "asset_not_approved",
        message:
          "Only approved reference assets can be assigned as a primary character reference.",
      } satisfies AssignResult,
      { status: 422 }
    );
  }

  // ── Get asset URL ────────────────────────────────────────────────────────────
  const assetRaw = selectedAsset as unknown as Record<string, unknown>;
  const assetUrl =
    typeof assetRaw.blobUrl === "string" && assetRaw.blobUrl
      ? (assetRaw.blobUrl as string)
      : typeof assetRaw.url === "string" && assetRaw.url
      ? (assetRaw.url as string)
      : "";

  if (!assetUrl || !assetUrl.startsWith("http")) {
    return Response.json(
      {
        ok: false,
        status: "invalid_asset_url",
        message: "Selected asset does not have a valid URL.",
      } satisfies AssignResult,
      { status: 422 }
    );
  }

  // ── Fetch character JSON from GitHub ─────────────────────────────────────────
  const charPath = `${CHARACTERS_PATH}/${characterSlug}.json`;
  const charUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${charPath}${refParam}`;

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
        } satisfies AssignResult,
        { status: 404 }
      );
    }
    if (!charRes.ok) {
      const errText = await charRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to read character from GitHub (${charRes.status}): ${errText.slice(0, 200)}`,
        } satisfies AssignResult,
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
        } satisfies AssignResult,
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
        } satisfies AssignResult,
        { status: 422 }
      );
    }
    try {
      existingChar = JSON.parse(
        decodeGitHubContent(charData.content)
      ) as Record<string, unknown>;
    } catch {
      return Response.json(
        {
          ok: false,
          status: "invalid_character_json",
          message: "Character file could not be parsed.",
        } satisfies AssignResult,
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
      } satisfies AssignResult,
      { status: 502 }
    );
  }

  // ── Build updated character ──────────────────────────────────────────────────
  const now = new Date().toISOString();
  const charName =
    typeof existingChar.name === "string" ? existingChar.name : characterSlug;
  const existingImage = isRecord(existingChar.image) ? existingChar.image : {};

  let imageUpdates: Record<string, unknown>;
  let extraFields: Record<string, unknown>;

  if (referenceRole === "primary-profile") {
    imageUpdates = {
      ...existingImage,
      profileSheet: assetUrl,
      alt:
        typeof existingImage.alt === "string" && existingImage.alt.trim()
          ? existingImage.alt
          : `Official ${charName} character profile reference`,
    };
    extraFields = {
      primaryReferenceAssetId: selectedAsset.id,
      primaryReferenceAssetUrl: assetUrl,
      primaryReferenceAssetType: selectedAsset.assetType,
    };
  } else {
    // primary-main
    imageUpdates = {
      ...existingImage,
      main: assetUrl,
    };
    extraFields = {
      mainReferenceAssetId: selectedAsset.id,
    };
  }

  const updatedChar: Record<string, unknown> = {
    ...existingChar,
    image: imageUpdates,
    ...extraFields,
    updatedAt: now,
  };

  const commitMessage = `Assign primary character reference: ${charName}`;

  // ── Commit to GitHub ─────────────────────────────────────────────────────────
  const updatedJson = JSON.stringify(updatedChar, null, 2) + "\n";
  const updatedBase64 = Buffer.from(updatedJson, "utf8").toString("base64");
  const charApiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${charPath}`;

  let htmlUrl = "";
  try {
    const putRes = await fetch(charApiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: updatedBase64,
        branch,
        sha: charSha,
      }),
    });
    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to commit character to GitHub (${putRes.status}): ${errText.slice(0, 200)}`,
        } satisfies AssignResult,
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
      } satisfies AssignResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "primary_reference_assigned",
      path: charPath,
      commitMessage,
      character: updatedChar,
      asset: assetRaw,
      htmlUrl,
      notes: [
        "Primary character reference was assigned.",
        "The character was not automatically approved or published.",
        "Vercel redeploy is required before profile display updates.",
      ],
    } satisfies AssignResult,
    { status: 200 }
  );
}
