import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

export const DRAMABITE_BASE_URL =
  "https://streamapi.web.id/p/dramabite/api/v1";
export const DRAMABITE_TOKEN =
  "KFKiMIbY3Np8kbimDo7lJDNSVslwF3Fn64cI0TOtqpOP373n58ca6BKzbDsLb7qB";
export const DRAMABITE_LANG = "id";
export const DRAMABITE_SOURCE_ID = "13";
export const DRAMABITE_SOURCE_NAME = "DramaBite";

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
    const value = record[key];
    const picked = toStringValue(value);
    if (picked) return picked;
  }
  return "";
}

export async function fetchDramabiteJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = DRAMABITE_BASE_URL.endsWith("/")
    ? DRAMABITE_BASE_URL
    : `${DRAMABITE_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", DRAMABITE_LANG);
  }

  if (!url.searchParams.has("token")) {
    url.searchParams.set("token", DRAMABITE_TOKEN);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `DramaBite upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;
  return Boolean(
    item.id ||
      item.dramaId ||
      item.drama_id ||
      item.title ||
      item.name ||
      item.cover ||
      item.poster ||
      item.image ||
      item.episodes,
  );
}

export function extractDramabiteItemsDeep(payload: unknown): JsonRecord[] {
  const seen = new Set<unknown>();

  const walk = (value: unknown): JsonRecord[] => {
    if (!value || typeof value !== "object" || seen.has(value)) return [];
    seen.add(value);

    if (Array.isArray(value)) {
      if (value.some(looksLikeDrama)) {
        return value.filter(looksLikeDrama) as JsonRecord[];
      }
      return value.flatMap(walk);
    }

    const record = value as JsonRecord;
    const priorityKeys = [
      "items",
      "list",
      "records",
      "rows",
      "data",
      "result",
      "results",
      "dramas",
      "series",
      "videos",
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

function createStableNumericId(value: string, fallback = 0): number {
  const direct = Number(value);
  if (Number.isFinite(direct) && direct > 0) return direct;

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash || fallback;
}

export function adaptDramabiteDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "id", "dramaId", "drama_id", "bookId");
  const numericId = createStableNumericId(rawId || `dramabite-${index}`, index + 1);
  const title =
    pickString(item, "title", "name", "dramaName", "bookName") ||
    `DramaBite ${numericId}`;
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
    toNumber(item.episodes) ||
    toNumber(item.episodeCount) ||
    toNumber(item.chapterCount) ||
    toNumber(item.totalEpisodes) ||
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
    tags: ["DramaBite"],
    source: DRAMABITE_SOURCE_NAME,
    sourceId: DRAMABITE_SOURCE_ID,
    sourceName: DRAMABITE_SOURCE_NAME,
    badge: "DramaBite",
    slug: `dramabite-${rawId || numericId}`,
    dramabiteRawId: rawId || undefined,
    dramabiteDramaId: rawId || undefined,
  } as Drama & {
    dramabiteRawId?: string;
    dramabiteDramaId?: string;
  };
}

export function dedupeDramabiteDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      dramabiteRawId?: string;
      dramabiteDramaId?: string;
    };
    const key =
      meta.dramabiteDramaId ||
      meta.dramabiteRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "dramabite"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptDramabiteDramaList(items: JsonRecord[]): Drama[] {
  return dedupeDramabiteDramas(
    items.map((item, index) => adaptDramabiteDrama(item, index)),
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

export function adaptDramabiteEpisode(
  detailEpisode: JsonRecord,
  dramaId: string,
): Episode {
  const episodeNumber =
    toNumber(detailEpisode.number) || toNumber(detailEpisode.id) || 1;
  const episodeId = toStringValue(detailEpisode.id, String(episodeNumber));
  const title =
    pickString(detailEpisode, "title", "name") || `Episode ${episodeNumber}`;

  return {
    id: createStableNumericId(`${dramaId}-${episodeId}`, episodeNumber),
    dramaId: createStableNumericId(dramaId),
    episodeNumber,
    title,
    videoUrl: `/api/dramabite/stream?dramaId=${encodeURIComponent(
      dramaId,
    )}&episode=${encodeURIComponent(String(episodeNumber))}`,
    originalVideoUrl: undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: episodeNumber >= 10,
    isVipOnly: episodeNumber >= 10,
    sortOrder: episodeNumber,
    thumbnail: undefined,
    dramabiteEpisodeId: episodeId,
    dramabitePlayId: episodeId,
  } as Episode & {
    dramabiteEpisodeId?: string;
    dramabitePlayId?: string;
  };
}

export function rewriteM3u8Playlist(
  playlistText: string,
  proxyBaseUrl: string,
  playlistUrl: string,
): string {
  const base = new URL(playlistUrl);

  return playlistText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        if (trimmed.startsWith("#EXT-X-KEY") && trimmed.includes('URI="')) {
          return trimmed.replace(/URI="([^"]+)"/g, (_, uri: string) => {
            const absolute = new URL(uri, base).toString();
            return `URI="${proxyBaseUrl}?url=${encodeURIComponent(absolute)}"`;
          });
        }
        return line;
      }

      const absolute = new URL(trimmed, base).toString();
      return `${proxyBaseUrl}?url=${encodeURIComponent(absolute)}`;
    })
    .join("\n");
}

export function buildProxyBaseUrl(request: NextRequest): string {
  return `${request.nextUrl.origin}/api/dramabite/stream`;
}

export function normalizeProxyPlaylistUrls(
  playlistText: string,
  request: NextRequest,
): string {
  const origin = request.nextUrl.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return playlistText
    .replace(new RegExp(`${origin}/api/dramabite/stream\\?url=`, "g"), "/api/dramabite/stream?url=")
    .replace(/http:\/\/localhost:\d+\/api\/dramabite\/stream\?url=/g, "/api/dramabite/stream?url=")
    .replace(/https?:\/\/127\.0\.0\.1:\d+\/api\/dramabite\/stream\?url=/g, "/api/dramabite/stream?url=");
}
