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

  // subtitle
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;

  // metadata source-specific
  reelShortEpisodeId?: string;
  reelShortVideoId?: string;

  meloloEpisodeId?: string;
  meloloVid?: string;

  dramawaveEpisodeId?: string;
  dramawaveVid?: string;
};