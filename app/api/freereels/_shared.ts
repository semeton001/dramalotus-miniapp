import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

const API_BASE =
  process.env.FREEREELS_API_BASE?.trim() ||
  "https://drakula.dramabos.my.id/api/freereels";

const DEFAULT_LANG = process.env.FREEREELS_LANG?.trim() || "id";
const DEFAULT_CODE = process.env.FREEREELS_CODE?.trim() || "";

type JsonRecord = Record<string, unknown>;

type FreeReelsPlayResponse = {
  success?: boolean;
  data?: unknown;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function pickString(raw: JsonRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
}

function pickNumber(raw: JsonRecord, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[|,/]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function flattenDramaCandidates(data: unknown): unknown[] {
  const list = extractList(data);
  const result: unknown[] = [];

  for (const item of list) {
    const raw = isRecord(item) ? item : {};

    // popular / foryou: drama ada di field `series`
    if (isRecord(raw.series)) {
      result.push(raw.series);
      continue;
    }

    // home: ada module card, dramanya ada di module_card.items
    if (isRecord(raw.module_card) && Array.isArray(raw.module_card.items)) {
      result.push(...raw.module_card.items);
      continue;
    }

    // item biasa
    result.push(raw);
  }

  return result;
}

export function getFreeReelsApiBase(): string {
  return API_BASE.replace(/\/+$/, "");
}

export function getFreeReelsLang(): string {
  return DEFAULT_LANG;
}

export function getFreeReelsCode(): string {
  return DEFAULT_CODE;
}

export function ensureFreeReelsCode(code?: string | null): string {
  const resolved =
    typeof code === "string" && code.trim() ? code.trim() : getFreeReelsCode();
  if (!resolved) {
    throw new Error("FREEREELS_CODE belum di-set di environment.");
  }
  return resolved;
}

export function buildApiUrl(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): string {
  const url = new URL(`${getFreeReelsApiBase()}${path}`);
  url.searchParams.set("lang", getFreeReelsLang());
  url.searchParams.set("code", ensureFreeReelsCode());

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export async function fetchFreeReelsJson<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : `FreeReels request gagal. status=${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!isRecord(data)) return [];

  const direct = [
    data.data,
    data.items,
    data.results,
    data.list,
    data.rows,
    data.books,
    data.drama_list,
    data.dramaList,
    data.records,
  ];

  for (const candidate of direct) {
    if (Array.isArray(candidate)) return candidate;
  }

  if (isRecord(data.data)) {
    const level2 = data.data as JsonRecord;

    const nested = [
      level2.items,
      level2.results,
      level2.list,
      level2.rows,
      level2.books,
      level2.drama_list,
      level2.dramaList,
      level2.records,
      level2.data, // penting
    ];

    for (const candidate of nested) {
      if (Array.isArray(candidate)) return candidate;
    }

    if (isRecord(level2.data)) {
      const level3 = level2.data as JsonRecord;

      const deeper = [
        level3.items,
        level3.results,
        level3.list,
        level3.rows,
        level3.books,
        level3.drama_list,
        level3.dramaList,
        level3.records,
      ];

      for (const candidate of deeper) {
        if (Array.isArray(candidate)) return candidate;
      }
    }
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

export function toDrama(item: unknown, index = 0, badge = "FreeReels"): Drama {
  const raw = isRecord(item) ? item : {};

  const dramaId = pickString(
    raw,
    "key",
    "id",
    "dramaId",
    "drama_id",
    "bookId",
    "book_id",
    "series_id",
    "seriesId",
  );

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

  const cover = pickString(
    raw,
    "cover",
    "coverImage",
    "cover_image",
    "poster",
    "posterImage",
    "poster_image",
    "image",
    "imageUrl",
    "image_url",
    "thumbnail",
    "thumb",
  );

  const description = pickString(
    raw,
    "desc",
    "description",
    "summary",
    "synopsis",
    "intro",
    "introduction",
  );

  const tags = Array.from(
    new Set([
      ...normalizeStringArray(raw.tag),
      ...normalizeStringArray(raw.series_tag),
      ...normalizeStringArray(raw.content_tags),
      ...normalizeStringArray(raw.content_detail_tags),
      ...normalizeStringArray(raw.category),
      ...normalizeStringArray(raw.genre),
      "Drama",
    ]),
  )
    .filter(Boolean)
    .slice(0, 8);

  const numericFallback =
    pickNumber(
      raw,
      "series_id",
      "seriesId",
      "numericDramaId",
      "numeric_drama_id",
    ) || index + 1;

  const numericId = createStableNumericId(
    dramaId || `${title}-${index}`,
    numericFallback,
  );

  return {
    id: numericId,
    source: "FreeReels",
    sourceId: "11",
    sourceName: "FreeReels",
    title,
    episodes: pickNumber(
      raw,
      "episode_count",
      "episodeCount",
      "episodes",
      "upload_num",
      "chapterCount",
    ),
    badge,
    tags,
    posterClass: "from-[#102A2A] via-[#12131A] to-[#090B12]",
    slug: `freereels-${dramaId || numericId}`,
    description,
    coverImage: cover || undefined,
    posterImage: cover || undefined,
    category: badge === "ForYou" ? "ForYou" : "Drama",
    language: "id",
    country: undefined,
    isNew: badge === "Baru" || badge === "Beranda",
    isDubbed: title.toLowerCase().includes("sulih suara"),
    isTrending: badge === "Populer" || badge === "ForYou",
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    freereelsRawId: dramaId || undefined,
    freereelsDramaId: dramaId || undefined,
    freereelsCode: getFreeReelsCode() || undefined,
  };
}

export function toDramaList(data: unknown, badge = "FreeReels"): Drama[] {
  return flattenDramaCandidates(data)
    .map((item, index) => toDrama(item, index, badge))
    .filter((item) =>
      Boolean(item.freereelsDramaId && item.title && item.posterImage),
    );
}

export function toDetailDrama(data: unknown): Drama {
  const raw = isRecord(data) ? (isRecord(data.data) ? data.data : data) : {};
  return toDrama(raw, 0, "FreeReels");
}

function resolveSubtitleEntry(value: unknown): JsonRecord | null {
  if (!Array.isArray(value)) return null;

  const normalized = value.filter(isRecord);
  const preferred = normalized.find((entry) => {
    const language = pickString(
      entry,
      "language",
      "lang",
      "locale",
    ).toLowerCase();
    const displayName = pickString(
      entry,
      "display_name",
      "displayName",
      "name",
      "label",
    ).toLowerCase();

    return (
      language === "id-id" ||
      language === "id" ||
      language.includes("indonesia") ||
      displayName === "indonesia" ||
      displayName.includes("indonesia")
    );
  });

  return preferred || normalized[0] || null;
}

export function toEpisode(
  item: unknown,
  numericDramaId: number,
  dramaId: string,
  code?: string,
): Episode {
  const raw = isRecord(item) ? item : {};

  const episodeId = pickString(raw, "id", "episodeId", "episode_id");
  const epNumber =
    pickNumber(raw, "episode", "episodeNumber", "ep", "sort", "seq") || 1;
  const title = pickString(raw, "name", "title") || `Episode ${epNumber}`;
  const subtitleEntry = resolveSubtitleEntry(
    Array.isArray(raw.subtitles) ? raw.subtitles : raw.subtitle_list,
  );
  const subtitleVtt = subtitleEntry
    ? pickString(subtitleEntry, "vtt", "subtitle", "url", "src")
    : "";
  const subtitleLanguage = subtitleEntry
    ? pickString(subtitleEntry, "language", "lang", "locale") || "id-ID"
    : "id-ID";
  const subtitleLabel = subtitleEntry
    ? pickString(
        subtitleEntry,
        "display_name",
        "displayName",
        "name",
        "label",
      ) || "Indonesia"
    : "Indonesia";

  const streamResolver = `/api/freereels/stream?dramaId=${encodeURIComponent(dramaId)}&episodeId=${encodeURIComponent(String(epNumber))}&code=${encodeURIComponent(code || "")}`;
  const subtitleProxy = subtitleVtt
    ? `/api/freereels/subtitle?url=${encodeURIComponent(subtitleVtt)}`
    : "";

  return {
    id: createStableNumericId(`${dramaId}:${episodeId || epNumber}`, epNumber),
    dramaId: numericDramaId,
    episodeNumber: epNumber,
    title,
    duration: "",
    slug: `freereels-${dramaId}-ep-${epNumber}`,
    description: "",
    thumbnail:
      pickString(raw, "cover", "coverImage", "cover_image") || undefined,
    videoUrl: streamResolver,
    originalVideoUrl: "",
    isLocked: !Boolean(raw.free),
    isVipOnly: !Boolean(raw.free),
    sortOrder: epNumber,
    subtitleUrl: subtitleProxy || undefined,
    subtitleLang: subtitleLanguage || "id-ID",
    subtitleLabel: subtitleLabel || "Indonesia",
    freereelsEpisodeId: episodeId || undefined,
    freereelsPlayId: String(epNumber),
    freereelsCode: code || getFreeReelsCode() || undefined,
  };
}

export function toEpisodes(
  data: unknown,
  numericDramaId: number,
  dramaId: string,
  code?: string,
): Episode[] {
  const root = isRecord(data) ? data : {};
  const rawEpisodes = Array.isArray(root.episodes)
    ? root.episodes
    : Array.isArray(root.data)
      ? root.data
      : extractList(data);

  return rawEpisodes
    .map((item) => toEpisode(item, numericDramaId, dramaId, code))
    .sort((a, b) => (a.episodeNumber || 0) - (b.episodeNumber || 0));
}

export async function resolvePlayData(
  dramaId: string,
  episodeId: string | number,
  code?: string,
): Promise<JsonRecord> {
  const playUrl = buildApiUrl(
    `/drama/${encodeURIComponent(dramaId)}/play/${encodeURIComponent(String(episodeId))}`,
    {
      code: code || getFreeReelsCode(),
    },
  );

  const json = await fetchFreeReelsJson<FreeReelsPlayResponse>(playUrl);
  const payload = isRecord(json.data)
    ? json.data
    : isRecord(json)
      ? json
      : null;

  if (!payload) {
    throw new Error("Payload play FreeReels tidak valid.");
  }

  return payload;
}

export function resolvePlayableUrl(payload: JsonRecord): string {
  const direct = pickString(payload, "video_url", "m3u8_url", "m3u8");
  if (direct) return direct;

  const externalH264 = pickString(payload, "external_audio_h264_m3u8");
  if (externalH264) return externalH264;

  const externalH265 = pickString(payload, "external_audio_h265_m3u8");
  if (externalH265) return externalH265;

  const external = pickString(payload, "external_audio_url");
  if (external) return external;

  return "";
}

export function getSubtitleProxyFromPlayPayload(payload: JsonRecord): string {
  const entry = resolveSubtitleEntry(
    Array.isArray(payload.subtitles)
      ? payload.subtitles
      : payload.subtitle_list,
  );
  if (!entry) return "";
  const vtt = pickString(entry, "vtt", "subtitle", "url", "src");
  if (!vtt) return "";
  return `/api/freereels/subtitle?url=${encodeURIComponent(vtt)}`;
}

export type FreeReelsFeedPayload = {
  items: Drama[];
  hasNextPage: boolean;
  page: number;
};

export function inferHasNextPage(
  items: Drama[],
  opts: { pageSize?: number; alwaysTrueWhenItems?: boolean } = {},
): boolean {
  const pageSize = opts.pageSize ?? 20;
  if (opts.alwaysTrueWhenItems) return items.length > 0;
  return items.length >= pageSize;
}

export function toFeedPayload(
  items: Drama[],
  page: number,
  hasNextPage: boolean,
): FreeReelsFeedPayload {
  return {
    items,
    hasNextPage,
    page,
  };
}

export function jsonFeed(items: Drama[], page: number, hasNextPage: boolean) {
  return {
    items,
    hasNextPage,
    page,
  };
}
