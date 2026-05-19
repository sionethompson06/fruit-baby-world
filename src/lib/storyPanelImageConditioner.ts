// Fetches approved reference images for image-conditioned story panel generation.
// Reads each asset as an ArrayBuffer, detects the correct MIME type via
// Content-Type header → URL extension → magic bytes, then creates a typed File
// object the OpenAI SDK can pass to images.edit() without MIME ambiguity.
//
// The original Phase 18C implementation passed raw Response objects which the
// SDK serialised as application/octet-stream — OpenAI rejects those.
// Server-safe — do NOT import in client components.

import type { BundleAsset } from "@/lib/storyPanelReferenceBundle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FetchedReferenceImage = {
  assetId: string;
  characterSlug: string;
  characterName: string;
  title: string;
  role: BundleAsset["role"];
  file: File;
  mimeType: string;
  filename: string;
};

export type ConditionedImageSet = {
  images: FetchedReferenceImage[];
  failedAssetIds: string[];
  warnings: string[];
};

const SUPPORTED_MIMES = ["image/png", "image/jpeg", "image/webp"] as const;
type SupportedMime = (typeof SUPPORTED_MIMES)[number];

const FETCH_TIMEOUT_MS = 8000;

// ─── MIME detection (A → B → C) ───────────────────────────────────────────────

function mimeFromContentType(ct: string | null): SupportedMime | null {
  if (!ct) return null;
  const base = ct.split(";")[0].trim().toLowerCase();
  if (base === "image/png") return "image/png";
  if (base === "image/jpeg") return "image/jpeg";
  if (base === "image/webp") return "image/webp";
  return null;
}

function mimeFromUrl(url: string): SupportedMime | null {
  const path = url.split("?")[0].toLowerCase();
  if (path.endsWith(".png")) return "image/png";
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
  if (path.endsWith(".webp")) return "image/webp";
  return null;
}

function mimeFromMagicBytes(buffer: ArrayBuffer): SupportedMime | null {
  const b = new Uint8Array(buffer.slice(0, 12));
  // PNG: 89 50 4E 47
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  // JPEG: FF D8 FF
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  // WEBP: RIFF....WEBP (bytes 0-3 = RIFF, bytes 8-11 = WEBP)
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "image/webp";
  return null;
}

function detectMime(
  contentType: string | null,
  url: string,
  buffer: ArrayBuffer
): SupportedMime | null {
  return mimeFromContentType(contentType) ?? mimeFromUrl(url) ?? mimeFromMagicBytes(buffer);
}

// ─── Safe filename builder ────────────────────────────────────────────────────

function buildFilename(asset: BundleAsset, mimeType: SupportedMime): string {
  const ext =
    mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
  const base = `${asset.characterSlug}-${asset.role}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return `${base}.${ext}`;
}

// ─── Main fetcher ─────────────────────────────────────────────────────────────

export async function fetchConditionedImages(
  assets: BundleAsset[]
): Promise<ConditionedImageSet> {
  const images: FetchedReferenceImage[] = [];
  const failedAssetIds: string[] = [];
  const warnings: string[] = [];

  await Promise.all(
    assets.map(async (asset) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      try {
        const res = await fetch(asset.url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          failedAssetIds.push(asset.id);
          warnings.push(
            `${asset.characterName} — "${asset.title}": fetch failed (HTTP ${res.status})`
          );
          return;
        }

        // Read as ArrayBuffer so we control the MIME type passed to OpenAI
        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get("content-type");
        const mimeType = detectMime(contentType, asset.url, buffer);

        if (!mimeType) {
          failedAssetIds.push(asset.id);
          warnings.push(
            `${asset.characterName} — "${asset.title}": skipped — MIME type could not be determined (content-type: ${contentType ?? "none"})`
          );
          return;
        }

        const filename = buildFilename(asset, mimeType);
        const file = new File([buffer], filename, { type: mimeType });

        images.push({
          assetId: asset.id,
          characterSlug: asset.characterSlug,
          characterName: asset.characterName,
          title: asset.title,
          role: asset.role,
          file,
          mimeType,
          filename,
        });
      } catch (err) {
        clearTimeout(timeout);
        const isAbort = err instanceof Error && err.name === "AbortError";
        failedAssetIds.push(asset.id);
        warnings.push(
          `${asset.characterName} — "${asset.title}": ${
            isAbort ? "fetch timed out (8s)" : "fetch error"
          }`
        );
      }
    })
  );

  return { images, failedAssetIds, warnings };
}
