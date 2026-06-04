import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";

export const DRAMANOVA_BASE_URL =
  "https://captain.sapimu.au/dramanova/api/v1";

export const DRAMANOVA_VIDEO_BASE_URL =
  "https://captain.sapimu.au/dramanova/api/video";
export const DRAMANOVA_TOKEN = process.env.DRAMANOVA_TOKEN?.trim() || "";
export const DRAMANOVA_LANG = "in";
export const DRAMANOVA_SOURCE_ID = "19";
export const DRAMANOVA_SOURCE_NAME = "DramaNova";

export const DRAMANOVA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

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

export async function fetchDramaNovaJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = DRAMANOVA_BASE_URL.endsWith("/")
    ? DRAMANOVA_BASE_URL
    : `${DRAMANOVA_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) url.searchParams.set("lang", DRAMANOVA_LANG);
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${DRAMANOVA_TOKEN}`,
      "User-Agent": DRAMANOVA_USER_AGENT,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `DramaNova upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

async function fetchDramaNovaVideoJson(fileId: string): Promise<unknown> {
  const url = new URL(DRAMANOVA_VIDEO_BASE_URL);
  url.searchParams.set("id", fileId);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${DRAMANOVA_TOKEN}`,
      "User-Agent": DRAMANOVA_USER_AGENT,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `DramaNova video upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;

  const hasId = Boolean(item.id || item.dramaId || item.movieId || item.bookId);
  const hasTitle = Boolean(item.title || item.name || item.dramaName || item.bookName);
  const hasPoster = Boolean(
    item.cover || item.poster || item.image || item.thumbnail || item.banner,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractDramaNovaItemsDeep(payload: unknown): JsonRecord[] {
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

export function adaptDramaNovaDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "id", "dramaId", "movieId", "bookId");
  const numericId = createStableNumericId(rawId || `dramanova-${index}`, index + 1);
  const title =
    pickString(item, "title", "name", "dramaName", "bookName") ||
    `DramaNova ${numericId}`;
  const posterImage = pickString(
    item,
    "cover",
    "poster",
    "image",
    "thumbnail",
    "banner",
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
    description:
      pickString(item, "description", "intro", "summary", "synopsis") || title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["DramaNova"],
    source: DRAMANOVA_SOURCE_NAME,
    sourceId: DRAMANOVA_SOURCE_ID,
    sourceName: DRAMANOVA_SOURCE_NAME,
    badge: "DramaNova",
    slug: `dramanova-${rawId || numericId}`,
    dramanovaRawId: rawId || undefined,
    dramanovaDramaId: rawId || undefined,
  } as Drama & {
    dramanovaRawId?: string;
    dramanovaDramaId?: string;
  };
}

export function dedupeDramaNovaDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      dramanovaRawId?: string;
      dramanovaDramaId?: string;
    };

    const key =
      meta.dramanovaDramaId ||
      meta.dramanovaRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "dramanova"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptDramaNovaDramaList(items: JsonRecord[]): Drama[] {
  return dedupeDramaNovaDramas(
    items.map((item, index) => adaptDramaNovaDrama(item, index)),
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
  const videos = record?.videos;

  if (!Array.isArray(videos)) {
    return pickString(record, "main_url", "backup_url", "url", "videoUrl", "playUrl");
  }

  const items = videos.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const by1080 = items.find((item) =>
    toStringValue(item.definition).toLowerCase().includes("1080"),
  );

  const by720 = items.find(
    (item) =>
      toStringValue(item.definition).toLowerCase().includes("720") ||
      toStringValue(item.quality).toLowerCase().includes("normal"),
  );

  const fallback = items.find(
    (item) => pickString(item, "main_url", "backup_url"),
  );

  return pickString(
    by1080 || by720 || fallback,
    "main_url",
    "backup_url",
    "url",
  );
}

function pickSubtitleFromEpisode(episode: JsonRecord) {
  const subtitles = episode.subtitles;

  if (!Array.isArray(subtitles)) return {};

  const items = subtitles.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const picked =
    items.find((item) => toStringValue(item.lang).toLowerCase() === "in") ||
    items.find((item) => toStringValue(item.lang).toLowerCase().includes("id")) ||
    items[0];

  const url = pickString(picked, "url", "label");
  const lang = pickString(picked, "lang") || "id-ID";

  return url
    ? {
        subtitleUrl: `/api/dramanova/subtitle?url=${encodeURIComponent(url)}`,
        subtitleLang: lang,
        subtitleLabel: "Indonesia",
      }
    : {};
}

export async function buildDramaNovaEpisodes(
  dramaId: string,
  numericDramaId: number,
): Promise<Episode[]> {
  const payload = await fetchDramaNovaJson(`/drama/${encodeURIComponent(dramaId)}`);
  const record = payload as JsonRecord;
  const episodesRaw = Array.isArray(record.episodes) ? record.episodes : [];

  const episodes = episodesRaw
    .filter(
      (item): item is JsonRecord =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((episode, index) => {
      const episodeNumber = toNumber(episode.number, index + 1);
      const episodeId = pickString(episode, "id") || `${dramaId}-${episodeNumber}`;
      const fileId = pickString(episode, "fileId");
            const subtitle = pickSubtitleFromEpisode(episode);

      return {
        id: createStableNumericId(episodeId, episodeNumber),
        dramaId: numericDramaId,
        episodeNumber,
        title: `Episode ${episodeNumber}`,
        videoUrl: fileId
          ? `/api/dramanova/stream?miniapp=1&fileId=${encodeURIComponent(
              fileId,
            )}&episodeNumber=${episodeNumber}`
          : "",
        originalVideoUrl: "",
        isLocked: false,
        isVipOnly: false,
        sortOrder: episodeNumber,
        thumbnail: pickString(episode, "cover") || undefined,
        ...subtitle,
        dramanovaEpisodeId: episodeId,
        dramanovaFileId: fileId || undefined,
      } as Episode & {
        dramanovaEpisodeId?: string;
        dramanovaFileId?: string;
      };
    })
    .filter((episode) => episode.videoUrl)
    .sort((a, b) => a.episodeNumber - b.episodeNumber);

  return episodes;
}

export async function resolveDramaNovaVideoUrl(fileId: string): Promise<string> {
  const payload = await fetchDramaNovaVideoJson(fileId);
  return pickBestVideoUrl(payload);
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
      { error: `Failed to load DramaNova media: ${response.status}` },
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
