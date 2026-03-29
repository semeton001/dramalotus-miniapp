import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";
import type { Source } from "@/types/source";

import sourcesData from "./sources.json";
import dramasData from "./dramas.json";
import episodesData from "./episodes.json";

const sources = sourcesData as Source[];

export const popularSources: Source[] = sources
  .filter((source) => source.isPopular)
  .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));

export const otherSources: Source[] = sources
  .filter((source) => !source.isPopular)
  .sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));

export const dramas: Drama[] = (dramasData as Drama[]).sort(
  (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999),
);

export const episodes: Episode[] = (episodesData as Episode[]).sort(
  (a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999),
);
