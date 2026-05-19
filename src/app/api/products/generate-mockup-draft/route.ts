// POST /api/products/generate-mockup-draft
// Admin-only (proxy handles auth): generate a temporary product mockup image
// draft from a character-safe product prompt using DALL-E 3.
//
// Security: OpenAI API key is server-side only. Never exposed to the browser.
// Safety:   Generated images are never saved, uploaded, or written to JSON.
//           No Blob upload. No product concept mutation. No public product pages.
//           No commerce. Temporary admin review only.

import OpenAI from "openai";
import { loadAllCharactersFromDisk } from "@/lib/characterContent";
import { normalizeCharacterProfile } from "@/lib/characterProfileNormalizer";
import {
  loadReferenceAssets,
  buildCharacterReferencePackage,
} from "@/lib/referenceAssetLoader";
import {
  buildProductMockupImagePrompt,
  buildProductMockupWarnings,
} from "@/lib/productMockupPrompt";
import type { ProductMockupDraftResult, ProductMockupStyle } from "@/lib/productMockupTypes";
import type { ProductConceptCategory } from "@/lib/productConceptTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFE_SLUG = /^[a-z0-9-]+$/;
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
const UNSAFE_HTML = /<[^>]*>/;

const ALLOWED_CATEGORIES: ProductConceptCategory[] = [
  "plush", "squish-toy", "book", "card", "sticker", "poster",
  "playset", "apparel", "classroom-material", "collectible", "bundle", "other",
];
const ALLOWED_STYLES: ProductMockupStyle[] = [
  "clean-product-mockup", "storybook-product", "collector-display", "classroom-display",
];

// ─── Types ────────────────────────────────────────────────────────────────────

type ReferenceMode = "prompt-only-reference-summary" | "no-references-available";

