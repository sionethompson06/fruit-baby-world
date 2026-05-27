// POST /api/products/save-approved-mockup
// Admin-only (proxy handles auth): upload an approved product mockup draft to
// Vercel Blob and attach the saved mockup metadata to the matching product concept.
//
// Security: GitHub token and Blob token are server-side only. Never exposed.
// Safety:   Saved mockups are admin-only by default. No public product pages.
//           No commerce. No Blob deletions. No story/audio/video changes.

import { put, BlobError } from "@vercel/blob";
import type {
  ProductConcept,
  ProductConceptCategory,
} from "@/lib/productConceptTypes";
import type { ProductMockupAsset } from "@/lib/productConceptTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_CATEGORIES: ProductConceptCategory[] = [
  "plush", "squish-toy", "book", "card", "sticker", "poster",
  "playset", "apparel", "classroom-material", "collectible", "bundle", "other",
];
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];
const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const SAFE_SLUG = /^[a-z0-9-]+$/;
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
const UNSAFE_HTML = /<[^>]*>/;
const FILE_PATH = "src/content/products/product-concepts.json";

// 15 MB base64 ceiling (raw buffer will be ~75% of this)
const MAX_BASE64_BYTES = 15 * 1024 * 1024;

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveMockupResult =
  | {
      ok: true;
      status: "product_mockup_saved";
      concept: ProductConcept;
      mockup: ProductMockupAsset;
      path: string;
      commitMessage: string;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "concept_not_found"
        | "blob_upload_failed"
        | "github_save_failed"
        | "file_too_large"
        | "unauthorized";
      message: string;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

function isProductConcept(v: unknown): v is ProductConcept {
  if (!isRecord(v)) return false;
  return (
    typeof v.id === "string" &&
    typeof v.title === "string" &&
    typeof v.category === "string" &&
    typeof v.status === "string" &&
    typeof v.shortDescription === "string" &&
    typeof v.createdAt === "string"
  );
}

function parseImageBase64(raw: string): { base64: string; detectedMime: string | null } {
  const match = raw.match(/^data:(image\/[a-z]+);base64,([\s\S]+)$/);
  if (match) return { base64: match[2], detectedMime: match[1] };
  return { base64: raw, detectedMime: null };
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }

  // ── Validate required fields ─────────────────────────────────────────────────

  if (typeof body.productConceptId !== "string" || !SAFE_ID.test(body.productConceptId)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "productConceptId is required and must be a safe alphanumeric ID." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }
  const productConceptId = body.productConceptId;

  if (typeof body.characterSlug !== "string" || !SAFE_SLUG.test(body.characterSlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "characterSlug is required and must be a safe slug." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug;

  if (!ALLOWED_CATEGORIES.includes(body.category as ProductConceptCategory)) {
    return Response.json(
      { ok: false, status: "validation_error", message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.` } satisfies SaveMockupResult,
      { status: 400 }
    );
  }
  const category = body.category as ProductConceptCategory;

  const productTitle = safeText(body.productTitle, 120);
  if (!productTitle) {
    return Response.json(
      { ok: false, status: "validation_error", message: "productTitle is required and must be under 120 characters with no HTML." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }

  if (typeof body.imageBase64 !== "string" || body.imageBase64.trim().length === 0) {
    return Response.json(
      { ok: false, status: "validation_error", message: "imageBase64 is required." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }
  const rawBase64Input = body.imageBase64.trim();

  if (Buffer.byteLength(rawBase64Input, "utf8") > MAX_BASE64_BYTES) {
    return Response.json(
      { ok: false, status: "file_too_large", message: "Image is too large to save. Maximum size is 15 MB." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }

  const { base64: base64Data, detectedMime } = parseImageBase64(rawBase64Input);
  const resolvedMime = detectedMime ?? body.mimeType;
  if (!isAllowedMime(resolvedMime)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "mimeType must be one of: image/png, image/jpeg, image/webp." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }
  const mimeType: AllowedMime = resolvedMime;

  // Optional fields
  let promptText: string | undefined;
  if (body.promptText !== undefined && body.promptText !== "") {
    const pt = safeText(body.promptText, 8000);
    if (pt === null) {
      return Response.json(
        { ok: false, status: "validation_error", message: "promptText must be under 8000 characters with no HTML if provided." } satisfies SaveMockupResult,
        { status: 400 }
      );
    }
    promptText = pt || undefined;
  }

  let reviewNotes: string | undefined;
  if (body.reviewNotes !== undefined && body.reviewNotes !== "") {
    const rn = safeText(body.reviewNotes, 1000);
    if (rn === null) {
      return Response.json(
        { ok: false, status: "validation_error", message: "reviewNotes must be under 1000 characters with no HTML." } satisfies SaveMockupResult,
        { status: 400 }
      );
    }
    reviewNotes = rn || undefined;
  }

  let mockupStyle: string | undefined;
  if (typeof body.mockupStyle === "string" && SAFE_ID.test(body.mockupStyle)) {
    mockupStyle = body.mockupStyle;
  }

  let approvedBy = "admin";
  if (typeof body.approvedBy === "string" && SAFE_ID.test(body.approvedBy)) {
    approvedBy = body.approvedBy;
  }

  // ── Check env ────────────────────────────────────────────────────────────────
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  const ghToken = process.env.GITHUB_TOKEN;
  const ghOwner = process.env.GITHUB_OWNER;
  const ghRepo = process.env.GITHUB_REPO;
  const ghBranch = process.env.GITHUB_BRANCH;

  if (!blobToken) {
    return Response.json(
      { ok: false, status: "setup_required", message: "Media storage is not configured. Add BLOB_READ_WRITE_TOKEN." } satisfies SaveMockupResult,
      { status: 503 }
    );
  }

  if (!ghToken || !ghOwner || !ghRepo || !ghBranch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured. Check GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH." } satisfies SaveMockupResult,
      { status: 503 }
    );
  }

  // ── Fetch product concepts from GitHub ────────────────────────────────────────
  const apiUrl = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${FILE_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${ghToken}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string | undefined;
  let existingConcepts: ProductConcept[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(ghBranch)}`, {
      method: "GET",
      headers: ghHeaders,
    });

    if (getRes.ok) {
      const fileData = (await getRes.json()) as Record<string, unknown>;
      existingSha = typeof fileData.sha === "string" ? fileData.sha : undefined;
      if (typeof fileData.content === "string") {
        const decoded = Buffer.from(fileData.content.replace(/\n/g, ""), "base64").toString("utf-8");
        try {
          const parsed = JSON.parse(decoded) as { concepts?: unknown[] };
          if (Array.isArray(parsed.concepts)) {
            existingConcepts = parsed.concepts.filter(isProductConcept);
          }
        } catch { /* treat as empty */ }
      }
    } else if (getRes.status !== 404) {
      return Response.json(
        { ok: false, status: "github_save_failed", message: "Failed to fetch product concepts from GitHub." } satisfies SaveMockupResult,
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[save-approved-mockup] GitHub fetch error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Failed to reach the GitHub API." } satisfies SaveMockupResult,
      { status: 502 }
    );
  }

  // ── Find target concept ───────────────────────────────────────────────────────
  const conceptIndex = existingConcepts.findIndex((c) => c.id === productConceptId);
  if (conceptIndex === -1) {
    return Response.json(
      { ok: false, status: "concept_not_found", message: `Product concept not found: ${productConceptId}.` } satisfies SaveMockupResult,
      { status: 404 }
    );
  }

  // ── Decode image ─────────────────────────────────────────────────────────────
  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, "base64");
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Could not decode imageBase64. Regenerate the draft and try again." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }
  if (imageBuffer.length === 0) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Decoded image is empty. Regenerate the draft and try again." } satisfies SaveMockupResult,
      { status: 400 }
    );
  }

  // ── Upload to Blob ────────────────────────────────────────────────────────────
  const ext = MIME_EXTENSIONS[mimeType];
  const blobPath = `products/mockups/${productConceptId}/${Date.now()}-product-mockup.${ext}`;

  let blobUrl: string;
  let blobPathname: string;

  try {
    const blob = await put(blobPath, imageBuffer, {
      access: "public",
      contentType: mimeType,
      token: blobToken,
    });
    blobUrl = blob.url;
    blobPathname = blob.pathname;
  } catch (err) {
    const msg = err instanceof BlobError ? err.message : "Blob upload failed.";
    console.error("[save-approved-mockup] Blob upload error:", msg);
    return Response.json(
      { ok: false, status: "blob_upload_failed", message: "Failed to upload mockup image to media storage. See server logs." } satisfies SaveMockupResult,
      { status: 502 }
    );
  }

  // ── Build mockup asset ────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const mockup: ProductMockupAsset = {
    id: `product-mockup-${Date.now()}`,
    type: "product-mockup",
    status: "saved",
    visibility: "admin-only",
    characterSlug,
    category,
    productTitle,
    url: blobUrl,
    pathname: blobPathname,
    mimeType,
    sizeBytes: imageBuffer.length,
    approvedBy,
    approvedAt: now,
    createdAt: now,
    ...(promptText ? { promptText } : {}),
    ...(mockupStyle ? { mockupStyle } : {}),
    ...(reviewNotes ? { reviewNotes } : {}),
  };

  // ── Update concept ────────────────────────────────────────────────────────────
  const existingConcept = existingConcepts[conceptIndex];
  const currentStatus = existingConcept.status;
  const updatedConcept: ProductConcept = {
    ...existingConcept,
    mockups: [...(existingConcept.mockups ?? []), mockup],
    updatedAt: now,
    status:
      currentStatus === "idea" || currentStatus === "planned"
        ? "in-design"
        : currentStatus,
  };

  const updatedConcepts = existingConcepts.map((c, i) =>
    i === conceptIndex ? updatedConcept : c
  );

  // ── Write back to GitHub ──────────────────────────────────────────────────────
  const fileContent = JSON.stringify({ concepts: updatedConcepts }, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");
  const commitMessage = `Attach product mockup: ${productTitle}`;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch: ghBranch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "(unreadable)");
      console.error(`[save-approved-mockup] GitHub PUT failed ${putRes.status}: ${errText}`);
      return Response.json(
        { ok: false, status: "github_save_failed", message: "Mockup uploaded to storage but failed to attach to product concept. Try attaching manually." } satisfies SaveMockupResult,
        { status: 207 }
      );
    }
  } catch (err) {
    console.error("[save-approved-mockup] GitHub write error:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_save_failed", message: "Mockup uploaded to storage but failed to reach GitHub. Try attaching manually." } satisfies SaveMockupResult,
      { status: 207 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "product_mockup_saved",
      concept: updatedConcept,
      mockup,
      path: FILE_PATH,
      commitMessage,
      notes: [
        "Approved product mockup was saved to media storage.",
        "Mockup metadata was attached to the product concept.",
        "The mockup is admin-only and not public yet.",
        "No commerce or checkout was created.",
      ],
    } satisfies SaveMockupResult,
    { status: 200 }
  );
}
