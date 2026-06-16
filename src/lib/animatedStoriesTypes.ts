export type AnimatedStoryStatus = "draft" | "published" | "archived";
export type AnimatedStoryVisibility = "hidden" | "public";
export type AnimatedStoryClipStatus = "draft" | "approved" | "archived";
export type AnimatedStoryClipVisibility = "hidden" | "public";

export type AnimatedStoryClip = {
  id: string;
  title: string;
  videoUrl: string;
  pathname?: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  durationSeconds?: number;
  sortOrder: number;
  status: AnimatedStoryClipStatus;
  visibility: AnimatedStoryClipVisibility;
  uploadedAt?: string;
  updatedAt?: string;
};

export type AnimatedStory = {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: AnimatedStoryStatus;
  visibility: AnimatedStoryVisibility;
  characterSlugs?: string[];
  coverImageUrl?: string;
  coverImagePathname?: string;
  coverImageOriginalFilename?: string;
  posterImageUrl?: string;
  posterImagePathname?: string;
  posterImageOriginalFilename?: string;
  sortOrder: number;
  clips: AnimatedStoryClip[];
  createdAt?: string;
  updatedAt?: string;
};

export type AnimatedStoriesContent = {
  version: number;
  stories: AnimatedStory[];
};

