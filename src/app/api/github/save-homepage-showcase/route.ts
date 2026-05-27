// POST /api/github/save-homepage-showcase
// Saves the homepage showcase config to GitHub.
// Auth: Protected by proxy.ts — requires valid admin cookie.

import { normalizeHomepageShowcaseConfig } from "@/lib/homepageShowcase";
import type { HomepageShowcaseConfig } from "@/lib/homepageShowcaseTypes";

type SaveResult =
  | {
      ok: true;
      status: "saved";
      path: string;
      config: HomepageShowcaseConfig;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "github_error";
      message: string;
      githubStatus?: number;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function POST(request: Request): Promise<Response> {
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

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, status: "setup_required", message: "GitHub saving is not configured." } satisfies SaveResult,
      { status: 503 }
    );
  }

  if (!isRecord(body.config)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "config is required and must be an object." } satisfies SaveResult,
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const normalized = normalizeHomepageShowcaseConfig({ ...body.config, updatedAt: now });

  const filePath = "src/content/site/homepage-showcase.json";
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Get current file SHA
  let existingSha: string | undefined;
  try {
    const getRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });
    if (getRes.ok) {
      const fileData = (await getRes.json()) as Record<string, unknown>;
      if (typeof fileData.sha === "string") existingSha = fileData.sha;
    }
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to reach GitHub API." } satisfies SaveResult,
      { status: 502 }
    );
  }

  const fileContent = JSON.stringify(normalized, null, 2);
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");
  const commitMessage = `Update homepage showcase config (${now.slice(0, 10)})`;

  try {
    const putBody: Record<string, unknown> = {
      message: commitMessage,
      content: contentBase64,
      branch,
    };
    if (existingSha) putBody.sha = existingSha;

    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: ghHeaders,
      body: JSON.stringify(putBody),
    });

    if (!putRes.ok) {
      const errBody = await putRes.text().catch(() => "");
      console.error(`[save-homepage-showcase] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        { ok: false, status: "github_error", message: `GitHub commit failed with status ${putRes.status}.`, githubStatus: putRes.status } satisfies SaveResult,
        { status: 502 }
      );
    }

    return Response.json(
      { ok: true, status: "saved", path: filePath, config: normalized } satisfies SaveResult,
      { status: 200 }
    );
  } catch {
    return Response.json(
      { ok: false, status: "github_error", message: "Failed to commit homepage showcase config to GitHub." } satisfies SaveResult,
      { status: 502 }
    );
  }
}
