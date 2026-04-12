import { NextRequest } from "next/server";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

export const IDRAMA_BASE_URL = "https://idrama.dramabos.my.id";
export const IDRAMA_DEFAULT_LANG = "id";
export const IDRAMA_DEFAULT_CODE = "4D96F22760EA30FB0FFBA9AA87A979A6";
export const IDRAMA_POPULAR_SECTION_ID = "section_d327e331";
export const IDRAMA_HOT_TAB_ID = "channel_ddbdbcef";

type JsonRecord = Record<string, unknown>;

export function pickString(raw: JsonRecord, ...keys: string[]): string {
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

export function pickNumber(raw: JsonRecord, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object") {
          const raw = entry as JsonRecord;
          return pickString(raw, "tag_local", "title", "name").trim();
        }
        return "";
      })
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

  let value = 17;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

export function extractDramaIdFromRoutePath(routePath: string): string {
  const match =
    routePath.match(/short_series_id=(\d+)/i) ||
    routePath.match(/\/drama\/(\d+)/i) ||
    routePath.match(/\/book\/(\d+)/i);

  return match?.[1] ?? "";
}

function looksLikeIdramaDramaItem(raw: JsonRecord): boolean {
  const directId = pickString(
    raw,
    "id",
    "short_play_id",
    "shortPlayId",
    "dramaId",
    "drama_id",
    "series_id",
    "short_series_id",
  );

  const routePath = pickString(raw, "route_path", "open_method", "jump_url");
  const routeDramaId = extractDramaIdFromRoutePath(routePath);

  const hasDramaId = !!(directId || routeDramaId);
  const hasDramaTitle = !!pickString(
    raw,
    "short_play_name",
    "book_name",
    "drama_name",
    "title",
    "name",
  );
  const hasArtwork = !!pickString(
    raw,
    "cover_url",
    "compress_cover_url",
    "image",
    "pic",
    "poster",
    "thumb",
  );
  const hasEpisodeInfo =
    pickNumber(raw, "current_count", "total_count", "episode_count", "episodes") > 0;

  return hasDramaId && (hasDramaTitle || hasArtwork || hasEpisodeInfo);
}

export async function fetchIdramaJson(
  path: string,
  params?: Record<string, string | number | undefined>,
  init?: RequestInit,
) {
  const url = new URL(path, `${IDRAMA_BASE_URL}/`);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", IDRAMA_DEFAULT_LANG);
  }

  const response = await fetch(url.toString(), {
    ...init,
    headers: {
      Accept: "application/json, text/plain, */*",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`iDrama request failed: ${response.status} ${url.pathname}`);
  }

  return response.json();
}

export function adaptIdramaDrama(
  item: unknown,
  index: number,
  badge = "iDrama",
): Drama | null {
  if (!item || typeof item !== "object") return null;

  const raw = item as JsonRecord;

  if (!looksLikeIdramaDramaItem(raw)) return null;

  const explicitDramaId = pickString(
    raw,
    "id",
    "short_play_id",
    "shortPlayId",
    "dramaId",
    "drama_id",
    "series_id",
    "short_series_id",
  );

  const routePath = pickString(raw, "route_path", "open_method", "jump_url");
  const routeVal = pickString(raw, "route_val", "target_id");
  const routeDramaId = extractDramaIdFromRoutePath(routePath) || routeVal;

  const dramaId = explicitDramaId || routeDramaId;
  if (!dramaId) return null;

  const numericId = createStableNumericId(dramaId, Date.now() + index);

  const title =
    pickString(
      raw,
      "short_play_name",
      "title",
      "name",
      "book_name",
      "drama_name",
    ) || "Tanpa Judul";

  const coverImage =
    pickString(
      raw,
      "cover_url",
      "compress_cover_url",
      "image",
      "pic",
      "poster",
      "thumb",
    ) || undefined;

  const description =
    pickString(raw, "introduction", "desc", "summary", "description") || "";

  const tags = Array.from(
    new Set([
      ...normalizeStringArray(raw["category_tag"]),
      ...normalizeStringArray(raw["content_tag"]),
      ...normalizeStringArray(raw["tags"]),
      "Drama",
    ]),
  ).slice(0, 8);

  const totalEpisodes = pickNumber(
    raw,
    "current_count",
    "total_count",
    "episode_count",
    "episodes",
  );

  const code = pickString(raw, "code");

  return {
    id: numericId,
    source: "iDrama",
    sourceId: "8",
    sourceName: "iDrama",
    title,
    episodes: totalEpisodes,
    badge,
    tags,
    posterClass: "from-[#0F172A] via-[#111827] to-[#020617]",
    slug: `idrama-${dramaId}`,
    description,
    coverImage,
    posterImage: coverImage,
    category: "Drama",
    language: "id",
    country: undefined,
    isNew: false,
    isDubbed: false,
    isTrending: badge === "Hot" || badge === "Populer",
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    idramaRawId: dramaId,
    idramaDramaId: dramaId,
    idramaCode: code || undefined,
  };
}

