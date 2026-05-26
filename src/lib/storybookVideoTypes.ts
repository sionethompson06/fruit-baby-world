// Storybook finished cartoon/video type — upload-first, one file per storybook.

export type StorybookVideoAsset = {
  id: string;
  title?: string;
  description?: string;
  videoUrl: string;
  posterImageUrl?: string;
  pathname?: string;
  posterPathname?: string;
  mimeType: string;
  sizeBytes?: number;
  durationSeconds?: number;
  sourceType: "admin-uploaded" | "external-url" | "legacy-generated";
  status: "draft" | "approved" | "archived";
  visibility: "hidden" | "public";
  createdAt: string;
  updatedAt?: string;
};
