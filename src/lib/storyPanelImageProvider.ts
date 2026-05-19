// Story panel image provider configuration and types (Phase 18D).
// Manages production provider env config and model selection.
// Structured so that a future second provider (e.g. Replicate) can be added
// by extending the switch blocks below without touching callers.
// Server-safe — do NOT import in client components.

// ─── Types ────────────────────────────────────────────────────────────────────

export type StoryPanelGenerationMode = "draft" | "production";
export type StoryPanelProvider = "openai" | "fal";

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_DRAFT_PROVIDER: StoryPanelProvider = "openai";
export const DEFAULT_DRAFT_MODEL_ID = "gpt-image-1";
export const DEFAULT_PRODUCTION_PROVIDER: StoryPanelProvider = "fal";
export const DEFAULT_PRODUCTION_MODEL_ID = "fal-ai/flux-kontext-pro";

// ─── Config readers ───────────────────────────────────────────────────────────

export function getDraftModelId(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_DRAFT_MODEL_ID;
}

export function getProductionProvider(): StoryPanelProvider {
  const raw = process.env.STORY_PANEL_PRODUCTION_PROVIDER?.trim().toLowerCase();
  if (raw === "fal") return "fal";
  return DEFAULT_PRODUCTION_PROVIDER;
}

export function getProductionModelId(): string {
  return (
    process.env.STORY_PANEL_PRODUCTION_MODEL_ID?.trim() || DEFAULT_PRODUCTION_MODEL_ID
  );
}

export function getFalApiKey(): string | undefined {
  return process.env.FAL_KEY?.trim() || undefined;
}

// ─── Setup checks ─────────────────────────────────────────────────────────────

export function isProductionProviderConfigured(): boolean {
  const provider = getProductionProvider();
  if (provider === "fal") return Boolean(getFalApiKey());
  return false;
}

export function getProductionSetupError(): string | null {
  const provider = getProductionProvider();
  if (provider === "fal") {
    if (!getFalApiKey()) {
      return "FAL_KEY is not configured. Add it to Vercel environment variables and redeploy to enable Production Mode.";
    }
  }
  return null;
}

export function getProviderLabel(provider: StoryPanelProvider): string {
  switch (provider) {
    case "openai": return "OpenAI";
    case "fal":    return "Fal.ai";
  }
}
