// Storybook page types for the display-first episode reader.
// These are admin-uploaded pages that appear in the public storybook reader.

export type StorybookPageStatus = "draft" | "approved" | "archived";
export type StorybookPageVisibility = "admin-only" | "public";

export type StorybookPageRole =
  | "front-cover"
  | "inside-cover"
  | "story-page"
  | "story-spread"
  | "end-page"
  | "back-cover";

export type StorybookLayoutType =
  | "single-page"
  | "two-page-spread"
  | "cover"
  | "back-cover";

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
  // Spread / layout support
  pageRole?: StorybookPageRole;
  layoutType?: StorybookLayoutType;
  spreadNumber?: number;
  leftPageLabel?: string;
  rightPageLabel?: string;
  displayMode?: "single" | "spread";
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
  // Spread / layout support
  pageRole?: StorybookPageRole;
  layoutType?: StorybookLayoutType;
  spreadNumber?: number;
  leftPageLabel?: string;
  rightPageLabel?: string;
  displayMode?: "single" | "spread";
};
