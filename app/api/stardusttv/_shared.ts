import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

export const STARDUSTTV_BASE_URL =
  "https://streamapi.web.id/p/stardusttv/api/v1";
export const STARDUSTTV_TOKEN =
  "KFKiMIbY3Np8kbimDo7lJDNSVslwF3Fn64cI0TOtqpOP373n58ca6BKzbDsLb7qB";
export const STARDUSTTV_LANG = "id";
export const STARDUSTTV_SOURCE_ID = "15";
export const STARDUSTTV_SOURCE_NAME = "StardustTV";

type JsonRecord = Record<string, unknown>;

type Episode = {
  id: number;
  dramaId: number;
  episodeNumber: number;
  title: string;
  videoUrl: string;
  originalVideoUrl?: string;
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;
  isLocked?: boolean;
  isVipOnly?: boolean;
  sortOrder?: number;
  thumbnail?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function pickString(record: JsonRecord | undefined, ...keys: string[]): string {
  if (!record) return "";

  for (const key of keys) {
    const picked = toStringValue(record[key]);
    if (picked) return picked;
  }

  return "";
}

export function createStableNumericId(value: string, fallback = 0): number {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || fallback;
}

export async function fetchStardustJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = STARDUSTTV_BASE_URL.endsWith("/")
    ? STARDUSTTV_BASE_URL
    : `${STARDUSTTV_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", STARDUSTTV_LANG);
  }

  if (!url.searchParams.has("token")) {
    url.searchParams.set("token", STARDUSTTV_TOKEN);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `StardustTV upstream ${response.status} for ${url.toString()}: ${body.slice(
        0,
        300,
      )}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;

  const hasId = Boolean(item.id || item.video_id || item.series_id);
  const hasTitle = Boolean(item.title || item.name || item.video_title);
  const hasPoster = Boolean(
    item.poster ||
      item.cover ||
      item.image ||
      item.thumbnail ||
      item.posterImage ||
      item.coverImage,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractStardustItemsDeep(payload: unknown): JsonRecord[] {
  const seen = new Set<unknown>();

  const walk = (value: unknown): JsonRecord[] => {
    if (!value || typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);

    if (Array.isArray(value)) {
      const directItems = value.filter(looksLikeDrama) as JsonRecord[];
      const nestedItems = value.flatMap(walk);
      return [...directItems, ...nestedItems];
    }

    const record = value as JsonRecord;
    const priorityKeys = [
      "list",
      "items",
      "data",
      "videos",
      "records",
      "rows",
      "results",
      "result",
    ];

    for (const key of priorityKeys) {
      const found = walk(record[key]);
      if (found.length > 0) return found;
    }

    return Object.values(record).flatMap(walk);
  };

  return walk(payload);
}

export function adaptStardustDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "id", "video_id", "series_id", "dramaId");
  const numericId = createStableNumericId(
    rawId || `stardusttv-${index}`,
    index + 1,
  );
  const title =
    pickString(item, "title", "name", "video_title") || `StardustTV ${numericId}`;
  const posterImage = pickString(
    item,
    "poster",
    "cover",
    "image",
    "thumbnail",
    "posterImage",
    "coverImage",
  );
  const episodes =
    toNumber(item.totalEpisodes) ||
    toNumber(item.total_episodes) ||
    toNumber(item.episodes) ||
    toNumber(item.episodeCount) ||
    0;

  return {
    id: numericId,
    title,
    description: pickString(item, "intro", "description", "summary") || title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["StardustTV"],
    source: STARDUSTTV_SOURCE_NAME,
    sourceId: STARDUSTTV_SOURCE_ID,
    sourceName: STARDUSTTV_SOURCE_NAME,
    badge: "StardustTV",
    slug: `stardusttv-${rawId || numericId}`,
    stardusttvRawId: rawId || undefined,
    stardusttvVideoId: rawId || undefined,
  } as Drama & {
    stardusttvRawId?: string;
    stardusttvVideoId?: string;
  };
}

