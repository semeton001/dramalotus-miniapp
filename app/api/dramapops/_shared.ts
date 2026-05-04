import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";

export const DRAMAPOPS_BASE_URL =
  "https://streamapi.web.id/p/dramapops/api/v1";
export const DRAMAPOPS_TOKEN = process.env.DRAMAPOPS_TOKEN?.trim() || "";
export const DRAMAPOPS_LANG = "id";
export const DRAMAPOPS_SOURCE_ID = "18";
export const DRAMAPOPS_SOURCE_NAME = "Dramapops";

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

export async function fetchDramapopsJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = DRAMAPOPS_BASE_URL.endsWith("/")
    ? DRAMAPOPS_BASE_URL
    : `${DRAMAPOPS_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) url.searchParams.set("lang", DRAMAPOPS_LANG);
  if (!url.searchParams.has("token")) url.searchParams.set("token", DRAMAPOPS_TOKEN);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Dramapops upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;

  const hasId = Boolean(
    item.id ||
      item.movieId ||
      item.dramaId ||
      item.bookId ||
      item.seriesId,
  );
  const hasTitle = Boolean(
    item.title ||
      item.name ||
      item.bookName ||
      item.dramaName ||
      item.movieName,
  );
  const hasPoster = Boolean(
    item.poster ||
      item.cover ||
      item.image ||
      item.thumbnail ||
      item.coverImage ||
      item.posterImage,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractDramapopsItemsDeep(payload: unknown): JsonRecord[] {
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
      "data",
      "dramas",
      "list",
      "items",
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

export function adaptDramapopsDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "id", "movieId", "dramaId", "bookId", "seriesId");
  const numericId = createStableNumericId(rawId || `dramapops-${index}`, index + 1);
  const title =
    pickString(item, "title", "name", "bookName", "dramaName", "movieName") ||
    `Dramapops ${numericId}`;
  const posterImage = pickString(
    item,
    "poster",
    "cover",
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
    toNumber(item.totalEpisode) ||
    0;

  return {
    id: numericId,
    title,
    description:
      pickString(item, "description", "intro", "summary", "synopsis") || title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["Dramapops"],
    source: DRAMAPOPS_SOURCE_NAME,
    sourceId: DRAMAPOPS_SOURCE_ID,
    sourceName: DRAMAPOPS_SOURCE_NAME,
    badge: "Dramapops",
    slug: `dramapops-${rawId || numericId}`,
    dramapopsRawId: rawId || undefined,
    dramapopsMovieId: rawId || undefined,
  } as Drama & {
    dramapopsRawId?: string;
    dramapopsMovieId?: string;
  };
}

export function dedupeDramapopsDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      dramapopsRawId?: string;
      dramapopsMovieId?: string;
    };

    const key =
      meta.dramapopsMovieId ||
      meta.dramapopsRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "dramapops"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptDramapopsDramaList(items: JsonRecord[]): Drama[] {
  return dedupeDramapopsDramas(
    items.map((item, index) => adaptDramapopsDrama(item, index)),
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

function pickBestVideoUrl(payload: unknown): string {
  const record = payload as JsonRecord;
  const data = record?.data as JsonRecord | undefined;

  const direct =
    pickString(data, "video", "videoUrl", "url", "playUrl", "video_path") ||
    pickString(record, "video", "videoUrl", "url", "playUrl", "video_path");

  if (direct) return direct;

  const qualities = (data?.videos || data?.videoInfoList || data?.qualities) as unknown;
  if (!Array.isArray(qualities)) return "";

  const items = qualities.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const by720 = items.find((item) =>
    toStringValue(item.quality).toLowerCase().includes("720"),
  );
  const by540 = items.find((item) =>
    toStringValue(item.quality).toLowerCase().includes("540"),
  );
  const fallback = items.find((item) => pickString(item, "url", "video", "videoUrl"));

  return pickString(by720 || by540 || fallback, "url", "video", "videoUrl", "playUrl");
}

function pickSubtitle(payload: unknown) {
  const data = (payload as JsonRecord)?.data as JsonRecord | undefined;
  const subtitles = data?.subtitles;

  if (!Array.isArray(subtitles)) return {};

  const items = subtitles.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const idSubtitle =
    items.find((item) => toStringValue(item.language).toLowerCase() === "ind-id") ||
    items.find((item) => toStringValue(item.language).toLowerCase().includes("ind")) ||
    items.find((item) => toStringValue(item.language).toLowerCase().includes("id"));

  const picked = idSubtitle || items[0];
  const url = pickString(picked, "url");
  const lang = pickString(picked, "language") || "id-ID";

  return url
    ? {
        subtitleUrl: `/api/dramapops/subtitle?url=${encodeURIComponent(url)}&v=4`,
        subtitleLang: lang,
        subtitleLabel: lang,
      }
    : {};
}

export async function buildDramapopsEpisode(
  movieId: string,
  episodeNumber: number,
  numericDramaId: number,
): Promise<Episode> {
  const payload = await fetchDramapopsJson(
    `/drama/${encodeURIComponent(movieId)}/episode/${episodeNumber}/video`,
    { quality: "720p" },
  );

  const data = (payload as JsonRecord)?.data as JsonRecord | undefined;
  const subtitle = pickSubtitle(payload);
  const isVip = episodeNumber > FREE_EPISODE_LIMIT;
  const title = `Episode ${episodeNumber}`;

  return {
    id: createStableNumericId(`${movieId}-${episodeNumber}`, episodeNumber),
    dramaId: numericDramaId,
    episodeNumber,
    title,
    videoUrl: `/api/dramapops/stream?movieId=${encodeURIComponent(
      movieId,
    )}&episode=${episodeNumber}&episodeNumber=${episodeNumber}`,
    originalVideoUrl: undefined,
    isLocked: isVip,
    isVipOnly: isVip,
    sortOrder: episodeNumber,
    thumbnail: pickString(data, "poster") || undefined,
    ...subtitle,
    dramapopsEpisodeId: String(episodeNumber),
    dramapopsPlayId: String(episodeNumber),
  } as Episode & {
    dramapopsEpisodeId?: string;
    dramapopsPlayId?: string;
  };
}

export async function buildDramapopsEpisodes(
  movieId: string,
  numericDramaId: number,
): Promise<Episode[]> {
  const maxEpisodes = 120;
  const batchSize = 12;
  const output: Episode[] = [];
  let consecutiveMisses = 0;

  for (let startEpisode = 1; startEpisode <= maxEpisodes; startEpisode += batchSize) {
    const episodeNumbers = Array.from(
      { length: batchSize },
      (_, index) => startEpisode + index,
    ).filter((episode) => episode <= maxEpisodes);

    const batch = await Promise.all(
      episodeNumbers.map(async (episode) => {
        try {
          const item = await buildDramapopsEpisode(
            movieId,
            episode,
            numericDramaId,
          );

          return item.videoUrl ? item : null;
        } catch {
          return null;
        }
      }),
    );

    for (const item of batch) {
      if (item) {
        output.push(item);
        consecutiveMisses = 0;
      } else {
        consecutiveMisses += 1;
      }
    }

    const lastEpisodeInBatch = episodeNumbers[episodeNumbers.length - 1] || 0;

    if (lastEpisodeInBatch >= 10 && consecutiveMisses >= 3) {
      break;
    }
  }

  return output.sort((a, b) => a.episodeNumber - b.episodeNumber);
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
      { error: `Failed to load Dramapops media: ${response.status}`, rawUrl },
      { status: response.status },
    );
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    response.headers.get("content-type") || "video/mp4",
  );
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
