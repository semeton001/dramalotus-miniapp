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

export type DramaBoxDetailResponse = {
  bookId?: string;
  bookName?: string;
  coverWap?: string;
  chapterCount?: number;
  introduction?: string;
  tags?: string[];
  tagV3s?: Array<{
    tagId?: number;
    tagName?: string;
    tagEnName?: string;
  }>;
};

function normalizeDramaBoxTags(raw: {
  tags?: string[];
  tagV3s?: Array<{ tagName?: string; tagEnName?: string }>;
}): string[] {
  if (Array.isArray(raw.tags) && raw.tags.length > 0) {
    return raw.tags
      .filter((tag): tag is string => typeof tag === "string")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }

  if (Array.isArray(raw.tagV3s) && raw.tagV3s.length > 0) {
    return raw.tagV3s
      .map((tag) => tag.tagName?.trim() || tag.tagEnName?.trim() || "")
      .filter((tag): tag is string => tag.length > 0);
  }

  return [];
}

function buildDramaBoxFallbackTags(raw: {
  bookName?: string;
  introduction?: string;
}): string[] {
  const text = `${raw.bookName ?? ""} ${raw.introduction ?? ""}`.toLowerCase();

  const inferred: string[] = ["DramaBox", "Short Drama"];

  if (text.includes("love") || text.includes("romance")) {
    inferred.push("Romance");
  }

  if (text.includes("ceo")) {
    inferred.push("CEO");
  }

  if (text.includes("revenge")) {
    inferred.push("Revenge");
  }

  if (text.includes("wedding") || text.includes("marry")) {
    inferred.push("Marriage");
  }

  if (text.includes("billionaire")) {
    inferred.push("Billionaire");
  }

  if (text.includes("secret")) {
    inferred.push("Secret");
  }

  if (text.includes("divorce")) {
    inferred.push("Divorce");
  }

  return Array.from(new Set(inferred)).slice(0, 3);
}

function buildDramaBoxFallbackDescription(raw: {
  bookName?: string;
  introduction?: string;
}): string {
  const title = raw.bookName?.trim() ?? "";
  const intro = raw.introduction?.trim();

  if (intro && intro.length > 0) return intro;

  if (title) {
    return `Drama pendek pilihan dari DramaBox: ${title}`;
  }

  return "Drama pendek pilihan dari DramaBox.";
}

function createDramaBoxDrama(raw: {
  bookId?: string;
  bookName?: string;
  coverWap?: string;
  chapterCount?: number;
  introduction?: string;
  tags?: string[];
  tagV3s?: Array<{ tagName?: string; tagEnName?: string }>;
}): Drama {
  const normalizedTags = normalizeDramaBoxTags(raw);
  const resolvedTitle = raw.bookName?.trim() ?? "";
  const resolvedDescription = buildDramaBoxFallbackDescription(raw);
  const resolvedTags =
    normalizedTags.length > 0 ? normalizedTags : buildDramaBoxFallbackTags(raw);

  return {
    id: Number(raw.bookId) || 0,
    source: "DramaBox",
    sourceId: "1",
    sourceName: "DramaBox",
    title: resolvedTitle,
    episodes: raw.chapterCount ?? 0,
    badge: "",
    tags: resolvedTags,
    posterClass: "",
    slug: raw.bookId ?? "",
    description: resolvedDescription,
    category: "",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: 9999,
    posterImage: raw.coverWap,
  };
}

export function adaptDramaBoxDrama(raw: DramaBoxDramaResponse): Drama {
  return createDramaBoxDrama(raw);
}

export function adaptDramaBoxDramaList(
  rawItems: DramaBoxDramaResponse[],
): Drama[] {
  return rawItems.map(adaptDramaBoxDrama);
}

export function adaptDramaBoxSearchItem(
  raw: DramaBoxSearchItemResponse,
): Drama {
  return createDramaBoxDrama(raw);
}

export function adaptDramaBoxSearchList(
  rawItems: DramaBoxSearchItemResponse[],
): Drama[] {
  return rawItems
    .filter((item) => Number(item.bookId) > 0 && !!item.bookName?.trim())
    .map(adaptDramaBoxSearchItem);
}

export function adaptDramaBoxDetail(
  raw: DramaBoxDetailResponse,
): Partial<Drama> & { id: number } {
  const normalizedTags = normalizeDramaBoxTags(raw);
  const resolvedTitle = raw.bookName?.trim() ?? "";

  return {
    id: Number(raw.bookId) || 0,
    title: resolvedTitle,
    episodes: raw.chapterCount ?? 0,
    tags:
      normalizedTags.length > 0
        ? normalizedTags
        : buildDramaBoxFallbackTags(raw),
    description: buildDramaBoxFallbackDescription(raw),
    posterImage: raw.coverWap,
    slug: raw.bookId ?? "",
  };
}

export function mergeDramaBoxDramaMetadata(
  base: Drama,
  detail?: Partial<Drama> & { id: number },
  episodeCount?: number,
): Drama {
  const resolvedEpisodes: number =
    (detail?.episodes ?? 0) > 0
      ? Number(detail?.episodes)
      : (episodeCount ?? 0) > 0
        ? Number(episodeCount)
        : Number(base.episodes ?? 0);

  const resolvedTags =
    Array.isArray(detail?.tags) && detail.tags.length > 0
      ? detail.tags
      : base.tags;

  const resolvedDescription =
    typeof detail?.description === "string" &&
    detail.description.trim().length > 0
      ? detail.description
      : base.description;

  const resolvedPosterImage =
    typeof detail?.posterImage === "string" &&
    detail.posterImage.trim().length > 0
      ? detail.posterImage
      : base.posterImage;

  const resolvedTitle =
    typeof detail?.title === "string" && detail.title.trim().length > 0
      ? detail.title
      : base.title;

  const resolvedSlug =
    typeof detail?.slug === "string" && detail.slug.trim().length > 0
      ? detail.slug
      : base.slug;

  return {
    ...base,
    title: resolvedTitle,
    episodes: resolvedEpisodes,
    tags: resolvedTags,
    description: resolvedDescription,
    posterImage: resolvedPosterImage,
    slug: resolvedSlug,
  };
}
