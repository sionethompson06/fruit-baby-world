// POST /api/characters/generate-official-profile-draft
// Admin-only: Generate an official character profile draft from a primary reference.
// Uses OpenAI to create structured profile fields based on character data and reference metadata.
// Returns JSON profile draft only — no data is saved.
//
// Auth:    Protected by proxy.ts — requires valid admin cookie.
// Safety:  No image generation. No character approval. No publishing.
//          Profile draft must be reviewed and saved separately.

import OpenAI from "openai";
import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────────

type GenerateResult =
  | {
      ok: true;
      status: "profile_draft_generated";
      characterSlug: string;
      primaryReferenceAssetUrl: string;
      profileDraft: ProfileDraft;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "character_not_found"
        | "missing_primary_reference"
        | "openai_error";
      message: string;
    };

type ProfileDraft = {
  name: string;
  slug: string;
  shortName: string;
  role: string;
  type: string;
  fruitType: string;
  home: string;
  shortDescription: string;
  personalityTraits: string[];
  visualIdentity: string;
  colorPalette: Array<{
    name: string;
    hex: string;
    usage: string;
  }>;
  bodyShapeRules: string[];
  faceAndExpressionRules: string[];
  textureAndSurfaceRules: string[];
  leafCrownAccessoryRules: string[];
  poseAndGestureRules: string[];
  storyRole: string;
  voiceGuide: string;
  favoriteQuote: string;
  characterRules: string[];
  generationRestrictions: string[];
  doNotChangeRules: string[];
  trademarkNotes: string;
  imageAlt: string;
  profileCompletenessNotes: string;
  adminReviewNotes: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isValidSlug(slug: unknown): slug is string {
  return typeof slug === "string" && SAFE_SLUG.test(slug) && slug.length <= 80;
}

function loadCharacterJson(slug: string): Record<string, unknown> | null {
  try {
    const filePath = path.join(
      process.cwd(),
      "src/content/characters",
      `${slug}.json`
    );
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function loadReferenceAssets(): Array<Record<string, unknown>> {
  try {
    const filePath = path.join(
      process.cwd(),
      "src/content/reference-assets/character-reference-assets.json"
    );
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as { assets?: unknown[] };
    if (!Array.isArray(parsed.assets)) return [];
    return parsed.assets.filter(isRecord);
  } catch {
    return [];
  }
}

function buildProfileGenerationPrompt(
  character: Record<string, unknown>,
  primaryReference: Record<string, unknown> | null,
  supplementalReferences: Array<Record<string, unknown>>
): string {
  const characterName = String(character.name || "");
  const characterSlug = String(character.slug || "");
  const fruitType = String(character.fruitType || "");
  const shortDescription = String(character.shortDescription || "");
  const personality = Array.isArray(character.personality)
    ? character.personality.map(String).join(", ")
    : "";
  const visualIdentity = isRecord(character.visualIdentity)
    ? String(character.visualIdentity.styleNotes || "")
    : "";
  const primaryRefTitle = primaryReference ? String(primaryReference.title || "") : "";
  const primaryRefDescription = primaryReference ? String(primaryReference.description || "") : "";
  const primaryRefNotes = primaryReference ? String(primaryReference.notes || "") : "";

  const supplementalInfo = supplementalReferences
    .map((ref) => `${ref.title || ""}: ${ref.description || ""} (${ref.notes || ""})`)
    .join("\n");

  return `Generate a complete official character profile for "${characterName}" (${characterSlug}).

Character Context:
- Fruit Type: ${fruitType}
- Current Description: ${shortDescription}
- Personality: ${personality}
- Existing Visual Notes: ${visualIdentity}

Primary Reference Asset:
- Title: ${primaryRefTitle}
- Description: ${primaryRefDescription}
- Notes: ${primaryRefNotes}

Supplemental Approved References:
${supplementalInfo}

Requirements:
- Preserve Fruit Baby baby-like design language: soft rounded form, warm kid-friendly expression
- Keep character as a cute, playful fruit baby, not realistic, adult, scary, or generic
- For Tiki: keep mischievous, funny, dramatic, kid-friendly (not scary/violent/horror-like/cruel/evil/intense)
- Generate approximate color hex values but note they must be verified against the reference
- Include comprehensive rules for body shape, face/expression, texture, accessories, poses
- Add generation restrictions and do-not-change rules to preserve character integrity
- Include trademark/canon notes for fidelity

Output only valid JSON matching the ProfileDraft schema. No prose outside JSON.`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
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

  // ── Validate characterSlug ──────────────────────────────────────────────────
  const characterSlug = isRecord(body) && typeof body.characterSlug === "string"
    ? body.characterSlug
    : null;
  if (!characterSlug || !isValidSlug(characterSlug)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "characterSlug must be a valid slug (lowercase letters, numbers, hyphens only).",
      },
      { status: 400 }
    );
  }

  // ── Load character JSON ─────────────────────────────────────────────────────
  const character = loadCharacterJson(characterSlug);
  if (!character) {
    return Response.json(
      { ok: false, status: "character_not_found", message: "Character not found." },
      { status: 404 }
    );
  }

  // ── Check for primary reference ─────────────────────────────────────────────
  const primaryReferenceAssetUrl = isRecord(character.image) && typeof character.image.profileSheet === "string"
    ? character.image.profileSheet
    : (typeof character.primaryReferenceAssetUrl === "string" ? character.primaryReferenceAssetUrl : null);

  if (!primaryReferenceAssetUrl) {
    return Response.json(
      {
        ok: false,
        status: "missing_primary_reference",
        message: "Assign a Primary Official Reference before generating an official character profile draft.",
      },
      { status: 400 }
    );
  }

  // ── Check OpenAI configuration ──────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "OpenAI is not configured yet. Add OPENAI_API_KEY in Vercel environment variables.",
      },
      { status: 503 }
    );
  }

  // ── Load reference assets ───────────────────────────────────────────────────
  const allAssets = loadReferenceAssets();
  const approvedRefs = allAssets.filter(
    (asset) =>
      isRecord(asset) &&
      asset.characterSlug === characterSlug &&
      asset.reviewStatus === "approved-for-generation" &&
      asset.approvedForGeneration === true &&
      asset.generationUseAllowed === true
  );

  const primaryAsset = approvedRefs.find(
    (asset) =>
      asset.id === character.primaryReferenceAssetId ||
      asset.blobUrl === primaryReferenceAssetUrl
  );

  const supplementalRefs = approvedRefs.filter(
    (asset) => asset !== primaryAsset
  );

  // ── Call OpenAI ─────────────────────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey });

    const prompt = buildProfileGenerationPrompt(character, primaryAsset || null, supplementalRefs);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "developer",
          content: `You are a character profile generator for Fruit Baby World. Generate structured JSON profiles that preserve character integrity and brand guidelines. Output only valid JSON.`
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";

    // ── Parse and validate response ───────────────────────────────────────────
    let profileDraft: ProfileDraft;
    try {
      const parsed = JSON.parse(rawText);
      if (!isRecord(parsed)) throw new Error("Response is not an object");

      // Basic validation of required fields
      if (typeof parsed.name !== "string") throw new Error("Missing name");
      if (typeof parsed.slug !== "string") throw new Error("Missing slug");
      if (!Array.isArray(parsed.personalityTraits)) throw new Error("Invalid personalityTraits");
      if (!Array.isArray(parsed.colorPalette)) throw new Error("Invalid colorPalette");

      profileDraft = parsed as ProfileDraft;
    } catch (parseErr) {
      return Response.json(
        {
          ok: false,
          status: "openai_error",
          message: "Generated response could not be parsed as valid profile JSON.",
        },
        { status: 500 }
      );
    }

    return Response.json(
      {
        ok: true,
        status: "profile_draft_generated",
        characterSlug,
        primaryReferenceAssetUrl,
        profileDraft,
        notes: [
          "This draft has not been saved yet.",
          "Admin should review all visual details and color values before saving.",
          "No character approval or publishing changed.",
        ],
      } satisfies GenerateResult,
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred during generation.";

    return Response.json(
      { ok: false, status: "openai_error", message },
      { status: 500 }
    );
  }
}