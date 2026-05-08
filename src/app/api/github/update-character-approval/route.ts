// POST /api/github/update-character-approval
// Admin-only: Update character approval mode in GitHub JSON.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only updates approval metadata. Does not change character identity,
//          visual data, image paths, or official asset files.
//
// Approval modes:
//   draft             → private, not approved for stories/generation
//   official-internal → admin use, approved for story/media/generation, not public
//   public            → visible on public character pages, fully approved
//   archived          → inactive, private

import type { UploadedReferenceAsset } from "@/app/api/reference-assets/upload-character-reference/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const CHARACTERS_PATH = "src/content/characters";
const REFERENCE_ASSETS_PATH =
  "src/content/reference-assets/character-reference-assets.json";

const VALID_MODES = ["draft", "official-internal", "public", "archived"] as const;
type ApprovalMode = (typeof VALID_MODES)[number];

// ─── Types ────────────────────────────────────────────────────────────────────

type ApprovalResult =
  | {
      ok: true;
      status: "character_approval_updated";
      path: string;
      commitMessage: string;
      character: Record<string, unknown>;
      approvalMode: ApprovalMode;
      approvedReferenceCount: number;
      hasValidBuiltInReference: boolean;
      generationReady: boolean;
      htmlUrl: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "unauthorized"
        | "setup_required"
        | "character_not_found"
        | "invalid_character_json"
        | "missing_approved_references"
        | "missing_required_fields"
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

function hasDangerousContent(s: string): boolean {
  return /<[a-z/]/i.test(s) || /javascript\s*:/i.test(s);
}

function hasBuiltInReference(char: Record<string, unknown>): boolean {
  const image = char.image;
  if (!isRecord(image)) return false;
  return (
    (typeof image.profileSheet === "string" &&
      image.profileSheet.trim().length > 0) ||
    (typeof image.main === "string" && image.main.trim().length > 0)
  );
}

// ─── Mode → compatibility fields mapper ──────────────────────────────────────

function mapModeToFields(
  mode: ApprovalMode,
  existing: Record<string, unknown>,
  approvedReferenceCount: number,
  now: string
): Record<string, unknown> {
  switch (mode) {
    case "draft":
      return {
        status: "draft",
        canonStatus: "draft",
        publicStatus: "private",
        approvedForStories: false,
        approvedForGeneration: false,
        referenceAssetsReviewed: approvedReferenceCount > 0,
        generationUseAllowed: false,
        publicUseAllowed: false,
        approvalMode: "draft",
      };
    case "official-internal":
      return {
        status: "approved",
        canonStatus: "official-internal",
        publicStatus: "private",
        approvedForStories: true,
        approvedForGeneration: true,
        referenceAssetsReviewed: true,
        generationUseAllowed: true,
        publicUseAllowed: false,
        approvalMode: "official-internal",
        approvedAt:
          typeof existing.approvedAt === "string" ? existing.approvedAt : now,
      };
    case "public":
      return {
        status: "active",
        canonStatus: "public",
        publicStatus: "public",
        approvedForStories: true,
        approvedForGeneration: true,
        referenceAssetsReviewed: true,
        generationUseAllowed: true,
        publicUseAllowed: true,
        approvalMode: "public",
        approvedAt:
          typeof existing.approvedAt === "string" ? existing.approvedAt : now,
        publishedAt:
          typeof existing.publishedAt === "string"
            ? existing.publishedAt
            : now,
      };
    case "archived":
      return {
        status: "archived",
        canonStatus: "archived",
        publicStatus: "private",
        approvedForStories: false,
        approvedForGeneration: false,
        generationUseAllowed: false,
        publicUseAllowed: false,
        approvalMode: "archived",
        archivedAt: now,
      };
  }
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
      } satisfies ApprovalResult,
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

  // ── Validate approvalMode ────────────────────────────────────────────────────
  if (!(VALID_MODES as readonly string[]).includes(body.approvalMode as string)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `approvalMode must be one of: ${VALID_MODES.join(", ")}.`,
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }
  const approvalMode = body.approvalMode as ApprovalMode;

  // ── Validate approvalNotes ───────────────────────────────────────────────────
  const rawNotes = body.approvalNotes;
  const approvalNotes =
    typeof rawNotes === "string" ? rawNotes.trim().slice(0, 1000) : "";
  if (approvalNotes && hasDangerousContent(approvalNotes)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "approvalNotes contains invalid content.",
      } satisfies ApprovalResult,
      { status: 400 }
    );
  }

  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const refParam = `?ref=${encodeURIComponent(branch)}`;

  // ── Count approved reference assets ─────────────────────────────────────────
  let approvedReferenceCount = 0;
  try {
    const refUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${REFERENCE_ASSETS_PATH}${refParam}`;
    const refRes = await fetch(refUrl, { method: "GET", headers: ghHeaders });
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
              a.reviewStatus === "approved-for-generation" &&
              a.approvedForGeneration === true &&
              a.generationUseAllowed === true
          ).length;
        }
      }
    }
  } catch {
    // Non-fatal — treat as 0 approved references
  }

  // ── Fetch character JSON from GitHub ────────────────────────────────────────
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
          message: `Failed to read character from GitHub (${charRes.status}): ${errText.slice(0, 200)}`,
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
      existingChar = JSON.parse(
        decodeGitHubContent(charData.content)
      ) as Record<string, unknown>;
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

  // ── Check valid built-in reference ───────────────────────────────────────────
  const hasBuiltIn = hasBuiltInReference(existingChar);
  const hasRef = approvedReferenceCount > 0 || hasBuiltIn;

  // ── Approval guardrails ──────────────────────────────────────────────────────
  if (approvalMode === "official-internal" && !hasRef) {
    return Response.json(
      {
        ok: false,
        status: "missing_approved_references",
        message:
          "This character needs at least one approved reference asset or valid official reference before becoming Official Internal.",
      } satisfies ApprovalResult,
      { status: 422 }
    );
  }

  if (approvalMode === "public") {
    if (!hasRef) {
      return Response.json(
        {
          ok: false,
          status: "missing_approved_references",
          message:
            "This character needs at least one approved reference asset or valid official reference before being published.",
        } satisfies ApprovalResult,
        { status: 422 }
      );
    }

    const missingFields: string[] = [];
    if (
      !existingChar.shortDescription ||
      (existingChar.shortDescription as string).trim().length === 0
    ) {
      missingFields.push("shortDescription");
    }
    const vi = existingChar.visualIdentity;
    if (
      !isRecord(vi) ||
      !vi.styleNotes ||
      (vi.styleNotes as string).trim().length === 0
    ) {
      missingFields.push("visualIdentity.styleNotes");
    }
    const cr = existingChar.characterRules;
    if (
      !isRecord(cr) ||
      (!(Array.isArray(cr.always) && cr.always.length > 0) &&
        !(Array.isArray(cr.never) && cr.never.length > 0))
    ) {
      missingFields.push("characterRules");
    }

    if (missingFields.length > 0) {
      return Response.json(
        {
          ok: false,
          status: "missing_required_fields",
          message: `Character is missing required fields for public publishing: ${missingFields.join(", ")}.`,
        } satisfies ApprovalResult,
        { status: 422 }
      );
    }
  }

  // ── Build updated character ──────────────────────────────────────────────────
  const now = new Date().toISOString();
  const modeFields = mapModeToFields(
    approvalMode,
    existingChar,
    approvedReferenceCount,
    now
  );

  const updatedChar: Record<string, unknown> = {
    ...existingChar,
    ...modeFields,
    approvalNotes:
      approvalNotes || existingChar.approvalNotes || undefined,
    updatedAt: now,
  };

  const generationReady =
    (approvalMode === "official-internal" || approvalMode === "public") &&
    hasRef;

  // ── Commit message ───────────────────────────────────────────────────────────
  const charName =
    typeof existingChar.name === "string" ? existingChar.name : characterSlug;
  let commitMessage: string;
  switch (approvalMode) {
    case "draft":
      commitMessage = `Set character draft: ${charName}`;
      break;
    case "official-internal":
      commitMessage = `Set character official internal: ${charName}`;
      break;
    case "public":
      commitMessage = `Publish character: ${charName}`;
      break;
    case "archived":
      commitMessage = `Archive character: ${charName}`;
      break;
  }

  // ── Commit updated JSON to GitHub ────────────────────────────────────────────
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
      approvalMode,
      approvedReferenceCount,
      hasValidBuiltInReference: hasBuiltIn,
      generationReady,
      htmlUrl,
      notes: [
        "Character approval metadata was updated.",
        "Vercel redeploy is required before character availability updates across the app.",
      ],
    } satisfies ApprovalResult,
    { status: 200 }
  );
}
