import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

export const GOODSHORT_BASE_URL = "https://streamapi.web.id/p/goodshort/api/v1";
export const GOODSHORT_LANG = "id";
export const GOODSHORT_TOKEN = process.env.GOODSHORT_TOKEN?.trim() || "";
export const GOODSHORT_CODE = "4D96F22760EA30FB0FFBA9AA87A979A6";
export const GOODSHORT_HOME_SIZE = 20;
export const GOODSHORT_SEARCH_SIZE = 15;
export const DEFAULT_QUALITY = "720p";

export type GoodshortTab =
  | "Beranda"
  | "Populer"
  | "Trending"
  | "Acak"
  | "Search";

export function pickString(
  raw: Record<string, unknown>,
  ...keys: string[]
): string {
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

export function pickNumber(
  raw: Record<string, unknown>,
  ...keys: string[]
): number {
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

export function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

export async function fetchGoodshortJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/")
    ? path.slice(1)
    : path;

  const baseUrl = GOODSHORT_BASE_URL.endsWith("/")
    ? GOODSHORT_BASE_URL
    : `${GOODSHORT_BASE_URL}/`;

  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("token")) {
    url.searchParams.set("token", GOODSHORT_TOKEN);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      accept: "application/json,text/plain,*/*",
      "user-agent": "Mozilla/5.0",
    },
  });

  if (!response.ok) {
    throw new Error(`GoodShort upstream error ${response.status} for ${url}`);
  }

  return response.json();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function extractListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];

  const flattenWrappers = (items: unknown[]): unknown[] => {
    const nested = items.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      if (Array.isArray(entry.items)) return entry.items;
      if (Array.isArray(entry.list)) return entry.list;
      if (Array.isArray(entry.records)) return entry.records;
      return [];
    });

    return nested.length > 0 ? nested : items;
  };

  if (Array.isArray(payload.data)) return flattenWrappers(payload.data);
  if (Array.isArray(payload.list)) return flattenWrappers(payload.list);
  if (Array.isArray(payload.items)) return flattenWrappers(payload.items);

  const dataNode = isRecord(payload.data) ? payload.data : null;
  if (!dataNode) return [];

  if (Array.isArray(dataNode.list)) return flattenWrappers(dataNode.list);
  if (Array.isArray(dataNode.items)) return flattenWrappers(dataNode.items);
  if (Array.isArray(dataNode.data)) return flattenWrappers(dataNode.data);

  if (Array.isArray(dataNode.records)) {
    const flattened = dataNode.records.flatMap((entry) => {
      if (!isRecord(entry)) return [];
      if (Array.isArray(entry.items)) return entry.items;
      if (Array.isArray(entry.list)) return entry.list;
      return [entry];
    });
    if (flattened.length > 0) return flattened;
  }

  const searchResult = isRecord(dataNode.searchResult)
    ? dataNode.searchResult
    : null;
  if (searchResult && Array.isArray(searchResult.records)) {
    return searchResult.records;
  }

  return [];
}

