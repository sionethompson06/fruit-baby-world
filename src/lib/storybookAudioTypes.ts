// Storybook narration audio type — upload-first, one file per storybook.

export type StorybookNarrationMode = "single-file" | "sequence";

export type StorybookNarrationSequenceBlock = {
  pageId: string;
  blockId: string;
  speakerSlug: string;
  speakerName: string;
  audioUrl: string;
  pathname?: string;
  sortOrder: number;
};

export type StorybookNarrationSequence = {
  source: "storybookAudioScript";
  generatedFromScriptAt: string;
  pageIds: string[];
  blocks: StorybookNarrationSequenceBlock[];
};

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
  // Phase Audio 5 — sequence mode fields
  mode?: StorybookNarrationMode;
  sequence?: StorybookNarrationSequence;
  approvedAt?: string;
};
