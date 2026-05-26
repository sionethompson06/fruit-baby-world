// Storybook page types for the display-first episode reader.
// These are admin-uploaded pages that appear in the public storybook reader.

export type StorybookPageStatus = "draft" | "approved" | "archived";
export type StorybookPageVisibility = "admin-only" | "public";

export type StorybookPage = {
  id: string;
  pageNumber: number;
  title?: string;
  caption?: string;
  readAloudText?: string;
  imageUrl: string;
  pathname?: string;
  mimeType: string;
  altText: string;
  sceneNumber?: number;
  characters?: string[];
  status: StorybookPageStatus;
  visibility: StorybookPageVisibility;
  sourceType: "admin-uploaded";
  createdAt: string;
  updatedAt: string;
};

export type StorybookPageInput = {
  title?: string;
  caption?: string;
  readAloudText?: string;
  imageUrl: string;
  pathname?: string;
  mimeType: string;
  altText: string;
  sceneNumber?: number;
  characters?: string[];
  status?: StorybookPageStatus;
  visibility?: StorybookPageVisibility;
};
