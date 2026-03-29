export type Episode = {
  id: number;
  dramaId: number;
  episodeNumber: number;
  title: string;
  duration: string;

  // siap untuk data nyata
  slug?: string;
  description?: string;
  videoUrl?: string;
  thumbnail?: string;
  isLocked?: boolean;
  isVipOnly?: boolean;

  // siap untuk urutan dan tracking
  sortOrder?: number;
};