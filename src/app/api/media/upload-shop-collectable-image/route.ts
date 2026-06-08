// POST /api/media/upload-shop-collectable-image
// Uploads an admin-provided shop collectable product image to Vercel Blob.
// Auth: Protected by proxy.ts — requires valid admin cookie.

import {
  put,
  BlobAccessError,
  BlobClientTokenExpiredError,
  BlobFileTooLargeError,
  BlobStoreNotFoundError,
  BlobStoreSuspendedError,
  BlobError,
} from "@vercel/blob";

const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number];

const MIME_EXTENSIONS: Record<AllowedMime, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const ALLOWED_PRODUCT_TYPES = ["plushy", "squishy"] as const;
type AllowedProductType = (typeof ALLOWED_PRODUCT_TYPES)[number];

const MAX_BASE64_BYTES = 20 * 1024 * 1024; // 20 MB

type ImageMetadata = {
  id: string;
  imageUrl: string;
  imagePathname: string;
  originalFilename?: string;
  sortOrder: 0;
  isArchived: false;
  uploadedAt: string;
  updatedAt: string;
};

type UploadResult =
  | {
      ok: true;
      status: "uploaded";
      imageUrl: string;
      pathname: string;
      image: ImageMetadata;
      characterSlug: string;
      productType: AllowedProductType;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    }
  | {
      ok: false;
      status:
        | "validation_error"
        | "setup_required"
        | "invalid_image_payload"
        | "image_too_large"
        | "blob_upload_failed";
      message: string;
    };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAllowedMime(v: unknown): v is AllowedMime {
  return typeof v === "string" && (ALLOWED_MIME_TYPES as readonly string[]).includes(v);
}

function isAllowedProductType(v: unknown): v is AllowedProductType {
  return typeof v === "string" && (ALLOWED_PRODUCT_TYPES as readonly string[]).includes(v);
}

const SAFE_SLUG = /^[a-z0-9][a-z0-9-]*$/;
function validateSlug(slug: unknown): slug is string {
  if (typeof slug !== "string" || slug.length === 0) return false;
  const normalized = slug.endsWith("-") ? slug.slice(0, -1) : slug;
  return SAFE_SLUG.test(normalized);
}

function parseImageBase64(raw: string): { base64: string; detectedMime: string | null } {
  const match = raw.match(/^data:(image\/[a-z]+);base64,([\s\S]+)$/);
  if (match) return { base64: match[2], detectedMime: match[1] };
  return { base64: raw, detectedMime: null };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be valid JSON." } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (!isRecord(body)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "Request body must be a JSON object." } satisfies UploadResult,
      { status: 400 }
    );
  }

  const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
  if (!blobToken) {
    return Response.json(
      { ok: false, status: "setup_required", message: "BLOB_READ_WRITE_TOKEN is not configured." } satisfies UploadResult,
      { status: 503 }
    );
  }

  if (!validateSlug(body.characterSlug)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "characterSlug is required and must be a valid slug." } satisfies UploadResult,
      { status: 400 }
    );
  }
  const characterSlug = body.characterSlug as string;

  if (!isAllowedProductType(body.productType)) {
    return Response.json(
      { ok: false, status: "validation_error", message: "productType must be 'plushy' or 'squishy'." } satisfies UploadResult,
      { status: 400 }
    );
  }
  const productType = body.productType;

  const rawBase64Input = typeof body.file === "string" ? body.file : "";
  if (!rawBase64Input) {
    return Response.json(
      { ok: false, status: "validation_error", message: "file (base64 image string) is required." } satisfies UploadResult,
      { status: 400 }
    );
  }

  if (rawBase64Input.length > MAX_BASE64_BYTES) {
    return Response.json(
      { ok: false, status: "image_too_large", message: "Image exceeds 20 MB limit." } satisfies UploadResult,
      { status: 413 }
    );
  }

  const { base64: base64Data, detectedMime } = parseImageBase64(rawBase64Input);
  const rawMime = typeof body.mimeType === "string" ? body.mimeType : (detectedMime ?? "");
  if (!isAllowedMime(rawMime)) {
    return Response.json(
      { ok: false, status: "invalid_image_payload", message: "mimeType must be image/png, image/jpeg, or image/webp." } satisfies UploadResult,
      { status: 400 }
    );
  }
  const mime = rawMime;
  const ext = MIME_EXTENSIONS[mime];

  let imageBuffer: Buffer;
  try {
    imageBuffer = Buffer.from(base64Data, "base64");
    if (imageBuffer.length === 0) throw new Error("empty buffer");
  } catch {
    return Response.json(
      { ok: false, status: "invalid_image_payload", message: "Could not decode base64 image data." } satisfies UploadResult,
      { status: 400 }
    );
  }

  const timestamp = Date.now();
  const originalFilename =
    typeof body.originalFilename === "string" && body.originalFilename
      ? body.originalFilename
      : undefined;
  const storagePath = `shop/collectables/${productType}/${characterSlug}-${timestamp}.${ext}`;

  try {
    const blob = await put(storagePath, imageBuffer, {
      access: "public",
      token: blobToken,
      contentType: mime,
    });

    const uploadedAt = new Date().toISOString();
    const imageId = `img-${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
    return Response.json(
      {
        ok: true,
        status: "uploaded",
        imageUrl: blob.url,
        pathname: blob.pathname,
        image: {
          id: imageId,
          imageUrl: blob.url,
          imagePathname: blob.pathname,
          originalFilename,
          sortOrder: 0,
          isArchived: false,
          uploadedAt,
          updatedAt: uploadedAt,
        } satisfies ImageMetadata,
        characterSlug,
        productType,
        mimeType: mime,
        sizeBytes: imageBuffer.length,
        uploadedAt,
      } satisfies UploadResult,
      { status: 200 }
    );
  } catch (err) {
    if (
      err instanceof BlobFileTooLargeError ||
      err instanceof BlobClientTokenExpiredError ||
      err instanceof BlobAccessError ||
      err instanceof BlobStoreNotFoundError ||
      err instanceof BlobStoreSuspendedError ||
      err instanceof BlobError
    ) {
      return Response.json(
        { ok: false, status: "blob_upload_failed", message: err.message } satisfies UploadResult,
        { status: 502 }
      );
    }
    return Response.json(
      { ok: false, status: "blob_upload_failed", message: "Unexpected error during upload." } satisfies UploadResult,
      { status: 502 }
    );
  }
}
