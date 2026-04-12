import { NextRequest, NextResponse } from "next/server";

export const SHORTMAX_BASE_URL = "https://shortmax.dramabos.my.id";
export const SHORTMAX_UPSTREAM_HEADERS = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: SHORTMAX_BASE_URL,
  Referer: `${SHORTMAX_BASE_URL}/`,
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

export type ShortmaxFeedKind =
  | "home"
  | "latest"
  | "trending"
  | "hot"
  | "ranking";

type ShortmaxRawDrama = Record<string, unknown>;

type ShortmaxEpisode = {
  id: number;
  dramaId: number;
  episodeNumber: number;
  title: string;
  videoUrl: string;
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;
  originalVideoUrl?: string;
};

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

export async function fetchShortmaxJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...SHORTMAX_UPSTREAM_HEADERS,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Shortmax upstream error ${response.status}. ${body.slice(0, 220)}`,
    );
  }

  return response.json();
}

export function buildShortmaxFeedUrl(
  kind: ShortmaxFeedKind,
  page = 1,
  type = "monthly",
): string {
  switch (kind) {
    case "latest":
      return `${SHORTMAX_BASE_URL}/api/v1/new?lang=id`;
    case "trending":
      return `${SHORTMAX_BASE_URL}/api/v1/popular?lang=id&page=${page}`;
    case "hot":
      return `${SHORTMAX_BASE_URL}/api/v1/hot?lang=id&page=${page}`;
    case "ranking":
      return `${SHORTMAX_BASE_URL}/api/v1/ranking?lang=id&page=${page}&type=${encodeURIComponent(type)}`;
    case "home":
    default:
      return `${SHORTMAX_BASE_URL}/api/v1/category/1?lang=id&pageSize=500`;
  }
}

export function extractShortmaxFeedList(payload: unknown): ShortmaxRawDrama[] {
  if (Array.isArray(payload)) return payload as ShortmaxRawDrama[];

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: { list?: unknown[] } }).data?.list)
  ) {
    return ((payload as { data: { list: unknown[] } }).data.list ??
      []) as ShortmaxRawDrama[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: unknown[] }).data as ShortmaxRawDrama[];
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { list?: unknown[] }).list)
  ) {
    return (payload as { list: unknown[] }).list as ShortmaxRawDrama[];
  }

  return [];
}

export function normalizeShortmaxFeed(
  payload: unknown,
  kind: ShortmaxFeedKind,
  sourceId = "7",
) {
  const list = extractShortmaxFeedList(payload);

  return list.map((item, index) => {
    const raw = item ?? {};

    const rawId =
      pickString(
        raw,
        "id",
        "dramaId",
        "drama_id",
        "playlet_id",
        "bookId",
        "book_id",
      ) || "";
    const code =
      pickString(raw, "code", "shareCode", "bookCode", "contentCode") || "";

    const numericCode = Number(code);
    const normalizedId =
      Number.isFinite(numericCode) && numericCode > 0
        ? numericCode
        : pickNumber(
            raw,
            "code",
            "id",
            "dramaId",
            "drama_id",
            "playlet_id",
            "bookId",
            "book_id",
          ) || Date.now() + index;

    const title =
      pickString(
        raw,
        "title",
        "name",
        "dramaName",
        "drama_name",
        "bookName",
        "book_name",
      ) || "Tanpa Judul";

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
      slug: code
        ? `shortmax-${code}`
        : rawId
          ? `shortmax-${rawId}`
          : `shortmax-${normalizedId}`,
      description,
      coverImage: coverImage || undefined,
      posterImage: posterImage || undefined,
      category: kind === "hot" ? "Hot" : "Drama",
      language: "id",
      country: undefined,
      isNew: kind === "latest" || kind === "home",
      isDubbed: title.toLowerCase().includes("[dubbing]"),
      isTrending: kind === "trending" || kind === "hot",
      sortOrder: index,
      rating: undefined,
      releaseYear: undefined,
      shortmaxRawId: rawId || undefined,
      shortmaxDramaId: code || undefined,
      shortmaxCode: code || undefined,
      shortmaxViews:
        pickNumber(raw, "views", "playCount", "play_count") || undefined,
    };
  });
}

function extractCandidateEpisodeArrays(
  payload: unknown,
): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];

  const buckets: unknown[] = [(payload as { data?: unknown }).data, payload];

  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;

    const obj = bucket as Record<string, unknown>;
    for (const key of [
      "episodes",
      "episodeList",
      "episode_list",
      "chapterList",
      "chapter_list",
      "list",
      "videos",
      "videoList",
      "video_list",
      "items",
      "playList",
      "play_list",
    ]) {
      if (Array.isArray(obj[key])) {
        return obj[key] as Record<string, unknown>[];
      }
    }
  }

  return [];
}

function resolveEpisodeVideoUrl(raw: Record<string, unknown>): string {
  const video = raw.video;
  if (video && typeof video === "object") {
    const videoObj = video as Record<string, unknown>;
    const bestFromNested = pickString(
      videoObj,
      "video_1080",
      "video_720",
      "video_480",
      "videoUrl",
      "video_url",
      "playUrl",
      "play_url",
      "url",
      "mp4",
      "hls",
      "hlsUrl",
      "hls_url",
      "m3u8",
    );
    if (bestFromNested) return bestFromNested;
  }

  return pickString(
    raw,
    "videoUrl",
    "video_url",
    "playUrl",
    "play_url",
    "url",
    "mp4",
    "hls",
    "hlsUrl",
    "hls_url",
    "m3u8",
  );
}

function resolveEpisodeSubtitleUrl(raw: Record<string, unknown>): string {
  return pickString(
    raw,
    "subtitleUrl",
    "subtitle_url",
    "subUrl",
    "sub_url",
    "srt",
    "vtt",
    "captionUrl",
    "caption_url",
  );
}

export function normalizeShortmaxEpisodes(
  payload: unknown,
  numericDramaId: number,
): ShortmaxEpisode[] {
  const rawEpisodes = extractCandidateEpisodeArrays(payload);

  return rawEpisodes
    .map((item, index) => {
      const episodeNumber =
        pickNumber(
          item,
          "episodeNumber",
          "episode_number",
          "episode",
          "ep",
          "sort",
          "index",
          "seq",
        ) || index + 1;

      const originalVideoUrl = resolveEpisodeVideoUrl(item);
      const subtitleOriginal = resolveEpisodeSubtitleUrl(item);

      if (!originalVideoUrl) return null;

      const normalizedEpisode: ShortmaxEpisode = {
        id: createStableNumericId(
          `${numericDramaId}-${episodeNumber}-${originalVideoUrl}`,
          numericDramaId * 1000 + episodeNumber,
        ),
        dramaId: numericDramaId,
        episodeNumber,
        title:
          pickString(item, "title", "name", "episodeTitle", "episode_title") ||
          `Episode ${episodeNumber}`,
        videoUrl: `/api/shortmax/stream?u=${encodeURIComponent(originalVideoUrl)}`,
        subtitleUrl: subtitleOriginal
          ? `/api/shortmax/subtitle?url=${encodeURIComponent(subtitleOriginal)}`
          : undefined,
        subtitleLang: "id-ID",
        subtitleLabel: "Indonesian",
        originalVideoUrl,
      };

      return normalizedEpisode;
    })
    .filter((item): item is ShortmaxEpisode => item !== null)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export async function proxyBinaryResponse(
  upstreamUrl: string,
  request: NextRequest,
  rewriteM3u8 = true,
) {
  const rangeHeader = request.headers.get("range");
  const upstreamResponse = await fetch(upstreamUrl, {
    headers: {
      ...SHORTMAX_UPSTREAM_HEADERS,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    },
    cache: "no-store",
  });

  if (!upstreamResponse.ok && upstreamResponse.status !== 206) {
    return new NextResponse(
      await upstreamResponse.text().catch(() => "Upstream media error."),
      { status: upstreamResponse.status },
    );
  }

  const contentType = upstreamResponse.headers.get("content-type") || "";
  const isM3u8 =
    rewriteM3u8 &&
    (contentType.includes("application/vnd.apple.mpegurl") ||
      upstreamUrl.includes(".m3u8"));

  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set(
    "Access-Control-Allow-Headers",
    "Range, Content-Type, Authorization",
  );
  headers.set("Accept-Ranges", "bytes");

  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "cache-control",
    "etag",
    "last-modified",
  ];

  for (const key of passthroughHeaders) {
    const value = upstreamResponse.headers.get(key);
    if (value) headers.set(key, value);
  }

  if (isM3u8) {
    const text = await upstreamResponse.text();
    const origin = new URL(upstreamUrl).origin;
    const parent = upstreamUrl.substring(0, upstreamUrl.lastIndexOf("/") + 1);

    const rewritten = text
      .split("\n")
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return line;

        try {
          const absoluteUrl = trimmed.startsWith("http")
            ? trimmed
            : trimmed.startsWith("/")
              ? `${origin}${trimmed}`
              : `${parent}${trimmed}`;

          return `/api/shortmax/stream?u=${encodeURIComponent(absoluteUrl)}`;
        } catch {
          return line;
        }
      })
      .join("\n");

    headers.set("content-type", "application/vnd.apple.mpegurl");
    return new NextResponse(rewritten, {
      status: upstreamResponse.status,
      headers,
    });
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

export function srtToVtt(input: string): string {
  const body = input
    .replace(/\r/g, "")
    .replace(/^\uFEFF/, "")
    .split("\n")
    .filter((line, index, arr) => {
      const trimmed = line.trim();
      const next = arr[index + 1]?.trim() ?? "";
      return !(trimmed && /^\d+$/.test(trimmed) && next.includes("-->"));
    })
    .join("\n")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");

  return `WEBVTT\n\n${body.trim()}\n`;
}
