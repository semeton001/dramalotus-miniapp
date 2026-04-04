import type { Drama } from "@/types/drama";

export type NetshortFeedKind =
  | "home"
  | "foryou"
  | "theaters"
  | "random"
  | "search"
  | "detail";

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function pickNumber(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, "").trim();
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => stripHtml(entry.trim()))
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/[|,/]/)
      .map((entry) => stripHtml(entry.trim()))
      .filter(Boolean);
  }

  return [];
}

function parseJsonStringArray(value: unknown): string[] {
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => stripHtml(entry.trim()))
        .filter(Boolean);
    }
  } catch {
    return normalizeStringArray(value);
  }

  return [];
}

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function extractFeedItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  const raw =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : null;

  if (!raw) return [];

  const rawData =
    raw.data && typeof raw.data === "object"
      ? (raw.data as Record<string, unknown>)
      : null;

  const rawResult =
    raw.result && typeof raw.result === "object"
      ? (raw.result as Record<string, unknown>)
      : null;

  const rawDataResult =
    rawData?.result && typeof rawData.result === "object"
      ? (rawData.result as Record<string, unknown>)
      : null;

  const candidates: unknown[] = [
    raw.items,
    raw.list,
    raw.results,
    raw.records,
    raw.theaters,
    raw.homeList,
    raw.shortPlayList,
    raw.shortPlaySearchList,
    raw.contentInfos,
    raw.searchInfos,
    raw.searchList,
    raw.contentInfoList,
    raw.searchCodeSearchResult,
    raw.data,
    raw.result,

    rawData?.items,
    rawData?.list,
    rawData?.results,
    rawData?.records,
    rawData?.theaters,
    rawData?.homeList,
    rawData?.shortPlayList,
    rawData?.shortPlaySearchList,
    rawData?.contentInfos,
    rawData?.searchInfos,
    rawData?.searchList,
    rawData?.contentInfoList,
    rawData?.searchCodeSearchResult,
    rawData?.data,
    rawData?.result,

    rawResult?.items,
    rawResult?.list,
    rawResult?.results,
    rawResult?.records,
    rawResult?.theaters,
    rawResult?.homeList,
    rawResult?.shortPlayList,
    rawResult?.shortPlaySearchList,
    rawResult?.contentInfos,
    rawResult?.searchInfos,
    rawResult?.searchList,
    rawResult?.contentInfoList,
    rawResult?.searchCodeSearchResult,

    rawDataResult?.items,
    rawDataResult?.list,
    rawDataResult?.results,
    rawDataResult?.records,
    rawDataResult?.theaters,
    rawDataResult?.homeList,
    rawDataResult?.shortPlayList,
    rawDataResult?.shortPlaySearchList,
    rawDataResult?.contentInfos,
    rawDataResult?.searchInfos,
    rawDataResult?.searchList,
    rawDataResult?.contentInfoList,
    rawDataResult?.searchCodeSearchResult,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function resolveBadge(kind: NetshortFeedKind): string {
  switch (kind) {
    case "foryou":
      return "ForYou";
    case "theaters":
      return "Teater";
    case "random":
      return "Acak";
    default:
      return "Netshort";
  }
}

export function buildNetshortDrama(
  rawItem: unknown,
  index: number,
  kind: NetshortFeedKind,
  sourceId = "5",
): Drama | null {
  const raw =
    rawItem && typeof rawItem === "object"
      ? (rawItem as Record<string, unknown>)
      : null;

  if (!raw) return null;

  const netshortRawId = pickString(
    raw,
    "shortPlayId",
    "short_play_id",
    "shortPlayBaseId",
    "short_play_base_id",
    "reserveShortPlayId",
    "drama_id",
    "dramaId",
    "book_id",
    "bookId",
    "id",
    "_id",
    "theater_id",
    "theaterId",
  );

  const title = stripHtml(
    pickString(
      raw,
      "shortPlayName",
      "short_play_name",
      "title",
      "name",
      "drama_name",
      "dramaName",
      "book_name",
      "bookName",
    ) || "Tanpa Judul",
  );

  const poster =
    pickString(
      raw,
      "shortPlayCover",
      "short_play_cover",
      "cover",
      "coverImage",
      "cover_image",
      "poster",
      "posterImage",
      "thumbnail",
      "image",
      "imageUrl",
      "verticalImageUrl",
    ) || "";

  const description = stripHtml(
    pickString(
      raw,
      "shotIntroduce",
      "shortIntroduce",
      "short_introduce",
      "description",
      "introduction",
      "summary",
      "intro",
      "synopsis",
    ),
  );

  const episodes = pickNumber(
    raw,
    "totalEpisode",
    "total_episode",
    "episodeCount",
    "episode_count",
    "chapters",
    "chapterCount",
    "totalEpisodes",
  );

  const labels = [
    ...normalizeStringArray(raw.labelArray),
    ...normalizeStringArray(raw.labelNameList),
    ...parseJsonStringArray(raw.shortPlayLabels),
    ...normalizeStringArray(raw.short_play_labels),
    ...normalizeStringArray(raw.labelNames),
    ...normalizeStringArray(raw.tags),
    ...normalizeStringArray(raw.tagNames),
    ...normalizeStringArray(raw.category),
    ...normalizeStringArray(raw.genre),
  ];

  const numericId = createStableNumericId(
    netshortRawId || `${kind}-${title}-${index}`,
    index + 1,
  );

  return {
    id: numericId,
    source: "Netshort",
    sourceId,
    sourceName: "Netshort",
    title,
    episodes,
    badge: resolveBadge(kind),
    tags: Array.from(new Set([...labels, "Drama"])).slice(0, 8),
    posterClass: "from-[#162033] via-[#12131A] to-[#090B12]",
    slug: `netshort-${netshortRawId || numericId}`,
    description,
    coverImage: poster || undefined,
    posterImage: poster || undefined,
    category: "Drama",
    language: "id",
    country: undefined,
    isNew: kind === "home",
    isDubbed: title.toLowerCase().includes("dub"),
    isTrending: false,
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    netshortRawId: netshortRawId || undefined,
    netshortDramaId: netshortRawId || undefined,
  };
}

export function normalizeNetshortFeed(
  payload: unknown,
  kind: NetshortFeedKind,
  sourceId = "5",
): Drama[] {
  const items = extractFeedItems(payload);

  return items
    .map((item, index) => buildNetshortDrama(item, index, kind, sourceId))
    .filter(
      (item): item is Drama =>
        !!item && item.id > 0 && item.title.trim().length > 0,
    );
}