export type Drama = {
  id: number;
  source: string;
  title: string;
  episodes: number;
  badge: string;
  tags: string[];
  posterClass: string;

  // siap untuk data nyata
  slug?: string;
  description?: string;
  coverImage?: string;
  posterImage?: string;
  category?: string;
  language?: string;
  country?: string;

  // siap untuk filter dan sorting
  isNew?: boolean;
  isDubbed?: boolean;
  isTrending?: boolean;
  sortOrder?: number;

  // siap untuk metadata tambahan
  rating?: number;
  releaseYear?: number;
};