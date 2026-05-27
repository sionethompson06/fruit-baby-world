// POST /api/media/upload-homepage-3d-model
// Uploads an admin-provided Pineapple Baby GLB/GLTF model to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin cookie.
// Accepts multipart FormData with a 'file' field.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";

const ALLOWED_EXTENSIONS = ["glb", "gltf"] as const;
type ModelExtension = (typeof ALLOWED_EXTENSIONS)[number];
type ModelType = "glb" | "gltf";

const ALLOWED_MIME_TYPES = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream",
  "application/gltf-binary",
]);

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB for 3D models

type UploadResult =
  | {
      ok: true;
      status: "uploaded";
      modelUrl: string;
      pathname: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
      modelType: ModelType;
    }
  | {
      ok: false;
      status:
        | "unauthorized"
        | "missing_file"
        | "invalid_model_type"
        | "model_too_large"
        | "setup_required"
        | "upload_failed";
      message: string;
    };

function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function isAllowedExtension(ext: string): ext is ModelExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export async function POST(request: Request): Promise<Response> {
  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      { ok: false, status: "setup_required", message: "BLOB_READ_WRITE_TOKEN is not configured." } satisfies UploadResult,
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { ok: false, status: "missing_file", message: "Request must be multipart/form-data with a file field." } satisfies UploadResult,
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { ok: false, status: "missing_file", message: "file field is required." } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (file.size === 0) {
    return Response.json(
      { ok: false, status: "missing_file", message: "Uploaded file is empty." } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { ok: false, status: "model_too_large", message: `File exceeds 100 MB limit (${Math.round(file.size / 1024 / 1024)} MB).` } satisfies UploadResult,
      { status: 400 }
    );
  }

  const ext = getExtension(file.name);
  if (!isAllowedExtension(ext)) {
    return Response.json(
      { ok: false, status: "invalid_model_type", message: `Only .glb and .gltf files are accepted. Got: .${ext || "unknown"}` } satisfies UploadResult,
      { status: 400 }
    );
  }

  // MIME validation: browsers may send application/octet-stream for GLB — allow it
  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_MIME_TYPES.has(mimeType) && !mimeType.startsWith("model/")) {
    return Response.json(
      { ok: false, status: "invalid_model_type", message: `Unexpected MIME type: ${mimeType}. Only GLB/GLTF model files are accepted.` } satisfies UploadResult,
      { status: 400 }
    );
  }

  const modelType: ModelType = ext === "glb" ? "glb" : "gltf";
  const storagePath = `site/homepage-showcase/3d-models/pineapple-baby-${Date.now()}.${ext}`;

  const contentType =
    ext === "glb" ? "model/gltf-binary" : "model/gltf+json";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const blob = await put(storagePath, buffer, {
      access: "public",
      contentType,
      token: blobToken,
    });

    return Response.json(
      {
        ok: true,
        status: "uploaded",
        modelUrl: blob.url,
        pathname: blob.pathname,
        mimeType: contentType,
        sizeBytes: file.size,
        uploadedAt: new Date().toISOString(),
        modelType,
      } satisfies UploadResult,
      { status: 200 }
    );
  } catch (err) {
    if (err instanceof BlobAccessError || err instanceof BlobClientTokenExpiredError) {
      return Response.json(
        { ok: false, status: "upload_failed", message: "Vercel Blob access denied. Check BLOB_READ_WRITE_TOKEN." } satisfies UploadResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobStoreNotFoundError) {
      return Response.json(
        { ok: false, status: "upload_failed", message: "Vercel Blob store not found." } satisfies UploadResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobStoreSuspendedError) {
      return Response.json(
        { ok: false, status: "upload_failed", message: "Vercel Blob store is suspended." } satisfies UploadResult,
        { status: 502 }
      );
    }
    if (err instanceof BlobFileTooLargeError) {
      return Response.json(
        { ok: false, status: "model_too_large", message: "File too large for Vercel Blob." } satisfies UploadResult,
        { status: 413 }
      );
    }
    if (err instanceof BlobError) {
      return Response.json(
        { ok: false, status: "upload_failed", message: `Blob upload failed: ${err.message}` } satisfies UploadResult,
        { status: 502 }
      );
    }
    return Response.json(
      { ok: false, status: "upload_failed", message: "Unexpected error during model upload." } satisfies UploadResult,
      { status: 502 }
    );
  }
}
