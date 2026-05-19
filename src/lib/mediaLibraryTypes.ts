// Read-only types for the admin Media Studio central library.
// No write operations — this is view/inventory only.

import type { MediaLifecycleStage } from "@/lib/mediaLifecycle";

export type MediaLibraryItemType =
  | "story-panel"
  | "narration-audio"
  | "animated-clip"
  | "final-video"
  | "product-mockup"
  | "character-reference";

export type MediaLibraryItem = {
  id: string;
  type: MediaLibraryItemType;
  title: string;
  sourceLabel: string;
  ownerType: "episode" | "scene" | "product" | "character";
  ownerTitle?: string;
  ownerSlug?: string;
  sceneId?: string;
  sceneNumber?: number;
  url?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  lifecycleStage: MediaLifecycleStage;
  visibility?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  warnings: string[];
};

export type MediaLibrarySummary = {
  total: number;
  publicReady: number;
  adminOnly: number;
  hidden: number;
  missingUrl: number;
  byType: Record<MediaLibraryItemType, number>;
};

export type MediaLibraryFilter =
  | "all"
  | "story-panel"
  | "narration-audio"
  | "animated-clip"
  | "final-video"
  | "product-mockup"
  | "character-reference"
  | "public-ready"
  | "hidden"
  | "needs-attention";

export const MEDIA_TYPE_LABELS: Record<MediaLibraryItemType, string> = {
  "story-panel": "Story Panel",
  "narration-audio": "Audio Narration",
  "animated-clip": "Animated Clip",
  "final-video": "Final Video",
  "product-mockup": "Product Mockup",
  "character-reference": "Character Reference",
};

export const MEDIA_TYPE_EMOJI: Record<MediaLibraryItemType, string> = {
  "story-panel": "🖼️",
  "narration-audio": "🎧",
  "animated-clip": "🎞️",
  "final-video": "🎬",
  "product-mockup": "🛍️",
  "character-reference": "🍍",
};
