// Page-level audio attached to individual storybook pages.
// Admin-uploaded audio only — no ElevenLabs generation.

export type StorybookPageAudioStatus = "draft" | "approved" | "archived";
export type StorybookPageAudioVisibility = "hidden" | "public";

export type StorybookPageAudioItem = {
  pageId: string;
  audioUrl: string;
  pathname?: string;
  originalAudioFilename?: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds?: number;
  status: StorybookPageAudioStatus;
  visibility: StorybookPageAudioVisibility;
  uploadedAt: string;
  updatedAt?: string;
};

export type StorybookPageAudioConfig = {
  version: 1;
  status: StorybookPageAudioStatus;
  visibility: StorybookPageAudioVisibility;
  pages: StorybookPageAudioItem[];
  updatedAt: string;
};