export function adaptIdramaDramaList(
  items: unknown[],
  badge = "iDrama",
): Drama[] {
  return items
    .map((item, index) => adaptIdramaDrama(item, index, badge))
    .filter((item): item is Drama => !!item);
}

export function adaptIdramaEpisodes(
  rawDrama: unknown,
  fallbackDramaId?: string,
  fallbackNumericDramaId?: number,
  fallbackCode?: string,
): Episode[] {
  if (!rawDrama || typeof rawDrama !== "object") return [];

  const raw = rawDrama as JsonRecord;
  const dramaId =
    pickString(raw, "id", "drama_id", "short_play_id") || fallbackDramaId || "";
  const numericDramaId =
    fallbackNumericDramaId ?? createStableNumericId(dramaId, Date.now());

  const code = fallbackCode || pickString(raw, "code");
  const episodeList = Array.isArray(raw["episode_list"])
    ? (raw["episode_list"] as unknown[])
    : [];

  return episodeList.map((episode, index) => {
    const epRaw =
      episode && typeof episode === "object"
        ? (episode as JsonRecord)
        : {};

    const epNumber =
      pickNumber(epRaw, "num", "episode_num", "episode", "sort") || index + 1;

    const epId =
      pickString(epRaw, "id", "episode_id", "video_id") ||
      `${dramaId}-${epNumber}`;

    const localTitle =
      pickString(epRaw, "title", "episode_title") || `Episode ${epNumber}`;

    const streamUrl = `/api/idrama/stream?dramaId=${encodeURIComponent(
      dramaId,
    )}&ep=${epNumber}&code=${encodeURIComponent(code || IDRAMA_DEFAULT_CODE)}`;

    return {
      id: createStableNumericId(epId, numericDramaId * 1000 + epNumber),
      dramaId: numericDramaId,
      episodeNumber: epNumber,
      title: localTitle,
      duration: "",
      slug: `idrama-${dramaId}-ep-${epNumber}`,
      description: "",
      videoUrl: streamUrl,
      originalVideoUrl: streamUrl,
      thumbnail: undefined,
      isLocked:
        typeof epRaw["locked"] === "boolean"
          ? Boolean(epRaw["locked"])
          : false,
      isVipOnly: false,
      sortOrder: epNumber,
      subtitleUrl: undefined,
      subtitleLang: "id-ID",
      subtitleLabel: "Indonesian",
      idramaEpisodeId: epId,
      idramaPlayId: String(epNumber),
    };
  });
}

function extractPossibleTabModules(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;

  if (!payload || typeof payload !== "object") return [];

  const raw = payload as JsonRecord;

  const candidates = [
    raw["list"],
    raw["items"],
    raw["data"],
    raw["modules"],
    raw["sections"],
    raw["cards"],
    raw["rows"],
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    if (candidate && typeof candidate === "object") {
      const nested = candidate as JsonRecord;

      const nestedCandidates = [
        nested["list"],
        nested["items"],
        nested["data"],
        nested["modules"],
        nested["sections"],
        nested["cards"],
        nested["rows"],
      ];

      for (const nestedCandidate of nestedCandidates) {
        if (Array.isArray(nestedCandidate)) {
          return nestedCandidate;
        }
      }
    }
  }

  return [];
}

