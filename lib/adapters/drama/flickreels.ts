import type { Drama } from "@/types/drama";

type FlickreelsFeedVariant =
  | "home"
  | "foryou"
  | "trending"
  | "search"
  | "random"
  | "detail";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

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
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeTagNames(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        const raw = asRecord(item);
        return pickString(raw, "name", "title", "tag_name", "label");
      })
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[|,/]/)
      .map((item) => item.trim())
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

export function buildFlickreelsDrama(
  rawItem: unknown,
  index: number,
  variant: FlickreelsFeedVariant = "home",
  sourceId = "6",
): Drama | null {
  const raw = asRecord(rawItem);
  const rawId = pickString(raw, "playlet_id", "playletId", "id", "book_id", "bookId");
  const fallbackNumericId = pickNumber(raw, "playlet_id", "id") || index + 1;
  const numericId = createStableNumericId(rawId || `flickreels-${variant}-${index}`, fallbackNumericId);

  const title = stripHtml(
    pickString(raw, "title", "name", "playlet_title", "drama_name") || "Tanpa Judul",
  );
  const description = stripHtml(
    pickString(raw, "introduce", "introduction", "description", "summary", "desc"),
  );
  const coverImage = pickString(raw, "cover", "poster", "thumbnail", "image", "image_url", "cover_image");
  const posterImage = pickString(raw, "poster", "cover", "thumbnail", "image", "image_url", "cover_image") || coverImage;
  const episodeCount = pickNumber(raw, "upload_num", "episode_num", "episode_count", "episodes", "chapterCount");
  const tags = Array.from(
    new Set([
      ...normalizeTagNames(raw.tag_list),
      ...normalizeTagNames(raw.tags),
      ...normalizeTagNames(raw.tagNames),
      ...(variant === "foryou" ? ["ForYou"] : []),
      ...(variant === "trending" ? ["Trending"] : []),
      "Drama",
    ]),
  ).slice(0, 8);

  return {
    id: numericId,
    source: "Flickreels",
    sourceId,
    sourceName: "Flickreels",
    title,
    episodes: episodeCount,
    badge:
      variant === "foryou"
        ? "ForYou"
        : variant === "trending"
          ? "Trending"
          : variant === "random"
            ? "Acak"
            : "Flickreels",
    tags,
    posterClass: "from-[#0F274A] via-[#12131A] to-[#090B12]",
    slug: `flickreels-${rawId || numericId}`,
    description,
    coverImage: coverImage || undefined,
    posterImage: posterImage || undefined,
    category: variant === "trending" ? "Trending" : "Drama",
    language: "id",
    country: undefined,
    isNew: variant === "home",
    isDubbed: false,
    isTrending: variant === "trending",
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    flickreelsRawId: rawId || undefined,
    flickreelsDramaId: rawId || undefined,
  };
}

export function normalizeFlickreelsFeed(
  payload: unknown,
  variant: FlickreelsFeedVariant = "home",
  sourceId = "6",
): Drama[] {
  const root = asRecord(payload);
  const nestedData = asRecord(root.data);
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(nestedData.data)
      ? nestedData.data
      : Array.isArray(root.data)
        ? (root.data as unknown[])
        : Array.isArray(root.items)
          ? (root.items as unknown[])
          : [];

  return list
    .map((item, index) => buildFlickreelsDrama(item, index, variant, sourceId))
    .filter((item): item is Drama => !!item);
}
