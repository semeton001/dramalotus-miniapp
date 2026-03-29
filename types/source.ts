export type Source = {
  id: number;
  name: string;
  badge?: string;
  cardClass?: string;
  logo?: string;

  // siap untuk data nyata
  slug?: string;
  description?: string;
  websiteUrl?: string;

  // siap untuk styling / branding source
  themeColor?: string;
  accentColor?: string;

  // siap untuk kontrol urutan / status
  sortOrder?: number;
  isPopular?: boolean;
};