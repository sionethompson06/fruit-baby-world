// POST /api/characters/generate-official-profile-draft
// Admin-only (proxy handles auth): analyze a character's primary reference image
// using OpenAI gpt-4o vision and return a structured profile draft JSON.
// No data is saved here — saving is a separate step via save-character-profile-draft.

import fs from "fs";
import path from "path";
import OpenAI from "openai";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;
const CHARACTERS_PATH = path.join(process.cwd(), "src/content/characters");

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileDraft = {
  name: string;
  shortName: string;
  role: string;
  type: string;
  fruitType: string;
  home: string;
  shortDescription: string;
  personalityTraits: string[];
  visualIdentity: string;
  colorPalette: { name: string; hex: string; usage: string }[];
  bodyShapeRules: string[];
  faceAndExpressionRules: string[];
  textureAndSurfaceRules: string[];
  leafCrownAccessoryRules: string[];
  poseAndGestureRules: string[];
  storyRole: string;
  voiceGuide: string;
  favoriteQuote: string;
  characterRules: { always: string[]; never: string[] };
  generationRestrictions: string[];
  doNotChangeRules: string[];
  trademarkNotes: string;
  imageAlt: string;
  profileCompletenessNotes: string;
  adminReviewNotes: string[];
};

type GenerateProfileResult =
  | {
      ok: true;
      status: "profile_draft_generated";
      profileDraft: ProfileDraft;
      referenceUrl: string;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "character_not_found"
        | "no_reference_image"
        | "generation_error"
        | "parse_error";
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

function loadCharacter(slug: string): Record<string, unknown> | null {
  try {
    const filePath = path.join(CHARACTERS_PATH, `${slug}.json`);
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getPrimaryReferenceUrl(char: Record<string, unknown>): string | null {
  if (
    typeof char.primaryReferenceAssetUrl === "string" &&
    char.primaryReferenceAssetUrl &&
    char.primaryReferenceAssetUrl.startsWith("http")
  ) {
    return char.primaryReferenceAssetUrl;
  }
  if (isRecord(char.image)) {
    const profileSheet = char.image.profileSheet;
    if (
      typeof profileSheet === "string" &&
      profileSheet &&
      profileSheet.startsWith("http")
    ) {
      return profileSheet;
    }
  }
  return null;
}

function buildSystemPrompt(char: Record<string, unknown>): string {
  const name = typeof char.name === "string" ? char.name : "this character";
  const slug = typeof char.slug === "string" ? char.slug : "";
  const type = typeof char.type === "string" ? char.type : "fruit-baby";
  const existingPersonality = Array.isArray(char.personality)
    ? (char.personality as string[]).join(", ")
    : "";
  const existingRole = typeof char.role === "string" ? char.role : "";

  return `You are an expert character profile writer for the Fruit Baby Universe — a kid-friendly animated brand for children ages 2-8. Your job is to analyze the provided official character reference image and generate a comprehensive, structured character profile JSON.

Character context:
- Name: ${name}
- Slug: ${slug}
- Type: ${type}
${existingRole ? `- Role: ${existingRole}` : ""}
${existingPersonality ? `- Known personality: ${existingPersonality}` : ""}

IMPORTANT RULES:
1. Return ONLY a valid JSON object matching the exact schema below. No markdown fences, no commentary outside the JSON.
2. Be visually specific — describe what you actually see in the image with precision.
3. All rules must be specific enough to reliably guide AI image generation consistency.
4. Keep everything appropriate for children (ages 2-8) — no scary, violent, or adult content.
5. Hex colors must be real hex codes extracted from the image (e.g., "#FFD84D").
6. String arrays should have 3-8 items unless the concept naturally has fewer.
7. If you cannot determine a value from the image, use an empty string or empty array and note it in adminReviewNotes.

REQUIRED JSON SCHEMA — return this exact shape:
{
  "name": "Full character name",
  "shortName": "Nickname or short name",
  "role": "Brief role (e.g., Heart of the Fruit Baby Universe)",
  "type": "fruit-baby OR villain OR other",
  "fruitType": "The fruit this character is based on",
  "home": "Character's home environment or setting",
  "shortDescription": "2-3 sentence character bio appropriate for young children",
  "personalityTraits": ["trait1", "trait2", "trait3"],
  "visualIdentity": "1-3 sentence description of the character's overall visual style and what makes them instantly recognizable",
  "colorPalette": [
    { "name": "Descriptive color name", "hex": "#HEXCODE", "usage": "Where this color appears on the character" }
  ],
  "bodyShapeRules": ["Specific rule about body shape that must always be preserved for generation consistency"],
  "faceAndExpressionRules": ["Specific rule about face structure and default expressions"],
  "textureAndSurfaceRules": ["Specific rule about surface texture, skin texture, or material finish"],
  "leafCrownAccessoryRules": ["Specific rule about leaf crown, hat, accessories, or signature props — or note 'No crown' if absent"],
  "poseAndGestureRules": ["Specific rule about poses, gestures, and movement style appropriate for this character"],
  "storyRole": "How this character functions in stories (1-2 sentences)",
  "voiceGuide": "How this character speaks — tone, vocabulary level, sentence structure, and catchphrase style",
  "favoriteQuote": "A sample quote that sounds like this character in their authentic voice",
  "characterRules": {
    "always": ["What this character always does or embodies"],
    "never": ["What this character must never do or become"]
  },
  "generationRestrictions": ["Things AI image generation must never change about this character"],
  "doNotChangeRules": ["Specific visual elements that must never be altered across any generated image"],
  "trademarkNotes": "Brief note about trademark-sensitive visual elements or brand-critical design details",
  "imageAlt": "Descriptive alt text for the character's official profile image (screen reader friendly)",
  "profileCompletenessNotes": "Brief note on what was confidently inferred from the image vs. what may need admin review",
  "adminReviewNotes": ["Specific item the admin should verify or update before this profile is finalized"]
}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message:
          "OPENAI_API_KEY is not configured. Add it to environment variables to enable profile generation.",
      } satisfies GenerateProfileResult,
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
      } satisfies GenerateProfileResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies GenerateProfileResult,
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
      } satisfies GenerateProfileResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug as string;

  // ── Load character from disk ───────────────────────────────────────────────
  const char = loadCharacter(characterSlug);
  if (!char) {
    return Response.json(
      {
        ok: false,
        status: "character_not_found",
        message: `Character "${characterSlug}" was not found.`,
      } satisfies GenerateProfileResult,
      { status: 404 }
    );
  }

  // ── Require primary reference URL ──────────────────────────────────────────
  const referenceUrl = getPrimaryReferenceUrl(char);
  if (!referenceUrl) {
    return Response.json(
      {
        ok: false,
        status: "no_reference_image",
        message:
          "No primary reference image URL found. Assign a Primary Official Reference first (must be an https:// URL).",
      } satisfies GenerateProfileResult,
      { status: 422 }
    );
  }

  // ── Call OpenAI gpt-4o with vision ─────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey });
    const systemPrompt = buildSystemPrompt(char);
    const charName =
      typeof char.name === "string" ? char.name : characterSlug;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "developer", content: systemPrompt },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: referenceUrl, detail: "high" },
            },
            {
              type: "text",
              text: `Analyze this official character reference image for ${charName} and generate the complete character profile JSON as specified in the system instructions.`,
            },
          ],
        },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    });

    const rawText = completion.choices[0]?.message?.content ?? "";

    let profileDraft: ProfileDraft;
    try {
      profileDraft = JSON.parse(rawText) as ProfileDraft;
    } catch {
      return Response.json(
        {
          ok: false,
          status: "parse_error",
          message:
            "Generation succeeded but the response could not be parsed as JSON. Try again.",
        } satisfies GenerateProfileResult,
        { status: 200 }
      );
    }

    return Response.json(
      {
        ok: true,
        status: "profile_draft_generated",
        profileDraft,
        referenceUrl,
      } satisfies GenerateProfileResult,
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "An unexpected error occurred during generation.";
    return Response.json(
      {
        ok: false,
        status: "generation_error",
        message: `Generation failed: ${message}`,
      } satisfies GenerateProfileResult,
      { status: 500 }
    );
  }
}
