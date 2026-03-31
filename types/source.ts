export type Source = {
  id: string;
  name: string;
  badge?: string | null;
  cardClass?: string | null;
  logo?: string | null;

  slug?: string | null;
  description?: string | null;
  websiteUrl?: string;

  themeColor?: string;
  accentColor?: string;

  sortOrder?: number | null;
  isPopular?: boolean;
};