export function dedupeStardustDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      stardusttvRawId?: string;
      stardusttvVideoId?: string;
    };

    const key =
      meta.stardusttvVideoId ||
      meta.stardusttvRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "stardusttv"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptStardustDramaList(items: JsonRecord[]): Drama[] {
  return dedupeStardustDramas(
    items.map((item, index) => adaptStardustDrama(item, index)),
  );
}

export function feedResponse(
  items: Drama[],
  page = 1,
  hasNextPage = false,
): NextResponse {
  return NextResponse.json(
    {
      items,
      hasNextPage,
      page,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function extractStardustEpisodes(payload: unknown): JsonRecord[] {
  const record = payload as JsonRecord;
  const data = record?.data as JsonRecord | undefined;
  const episodes = data?.episodes;

  return Array.isArray(episodes) ? (episodes as JsonRecord[]) : [];
}

export function adaptStardustEpisode(
  raw: JsonRecord,
  videoId: string,
  numericDramaId: number,
): Episode {
  const episodeNumber = toNumber(raw.sort) || toNumber(raw.episode) || 1;
  const episodeId = pickString(raw, "id") || String(episodeNumber);
  const h264 = pickString(raw, "h264");
  const thumbnail = pickString(raw, "snapshot", "thumbnail", "poster", "cover");
  const isVip = toNumber(raw.is_vip) === 1;

  return {
    id: createStableNumericId(`${videoId}-${episodeId}`, episodeNumber),
    dramaId: numericDramaId,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: h264
      ? `/api/stardusttv/stream?url=${encodeURIComponent(h264)}`
      : `/api/stardusttv/stream?videoId=${encodeURIComponent(
          videoId,
        )}&episode=${encodeURIComponent(String(episodeNumber))}`,
    originalVideoUrl: h264 || undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: isVip,
    isVipOnly: isVip,
    sortOrder: episodeNumber,
    thumbnail: thumbnail || undefined,
    stardusttvEpisodeId: episodeId,
    stardusttvPlayId: String(episodeNumber),
  } as Episode & {
    stardusttvEpisodeId?: string;
    stardusttvPlayId?: string;
  };
}

export function extractEpisodeStreamUrl(payload: unknown): string {
  const record = payload as JsonRecord;
  const data = record?.data as JsonRecord | undefined;

  return pickString(data, "h264", "h265", "video_url", "url");
}

function buildRelativeProxyUrl(targetUrl: string): string {
  return `/api/stardusttv/stream?url=${encodeURIComponent(targetUrl)}`;
}

export function rewriteM3u8Playlist(
  playlistText: string,
  playlistUrl: string,
): string {
  return playlistText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        return line;
      }

      try {
        return buildRelativeProxyUrl(new URL(trimmed, playlistUrl).toString());
      } catch {
        return line;
      }
    })
    .join("\n");
}

function forwardHeaders(contentType: string): Headers {
  const headers = new Headers();

  headers.set("content-type", contentType || "application/octet-stream");
  headers.set("cache-control", "no-store");
  headers.set("access-control-allow-origin", "*");

  return headers;
}

export async function proxyMedia(
  request: NextRequest,
  rawUrl: string,
): Promise<NextResponse> {
  const response = await fetch(rawUrl, {
    method: "GET",
    headers: {
      Accept: "*/*",
      ...(request.headers.get("range")
        ? { Range: request.headers.get("range") as string }
        : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Failed to load StardustTV media: ${response.status}`, rawUrl },
      { status: response.status },
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const activeTargetUrl = response.url || rawUrl;
  const headers = forwardHeaders(contentType);

  const contentLength = response.headers.get("content-length");
  const contentRange = response.headers.get("content-range");

  if (contentLength) headers.set("content-length", contentLength);
  if (contentRange) headers.set("content-range", contentRange);

  if (
    activeTargetUrl.includes(".m3u8") ||
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL") ||
    contentType.includes("audio/x-mpegurl")
  ) {
    const text = await response.text();
    const rewritten = rewriteM3u8Playlist(text, activeTargetUrl);
    headers.delete("content-length");

    return new NextResponse(rewritten, { status: 200, headers });
  }

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers,
  });
}
