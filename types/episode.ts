export type Episode = {
  id: number;
  dramaId: number;
  episodeNumber: number;
  title: string;
  duration: string;

  slug?: string;
  description?: string;
  videoUrl?: string;
  originalVideoUrl?: string;
  thumbnail?: string;
  isLocked?: boolean;
  isVipOnly?: boolean;
  sortOrder?: number;

  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;

  dramaboxChapterId?: string;
  dramaboxBookId?: string;

  reelShortEpisodeId?: string;
  reelShortVideoId?: string;
  reelShortDramaId?: string;
  reelShortCode?: string;

  meloloEpisodeId?: string;
  meloloVid?: string;

  dramawaveEpisodeId?: string;
  dramawaveVid?: string;

  netshortEpisodeId?: string;
  netshortVid?: string;

  flickreelsEpisodeId?: string;
  flickreelsVid?: string;

  idramaEpisodeId?: string;
  idramaPlayId?: string;

  reelifeEpisodeId?: string;
  reelifePlayId?: string;
  reelifeCode?: string;

  freereelsEpisodeId?: string;
  freereelsPlayId?: string;
  freereelsCode?: string;
};
