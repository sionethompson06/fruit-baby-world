export type CoverPageVideo = {
  id: string;
  title: string;
  videoUrl: string;
  pathname?: string;
  originalFilename?: string;
  mimeType?: string;
  sizeBytes?: number;
  isActive: boolean;
  sortOrder: number;
  uploadedAt?: string;
  updatedAt?: string;
  archivedAt?: string;
};

export type CoverPageSettings = {
  enabled: boolean;
  unveilingAt: string;
  title: string;
  eyebrow: string;
  subtitle: string;
  footerTeaser: string;
  countdownLabel: string;
  completeMessage: string;
  completeSubtext: string;
  videoSectionTitle: string;
  videoPlaceholderText: string;
  videoLoop: boolean;
  autoplayMuted: boolean;
  videos: CoverPageVideo[];
  updatedAt: string;
};
