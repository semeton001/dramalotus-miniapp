import type { Drama } from "@/types/drama";

type ShortmaxFeedKind = "home" | "latest" | "trending" | "hot" | "ranking" | "search" | "detail";

function pickString(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
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
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((entry): entry is string => typeof entry === "string")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/[|,/]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function extractShortmaxFeedList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: { list?: unknown[] } }).data?.list)
  ) {
    return ((payload as { data: { list: unknown[] } }).data.list ??
      []) as Record<string, unknown>[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: unknown[] }).data as Record<string, unknown>[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { list?: unknown[] }).list)
  ) {
    return (payload as { list: unknown[] }).list as Record<string, unknown>[];
  }

  return [];
}

export function buildShortmaxDrama(
  rawItem: unknown,
  index = 0,
  kind: ShortmaxFeedKind = "home",
  sourceId = "7",
): Drama | null {
  if (!rawItem || typeof rawItem !== "object") return null;
  const raw = rawItem as Record<string, unknown>;

  const shortmaxRawId =
    pickString(raw, "dramaId", "drama_id", "playlet_id", "bookId", "book_id", "id") || "";
  const shortmaxCode =
    pickString(raw, "code", "shareCode", "bookCode", "contentCode") || "";
  const fallbackNumericId =
    pickNumber(raw, "id", "dramaId", "drama_id", "playlet_id", "bookId", "book_id") ||
    Date.now() + index;
  const normalizedId = createStableNumericId(
    shortmaxRawId || shortmaxCode || `shortmax-${index}`,
    fallbackNumericId,
  );

  const title =
    pickString(raw, "title", "name", "dramaName", "drama_name", "bookName", "book_name") ||
    "Tanpa Judul";

  const coverImage = pickString(
    raw,
    "cover",
    "coverUrl",
    "cover_url",
    "coverImage",
    "cover_image",
    "thumbnail",
    "thumb",
    "poster",
    "posterImage",
    "poster_image",
    "image",
    "imageUrl",
    "image_url",
    "pic",
  );

  const posterImage =
    pickString(
      raw,
      "posterImage",
      "poster_image",
      "poster",
      "cover",
      "coverUrl",
      "cover_url",
      "coverImage",
      "cover_image",
      "thumbnail",
      "thumb",
      "image",
      "imageUrl",
      "image_url",
      "pic",
    ) || coverImage;

  const description = pickString(
    raw,
    "summary",
    "description",
    "introduction",
    "intro",
    "synopsis",
    "desc",
  );

  const tags = Array.from(
    new Set([
      ...normalizeStringArray(raw.tags),
      ...normalizeStringArray(raw.tagNames),
      ...(kind === "latest" ? ["Terbaru"] : []),
      ...(kind === "trending" ? ["Trending"] : []),
      ...(kind === "hot" ? ["Hot"] : []),
      ...(kind === "ranking" ? ["Ranking"] : []),
      "Drama",
    ]),
  ).slice(0, 8);

  return {
    id: normalizedId,
    source: "Shortmax",
    sourceId,
    sourceName: "Shortmax",
    title,
    episodes: pickNumber(
      raw,
      "episodes",
      "episodeCount",
      "episode_count",
      "chapterCount",
      "totalEpisodes",
    ),
    badge:
      kind === "latest"
        ? "Terbaru"
        : kind === "trending"
          ? "Trending"
          : kind === "hot"
            ? "Hot"
            : kind === "ranking"
              ? "Ranking"
              : "Shortmax",
    tags,
    posterClass: "from-[#102B3A] via-[#12131A] to-[#090B12]",
    slug: shortmaxRawId
      ? `shortmax-${shortmaxRawId}`
      : shortmaxCode
        ? `shortmax-${shortmaxCode}`
        : `shortmax-${normalizedId}`,
    description,
    coverImage: coverImage || undefined,
    posterImage: posterImage || undefined,
    category: kind === "ranking" ? "Ranking" : kind === "hot" ? "Hot" : "Drama",
    language: "id",
    country: undefined,
    isNew: kind === "latest" || kind === "home",
    isDubbed: title.toLowerCase().includes("[dubbing]"),
    isTrending: kind === "trending" || kind === "hot",
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    shortmaxRawId: shortmaxRawId || undefined,
    shortmaxDramaId: shortmaxRawId || undefined,
    shortmaxCode: shortmaxCode || undefined,
    shortmaxViews: pickNumber(raw, "views", "playCount", "play_count") || undefined,
  };
}

export function normalizeShortmaxFeed(
  payload: unknown,
  kind: ShortmaxFeedKind = "home",
  sourceId = "7",
): Drama[] {
  return extractShortmaxFeedList(payload)
    .map((item, index) => buildShortmaxDrama(item, index, kind, sourceId))
    .filter((item): item is Drama => !!item);
}
