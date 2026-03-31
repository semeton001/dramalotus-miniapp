import type { Drama } from "@/types/drama";

export type DramaBoxDramaResponse = {
  bookId: string;
  bookName?: string;
  coverWap?: string;
  chapterCount?: number;
  introduction?: string;
  tags?: string[];
};

export type DramaBoxDramaListResponse = {
  data?: DramaBoxDramaResponse[];
};

export type DramaBoxSearchItemResponse = {
  bookId: string;
  bookName?: string;
  coverWap?: string;
  chapterCount?: number;
  introduction?: string;
  tags?: string[];
};

export function adaptDramaBoxDrama(raw: DramaBoxDramaResponse): Drama {
  return {
    id: Number(raw.bookId) || 0,
    source: "DramaBox",
    sourceId: "dramabox",
    sourceName: "DramaBox",
    title: raw.bookName ?? "",
    episodes: raw.chapterCount ?? 0,
    badge: "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    posterClass: "",
    slug: raw.bookId ?? "",
    description: raw.introduction ?? "",
    category: "",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: 9999,
    posterImage: raw.coverWap,
  };
}

export function adaptDramaBoxDramaList(
  rawItems: DramaBoxDramaResponse[],
): Drama[] {
  return rawItems.map(adaptDramaBoxDrama);
}

export function adaptDramaBoxSearchItem(
  raw: DramaBoxSearchItemResponse,
): Drama {
  return {
    id: Number(raw.bookId) || 0,
    source: "DramaBox",
    sourceId: "dramabox",
    sourceName: "DramaBox",
    title: raw.bookName ?? "",
    episodes: raw.chapterCount ?? 0,
    badge: "",
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    posterClass: "",
    slug: raw.bookId ?? "",
    description: raw.introduction ?? "",
    category: "",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: 9999,
    posterImage: raw.coverWap,
  };
}

export function adaptDramaBoxSearchList(
  rawItems: DramaBoxSearchItemResponse[],
): Drama[] {
  return rawItems.map(adaptDramaBoxSearchItem);
}
