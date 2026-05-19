import { isFinalVideoAsset, type FinalVideoAsset } from "./finalVideoAssetTypes";

export function isPublicReadyFinalVideo(finalVideo: unknown): finalVideo is FinalVideoAsset {
  if (!isFinalVideoAsset(finalVideo)) return false;
  const fv = finalVideo as FinalVideoAsset;
  if (fv.status !== "saved") return false;
  if (fv.visibility !== "public-ready") return false;
  if (!fv.url || typeof fv.url !== "string") return false;
  if (!fv.url.startsWith("https://") && !fv.url.startsWith("/")) return false;
  return true;
}

export function getPublicReadyFinalVideo(episode: Record<string, unknown> | null | undefined): FinalVideoAsset | null {
  if (!episode || typeof episode !== "object") return null;
  const fv = (episode as Record<string, unknown>).finalVideo;
  if (isPublicReadyFinalVideo(fv)) return fv as FinalVideoAsset;
  return null;
}

export function getFinalVideoPublicLabel(finalVideo: unknown): string {
  if (!finalVideo || typeof finalVideo !== "object") return "Missing";
  const v = (finalVideo as Record<string, unknown>).visibility as string | undefined;
  if (v === "public-ready") return "Public Ready";
  if (v === "admin-only") return "Admin Only";
  if (v === "hidden") return "Hidden";
  return "Missing";
}
