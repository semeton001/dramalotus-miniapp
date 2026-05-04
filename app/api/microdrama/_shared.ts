import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";

export const MICRODRAMA_BASE_URL =
  "https://streamapi.web.id/p/microdrama/api/v1";
export const MICRODRAMA_TOKEN = process.env.MICRODRAMA_TOKEN?.trim() || "";
export const MICRODRAMA_LANG = "id";
export const MICRODRAMA_SOURCE_ID = "14";
export const MICRODRAMA_SOURCE_NAME = "MicroDrama";

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

export async function fetchMicrodramaJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = MICRODRAMA_BASE_URL.endsWith("/")
    ? MICRODRAMA_BASE_URL
    : `${MICRODRAMA_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", MICRODRAMA_LANG);
  }

  if (!url.searchParams.has("token")) {
    url.searchParams.set("token", MICRODRAMA_TOKEN);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `MicroDrama upstream ${response.status} for ${url.toString()}: ${body.slice(
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

  const hasId = Boolean(item.id || item.dramaId || item.bookId || item.seriesId);
  const hasTitle = Boolean(item.title || item.name || item.bookName || item.dramaName);
  const hasPoster = Boolean(
    item.cover ||
      item.poster ||
      item.image ||
      item.thumbnail ||
      item.coverImage ||
      item.posterImage,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractMicrodramaItemsDeep(payload: unknown): JsonRecord[] {
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
    const direct: JsonRecord[] = [];

    if (looksLikeDrama(record)) direct.push(record);

    const priorityKeys = [
      "dramas",
      "list",
      "items",
      "data",
      "results",
      "result",
      "records",
      "rows",
      "contents",
    ];

    for (const key of priorityKeys) {
      const found = walk(record[key]);
      if (found.length > 0) return [...direct, ...found];
    }

    return [...direct, ...Object.values(record).flatMap(walk)];
  };

  return walk(payload);
}

export function adaptMicrodramaDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "id", "dramaId", "bookId", "seriesId");
  const numericId = createStableNumericId(
    rawId || `microdrama-${index}`,
    index + 1,
  );
  const title =
    pickString(item, "title", "name", "bookName", "dramaName") ||
    `MicroDrama ${numericId}`;
  const posterImage = pickString(
    item,
    "cover",
    "poster",
    "image",
    "thumbnail",
    "coverImage",
    "posterImage",
  );
  const episodes =
    toNumber(item.total_episodes) ||
    toNumber(item.totalEpisodes) ||
    toNumber(item.episodes) ||
    toNumber(item.episodeCount) ||
    0;

  return {
    id: numericId,
    title,
    description:
      pickString(item, "description", "intro", "summary", "synopsis") || title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["MicroDrama"],
    source: MICRODRAMA_SOURCE_NAME,
    sourceId: MICRODRAMA_SOURCE_ID,
    sourceName: MICRODRAMA_SOURCE_NAME,
    badge: "MicroDrama",
    slug: `microdrama-${rawId || numericId}`,
    microdramaRawId: rawId || undefined,
    microdramaDramaId: rawId || undefined,
  } as Drama & {
    microdramaRawId?: string;
    microdramaDramaId?: string;
  };
}

export function dedupeMicrodramaDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      microdramaRawId?: string;
      microdramaDramaId?: string;
    };

    const key =
      meta.microdramaDramaId ||
      meta.microdramaRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "microdrama"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptMicrodramaDramaList(items: JsonRecord[]): Drama[] {
  return dedupeMicrodramaDramas(
    items.map((item, index) => adaptMicrodramaDrama(item, index)),
  );
}

export function feedResponse(items: Drama[], page = 1): NextResponse {
  return NextResponse.json(
    {
      items,
      hasNextPage: false,
      page,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export function extractMicrodramaEpisodes(payload: unknown): JsonRecord[] {
  const record = payload as JsonRecord;
  const episodes = record?.episodes;

  if (Array.isArray(episodes)) return episodes as JsonRecord[];

  const data = record?.data as JsonRecord | undefined;
  if (Array.isArray(data?.episodes)) return data.episodes as JsonRecord[];

  const drama = record?.drama as JsonRecord | undefined;
  if (Array.isArray(drama?.episodes)) return drama.episodes as JsonRecord[];

  return [];
}

function pickBestVideoUrl(videos: unknown): string {
  if (!Array.isArray(videos)) return "";

  const items = videos.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const by720 = items.find((item) =>
    toStringValue(item.quality).toUpperCase().includes("720"),
  );
  const by540 = items.find((item) =>
    toStringValue(item.quality).toUpperCase().includes("540"),
  );
  const fallback = items.find((item) => pickString(item, "url", "video"));

  return pickString(by720 || by540 || fallback, "url", "video", "videoUrl");
}

export function adaptMicrodramaEpisode(
  raw: JsonRecord,
  dramaId: string,
  numericDramaId: number,
): Episode {
  const episodeNumber = toNumber(raw.index) || toNumber(raw.episode) || 1;
  const episodeId = pickString(raw, "id") || String(episodeNumber);
  const isVip = episodeNumber > FREE_EPISODE_LIMIT;

  return {
    id: createStableNumericId(`${dramaId}-${episodeId}`, episodeNumber),
    dramaId: numericDramaId,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: `/api/microdrama/stream?dramaId=${encodeURIComponent(
      dramaId,
    )}&episode=${encodeURIComponent(String(episodeNumber))}&episodeNumber=${episodeNumber}`,
    originalVideoUrl: undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: isVip,
    isVipOnly: isVip,
    sortOrder: episodeNumber,
    thumbnail: undefined,
    microdramaEpisodeId: episodeId,
    microdramaPlayId: String(episodeNumber),
  } as Episode & {
    microdramaEpisodeId?: string;
    microdramaPlayId?: string;
  };
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
      { error: `Failed to load MicroDrama media: ${response.status}`, rawUrl },
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
