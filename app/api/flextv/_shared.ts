import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";

export const FLEXTV_BASE_URL = "https://streamapi.web.id/p/flextv/api/v1";
export const FLEXTV_TOKEN = process.env.FLEXTV_TOKEN?.trim() || "";
export const FLEXTV_LANG = "id";
export const FLEXTV_SOURCE_ID = "14";
export const FLEXTV_SOURCE_NAME = "FlexTV";

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

function pickString(record: JsonRecord, ...keys: string[]): string {
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

export async function fetchFlextvJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = FLEXTV_BASE_URL.endsWith("/")
    ? FLEXTV_BASE_URL
    : `${FLEXTV_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) url.searchParams.set("lang", FLEXTV_LANG);
  if (!url.searchParams.has("token")) url.searchParams.set("token", FLEXTV_TOKEN);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `FlexTV upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;

  const hasSeriesId = Boolean(
    item.series_id ||
      item.seriesId ||
      item.dramaId ||
      item.bookId ||
      item.id,
  );
  const hasTitle = Boolean(
    item.series_name ||
      item.title ||
      item.name ||
      item.dramaName,
  );
  const hasPoster = Boolean(
    item.cover ||
      item.poster ||
      item.posterImage ||
      item.image ||
      item.coverImage ||
      item.thumbnail,
  );

  return hasSeriesId && hasTitle && hasPoster;
}

export function extractFlextvItemsDeep(payload: unknown): JsonRecord[] {
  const seen = new Set<unknown>();

  const walk = (value: unknown): JsonRecord[] => {
    if (!value || typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);

    if (Array.isArray(value)) {
      const directItems = value.filter(looksLikeDrama) as JsonRecord[];
      const nestedItems = value.flatMap(walk);

      if (directItems.length > 0 || nestedItems.length > 0) {
        return [...directItems, ...nestedItems];
      }

      return [];
    }

    const record = value as JsonRecord;
    const priorityKeys = [
      "list",
      "items",
      "data",
      "result",
      "results",
      "records",
      "rows",
      "series",
      "dramas",
      "contents",
    ];

    for (const key of priorityKeys) {
      const found = walk(record[key]);
      if (found.length > 0) return found;
    }

    return Object.values(record).flatMap(walk);
  };

  return walk(payload);
}

export function adaptFlextvDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "series_id", "id", "seriesId", "dramaId");
  const numericId = createStableNumericId(rawId || `flextv-${index}`, index + 1);
  const title =
    pickString(item, "series_name", "title", "name", "dramaName") ||
    `FlexTV ${numericId}`;
  const coverImage = pickString(
    item,
    "cover",
    "poster",
    "posterImage",
    "image",
    "coverImage",
    "thumbnail",
  );
  const episodes =
    toNumber(item.max_series_no) ||
    toNumber(item.last_series_no) ||
    toNumber(item.episodes) ||
    toNumber(item.episodeCount) ||
    0;

  return {
    id: numericId,
    title,
    description:
      pickString(item, "description", "introduction", "summary", "synopsis") ||
      title,
    coverImage,
    posterImage: coverImage,
    episodes,
    tags: ["FlexTV"],
    source: FLEXTV_SOURCE_NAME,
    sourceId: FLEXTV_SOURCE_ID,
    sourceName: FLEXTV_SOURCE_NAME,
    badge: "FlexTV",
    slug: `flextv-${rawId || numericId}`,
    flextvRawId: rawId || undefined,
    flextvSeriesId: rawId || undefined,
  } as Drama & {
    flextvRawId?: string;
    flextvSeriesId?: string;
  };
}

export function dedupeFlextvDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      flextvRawId?: string;
      flextvSeriesId?: string;
    };

    const key =
      meta.flextvSeriesId ||
      meta.flextvRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "flextv"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptFlextvDramaList(items: JsonRecord[]): Drama[] {
  return dedupeFlextvDramas(
    items.map((item, index) => adaptFlextvDrama(item, index)),
  );
}

export function feedResponse(items: Drama[], page = 1) {
  return NextResponse.json(
    {
      items,
      hasNextPage: false,
      page,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

function pick720VideoUrl(playInfo: JsonRecord | undefined): string {
  const progressive = Array.isArray(playInfo?.progressive)
    ? (playInfo?.progressive as JsonRecord[])
    : [];

  const video720 =
    progressive.find((item) =>
      String(item.title || "").toUpperCase().includes("720"),
    ) || progressive.find((item) => typeof item.video_url === "string");

  return (
    pickString(video720 || {}, "video_url", "url", "videoPath") ||
    pickString(playInfo || {}, "video_url", "url", "videoPath")
  );
}

export function adaptFlextvEpisode(
  raw: JsonRecord,
  seriesId: string,
  numericDramaId: number,
): Episode {
  const episodeNumber = toNumber(raw.series_no) || toNumber(raw.number) || 1;
  const episodeId = pickString(raw, "id", "episode_id") || String(episodeNumber);
  const isVip = episodeNumber > FREE_EPISODE_LIMIT || toNumber(raw.is_vip_free) === 1;

  return {
    id: createStableNumericId(`${seriesId}-${episodeId}`, episodeNumber),
    dramaId: numericDramaId,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: `/api/flextv/stream?seriesId=${encodeURIComponent(
      seriesId,
    )}&episodeId=${encodeURIComponent(episodeId)}&episodeNumber=${episodeNumber}`,
    originalVideoUrl: undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: isVip,
    isVipOnly: isVip,
    sortOrder: episodeNumber,
    thumbnail: pickString(raw, "cover", "thumbnail") || undefined,
    flextvEpisodeId: episodeId,
    flextvPlayId: episodeId,
  } as Episode & {
    flextvEpisodeId?: string;
    flextvPlayId?: string;
  };
}

export function extractFlextvEpisodes(payload: unknown): JsonRecord[] {
  const record = payload as JsonRecord;
  const data = record?.data as JsonRecord | undefined;
  const list = data?.list;

  return Array.isArray(list) ? (list as JsonRecord[]) : [];
}

export function extractPlayVideoUrl(payload: unknown): string {
  const record = payload as JsonRecord;
  const data = record?.data as JsonRecord | undefined;
  return pick720VideoUrl(data);
}

export async function proxyRemoteMedia(
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
      { error: `Failed to load FlexTV media: ${response.status}`, rawUrl },
      { status: response.status },
    );
  }

  const headers = new Headers();
  headers.set("content-type", response.headers.get("content-type") || "video/mp4");
  headers.set("cache-control", "no-store");
  headers.set("access-control-allow-origin", "*");

  const contentLength = response.headers.get("content-length");
  const contentRange = response.headers.get("content-range");
  if (contentLength) headers.set("content-length", contentLength);
  if (contentRange) headers.set("content-range", contentRange);

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers,
  });
}
