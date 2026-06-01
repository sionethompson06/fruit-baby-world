// Types for the page-by-page audio script attached to a storybook.
// No audio generation — this is script authoring only.

export type StorybookAudioScriptStatus =
  | "draft"
  | "ready-for-generation"
  | "approved"
  | "archived";

export type StorybookAudioScriptBlockType =
  | "narration"
  | "dialogue"
  | "sound-effect";

export type StorybookAudioScriptBlockStatus =
  | "draft"
  | "approved"
  | "archived";

export type StorybookAudioSpeaker = {
  speakerSlug: string;
  speakerName: string;
  characterSlug?: string;
  provider?: string;
  voiceId?: string;
  voiceLabel?: string;
};

export type StorybookAudioScriptBlock = {
  id: string;
  type: StorybookAudioScriptBlockType;
  speakerSlug: string;
  speakerName: string;
  text: string;
  voiceId?: string;
  sortOrder: number;
  status: StorybookAudioScriptBlockStatus;
  // Populated after audio generation (Phase Audio 2+)
  audioUrl?: string;
  pathname?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  generatedAt?: string;
  generationProvider?: "elevenlabs";
  generationModelId?: string;
  generationError?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type StorybookAudioScriptPageAudioPreview = {
  generatedAt: string;
  generationProvider: "storybook-page-sequence";
  blockIds: string[];
  status: "draft" | "approved" | "archived";
};

export type StorybookAudioScriptPage = {
  pageId: string;
  pageNumber?: number;
  pageRole?: string;
  originalFilename?: string;
  scriptBlocks: StorybookAudioScriptBlock[];
  pageAudioPreview?: StorybookAudioScriptPageAudioPreview;
  updatedAt?: string;
};

export type StorybookFullBookAudioPreview = {
  generatedAt: string;
  generationProvider: "storybook-full-sequence";
  status: "draft" | "approved" | "archived";
  pageIds: string[];
  blockIds: string[];
  missingAudioBlockIds: string[];
  totalBlocks: number;
  totalPages: number;
};

export type StorybookAudioScript = {
  version: 1;
  status: StorybookAudioScriptStatus;
  defaultNarratorVoiceId?: string;
  speakers: StorybookAudioSpeaker[];
  pages: StorybookAudioScriptPage[];
  updatedAt: string;
  fullBookAudioPreview?: StorybookFullBookAudioPreview;
};
