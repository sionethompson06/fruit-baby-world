import { put } from "@vercel/blob";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type UploadResult =
  | { ok: true; url: string; pathname: string; contentType: string }
  | { ok: false; error: string };

export async function POST(req: NextRequest): Promise<Response> {

  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ ok: false, error: "Invalid form data" } satisfies UploadResult, { status: 400 });

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return Response.json({ ok: false, error: "No file provided" } satisfies UploadResult, { status: 400 });
  }

  const folder = String(form.get("folder") || "uploads");
  if (!/^[a-z0-9/_-]+$/i.test(folder)) {
    return Response.json({ ok: false, error: "Invalid folder" } satisfies UploadResult, { status: 400 });
  }

  const ALLOWED_TYPES: Record<string, string[]> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "audio/mpeg": ["mp3"],
    "audio/mp4": ["m4a"],
    "audio/x-m4a": ["m4a"],
    "video/mp4": ["mp4"],
    "video/quicktime": ["mov"],
  };

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_TYPES[mime]) {
    return Response.json({ ok: false, error: `File type not allowed: ${mime}` } satisfies UploadResult, { status: 400 });
  }

  const ext = ALLOWED_TYPES[mime][0];
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").slice(0, 60);
  const pathname = `${folder}/${timestamp}-${safeName}.${ext}`;

  const blob = await put(pathname, file, {
    access: "public",
    contentType: mime,
  });

  return Response.json({
    ok: true,
    url: blob.url,
    pathname: blob.pathname,
    contentType: mime,
  } satisfies UploadResult);
}
