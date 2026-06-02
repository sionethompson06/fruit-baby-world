export type CoverPageVideo = {
  id: string;
  title: string;
  videoUrl: string;
  pathname?: string;
  originalFilename?: string;
  isActive: boolean;
  sortOrder: number;
  uploadedAt: string;
};

export type CoverPageSettings = {
  enabled: boolean;
  unveilingAt: string;
  title: string;
  eyebrow: string;
  subtitle: string;
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
