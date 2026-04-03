import type { Drama } from "@/types/drama";

type ReelShortDrama = Drama & {
  reelShortRawId?: string;
  reelShortCode?: string;
  reelShortSlug?: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function pickString(
  record: Record<string, unknown>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

function pickNumber(
  record: Record<string, unknown>,
  ...keys: string[]
): number {
  for (const key of keys) {
    const value = record[key];

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

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function extractList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.map(toRecord);
  }

  const record = toRecord(payload);

  const candidates = [
    record.books,
    record.results,
    record.popular,
    record.data,
    record.items,
    record.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map(toRecord);
    }
  }

  return [];
}

export function adaptReelShortDramas(payload: unknown): ReelShortDrama[] {
  const items = extractList(payload);

  return items.map((record, index) => {
    const reelShortRawId =
      pickString(
        record,
        "book_id",
        "bookId",
        "id",
        "_id",
        "seriesId",
        "dramaId",
        "drama_id",
      ) || "";

    const reelShortCode =
      pickString(record, "code", "bookCode", "contentCode", "shareCode") || "";

    const reelShortSlug =
      pickString(record, "slug", "seriesSlug", "bookSlug", "book_slug") ||
      (reelShortRawId ? `reelshort-${reelShortRawId}` : "");

    const fallbackNumericId =
      pickNumber(record, "chapters", "episodeCount", "episodes", "views") ||
      Date.now() + index;

    const numericId = createStableNumericId(
      reelShortRawId || reelShortSlug || `reelshort-${index}`,
      fallbackNumericId,
    );

    const title =
      pickString(
        record,
        "title",
        "name",
        "bookName",
        "book_name",
        "dramaName",
        "drama_name",
        "seriesName",
      ) || "Tanpa Judul";

    const coverImage = pickString(
      record,
      "pic",
      "coverImage",
      "posterImage",
      "cover",
      "poster",
      "thumbnail",
      "thumb",
      "image",
      "imageUrl",
      "image_url",
    );

    const posterImage =
      pickString(
        record,
        "pic",
        "posterImage",
        "coverImage",
        "poster",
        "cover",
        "thumbnail",
        "thumb",
        "image",
        "imageUrl",
        "image_url",
      ) || coverImage;

    const description = pickString(
      record,
      "desc",
      "description",
      "introduction",
      "summary",
      "intro",
      "synopsis",
    );

    const tags = Array.from(
      new Set([
        ...normalizeStringArray(record.theme),
        ...normalizeStringArray(record.tags),
        ...normalizeStringArray(record.genre),
        ...normalizeStringArray(record.category),
        "Drama",
      ]),
    ).slice(0, 8);

    return {
      id: numericId,
      source: "ReelShort",
      sourceId: "2",
      sourceName: "ReelShort",
      title,
      episodes: pickNumber(
        record,
        "chapters",
        "chapterCount",
        "episodes",
        "episodeCount",
        "episode_count",
        "totalEpisodes",
      ),
      badge: "ReelShort",
      tags,
      posterClass: "from-[#1A102E] via-[#12131A] to-[#090B12]",
      slug: reelShortSlug || `reelshort-${numericId}`,
      description,
      coverImage: coverImage || undefined,
      posterImage: posterImage || undefined,
      category: pickString(record, "category") || "Drama",
      language: pickString(record, "lang", "language") || "in",
      country: undefined,
      isNew: false,
      isDubbed: title.toLowerCase().includes("versi dub"),
      isTrending: false,
      sortOrder: index,
      rating: undefined,
      releaseYear: undefined,
      reelShortRawId: reelShortRawId || undefined,
      reelShortCode: reelShortCode || undefined,
      reelShortSlug: reelShortSlug || undefined,
    };
  });
}
