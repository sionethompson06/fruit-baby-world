// Audio narration provider configuration helpers (Phase 13A).
// Server-only — reads process.env. Never expose secret values to the client.
// No audio generation or external calls are made here.

import type { NarrationProvider, NarrationProviderStatus } from "@/lib/audioNarrationTypes";

const DEFAULT_PROVIDER: NarrationProvider = "elevenlabs";

export function getDefaultNarrationProvider(): NarrationProvider {
  return DEFAULT_PROVIDER;
}

export function isElevenLabsConfigured(): boolean {
  return Boolean(process.env.ELEVENLABS_API_KEY?.trim());
}

export function getDefaultVoiceId(): string | undefined {
  return process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim() || undefined;
}

export function getDefaultNarrationModelId(): string | undefined {
  return process.env.ELEVENLABS_MODEL_ID?.trim() || undefined;
}

export function getAudioNarrationProviderStatus(): NarrationProviderStatus {
  const hasApiKey = Boolean(process.env.ELEVENLABS_API_KEY?.trim());
  const hasVoiceId = Boolean(process.env.ELEVENLABS_DEFAULT_VOICE_ID?.trim());
  const hasModelId = Boolean(process.env.ELEVENLABS_MODEL_ID?.trim());

  const missing: string[] = [];
  if (!hasApiKey) missing.push("ELEVENLABS_API_KEY");

  return {
    provider: DEFAULT_PROVIDER,
    configured: hasApiKey,
    missing,
    defaultVoiceIdConfigured: hasVoiceId,
    modelIdConfigured: hasModelId,
  };
}

export function getAudioNarrationProviderConfig(): {
  provider: NarrationProvider;
  voiceId: string | undefined;
  modelId: string | undefined;
} {
  return {
    provider: DEFAULT_PROVIDER,
    voiceId: getDefaultVoiceId(),
    modelId: getDefaultNarrationModelId(),
  };
}