type GenerateMockupResult =
  | {
      ok: true;
      status: "product_mockup_draft_generated";
      draft: ProductMockupDraftResult;
      generationPrompt: string;
      referenceMode: ReferenceMode;
      warnings: string[];
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "character_not_found"
        | "provider_error"
        | "unauthorized";
      message: string;
      generationPrompt?: string;
      warnings?: string[];
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function safeText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > max) return null;
  if (UNSAFE_HTML.test(t)) return null;
  return t;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies GenerateMockupResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies GenerateMockupResult,
      { status: 400 }
    );
  }

  // ── Validate fields ──────────────────────────────────────────────────────────

  if (body.productConceptId !== undefined && body.productConceptId !== "") {
    if (typeof body.productConceptId !== "string" || !SAFE_ID.test(body.productConceptId)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "productConceptId must be a safe alphanumeric ID if provided." } satisfies GenerateMockupResult,
        { status: 400 }
      );
    }
  }

  const characterSlug = typeof body.characterSlug === "string" && SAFE_SLUG.test(body.characterSlug)
    ? body.characterSlug
    : null;
  if (!characterSlug) {
    return Response.json(
      { ok: false, status: "validation_error", message: "characterSlug is required and must be a safe slug." } satisfies GenerateMockupResult,
      { status: 400 }
    );
  }

  if (!ALLOWED_CATEGORIES.includes(body.category as ProductConceptCategory)) {
    return Response.json(
      { ok: false, status: "validation_error", message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.` } satisfies GenerateMockupResult,
      { status: 400 }
    );
  }
  const category = body.category as ProductConceptCategory;

  const productTitle = safeText(body.productTitle, 120);
  if (!productTitle) {
    return Response.json(
      { ok: false, status: "validation_error", message: "productTitle is required, must be under 120 characters, and must not contain HTML." } satisfies GenerateMockupResult,
      { status: 400 }
    );
  }

  const promptText = safeText(body.promptText, 5000);
  if (!promptText) {
    return Response.json(
      { ok: false, status: "validation_error", message: "promptText is required, must be under 5000 characters, and must not contain HTML." } satisfies GenerateMockupResult,
      { status: 400 }
    );
  }

  let mockupStyle: ProductMockupStyle = "clean-product-mockup";
  if (body.mockupStyle !== undefined) {
    if (!ALLOWED_STYLES.includes(body.mockupStyle as ProductMockupStyle)) {
      return Response.json(
        { ok: false, status: "validation_error", message: `mockupStyle must be one of: ${ALLOWED_STYLES.join(", ")}.` } satisfies GenerateMockupResult,
        { status: 400 }
      );
    }
    mockupStyle = body.mockupStyle as ProductMockupStyle;
  }

  // ── Check OpenAI key ─────────────────────────────────────────────────────────
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "Product mockup draft generation is not active yet. Set OPENAI_API_KEY to enable generation.",
      } satisfies GenerateMockupResult,
      { status: 200 }
    );
  }

  // ── Load character ───────────────────────────────────────────────────────────
  const allChars = loadAllCharactersFromDisk();
  const rawChar = allChars.find(
    (c) => c.slug === characterSlug || (c as { id?: string }).id === characterSlug
  );

  if (!rawChar) {
    return Response.json(
      {
        ok: false,
        status: "character_not_found",
        message: `Character not found: ${characterSlug}. Use a valid character slug.`,
      } satisfies GenerateMockupResult,
      { status: 404 }
    );
  }

  const char = normalizeCharacterProfile(rawChar);

  // ── Load reference assets ────────────────────────────────────────────────────
  let referenceAssetTitles: string[] = [];
  let referenceMode: ReferenceMode = "no-references-available";

  try {
    const allAssets = loadReferenceAssets();
    const refPkg = buildCharacterReferencePackage(rawChar, allAssets);

    const topRefs = [
      ...refPkg.profileSheets.slice(0, 1),
      ...refPkg.mainReferences.slice(0, 1),
      ...refPkg.supportingReferences.slice(0, 2),
    ];

    if (topRefs.length > 0) {
      referenceAssetTitles = topRefs.map(
        (a) => a.title || a.description || a.assetType
      );
      referenceMode = "prompt-only-reference-summary";
    }
  } catch {
    // Reference loading failure is non-fatal — generate from prompt only
  }

  // ── Build generation prompt ──────────────────────────────────────────────────
  const colorPalette = char.colorPalette.map(
    (c) => `${c.name}${c.hex ? ` (${c.hex})` : ""}${c.usage ? ` — ${c.usage}` : ""}`
  );

  const promptInput = {
    characterSlug,
    characterName: char.displayName,
    characterFruitType: char.fruitType,
    characterRole: char.role,
    visualIdentitySummary: char.visualIdentitySummary,
    colorPalette,
    alwaysRules: char.alwaysRules,
    neverRules: char.neverRules,
    doNotChangeRules: char.doNotChangeRules,
    category,
    productTitle,
    promptText,
    mockupStyle,
    referenceAssetTitles,
  };

  const generationPrompt = buildProductMockupImagePrompt(promptInput);
  const promptWarnings = buildProductMockupWarnings(promptInput);

  const allWarnings = [
    ...promptWarnings,
    ...(referenceMode === "prompt-only-reference-summary"
      ? ["Product mockup generation used prompt-only reference guidance. Reference-image input can be added later."]
      : ["No approved reference assets found for this character. Character described from profile data only."]),
  ].filter((w, i, arr) => arr.indexOf(w) === i);

  // ── Generate image ───────────────────────────────────────────────────────────
  try {
    const openai = new OpenAI({ apiKey });

    const imageResponse = await openai.images.generate({
      model: "dall-e-3",
      prompt: generationPrompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const b64 = imageResponse.data?.[0]?.b64_json;
    if (!b64) {
      return Response.json(
        {
          ok: false,
          status: "provider_error",
          message: "Image generation returned an empty response.",
          generationPrompt,
          warnings: allWarnings,
        } satisfies GenerateMockupResult,
        { status: 502 }
      );
    }

    const draft: ProductMockupDraftResult = {
      id: `product-mockup-draft-${Date.now()}`,
      characterSlug,
      category,
      productTitle,
      promptText,
      imageBase64: b64,
      mimeType: "image/png",
      createdAt: new Date().toISOString(),
      warnings: allWarnings,
    };

    return Response.json(
      {
        ok: true,
        status: "product_mockup_draft_generated",
        draft,
        generationPrompt,
        referenceMode,
        warnings: allWarnings,
        notes: [
          "This product mockup draft has not been saved.",
          "Review it before saving to a product concept in a future phase.",
          "No public product page or commerce was created.",
        ],
      } satisfies GenerateMockupResult,
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed.";
    console.error("[generate-mockup-draft] OpenAI error:", message);
    return Response.json(
      {
        ok: false,
        status: "provider_error",
        message: "Image generation failed. See server logs for details.",
        generationPrompt,
        warnings: allWarnings,
      } satisfies GenerateMockupResult,
      { status: 502 }
    );
  }
}
