// POST /api/github/create-character-draft
// Admin-only: Create a new character draft JSON file in GitHub.
// New characters are private by default — not public, not approved for stories or generation.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  All draft defaults are enforced server-side. Slug conflicts are checked.
//          No image generation. No public publishing. No approval workflow.

// ─── Types ────────────────────────────────────────────────────────────────────

type CreateResult =
  | {
      ok: true;
      status: "character_draft_created";
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
        | "character_exists"
        | "github_error";
      message: string;
    };

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_TYPES = new Set(["fruit-baby", "villain", "other"]);
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

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

function hasDangerousContent(s: string): boolean {
  return /<[a-z/]/i.test(s) || /javascript\s*:/i.test(s);
}

function checkField(
  value: string,
  fieldName: string,
  max: number,
  required: boolean
):
  | null
  | { ok: false; status: "validation_error"; message: string } {
  if (required && (!value || value.trim().length === 0)) {
    return {
      ok: false,
      status: "validation_error",
      message: `${fieldName} is required.`,
    };
  }
  if (value && value.trim().length > max) {
    return {
      ok: false,
      status: "validation_error",
      message: `${fieldName} must be ${max} characters or fewer.`,
    };
  }
  if (value && hasDangerousContent(value)) {
    return {
      ok: false,
      status: "validation_error",
      message: `${fieldName} contains invalid content.`,
    };
  }
  return null;
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
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured yet.",
      } satisfies CreateResult,
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
      } satisfies CreateResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }

  // ── Validate name ────────────────────────────────────────────────────────────
  const nameRaw = typeof body.name === "string" ? body.name.trim() : "";
  const nameErr = checkField(nameRaw, "name", 80, true);
  if (nameErr) return Response.json(nameErr satisfies CreateResult, { status: 400 });
  const name = nameRaw;

  // ── Validate slug ────────────────────────────────────────────────────────────
  const slugRaw = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  if (!isValidSlug(slugRaw)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message:
          "slug is required and must contain only lowercase letters, numbers, and hyphens. Must start and end with a letter or number.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }
  const slug = slugRaw;

  // ── Validate type ────────────────────────────────────────────────────────────
  const typeRaw = typeof body.type === "string" ? body.type.trim() : "";
  if (!VALID_TYPES.has(typeRaw)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: `type must be one of: ${[...VALID_TYPES].join(", ")}.`,
      } satisfies CreateResult,
      { status: 400 }
    );
  }
  const type = typeRaw as "fruit-baby" | "villain" | "other";

  // ── Validate optional string fields ─────────────────────────────────────────
  const shortNameRaw = typeof body.shortName === "string" ? body.shortName.trim() : "";
  const shortNameErr = checkField(shortNameRaw, "shortName", 40, false);
  if (shortNameErr) return Response.json(shortNameErr satisfies CreateResult, { status: 400 });

  const roleRaw = typeof body.role === "string" ? body.role.trim() : "";
  const roleErr = checkField(roleRaw, "role", 80, true);
  if (roleErr) return Response.json(roleErr satisfies CreateResult, { status: 400 });

  const fruitTypeRaw = typeof body.fruitType === "string" ? body.fruitType.trim() : "";
  const fruitTypeErr = checkField(fruitTypeRaw, "fruitType", 80, false);
  if (fruitTypeErr) return Response.json(fruitTypeErr satisfies CreateResult, { status: 400 });

  const homeRaw = typeof body.home === "string" ? body.home.trim() : "";
  const homeErr = checkField(homeRaw, "home", 120, false);
  if (homeErr) return Response.json(homeErr satisfies CreateResult, { status: 400 });

  const shortDescRaw = typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";
  const shortDescErr = checkField(shortDescRaw, "shortDescription", 500, true);
  if (shortDescErr) return Response.json(shortDescErr satisfies CreateResult, { status: 400 });

  const visualIdentityRaw = typeof body.visualIdentity === "string" ? body.visualIdentity.trim() : "";
  const visualIdentityErr = checkField(visualIdentityRaw, "visualIdentity", 1200, true);
  if (visualIdentityErr)
    return Response.json(visualIdentityErr satisfies CreateResult, { status: 400 });

  const voiceGuideRaw = typeof body.voiceGuide === "string" ? body.voiceGuide.trim() : "";
  const voiceGuideErr = checkField(voiceGuideRaw, "voiceGuide", 800, false);
  if (voiceGuideErr) return Response.json(voiceGuideErr satisfies CreateResult, { status: 400 });

  const favoriteQuoteRaw = typeof body.favoriteQuote === "string" ? body.favoriteQuote.trim() : "";
  const favoriteQuoteErr = checkField(favoriteQuoteRaw, "favoriteQuote", 200, false);
  if (favoriteQuoteErr)
    return Response.json(favoriteQuoteErr satisfies CreateResult, { status: 400 });

  const trademarkNotesRaw = typeof body.trademarkNotes === "string" ? body.trademarkNotes.trim() : "";
  const trademarkNotesErr = checkField(trademarkNotesRaw, "trademarkNotes", 800, false);
  if (trademarkNotesErr)
    return Response.json(trademarkNotesErr satisfies CreateResult, { status: 400 });

  const adminNotesRaw = typeof body.notes === "string" ? body.notes.trim() : "";
  const adminNotesErr = checkField(adminNotesRaw, "notes", 1000, false);
  if (adminNotesErr) return Response.json(adminNotesErr satisfies CreateResult, { status: 400 });

  // ── Validate personalityTraits ───────────────────────────────────────────────
  if (!isStringArray(body.personalityTraits) || body.personalityTraits.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "personalityTraits is required and must be a non-empty array of strings.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }
  if (body.personalityTraits.length > 12) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "personalityTraits must have 12 or fewer items.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }
  const personalityTraits = body.personalityTraits
    .map((t) => t.trim().slice(0, 40))
    .filter(Boolean);
  if (personalityTraits.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "personalityTraits must have at least one non-empty trait.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }

  // ── Validate characterRules ──────────────────────────────────────────────────
  if (!isStringArray(body.characterRules) || body.characterRules.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "characterRules is required and must be a non-empty array of strings.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }
  if (body.characterRules.length > 20) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "characterRules must have 20 or fewer items.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }
  const allRules = body.characterRules
    .map((r) => r.trim().slice(0, 250))
    .filter(Boolean);
  if (allRules.length === 0) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "characterRules must have at least one non-empty rule.",
      } satisfies CreateResult,
      { status: 400 }
    );
  }

  // ── Validate generationRestrictions (optional) ───────────────────────────────
  const generationRestrictions: string[] = [];
  if (body.generationRestrictions !== undefined) {
    if (!isStringArray(body.generationRestrictions)) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "generationRestrictions must be an array of strings.",
        } satisfies CreateResult,
        { status: 400 }
      );
    }
    if (body.generationRestrictions.length > 12) {
      return Response.json(
        {
          ok: false,
          status: "validation_error",
          message: "generationRestrictions must have 12 or fewer items.",
        } satisfies CreateResult,
        { status: 400 }
      );
    }
    generationRestrictions.push(
      ...body.generationRestrictions
        .map((r) => r.trim().slice(0, 250))
        .filter(Boolean)
    );
  }

  // ── Split characterRules into always/never ────────────────────────────────────
  const neverPrefixes = ["do not", "never ", "don't", "dont "];
  const alwaysRules = allRules.filter(
    (r) => !neverPrefixes.some((p) => r.toLowerCase().startsWith(p))
  );
  const neverRules = allRules.filter((r) =>
    neverPrefixes.some((p) => r.toLowerCase().startsWith(p))
  );

  // ── Check slug conflicts ─────────────────────────────────────────────────────
  const filePath = `src/content/characters/${slug}.json`;
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  try {
    const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (checkRes.ok) {
      return Response.json(
        {
          ok: false,
          status: "character_exists",
          message: `A character with slug "${slug}" already exists. Choose a different slug.`,
        } satisfies CreateResult,
        { status: 409 }
      );
    }

    if (checkRes.status !== 404) {
      const errText = await checkRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub conflict check failed (${checkRes.status}): ${errText.slice(0, 200)}`,
        } satisfies CreateResult,
        { status: 502 }
      );
    }
    // 404 = file doesn't exist, safe to create
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub conflict check failed: ${msg}`,
      } satisfies CreateResult,
      { status: 502 }
    );
  }

  // ── Build character JSON ─────────────────────────────────────────────────────
  const now = new Date().toISOString();

  // Default generation restriction always included
  const allGenerationRestrictions =
    generationRestrictions.length > 0
      ? generationRestrictions
      : [
          "Not approved for generation until official reference assets are uploaded and reviewed.",
        ];

  const characterData: Record<string, unknown> = {
    id: slug,
    slug,
    name,
    shortName: shortNameRaw || name.split(" ")[0],
    role: roleRaw,
    type,
    status: "draft",
    canonStatus: "draft",
    publicStatus: "private",
    approvedForStories: false,
    approvedForGeneration: false,
    requiresReferenceAssets: true,
    referenceAssetsReviewed: false,
    generationUseAllowed: false,
    publicUseAllowed: false,
    tagline: "",
    fruitType: fruitTypeRaw,
    home: homeRaw,
    shortDescription: shortDescRaw,
    about: "",
    personality: personalityTraits,
    visualIdentity: {
      primaryColors: [],
      accentColors: [],
      palette: [],
      styleNotes: visualIdentityRaw,
    },
    expressions: [],
    posesAndActions: [],
    storyRole: "",
    characterRules: {
      always: alwaysRules.length > 0 ? alwaysRules : allRules,
      never: neverRules,
    },
    signatureStyle: "",
    catchphrases: [],
    image: {
      main: "",
      profileSheet: "",
      alt: `${name} character — draft, no official image yet`,
    },
    signatureQuote: "",
    favoriteQuote: favoriteQuoteRaw,
    voiceGuide: voiceGuideRaw,
    generationRestrictions: allGenerationRestrictions,
    trademarkNotes: trademarkNotesRaw ? [trademarkNotesRaw] : [],
    notes: adminNotesRaw,
    referenceAssetIds: [],
    createdAt: now,
    updatedAt: now,
    merchPotential: [],
  };

  // ── Commit to GitHub ─────────────────────────────────────────────────────────
  const jsonContent = JSON.stringify(characterData, null, 2) + "\n";
  const base64Content = Buffer.from(jsonContent, "utf8").toString("base64");
  const commitMessage = `Create character draft: ${name}`;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: base64Content,
        branch,
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "");
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `Failed to commit character draft to GitHub (${putRes.status}): ${errText.slice(0, 200)}`,
        } satisfies CreateResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    const htmlUrl = getHtmlUrl(putData);

    return Response.json(
      {
        ok: true,
        status: "character_draft_created",
        path: filePath,
        commitMessage,
        character: characterData,
        htmlUrl,
        notes: [
          "Character draft was created in GitHub.",
          "The character is private and not approved for stories or generation.",
          "Upload reference assets next, then review and approve the character in a future phase.",
          "Vercel redeploy is required before the character appears in admin character lists.",
        ],
      } satisfies CreateResult,
      { status: 200 }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: `GitHub commit failed: ${msg}`,
      } satisfies CreateResult,
      { status: 502 }
    );
  }
}
