// Fetches approved reference images for image-conditioned story panel generation.
// Returns Response objects which are directly Uploadable by the OpenAI SDK.
// Server-safe — do NOT import in client components.

import type { BundleAsset } from "@/lib/storyPanelReferenceBundle";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FetchedReferenceImage = {
  assetId: string;
  characterSlug: string;
  characterName: string;
  title: string;
  role: BundleAsset["role"];
  response: Response;
};

export type ConditionedImageSet = {
  images: FetchedReferenceImage[];
  failedAssetIds: string[];
  warnings: string[];
};

// ─── Fetcher ──────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8000;

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

        const contentType = res.headers.get("content-type") ?? "";
        if (!contentType.startsWith("image/")) {
          failedAssetIds.push(asset.id);
          warnings.push(
            `${asset.characterName} — "${asset.title}": not an image (${contentType || "unknown content-type"})`
          );
          return;
        }

        images.push({
          assetId: asset.id,
          characterSlug: asset.characterSlug,
          characterName: asset.characterName,
          title: asset.title,
          role: asset.role,
          response: res,
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
