// POST /api/github/update-product-concept-visibility
// Admin-only: update publicPreviewStatus on a product concept in product-concepts.json.
//
// Security: GitHub token is server-side only. Never exposed to the browser.
// Safety:   Only updates publicPreviewStatus and publicPreviewUpdatedAt.
//           Does not modify mockups. Does not delete files. No commerce.

import type { ProductConcept } from "@/lib/productConceptTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_STATUSES = ["draft", "public-ready", "hidden"] as const;
type PublicPreviewStatus = (typeof ALLOWED_STATUSES)[number];
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
const FILE_PATH = "src/content/products/product-concepts.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateVisibilityResult =
  | {
      ok: true;
      status: "concept_visibility_updated";
      conceptId: string;
      publicPreviewStatus: PublicPreviewStatus;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "concept_not_found"
        | "github_error";
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }

  if (typeof body.productConceptId !== "string" || !SAFE_ID.test(body.productConceptId)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "productConceptId is required and must be a safe ID." } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }
  const productConceptId = body.productConceptId;

  if (!ALLOWED_STATUSES.includes(body.publicPreviewStatus as PublicPreviewStatus)) {
    return Response.json(
      { ok: false, status: "validation_error", message: `publicPreviewStatus must be one of: ${ALLOWED_STATUSES.join(", ")}.` } satisfies UpdateVisibilityResult,
      { status: 400 }
    );
  }
  const publicPreviewStatus = body.publicPreviewStatus as PublicPreviewStatus;

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies UpdateVisibilityResult,
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

  let existingSha: string | undefined;
  let concepts: ProductConcept[] = [];

  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { method: "GET", headers: ghHeaders });
    if (getRes.ok) {
      const fd = (await getRes.json()) as Record<string, unknown>;
      existingSha = typeof fd.sha === "string" ? fd.sha : undefined;
      if (typeof fd.content === "string") {
        const decoded = Buffer.from(fd.content.replace(/\n/g, ""), "base64").toString("utf-8");
        try {
          const parsed = JSON.parse(decoded) as { concepts?: unknown[] };
          if (Array.isArray(parsed.concepts)) concepts = parsed.concepts.filter(isProductConcept);
        } catch { /* empty */ }
      }
    } else if (getRes.status !== 404) {
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to fetch product concepts from GitHub." } satisfies UpdateVisibilityResult,
        { status: 502 }
      );
    }
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateVisibilityResult,
      { status: 502 }
    );
  }

  const idx = concepts.findIndex((c) => c.id === productConceptId);
  if (idx === -1) {
    return Response.json(
      { ok: false, status: "concept_not_found", message: `Product concept not found: ${productConceptId}.` } satisfies UpdateVisibilityResult,
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const updatedConcepts = concepts.map((c, i) =>
    i === idx
      ? { ...c, publicPreviewStatus, publicPreviewUpdatedAt: now, updatedAt: now }
      : c
  );

  const fileContent = JSON.stringify({ concepts: updatedConcepts }, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");
  const commitMessage = `Update product concept visibility: ${concepts[idx].title} → ${publicPreviewStatus}`;

  try {
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify({
        message: commitMessage,
        content: contentBase64,
        branch,
        ...(existingSha ? { sha: existingSha } : {}),
      }),
    });

    if (!putRes.ok) {
      console.error(`[update-product-concept-visibility] PUT failed: ${putRes.status}`);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to save visibility update to GitHub." } satisfies UpdateVisibilityResult,
        { status: 502 }
      );
    }
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateVisibilityResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "concept_visibility_updated",
      conceptId: productConceptId,
      publicPreviewStatus,
      notes: [
        `Product concept preview status set to: ${publicPreviewStatus}.`,
        "No product media was modified.",
        "No commerce was created.",
      ],
    } satisfies UpdateVisibilityResult,
    { status: 200 }
  );
}
