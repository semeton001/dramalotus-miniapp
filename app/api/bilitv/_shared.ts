import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";

export const BILITV_BASE_URL =
  "https://captain.sapimu.au/bilitv/api/v1";
export const BILITV_TOKEN = process.env.BILITV_TOKEN?.trim() || "";
export const BILITV_LANG = "id";
export const BILITV_SOURCE_ID = "20";
export const BILITV_SOURCE_NAME = "BiliTV";

export const BILITV_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";
export const BILITV_HOME_MAX_PAGE = 10;
export const BILITV_VIP_MAX_PAGE = 5;

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

export async function fetchBiliTVJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<unknown> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const baseUrl = BILITV_BASE_URL.endsWith("/")
    ? BILITV_BASE_URL
    : `${BILITV_BASE_URL}/`;
  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) url.searchParams.set("lang", BILITV_LANG);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${BILITV_TOKEN}`,
      "User-Agent": BILITV_USER_AGENT,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `BiliTV upstream ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as JsonRecord;

  const hasId = Boolean(item.id || item.dramaId || item.shortId || item.bookId);
  const hasTitle = Boolean(item.title || item.name || item.dramaName || item.bookName);
  const hasPoster = Boolean(
    item.cover || item.poster || item.image || item.thumbnail || item.banner,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractBiliTVItemsDeep(payload: unknown): JsonRecord[] {
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

export function adaptBiliTVDrama(item: JsonRecord, index = 0): Drama {
  const rawId = pickString(item, "id", "dramaId", "shortId", "bookId");
  const numericId = createStableNumericId(rawId || `bilitv-${index}`, index + 1);
  const title =
    pickString(item, "title", "name", "dramaName", "bookName") ||
    `BiliTV ${numericId}`;
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
    posterClass: "",
    category: "Drama",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: index + 1,
    description:
      pickString(item, "description", "intro", "summary", "synopsis") || title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["BiliTV"],
    source: BILITV_SOURCE_NAME,
    sourceId: BILITV_SOURCE_ID,
    sourceName: BILITV_SOURCE_NAME,
    badge: "BiliTV",
    slug: `bilitv-${rawId || numericId}`,
    bilitvRawId: rawId || undefined,
    bilitvDramaId: rawId || undefined,
  } as Drama & {
    bilitvRawId?: string;
    bilitvDramaId?: string;
  };
}

export function dedupeBiliTVDramas(items: Drama[]): Drama[] {
  const seen = new Set<string>();
  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      bilitvRawId?: string;
      bilitvDramaId?: string;
    };

    const key =
      meta.bilitvDramaId ||
      meta.bilitvRawId ||
      drama.slug ||
      `${drama.sourceName || drama.source || "bilitv"}::${drama.title}`;

    if (!key || seen.has(key)) return;
    seen.add(key);
    output.push(drama);
  });

  return output;
}

export function adaptBiliTVDramaList(items: JsonRecord[]): Drama[] {
  return dedupeBiliTVDramas(
    items.map((item, index) => adaptBiliTVDrama(item, index)),
  );
}

export async function enrichBiliTVSubtitleAvailability(
  dramas: Drama[],
): Promise<Drama[]> {
  const checked = await Promise.all(
    dramas.map(async (drama) => {
      const meta = drama as Drama & {
        bilitvRawId?: string;
        bilitvDramaId?: string;
        bilitvNoIndonesianSubtitle?: boolean;
      };

      const dramaId =
        typeof meta.bilitvDramaId === "string" && meta.bilitvDramaId.trim()
          ? meta.bilitvDramaId.trim()
          : typeof meta.bilitvRawId === "string" && meta.bilitvRawId.trim()
            ? meta.bilitvRawId.trim()
            : "";

      if (!dramaId) {
        return {
          ...drama,
          bilitvNoIndonesianSubtitle: true,
        } as Drama & { bilitvNoIndonesianSubtitle: boolean };
      }

      try {
        const vtt = await fetchBiliTVSubtitleVtt(dramaId, "1");
        const hasSubtitle = vtt
          .replace(/^WEBVTT[^\n\r]*(\r?\n)+/i, "")
          .replace(/^\uFEFF/, "")
          .trim().length > 0;

        return {
          ...drama,
          bilitvNoIndonesianSubtitle: !hasSubtitle,
        } as Drama & { bilitvNoIndonesianSubtitle: boolean };
      } catch {
        return {
          ...drama,
          bilitvNoIndonesianSubtitle: true,
        } as Drama & { bilitvNoIndonesianSubtitle: boolean };
      }
    }),
  );

  return checked;
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

export async function buildBiliTVEpisodes(
  dramaId: string,
  numericDramaId: number,
): Promise<Episode[]> {
  const payload = await fetchBiliTVJson(`/drama/${encodeURIComponent(dramaId)}`);
  const record = payload as JsonRecord;
  const episodesRaw = Array.isArray(record.episodes) ? record.episodes : [];

  return episodesRaw
    .filter(
      (item): item is JsonRecord =>
        Boolean(item) && typeof item === "object" && !Array.isArray(item),
    )
    .map((episode, index) => {
      const episodeNumber = toNumber(episode.number, index + 1);
      const episodeId = pickString(episode, "id") || `${dramaId}-${episodeNumber}`;

      return {
        id: createStableNumericId(`${dramaId}-${episodeId}`, episodeNumber),
        dramaId: numericDramaId,
        episodeNumber,
        title: `Episode ${episodeNumber}`,
        videoUrl: `/api/bilitv/stream?miniapp=1&dramaId=${encodeURIComponent(
          dramaId,
        )}&episode=${episodeNumber}&episodeNumber=${episodeNumber}`,
        originalVideoUrl: "",
        subtitleUrl: `/api/bilitv/subtitle?dramaId=${encodeURIComponent(
          dramaId,
        )}&episode=${episodeNumber}`,
        subtitleLang: "id",
        subtitleLabel: "Indonesia",
        isLocked: false,
        isVipOnly: false,
        sortOrder: episodeNumber,
        bilitvEpisodeId: episodeId,
      } as Episode & {
        bilitvEpisodeId?: string;
      };
    })
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export async function resolveBiliTVVideoUrl(
  dramaId: string,
  episode: string,
): Promise<string> {
  const payload = await fetchBiliTVJson(
    `/drama/${encodeURIComponent(dramaId)}/episode/${encodeURIComponent(
      episode,
    )}`,
    { quality: 720 },
  );

  const record = payload as JsonRecord;
  const qualities = record.qualities;

  if (qualities && typeof qualities === "object" && !Array.isArray(qualities)) {
    const qualityRecord = qualities as JsonRecord;
    return (
      pickString(qualityRecord, "1080") ||
      pickString(qualityRecord, "720") ||
      pickString(qualityRecord, "480")
    );
  }

  return pickString(record, "video", "url", "videoUrl", "playUrl");
}

export async function fetchBiliTVSubtitleVtt(
  dramaId: string,
  episode: string,
): Promise<string> {
  const payload = await fetchBiliTVJson(
    `/subtitle/${encodeURIComponent(dramaId)}/${encodeURIComponent(episode)}`,
    { format: "json", lang: BILITV_LANG },
  );

  const record = payload as JsonRecord;
  return pickString(record, "vtt", "subtitle", "text");
}

