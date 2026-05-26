// POST /api/github/update-product-mockup-visibility
// Admin-only: update visibility on a saved product mockup within product-concepts.json.
//
// Security: GitHub token is server-side only. Never exposed to the browser.
// Safety:   Only updates selected mockup visibility and visibilityUpdatedAt.
//           Does not delete files. No commerce. No other concept fields modified.

import type { ProductConcept } from "@/lib/productConceptTypes";

// ─── Constants ────────────────────────────────────────────────────────────────

const ALLOWED_VISIBILITIES = ["admin-only", "public-ready", "hidden"] as const;
type MockupVisibility = (typeof ALLOWED_VISIBILITIES)[number];
const SAFE_ID = /^[a-zA-Z0-9_-]+$/;
const FILE_PATH = "src/content/products/product-concepts.json";

// ─── Types ────────────────────────────────────────────────────────────────────

type UpdateMockupVisibilityResult =
  | {
      ok: true;
      status: "mockup_visibility_updated";
      conceptId: string;
      mockupId: string;
      visibility: MockupVisibility;
      notes: string[];
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "concept_not_found"
        | "mockup_not_found"
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
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UpdateMockupVisibilityResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UpdateMockupVisibilityResult,
      { status: 400 }
    );
  }

  if (typeof body.productConceptId !== "string" || !SAFE_ID.test(body.productConceptId)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "productConceptId is required." } satisfies UpdateMockupVisibilityResult,
      { status: 400 }
    );
  }
  const productConceptId = body.productConceptId;

  if (typeof body.mockupId !== "string" || !SAFE_ID.test(body.mockupId)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "mockupId is required." } satisfies UpdateMockupVisibilityResult,
      { status: 400 }
    );
  }
  const mockupId = body.mockupId;

  if (!ALLOWED_VISIBILITIES.includes(body.visibility as MockupVisibility)) {
    return Response.json(
      { ok: false, status: "validation_error", message: `visibility must be one of: ${ALLOWED_VISIBILITIES.join(", ")}.` } satisfies UpdateMockupVisibilityResult,
      { status: 400 }
    );
  }
  const visibility = body.visibility as MockupVisibility;

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies UpdateMockupVisibilityResult,
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
        { ok: false, status: "github_error", message: "Failed to fetch product concepts from GitHub." } satisfies UpdateMockupVisibilityResult,
        { status: 502 }
      );
    }
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateMockupVisibilityResult,
      { status: 502 }
    );
  }

  const conceptIdx = concepts.findIndex((c) => c.id === productConceptId);
  if (conceptIdx === -1) {
    return Response.json(
      { ok: false, status: "concept_not_found", message: `Product concept not found: ${productConceptId}.` } satisfies UpdateMockupVisibilityResult,
      { status: 404 }
    );
  }

  const concept = concepts[conceptIdx];
  const mockups = concept.mockups ?? [];
  const mockupIdx = mockups.findIndex((m) => m.id === mockupId);
  if (mockupIdx === -1) {
    return Response.json(
      { ok: false, status: "mockup_not_found", message: `Mockup not found: ${mockupId}.` } satisfies UpdateMockupVisibilityResult,
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const updatedMockups = mockups.map((m, i) =>
    i === mockupIdx ? { ...m, visibility, visibilityUpdatedAt: now } : m
  );

  const updatedConcepts = concepts.map((c, i) =>
    i === conceptIdx ? { ...c, mockups: updatedMockups, updatedAt: now } : c
  );

  const fileContent = JSON.stringify({ concepts: updatedConcepts }, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");
  const commitMessage = `Update product mockup visibility: ${concept.title} — ${visibility}`;

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
      console.error(`[update-product-mockup-visibility] PUT failed: ${putRes.status}`);
      return Response.json(
        { ok: false, status: "github_error", message: "Failed to save mockup visibility to GitHub." } satisfies UpdateMockupVisibilityResult,
        { status: 502 }
      );
    }
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach the GitHub API." } satisfies UpdateMockupVisibilityResult,
      { status: 502 }
    );
  }

  return Response.json(
    {
      ok: true,
      status: "mockup_visibility_updated",
      conceptId: productConceptId,
      mockupId,
      visibility,
      notes: [
        `Mockup visibility set to: ${visibility}.`,
        "No files were deleted.",
        "No commerce was created.",
      ],
    } satisfies UpdateMockupVisibilityResult,
    { status: 200 }
  );
}
