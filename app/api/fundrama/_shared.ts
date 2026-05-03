import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

export const FUNDRAMA_BASE_URL = "https://streamapi.web.id/p/fundrama/api/v1";
export const FUNDRAMA_TOKEN =
  "KFKiMIbY3Np8kbimDo7lJDNSVslwF3Fn64cI0TOtqpOP373n58ca6BKzbDsLb7qB";
export const FUNDRAMA_LANG = "id";
export const FUNDRAMA_SOURCE_ID = "13";
export const FUNDRAMA_SOURCE_NAME = "FunDrama";

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

export async function fetchFundramaJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = FUNDRAMA_BASE_URL.endsWith("/")
    ? FUNDRAMA_BASE_URL
    : `${FUNDRAMA_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) url.searchParams.set("lang", FUNDRAMA_LANG);
  if (!url.searchParams.has("token")) url.searchParams.set("token", FUNDRAMA_TOKEN);

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `FunDrama upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;

  const hasId = Boolean(
    item.dshame ||
      item.id ||
      item.dramaId ||
      item.bookId ||
      item.seriesId,
  );
  const hasTitle = Boolean(
    item.nsin ||
      item.title ||
      item.name ||
      item.bookName ||
      item.dramaName,
  );
  const hasPoster = Boolean(
    item.ptear ||
      item.poster ||
      item.cover ||
      item.image ||
      item.coverImage ||
      item.posterImage ||
      item.thumbnail,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractFundramaItemsDeep(payload: unknown): JsonRecord[] {
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
      "btra",
      "list",
      "items",
      "data",
      "ddriv",
      "result",
      "results",
      "records",
      "rows",
      "dramas",
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

export function adaptFundramaDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "dshame", "id", "dramaId", "bookId", "seriesId");
  const numericId = createStableNumericId(
    rawId || `fundrama-${index}`,
    index + 1,
  );
  const title =
    pickString(item, "nsin", "title", "name", "bookName", "dramaName") ||
    `FunDrama ${numericId}`;
  const posterImage = pickString(
    item,
    "ptear",
    "poster",
    "cover",
    "image",
    "coverImage",
    "posterImage",
    "thumbnail",
  );
  const episodes =
    toNumber(item.eshe) ||
    toNumber(item.totalEpisodes) ||
    toNumber(item.total_episodes) ||
    toNumber(item.episodes) ||
    toNumber(item.episodeCount) ||
    0;

  return {
    id: numericId,
    title,
    description:
      pickString(item, "dentra", "description", "intro", "summary", "synopsis") ||
      title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["FunDrama"],
    source: FUNDRAMA_SOURCE_NAME,
    sourceId: FUNDRAMA_SOURCE_ID,
    sourceName: FUNDRAMA_SOURCE_NAME,
    badge: "FunDrama",
    slug: `fundrama-${rawId || numericId}`,
    fundramaRawId: rawId || undefined,
    fundramaDramaId: rawId || undefined,
  } as Drama & {
    fundramaRawId?: string;
    fundramaDramaId?: string;
  };
}

export function dedupeFundramaDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      fundramaRawId?: string;
      fundramaDramaId?: string;
    };

    const key =
      meta.fundramaDramaId ||
      meta.fundramaRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "fundrama"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptFundramaDramaList(items: JsonRecord[]): Drama[] {
  return dedupeFundramaDramas(
    items.map((item, index) => adaptFundramaDrama(item, index)),
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

export function extractFundramaEpisodes(payload: unknown): JsonRecord[] {
  const record = payload as JsonRecord;
  const data = record?.data as JsonRecord | undefined;
  const ddriv = data?.ddriv as JsonRecord | undefined;
  const episodes = ddriv?.eclim;

  return Array.isArray(episodes) ? (episodes as JsonRecord[]) : [];
}

function pickBestVideoUrl(qualities: unknown): string {
  if (!Array.isArray(qualities)) return "";

  const items = qualities.filter(
    (item): item is JsonRecord =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );

  const by720 = items.find((item) =>
    toStringValue(item.Dspee).toUpperCase().includes("720"),
  );
  const by540 = items.find((item) =>
    toStringValue(item.Dspee).toUpperCase().includes("540"),
  );
  const fallback = items.find((item) => pickString(item, "Mbrie", "Bcance"));

  return pickString(by720 || by540 || fallback, "Mbrie", "Bcance", "url");
}

export function adaptFundramaEpisode(
  raw: JsonRecord,
  dramaId: string,
  numericDramaId: number,
): Episode {
  const episodeNumber = toNumber(raw.erev) || toNumber(raw.episode) || 1;
  const episodeId =
    pickString(raw, "esecur", "vticke", "id") || String(episodeNumber);
  const videoUrl = pickBestVideoUrl(raw.ptitl);
  const isVip = false;

  return {
    id: createStableNumericId(`${dramaId}-${episodeId}`, episodeNumber),
    dramaId: numericDramaId,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: videoUrl
      ? `/api/fundrama/stream?url=${encodeURIComponent(videoUrl)}`
      : `/api/fundrama/stream?dramaId=${encodeURIComponent(
          dramaId,
        )}&episode=${encodeURIComponent(String(episodeNumber))}`,
    originalVideoUrl: videoUrl || undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: isVip,
    isVipOnly: isVip,
    sortOrder: episodeNumber,
    thumbnail: undefined,
    fundramaEpisodeId: episodeId,
    fundramaPlayId: String(episodeNumber),
  } as Episode & {
    fundramaEpisodeId?: string;
    fundramaPlayId?: string;
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
      { error: `Failed to load FunDrama media: ${response.status}`, rawUrl },
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
