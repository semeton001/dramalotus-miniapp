export type Drama = {
  id: number;

  // lama, sementara dipertahankan agar UI lama tetap aman
  source: string;

  // baru, untuk migrasi ke shape final
  sourceId: string;
  sourceName: string;

  title: string;
  episodes: number;
  badge: string;
  tags: string[];
  posterClass: string;

  slug: string;
  description: string;
  coverImage?: string;
  posterImage?: string;
  category: string;
  language?: string;
  country?: string;

  isNew: boolean;
  isDubbed: boolean;
  isTrending: boolean;
  sortOrder: number;

  rating?: number;
  releaseYear?: number;
};