export function flattenTabModulesToDramas(
  payload: unknown,
  badge = "iDrama",
): Drama[] {
  const modules = extractPossibleTabModules(payload);
  if (modules.length === 0) return [];

  const results: Drama[] = [];

  modules.forEach((module) => {
    if (!module || typeof module !== "object") return;
    const rawModule = module as JsonRecord;

    const itemCandidates: unknown[][] = [
      Array.isArray(rawModule["items"]) ? (rawModule["items"] as unknown[]) : [],
      Array.isArray(rawModule["list"]) ? (rawModule["list"] as unknown[]) : [],
      Array.isArray(rawModule["short_plays"])
        ? (rawModule["short_plays"] as unknown[])
        : [],
      Array.isArray(rawModule["data"]) ? (rawModule["data"] as unknown[]) : [],
    ];

    itemCandidates.forEach((items) => {
      items.forEach((item) => {
        const adapted = adaptIdramaDrama(item, results.length, badge);
        if (adapted) results.push(adapted);
      });
    });
  });

  const deduped = new Map<string, Drama>();

  results.forEach((drama) => {
    const key =
      drama.idramaDramaId || drama.idramaRawId || drama.slug || String(drama.id);
    deduped.set(key, drama);
  });

  return Array.from(deduped.values());
}

export function extractHomeChannelKeys(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [IDRAMA_HOT_TAB_ID];
  }

  const raw = payload as JsonRecord;
  const list = Array.isArray(raw["list"]) ? (raw["list"] as unknown[]) : [];
  const keys: string[] = [];

  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const rawEntry = entry as JsonRecord;

    const directKey = pickString(rawEntry, "key");
    if (directKey.startsWith("channel_")) {
      keys.push(directKey);
    }

    const subNavs = Array.isArray(rawEntry["sub_navs"])
      ? (rawEntry["sub_navs"] as unknown[])
      : [];

    subNavs.forEach((subNav) => {
      if (!subNav || typeof subNav !== "object") return;
      const key = pickString(subNav as JsonRecord, "key");
      if (key.startsWith("channel_")) {
        keys.push(key);
      }
    });
  });

  const deduped = Array.from(new Set(keys.filter(Boolean)));
  return deduped.length > 0 ? deduped : [IDRAMA_HOT_TAB_ID];
}

export function getSearchParam(
  request: NextRequest,
  key: string,
  fallback = "",
): string {
  return request.nextUrl.searchParams.get(key)?.trim() || fallback;
}

function resolveMediaUrl(uri: string, baseUrl: string): string {
  if (!uri.trim()) return uri;
  if (uri.startsWith("data:")) return uri;

  try {
    return new URL(uri, baseUrl).toString();
  } catch {
    return uri;
  }
}

export function rewriteM3u8Playlist(
  playlistText: string,
  proxyBaseUrl: string,
  playlistUrl: string,
): string {
  return playlistText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) {
        return line;
      }

      if (trimmed.startsWith("#EXT-X-KEY")) {
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) => {
          if (
            uri.startsWith("data:") ||
            uri.startsWith(proxyBaseUrl) ||
            uri.startsWith("/api/idrama/stream")
          ) {
            return `URI="${uri}"`;
          }

          const resolved = resolveMediaUrl(uri, playlistUrl);
          const proxied = `${proxyBaseUrl}?url=${encodeURIComponent(resolved)}`;
          return `URI="${proxied}"`;
        });
      }

      if (trimmed.startsWith("#")) {
        return line;
      }

      if (
        trimmed.startsWith("data:") ||
        trimmed.startsWith(proxyBaseUrl) ||
        trimmed.startsWith("/api/idrama/stream")
      ) {
        return line;
      }

      const resolved = resolveMediaUrl(trimmed, playlistUrl);
      return `${proxyBaseUrl}?url=${encodeURIComponent(resolved)}`;
    })
    .join("\n");
}

export function buildProxyBaseUrl(request: NextRequest): string {
  return `${request.nextUrl.origin}/api/idrama/stream`;
}
