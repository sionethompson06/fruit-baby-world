// Storybook narration audio type — upload-first, one file per storybook.

export type StorybookNarrationAudio = {
  id: string;
  title?: string;
  audioUrl: string;
  pathname?: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds?: number;
  sourceType: "admin-uploaded" | "legacy-generated";
  status: "draft" | "approved" | "archived";
  visibility: "hidden" | "public";
  createdAt: string;
  updatedAt?: string;
};
