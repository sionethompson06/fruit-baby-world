// POST /api/github/save-character-profile-draft
// Admin-only: Save an official character profile draft to GitHub.
// Merges allowed profile fields into character JSON, preserves approval/status fields.
// Does not approve or publish character.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  Only saves allowed fields. Preserves all approval and status fields.
//          No image generation. No character approval. No publishing.

import { Octokit } from "@octokit/rest";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveResult =
  | {
      ok: true;
      status: "character_profile_saved";
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
        | "github_error";
      message: string;
    };

type ProfileDraft = {
  name?: string;
  shortName?: string;
  role?: string;
  type?: string;
  fruitType?: string;
  home?: string;
  shortDescription?: string;
  personalityTraits?: string[];
  visualIdentity?: string;
  colorPalette?: Array<{
    name: string;
    hex: string;
    usage: string;
  }>;
  bodyShapeRules?: string[];
  faceAndExpressionRules?: string[];
  textureAndSurfaceRules?: string[];
  leafCrownAccessoryRules?: string[];
  poseAndGestureRules?: string[];
  storyRole?: string;
  voiceGuide?: string;
  favoriteQuote?: string;
  characterRules?: string[];
  generationRestrictions?: string[];
  doNotChangeRules?: string[];
  trademarkNotes?: string;
  imageAlt?: string;
  profileCompletenessNotes?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const ALLOWED_PROFILE_FIELDS = new Set([
  "name",
  "shortName",
  "role",
  "type",
  "fruitType",
  "home",
  "shortDescription",
  "personalityTraits",
  "visualIdentity",
  "colorPalette",
  "bodyShapeRules",
  "faceAndExpressionRules",
  "textureAndSurfaceRules",
  "leafCrownAccessoryRules",
  "poseAndGestureRules",
  "storyRole",
  "voiceGuide",
  "favoriteQuote",
  "characterRules",
  "generationRestrictions",
  "doNotChangeRules",
  "trademarkNotes",
  "profileCompletenessNotes",
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SAFE_SLUG.test(slug) && slug.length <= 80;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((item) => typeof item === "string");
}

function validateProfileDraft(draft: unknown): draft is ProfileDraft {
  if (!isRecord(draft)) return false;

  // Basic validation
  if (draft.name && typeof draft.name !== "string") return false;
  if (draft.shortName && typeof draft.shortName !== "string") return false;
  if (draft.personalityTraits && !isStringArray(draft.personalityTraits)) return false;
  if (draft.colorPalette && !Array.isArray(draft.colorPalette)) return false;

  return true;
}

async function fetchCharacterFromGitHub(
  octokit: Octokit,
  owner: string,
  repo: string,
  branch: string,
  slug: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: `src/content/characters/${slug}.json`,
      ref: branch,
    });

    if (Array.isArray(response.data) || response.data.type !== "file") return null;

    const fileData = response.data;
    const content = Buffer.from(fileData.content, "base64").toString("utf8");
    return { content, sha: fileData.sha };
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Check GitHub configuration ───────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub environment variables are not configured.",
      },
      { status: 503 }
    );
  }

  // ── Parse request body ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  // ── Validate inputs ─────────────────────────────────────────────────────────
  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be an object." },
      { status: 400 }
    );
  }

  const characterSlug = body.characterSlug;
  if (!characterSlug || !isValidSlug(characterSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "characterSlug must be a valid slug.",
      },
      { status: 400 }
    );
  }

  const profileDraft = body.profileDraft;
  if (!validateProfileDraft(profileDraft)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "profileDraft must be a valid profile object.",
      },
      { status: 400 }
    );
  }

  // ── Initialize Octokit ──────────────────────────────────────────────────────
  const octokit = new Octokit({ auth: token });

  // ── Fetch current character from GitHub ─────────────────────────────────────
  const currentFile = await fetchCharacterFromGitHub(octokit, owner, repo, branch, characterSlug);
  if (!currentFile) {
    return Response.json(
      { ok: false, status: "character_not_found", message: "Character not found in GitHub." },
      { status: 404 }
    );
  }

  let character: Record<string, unknown>;
  try {
    character = JSON.parse(currentFile.content);
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Character file contains invalid JSON." },
      { status: 500 }
    );
  }

  // ── Merge allowed profile fields ────────────────────────────────────────────
  for (const [key, value] of Object.entries(profileDraft)) {
    if (ALLOWED_PROFILE_FIELDS.has(key)) {
      character[key] = value;
    }
  }

  // Handle image.alt separately
  if (profileDraft.imageAlt && isRecord(character.image)) {
    character.image.alt = profileDraft.imageAlt;
  }

  // ── Update timestamps ───────────────────────────────────────────────────────
  character.updatedAt = new Date().toISOString();
  character.profileCompletedAt = new Date().toISOString();
  if (profileDraft.visualIdentity) {
    character.profileGeneratedFromPrimaryReferenceAt = new Date().toISOString();
  }

  // ── Save to GitHub ──────────────────────────────────────────────────────────
  try {
    const newContent = JSON.stringify(character, null, 2) + "\n";
    const commitMessage = `Save official character profile draft: ${character.name || characterSlug}`;

    const response = await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: `src/content/characters/${characterSlug}.json`,
      message: commitMessage,
      content: Buffer.from(newContent).toString("base64"),
      sha: currentFile.sha,
      branch,
    });

    const htmlUrl = response.data.commit?.html_url || "";

    return Response.json(
      {
        ok: true,
        status: "character_profile_saved",
        path: `src/content/characters/${characterSlug}.json`,
        commitMessage,
        character,
        htmlUrl,
        notes: [
          "Character profile fields were saved.",
          "The character was not automatically approved or published.",
          "Vercel redeploy is required before the updated profile appears everywhere.",
        ],
      } satisfies SaveResult,
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save character profile to GitHub.";

    return Response.json(
      { ok: false, status: "github_error", message },
      { status: 500 }
    );
  }
}