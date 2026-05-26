// Video generation provider configuration helpers (Phase 14A).
// Server-only — reads process.env. Never expose secret values to the client.
// No video generation or external calls are made here.

import type { VideoGenerationProvider, VideoProviderStatus } from "@/lib/videoGenerationTypes";

const SUPPORTED_PROVIDERS: readonly VideoGenerationProvider[] = [
  "runway",
  "luma",
  "fal",
  "replicate",
];

export function getVideoGenerationProvider(): VideoGenerationProvider {
  const raw = process.env.VIDEO_GENERATION_PROVIDER?.trim().toLowerCase();
  if (!raw) return "none";
  if ((SUPPORTED_PROVIDERS as readonly string[]).includes(raw)) {
    return raw as VideoGenerationProvider;
  }
  return "none";
}

export function getVideoGenerationModelId(): string | undefined {
  return process.env.VIDEO_GENERATION_MODEL_ID?.trim() || undefined;
}

export function getVideoProviderLabel(provider: VideoGenerationProvider): string {
  switch (provider) {
    case "runway":    return "Runway";
    case "luma":      return "Luma Dream Machine";
    case "fal":       return "Fal.ai";
    case "replicate": return "Replicate";
    case "none":      return "None";
  }
}

export function getVideoProviderMissingEnvVars(provider: VideoGenerationProvider): string[] {
  const missing: string[] = [];
  const hasGenericKey = Boolean(process.env.VIDEO_GENERATION_API_KEY?.trim());

  switch (provider) {
    case "runway":
      if (!process.env.RUNWAY_API_KEY?.trim() && !hasGenericKey) {
        missing.push("RUNWAY_API_KEY");
      }
      break;
    case "luma":
      if (!process.env.LUMA_API_KEY?.trim() && !hasGenericKey) {
        missing.push("LUMA_API_KEY");
      }
      break;
    case "fal":
      if (!process.env.FAL_KEY?.trim() && !hasGenericKey) {
        missing.push("FAL_KEY");
      }
      break;
    case "replicate":
      if (!process.env.REPLICATE_API_TOKEN?.trim() && !hasGenericKey) {
        missing.push("REPLICATE_API_TOKEN");
      }
      break;
    case "none":
      missing.push("VIDEO_GENERATION_PROVIDER");
      break;
  }

  return missing;
}

function isProviderApiKeyPresent(provider: VideoGenerationProvider): boolean {
  const hasGenericKey = Boolean(process.env.VIDEO_GENERATION_API_KEY?.trim());
  switch (provider) {
    case "runway":    return Boolean(process.env.RUNWAY_API_KEY?.trim()) || hasGenericKey;
    case "luma":      return Boolean(process.env.LUMA_API_KEY?.trim()) || hasGenericKey;
    case "fal":       return Boolean(process.env.FAL_KEY?.trim()) || hasGenericKey;
    case "replicate": return Boolean(process.env.REPLICATE_API_TOKEN?.trim()) || hasGenericKey;
    case "none":      return false;
  }
}

export function isVideoGenerationConfigured(): boolean {
  const provider = getVideoGenerationProvider();
  if (provider === "none") return false;
  return isProviderApiKeyPresent(provider);
}

export function getVideoGenerationProviderStatus(): VideoProviderStatus {
  const provider = getVideoGenerationProvider();
  const configured = isVideoGenerationConfigured();
  const missing = getVideoProviderMissingEnvVars(provider);
  const modelIdConfigured = Boolean(process.env.VIDEO_GENERATION_MODEL_ID?.trim());

  return {
    provider,
    configured,
    missing,
    modelIdConfigured,
    providerLabel: getVideoProviderLabel(provider),
  };
}

export function getVideoGenerationProviderConfig(): {
  provider: VideoGenerationProvider;
  modelId: string | undefined;
} {
  return {
    provider: getVideoGenerationProvider(),
    modelId: getVideoGenerationModelId(),
  };
}