export function normalizeGoodshortImageUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const normalized = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;

  return `https://acfs1.goodreels.com/${normalized}`;
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
      .replace(/[\[\]"]/g, "")
      .split(/[|,/]/)
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

export function buildGoodshortDrama(
  item: unknown,
  index: number,
  tab: GoodshortTab,
  sourceId = "8",
): Drama | null {
  if (!isRecord(item)) return null;

  const goodshortDramaId =
    pickString(item, "bookId", "action", "id", "book_id", "bookIdStr") || "";

  const fallbackNumericId =
    pickNumber(item, "id", "bookId", "book_id", "action") || index + 1;
  const numericId = createStableNumericId(
    goodshortDramaId || `goodshort-${index}`,
    fallbackNumericId,
  );

  const title =
    pickString(
      item,
      "bookName",
      "title",
      "name",
      "alias1",
      "aliasInfo",
      "tags",
    ) || "Tanpa Judul";

  const rawCoverImage = pickString(
    item,
    "cover",
    "coverUrl",
    "cover_url",
    "image",
    "imageUrl",
    "image_url",
    "bookDetailCover",
    "coverImage",
    "poster",
    "posterImage",
    "thumbnail",
  );

  const rawPosterImage =
    pickString(
      item,
      "cover",
      "coverUrl",
      "cover_url",
      "image",
      "imageUrl",
      "image_url",
      "posterImage",
      "poster",
      "coverImage",
      "thumbnail",
      "bookDetailCover",
    ) || rawCoverImage;

  const coverImage = normalizeGoodshortImageUrl(rawCoverImage);
  const posterImage = normalizeGoodshortImageUrl(rawPosterImage);

  const tags = Array.from(
    new Set([
      ...normalizeStringArray(item.tags),
      ...(tab === "Populer" ? ["Populer"] : []),
      ...(tab === "Trending" ? ["Trending"] : []),
      ...(tab === "Acak" ? ["Acak"] : []),
      "Drama",
    ]),
  ).slice(0, 8);

  return {
    id: numericId,
    source: "GoodShort",
    sourceId,
    sourceName: "GoodShort",
    title,
    episodes: pickNumber(item, "chapterCount", "episodes", "episodeCount"),
    badge:
      tab === "Populer"
        ? "Populer"
        : tab === "Trending"
          ? "Trending"
          : tab === "Acak"
            ? "Acak"
            : "GoodShort",
    tags,
    posterClass: "from-[#0D5F56] via-[#12131A] to-[#090B12]",
    slug: `goodshort-${goodshortDramaId || numericId}`,
    description:
      pickString(
        item,
        "introduction",
        "description",
        "summary",
        "intro",
        "synopsis",
        "tags",
      ) || "",
    coverImage: coverImage || undefined,
    posterImage: posterImage || undefined,
    category: "Drama",
    language: GOODSHORT_LANG,
    country: undefined,
    isNew: tab === "Beranda",
    isDubbed: false,
    isTrending: tab === "Populer" || tab === "Trending",
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    goodshortRawId: goodshortDramaId || undefined,
    goodshortDramaId: goodshortDramaId || undefined,
  };
}

export function normalizeGoodshortFeed(
  payload: unknown,
  tab: GoodshortTab,
  sourceId = "8",
): Drama[] {
  const list = extractListPayload(payload);
  const map = new Map<string, Drama>();

  list.forEach((item, index) => {
    const drama = buildGoodshortDrama(item, index, tab, sourceId);
    if (!drama) return;

    const key =
      drama.goodshortDramaId ||
      drama.goodshortRawId ||
      drama.slug ||
      String(drama.id);
    map.set(key, drama);
  });

  return Array.from(map.values());
}

export async function fetchGoodshortBookDetail(
  dramaId: string,
): Promise<Record<string, unknown> | null> {
  if (!dramaId) return null;

  const payload = await fetchGoodshortJson(
    `/book/${encodeURIComponent(dramaId)}`,
    {
      lang: GOODSHORT_LANG,
    },
  );

  if (!isRecord(payload)) return null;
  const dataNode = isRecord(payload.data) ? payload.data : null;
  const bookNode = dataNode && isRecord(dataNode.book) ? dataNode.book : null;
  return bookNode;
}

export async function hydrateDramaWithBookDetail(
  drama: Drama,
  detail: Record<string, unknown> | null,
): Promise<Drama> {
  if (!detail) return drama;

  const title = pickString(detail, "bookName", "title", "name") || drama.title;
  const coverImage =
    normalizeGoodshortImageUrl(
      pickString(detail, "cover", "coverImage", "bookDetailCover"),
    ) ||
    drama.coverImage ||
    "";
  const posterImage =
    normalizeGoodshortImageUrl(
      pickString(detail, "cover", "posterImage", "coverImage", "bookDetailCover"),
    ) ||
    drama.posterImage ||
    coverImage;
  const description =
    pickString(detail, "introduction", "description", "summary", "intro") ||
    drama.description;
  const episodes =
    pickNumber(detail, "chapterCount", "episodes", "episodeCount") ||
    drama.episodes;

  return {
    ...drama,
    title: title || drama.title,
    coverImage: coverImage || drama.coverImage,
    posterImage: posterImage || drama.posterImage,
    description,
    episodes,
  };
}

export async function enrichGoodshortDramasWithBookDetails(
  dramas: Drama[],
): Promise<Drama[]> {
  const enriched = await Promise.all(
    dramas.map(async (drama) => {
      const dramaId = drama.goodshortDramaId || drama.goodshortRawId || "";
      if (!dramaId) return drama;
      if (drama.posterImage || drama.coverImage) return drama;

      try {
        const detail = await fetchGoodshortBookDetail(dramaId);
        return hydrateDramaWithBookDetail(drama, detail);
      } catch {
        return drama;
      }
    }),
  );

  return enriched;
}

export function rotateList<T>(items: T[], page: number, windowSize = 20): T[] {
  if (items.length === 0) return [];
  if (page <= 1) return items;

  const offset = ((page - 1) * windowSize) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

export function parseEpisodeNumber(value: string, fallback: number): number {
  const match = value.match(/(\d+)/);
  if (match?.[1]) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

export function buildInternalStreamUrl(params: Record<string, string>): string {
  const url = new URL("/api/goodshort/stream", "http://localhost");
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function buildInternalSubtitleUrl(urlValue: string): string {
  const url = new URL("/api/goodshort/subtitle", "http://localhost");
  url.searchParams.set("url", urlValue);
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function normalizeGoodshortVideoPath(rawUrl: string): string {
  if (!rawUrl) return "";

  try {
    const parsed = new URL(rawUrl);

    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") {
      parsed.protocol = "https:";
      parsed.host = "goodshort.dramabos.my.id";
      return parsed.toString();
    }

    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

export function buildGoodshortEpisodes(
  chaptersPayload: unknown,
  numericDramaId: number,
): Episode[] {
  if (!isRecord(chaptersPayload)) return [];

  const dataNode = isRecord(chaptersPayload.data) ? chaptersPayload.data : null;
  if (!dataNode) return [];

  const bookId = pickString(dataNode, "bookId");
  const videoKey = pickString(dataNode, "videoKey");

  const episodeList = Array.isArray(dataNode.episodes)
    ? dataNode.episodes
    : Array.isArray(dataNode.list)
      ? dataNode.list
      : [];

  return episodeList
    .map((item, index) => {
      if (!isRecord(item)) return null;

      const chapterId = pickString(item, "id");
      const chapterName = pickString(item, "chapterName") || String(index + 1);

      const allVideos = Array.isArray(item.allVideos) ? item.allVideos : [];
      const preferredVideo =
        allVideos.find(
          (entry): entry is Record<string, unknown> =>
            isRecord(entry) &&
            pickString(entry, "type").toLowerCase() === "720p" &&
            !!pickString(entry, "rawUrl"),
        ) ??
        allVideos.find(
          (entry): entry is Record<string, unknown> =>
            isRecord(entry) && !!pickString(entry, "rawUrl"),
        ) ??
        null;

      const rawVideoPath =
        (preferredVideo ? pickString(preferredVideo, "rawUrl") : "") ||
        pickString(item, "m3u8");

      const videoPath = normalizeGoodshortVideoPath(rawVideoPath);

      if (!chapterId || !videoPath) return null;

      const stableEpisodeId = createStableNumericId(
        `${bookId || numericDramaId}:${chapterId}`,
        index + 1,
      );

      const rawIndex = pickNumber(item, "index");
      const episodeNumber =
        rawIndex > 0 || rawIndex === 0
          ? rawIndex + 1
          : parseEpisodeNumber(chapterName, index + 1);

      const streamUrl = buildInternalStreamUrl({
        url: videoPath,
        dramaId: bookId || "",
        episodeId: chapterId,
        videoKey,
      });

      const episode: Episode = {
        id: stableEpisodeId,
        dramaId: numericDramaId,
        episodeNumber,
        title: `Episode ${chapterName}`,
        duration: "",
        slug: `goodshort-${bookId || numericDramaId}-${chapterId}`,
        description: undefined,
        sortOrder: index,
        isLocked: pickNumber(item, "price") > 0,
        isVipOnly: pickNumber(item, "price") > 0,
        videoUrl: streamUrl,
        thumbnail: undefined,
      };

      return episode;
    })
    .filter((episode): episode is Episode => !!episode)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

function absolutizeUrl(candidate: string, baseUrl: string): string {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
}

export function rewriteM3u8Playlist(
  content: string,
  playlistUrl: string,
): string {
  const lines = content.split(/\r?\n/);

  const isInternalProxyPath = (value: string): boolean => {
    const trimmed = value.trim();
    return (
      trimmed.startsWith("/api/goodshort/stream?") ||
      trimmed.startsWith("http://localhost/api/goodshort/stream?") ||
      trimmed.startsWith("https://localhost/api/goodshort/stream?")
    );
  };

  const shouldBypassProxyBareLine = (value: string): boolean => {
    const trimmed = value.trim().toLowerCase();

    return (
      !trimmed ||
      trimmed.startsWith("blob:") ||
      trimmed.startsWith("skd:") ||
      trimmed.startsWith("mailto:") ||
      trimmed.startsWith("javascript:")
    );
  };

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
          const uriTrimmed = uri.trim();

          if (isInternalProxyPath(uriTrimmed)) {
            return `URI="${uriTrimmed}"`;
          }

          if (
            uriTrimmed.toLowerCase().startsWith("blob:") ||
            uriTrimmed.toLowerCase().startsWith("skd:") ||
            uriTrimmed.toLowerCase().startsWith("mailto:") ||
            uriTrimmed.toLowerCase().startsWith("javascript:")
          ) {
            return `URI="${uri}"`;
          }

          return `URI="${uri}"`;
        });
      }

      if (isInternalProxyPath(trimmed)) {
        return trimmed;
      }

      if (shouldBypassProxyBareLine(trimmed)) {
        return line;
      }

      return line;
    })
    .join("\n");
}

export function createProxyHeaders(
  upstream: Response,
  dropContentLength = false,
): Headers {
  const headers = new Headers(upstream.headers);
  headers.set("access-control-allow-origin", "*");
  headers.set("access-control-allow-methods", "GET,OPTIONS");
  headers.set("access-control-allow-headers", "*");
  headers.delete("content-security-policy");
  if (dropContentLength) {
    headers.delete("content-length");
  }
  return headers;
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function readPositiveInt(
  request: NextRequest,
  key: string,
  fallback: number,
): number {
  const raw = request.nextUrl.searchParams.get(key);
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
