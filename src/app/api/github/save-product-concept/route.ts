// POST /api/github/save-product-concept
// Admin-only (proxy handles auth): create or update a product concept in
// src/content/products/product-concepts.json on the configured GitHub branch.
//
// Security: GitHub token is server-side only. Never exposed to the browser.
// Safety:   Planning-only. No product media, no commerce, no public product pages.
//           No image generation. No Blob uploads. No product deletion.

import type {
  ProductConcept,
  ProductConceptCategory,
  ProductConceptStatus,
  ProductConceptAudience,
} from "@/lib/productConceptTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_CATEGORIES: ProductConceptCategory[] = [
  "plush", "squish-toy", "book", "card", "sticker", "poster",
  "playset", "apparel", "classroom-material", "collectible", "bundle", "other",
];
const ALLOWED_STATUSES: ProductConceptStatus[] = ["idea", "planned", "in-design", "archived"];
const ALLOWED_AUDIENCES: ProductConceptAudience[] = ["kids", "parents", "teachers", "collectors", "families"];
const SAFE_SLUG = /^[a-z0-9-]+$/;
const UNSAFE_HTML = /<[^>]*>/;

const FILE_PATH = "src/content/products/product-concepts.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type SaveResult =
  | {
      ok: true;
      status: "product_concept_saved";
      concept: ProductConcept;
      path: string;
      commitMessage: string;
      notes: string[];
    }
  | {
      ok: false;
      status: "validation_error" | "setup_required" | "github_error" | "unauthorized";
      message: string;
    };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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

function safeText(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  if (trimmed.length > max) return null;
  if (UNSAFE_HTML.test(trimmed)) return null;
  return trimmed;
}

function generateConceptId(category: ProductConceptCategory): string {
  return `product-concept-${category}-${Date.now()}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  // ── Parse body ───────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies SaveResult,
      { status: 400 }
    );
  }

  const raw = body.concept;
  if (!isRecord(raw)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "concept is required and must be an object." } satisfies SaveResult,
      { status: 400 }
    );
  }

  // ── Validate fields ──────────────────────────────────────────────────────────

  const title = safeText(raw.title, 120);
  if (!title) {
    return Response.json(
      { ok: false, status: "validation_error", message: "concept.title is required and must be a non-empty string under 120 characters with no HTML." } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (!ALLOWED_CATEGORIES.includes(raw.category as ProductConceptCategory)) {
    return Response.json(
      { ok: false, status: "validation_error", message: `concept.category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.` } satisfies SaveResult,
      { status: 400 }
    );
  }
  const category = raw.category as ProductConceptCategory;

  if (!ALLOWED_STATUSES.includes(raw.status as ProductConceptStatus)) {
    return Response.json(
      { ok: false, status: "validation_error", message: `concept.status must be one of: ${ALLOWED_STATUSES.join(", ")}.` } satisfies SaveResult,
      { status: 400 }
    );
  }
  const status = raw.status as ProductConceptStatus;

  const shortDescription = safeText(raw.shortDescription, 500);
  if (!shortDescription) {
    return Response.json(
      { ok: false, status: "validation_error", message: "concept.shortDescription is required and must be under 500 characters with no HTML." } satisfies SaveResult,
      { status: 400 }
    );
  }

  // Optional fields
  let characterSlug: string | undefined;
  if (raw.characterSlug !== undefined && raw.characterSlug !== "") {
    if (!SAFE_SLUG.test(raw.characterSlug as string)) {
      return Response.json(
        { ok: false, status: "validation_error", message: "concept.characterSlug must be a safe slug (lowercase letters, numbers, hyphens)." } satisfies SaveResult,
        { status: 400 }
      );
    }
    characterSlug = raw.characterSlug as string;
  }

  let audience: ProductConceptAudience | undefined;
  if (raw.audience !== undefined && raw.audience !== "") {
    if (!ALLOWED_AUDIENCES.includes(raw.audience as ProductConceptAudience)) {
      return Response.json(
        { ok: false, status: "validation_error", message: `concept.audience must be one of: ${ALLOWED_AUDIENCES.join(", ")}.` } satisfies SaveResult,
        { status: 400 }
      );
    }
    audience = raw.audience as ProductConceptAudience;
  }

  let productNotes: string | undefined;
  if (raw.productNotes !== undefined && raw.productNotes !== "") {
    const notes = safeText(raw.productNotes, 1500);
    if (notes === null) {
      return Response.json(
        { ok: false, status: "validation_error", message: "concept.productNotes must be under 1500 characters with no HTML." } satisfies SaveResult,
        { status: 400 }
      );
    }
    productNotes = notes || undefined;
  }

  let characterIntegrityNotes: string | undefined;
  if (raw.characterIntegrityNotes !== undefined && raw.characterIntegrityNotes !== "") {
    const intNotes = safeText(raw.characterIntegrityNotes, 1500);
    if (intNotes === null) {
      return Response.json(
        { ok: false, status: "validation_error", message: "concept.characterIntegrityNotes must be under 1500 characters with no HTML." } satisfies SaveResult,
        { status: 400 }
      );
    }
    characterIntegrityNotes = intNotes || undefined;
  }

  // ── GitHub env setup ─────────────────────────────────────────────────────────
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured yet." } satisfies SaveResult,
      { status: 503 }
    );
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // ── Fetch existing file from GitHub ──────────────────────────────────────────
  let existingSha: string | undefined;
  let existingConcepts: ProductConcept[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
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
        } catch {
          // treat as empty if parse fails
        }
      }
    } else if (getRes.status !== 404) {
      console.error(`[save-product-concept] Unexpected GET status: ${getRes.status}`);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to fetch existing product concepts from GitHub." } satisfies SaveResult,
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[save-product-concept] Network error fetching file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies SaveResult,
      { status: 502 }
    );
  }

  // ── Assemble concept ─────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const existingId = typeof raw.id === "string" && SAFE_SLUG.test(raw.id) ? raw.id : undefined;
  const isUpdate = !!existingId && existingConcepts.some((c) => c.id === existingId);

  const existing = isUpdate ? existingConcepts.find((c) => c.id === existingId)! : null;

  const concept: ProductConcept = {
    id: existingId ?? generateConceptId(category),
    title,
    category,
    status,
    shortDescription,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    ...(characterSlug ? { characterSlug } : {}),
    ...(audience ? { audience } : {}),
    ...(productNotes ? { productNotes } : {}),
    ...(characterIntegrityNotes ? { characterIntegrityNotes } : {}),
  };

  const updatedConcepts = isUpdate
    ? existingConcepts.map((c) => (c.id === concept.id ? concept : c))
    : [...existingConcepts, concept];

  // ── Write back to GitHub ─────────────────────────────────────────────────────
  const fileContent = JSON.stringify({ concepts: updatedConcepts }, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");
  const commitMessage = isUpdate
    ? `Update product concept: ${title}`
    : `Add product concept: ${title}`;

  const putBody: Record<string, unknown> = {
    message: commitMessage,
    content: contentBase64,
    branch,
    ...(existingSha ? { sha: existingSha } : {}),
  };

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => "(unreadable)");
      console.error(`[save-product-concept] PUT failed ${putRes.status}: ${errText}`);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to save product concept to GitHub." } satisfies SaveResult,
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[save-product-concept] Network error writing file:", err instanceof Error ? err.message : err);
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies SaveResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "product_concept_saved",
      concept,
      path: FILE_PATH,
      commitMessage,
      notes: [
        "Product concept was saved.",
        "No product media was generated.",
        "No commerce or public product page was created.",
      ],
    } satisfies SaveResult,
    { status: 200 }
  );
}
