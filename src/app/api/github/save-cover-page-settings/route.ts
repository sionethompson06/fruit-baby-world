// POST /api/github/save-cover-page-settings
// Saves cover page settings to src/content/site/cover-page.json via the GitHub API.
// Protected by the admin auth proxy — requires a valid admin session cookie.

import { normalizeCoverPageSettings } from "@/lib/coverPage";

type SaveResult =
  | { ok: true; status: "saved"; path: string; htmlUrl: string }
  | {
      ok: false;
      status: "validation_error" | "setup_required" | "github_error";
      message: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
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

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be valid JSON.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      {
        ok: false,
        status: "validation_error",
        message: "Request body must be a JSON object.",
      } satisfies SaveResult,
      { status: 400 }
    );
  }

  const settings = normalizeCoverPageSettings(body.settings ?? body);

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH;

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      {
        ok: false,
        status: "setup_required",
        message: "GitHub saving is not configured.",
      } satisfies SaveResult,
      { status: 503 }
    );
  }

  const filePath = "src/content/site/cover-page.json";
  const now = new Date().toISOString();
  const toSave = { ...settings, updatedAt: now };
  const contentBase64 = Buffer.from(
    JSON.stringify(toSave, null, 2),
    "utf-8"
  ).toString("base64");

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const ghHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let existingSha: string | undefined;
  try {
    const checkRes = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, {
      method: "GET",
      headers: ghHeaders,
    });
    if (checkRes.ok) {
      const existing = (await checkRes.json()) as Record<string, unknown>;
      existingSha =
        typeof existing.sha === "string" ? existing.sha : undefined;
    } else if (checkRes.status !== 404) {
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: "Failed to check existing file on GitHub.",
        } satisfies SaveResult,
        { status: 502 }
      );
    }
  } catch {
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to reach the GitHub API.",
      } satisfies SaveResult,
      { status: 502 }
    );
  }

  const putBody: Record<string, unknown> = {
    message: "Update cover page settings",
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
      const errBody = await putRes.text().catch(() => "");
      console.error(`[save-cover-page-settings] GitHub PUT failed (${putRes.status}):`, errBody);
      return Response.json(
        {
          ok: false,
          status: "github_error",
          message: `GitHub commit failed with status ${putRes.status}.`,
        } satisfies SaveResult,
        { status: 502 }
      );
    }

    const putData = (await putRes.json()) as Record<string, unknown>;
    return Response.json(
      {
        ok: true,
        status: "saved",
        path: filePath,
        htmlUrl: getHtmlUrl(putData),
      } satisfies SaveResult,
      { status: 200 }
    );
  } catch {
    return Response.json(
      {
        ok: false,
        status: "github_error",
        message: "Failed to commit the file to GitHub.",
      } satisfies SaveResult,
      { status: 502 }
    );
  }
}
