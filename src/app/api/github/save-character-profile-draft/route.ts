// POST /api/github/save-character-profile-draft
// Admin-only (proxy handles auth): merge allowed profile fields from a generated
// profileDraft into the character JSON and commit to GitHub.
// Does NOT change: slug, status, approvalMode, generation flags, publicUseAllowed,
// image.profileSheet, image.main, primaryReferenceAssetUrl, or createdAt.

import type { ProfileDraft } from "@/app/api/characters/generate-official-profile-draft/route";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const CHARACTERS_PATH = "src/content/characters";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveProfileResult =
  | {
      ok: true;
      status: "profile_draft_saved";
      path: string;
      commitMessage: string;
      character: Record<string, unknown>;
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
        | "github_error";
      message: string;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function safeStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const filtered = v.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
  return filtered.length > 0 ? filtered : undefined;
}

function safeString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
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
      } satisfies SaveProfileResult,
      { status: 503 }
    );
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies SaveProfileResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies SaveProfileResult,
      { status: 400 }
    );
  }

  // ── Validate characterSlug ─────────────────────────────────────────────────
  if (!isValidSlug(body.characterSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "characterSlug must be lowercase letters, numbers, and hyphens only.",
      } satisfies SaveProfileResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug as string;

  // ── Validate profileDraft ──────────────────────────────────────────────────
  if (!isRecord(body.profileDraft)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "profileDraft must be a JSON object.",
      } satisfies SaveProfileResult,
      { status: 400 }
    );
  }
  const profileDraft = body.profileDraft as Partial<ProfileDraft>;

  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const refParam = `?ref=${encodeURIComponent(branch)}`;

  // ── Fetch character from GitHub ────────────────────────────────────────────
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
          message: "Character file was not found on GitHub.",
        } satisfies SaveProfileResult,
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
        } satisfies SaveProfileResult,
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
        } satisfies SaveProfileResult,
        { status: 502 }
      );
    }
    charSha = charData.sha;
    if (typeof charData.content !== "string") {
      return Response.json(
        {
          ok: false,
          status: "invalid_character_json",
          message: "Character file could not be read from GitHub.",
        } satisfies SaveProfileResult,
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
        } satisfies SaveProfileResult,
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
      } satisfies SaveProfileResult,
      { status: 502 }
    );
  }

  // ── Merge allowed fields — forbidden fields are preserved from existingChar ─
  const now = new Date().toISOString();
  const charName =
    typeof existingChar.name === "string" ? existingChar.name : characterSlug;

  const updatedChar: Record<string, unknown> = { ...existingChar };

  // Simple string fields
  for (const key of [
    "name",
    "shortName",
    "role",
    "type",
    "fruitType",
    "home",
    "shortDescription",
    "storyRole",
    "voiceGuide",
    "favoriteQuote",
    "profileCompletenessNotes",
  ] as const) {
    const val = safeString(profileDraft[key]);
    if (val !== undefined) updatedChar[key] = val;
  }

  // personalityTraits → personality
  const personalityTraits = safeStringArray(profileDraft.personalityTraits);
  if (personalityTraits) updatedChar.personality = personalityTraits;

  // New visual fidelity rule arrays
  for (const key of [
    "bodyShapeRules",
    "faceAndExpressionRules",
    "textureAndSurfaceRules",
    "leafCrownAccessoryRules",
    "poseAndGestureRules",
    "generationRestrictions",
    "doNotChangeRules",
  ] as const) {
    const val = safeStringArray(profileDraft[key]);
    if (val !== undefined) updatedChar[key] = val;
  }

  // trademarkNotes (string in draft → string[] in character JSON)
  if (
    typeof profileDraft.trademarkNotes === "string" &&
    profileDraft.trademarkNotes.trim()
  ) {
    updatedChar.trademarkNotes = [profileDraft.trademarkNotes.trim()];
  }

  // characterRules — merge always/never, preserve any unrelated fields
  if (isRecord(profileDraft.characterRules)) {
    const existingRules = isRecord(existingChar.characterRules)
      ? existingChar.characterRules
      : {};
    const always = safeStringArray(
      (profileDraft.characterRules as Record<string, unknown>).always
    );
    const never = safeStringArray(
      (profileDraft.characterRules as Record<string, unknown>).never
    );
    updatedChar.characterRules = {
      ...existingRules,
      ...(always ? { always } : {}),
      ...(never ? { never } : {}),
    };
  }

  // visualIdentity — merge styleNotes and palette; preserve primaryColors/accentColors
  const existingVi = isRecord(existingChar.visualIdentity)
    ? existingChar.visualIdentity
    : {};
  const viUpdate: Record<string, unknown> = { ...existingVi };

  const viStyleNotes = safeString(profileDraft.visualIdentity);
  if (viStyleNotes) viUpdate.styleNotes = viStyleNotes;

  if (
    Array.isArray(profileDraft.colorPalette) &&
    profileDraft.colorPalette.length > 0
  ) {
    const palette = (
      profileDraft.colorPalette as { name?: unknown; hex?: unknown }[]
    )
      .filter(
        (s) => typeof s.name === "string" && typeof s.hex === "string"
      )
      .map((s) => ({ name: s.name as string, hex: s.hex as string }));
    if (palette.length > 0) viUpdate.palette = palette;
  }

  updatedChar.visualIdentity = viUpdate;

  // image.alt — only alt; profileSheet/main are preserved
  const imageAlt = safeString(profileDraft.imageAlt);
  if (imageAlt) {
    const existingImage = isRecord(existingChar.image)
      ? existingChar.image
      : {};
    updatedChar.image = { ...existingImage, alt: imageAlt };
  }

  // Timestamps
  updatedChar.updatedAt = now;
  updatedChar.profileCompletedAt = now;
  updatedChar.profileGeneratedFromPrimaryReferenceAt = now;

  const commitMessage = `Save official character profile draft: ${charName}`;

  // ── Commit to GitHub ───────────────────────────────────────────────────────
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
        } satisfies SaveProfileResult,
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
      } satisfies SaveProfileResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "profile_draft_saved",
      path: charPath,
      commitMessage,
      character: updatedChar,
      htmlUrl,
      notes: [
        "Official character profile draft saved to GitHub.",
        "Approval mode, status, generation flags, and publicUseAllowed were not changed.",
        "Vercel redeploy is required before changes appear in admin view.",
      ],
    } satisfies SaveProfileResult,
    { status: 200 }
  );
}
