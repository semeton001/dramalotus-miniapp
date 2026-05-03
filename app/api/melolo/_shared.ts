import { NextRequest, NextResponse } from "next/server";
import { adaptMeloloDramaDetail, adaptMeloloDramaList, adaptMeloloSearchList } from "@/lib/adapters/drama/melolo";
import { adaptMeloloEpisodeList } from "@/lib/adapters/episode/melolo";

export const MELOLO_PAGE_SIZE = 50;
export const MELOLO_DEFAULT_VIDEO_CODE =
  "KFKiMIbY3Np8kbimDo7lJDNSVslwF3Fn64cI0TOtqpOP373n58ca6BKzbDsLb7qB";

const MELOLO_API_BASE_URL = "https://streamapi.web.id/p/melolo/api/v1";
const MELOLO_LANG = "id";
const MELOLO_TOKEN =
  "KFKiMIbY3Np8kbimDo7lJDNSVslwF3Fn64cI0TOtqpOP373n58ca6BKzbDsLb7qB";
const MELOLO_HOME_AGGREGATE_OFFSETS = [0];

type StreamPayload = {
  url?: string;
  backup?: string;
  list?: Array<{
    definition?: string;
    url?: string;
  }>;
  [key: string]: unknown;
};

type EpisodeWithMeloloMeta = {
  meloloVid?: string;
  videoUrl?: string;
  [key: string]: unknown;
};

type FeedMode = "home" | "romance" | "foryou" | "pewaris";
type MeloloDramaItem = ReturnType<typeof adaptMeloloDramaList>[number];

type FeedResult = {
  items: MeloloDramaItem[];
  hasNextPage: boolean;
  page: number;
  offset: number;
};

function requestHeaders(): HeadersInit {
  return {
    Accept: "application/json",
  };
}

export function createStableNumericId(seed: string, fallback = 0): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

export function resolvePageAndOffset(request: NextRequest): {
  page: number;
  offset: number;
} {
  const { searchParams } = new URL(request.url);

  const rawPage = searchParams.get("page")?.trim() ?? "";
  const rawOffset = searchParams.get("offset")?.trim() ?? "";

  const parsedPage = Number(rawPage);
  const parsedOffset = Number(rawOffset);

  if (Number.isFinite(parsedPage) && parsedPage > 0) {
    return {
      page: Math.floor(parsedPage),
      offset: (Math.floor(parsedPage) - 1) * MELOLO_PAGE_SIZE,
    };
  }

  if (Number.isFinite(parsedOffset) && parsedOffset >= 0) {
    const offset = Math.floor(parsedOffset);
    return {
      page: Math.floor(offset / MELOLO_PAGE_SIZE) + 1,
      offset,
    };
  }

  return {
    page: 1,
    offset: 0,
  };
}

export async function fetchJson<T = unknown>(url: string): Promise<{
  ok: boolean;
  status: number;
  payload: T | null;
}> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: requestHeaders(),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      payload: null,
    };
  }

  return {
    ok: true,
    status: response.status,
    payload: (await response.json()) as T,
  };
}

function pickBestStreamUrl(payload: StreamPayload): string {
  if (typeof payload.url === "string" && payload.url.trim().length > 0) {
    return payload.url.trim();
  }

  if (Array.isArray(payload.list) && payload.list.length > 0) {
    const firstValid = payload.list.find(
      (item) => typeof item?.url === "string" && item.url.trim().length > 0,
    );

    if (firstValid?.url) {
      return firstValid.url.trim();
    }
  }

  if (typeof payload.backup === "string" && payload.backup.trim().length > 0) {
    return payload.backup.trim();
  }

  return "";
}

function buildMeloloApiUrl(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): string {
  const url = new URL(`${MELOLO_API_BASE_URL}${path}`);
  url.searchParams.set("lang", MELOLO_LANG);
  url.searchParams.set("token", MELOLO_TOKEN);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

function buildHomeUrl(_offset: number): string {
  return buildMeloloApiUrl("/bookmall");
}

function buildHomeTabsUrl(): string {
  return buildMeloloApiUrl("/bookmall/tabs", { gender: 0 });
}

function buildDetailUrl(id: string): string {
  return buildMeloloApiUrl("/book", { id });
}

function buildMultiVideoUrl(id: string): string {
  return buildMeloloApiUrl("/multi-video", { id });
}

function buildSearchUrl(query: string, offset = 0, limit = MELOLO_PAGE_SIZE): string {
  return buildMeloloApiUrl("/search", {
    q: query,
    limit,
    offset,
  });
}

function buildVideoUrl(vid: string): string {
  return buildMeloloApiUrl("/multi-video", { id: vid });
}

function normalizeFeedItems(payload: unknown, _mode: Exclude<FeedMode, "home">): MeloloDramaItem[] {
  if (payload == null) {
    return [];
  }

  return adaptMeloloSearchList(payload) as MeloloDramaItem[];
}

function buildMeloloDramaKey(item: MeloloDramaItem): string {
  const candidates = [
    typeof item.meloloDramaId === "string" ? item.meloloDramaId.trim() : "",
    typeof item.meloloRawId === "string" ? item.meloloRawId.trim() : "",
    typeof item.slug === "string" ? item.slug.trim() : "",
    typeof item.title === "string" ? item.title.trim().toLowerCase() : "",
  ].filter(Boolean);

  return candidates[0] || `${item.id}`;
}

function mergeMeloloDramaLists(lists: MeloloDramaItem[][]): MeloloDramaItem[] {
  const map = new Map<string, MeloloDramaItem>();

  for (const list of lists) {
    for (const item of list) {
      const key = buildMeloloDramaKey(item);
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
  }

  return Array.from(map.values());
}

function paginateMeloloItems(items: MeloloDramaItem[], page: number): FeedResult {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const offset = (safePage - 1) * MELOLO_PAGE_SIZE;
  const paginatedItems = items.slice(offset, offset + MELOLO_PAGE_SIZE);

  return {
    items: paginatedItems,
    hasNextPage: offset + MELOLO_PAGE_SIZE < items.length,
    page: safePage,
    offset,
  };
}

async function fetchHomeAggregateFeed(page: number): Promise<FeedResult> {
  const [bookmallResult, tabsResult] = await Promise.all([
    fetchJson(buildHomeUrl(0)),
    fetchJson(buildHomeTabsUrl()),
  ]);

  const lists: MeloloDramaItem[][] = [];

  if (bookmallResult.ok && bookmallResult.payload != null) {
    lists.push(adaptMeloloDramaList(bookmallResult.payload) as MeloloDramaItem[]);
  }

  if (tabsResult.ok && tabsResult.payload != null) {
    lists.push(adaptMeloloDramaList(tabsResult.payload) as MeloloDramaItem[]);
  }

  const mergedItems = mergeMeloloDramaLists(lists);

  return paginateMeloloItems(mergedItems, page);
}

async function resolveFeedItems(mode: FeedMode, page: number, offset: number): Promise<FeedResult> {
  if (mode === "home") {
    return fetchHomeAggregateFeed(page);
  }

  const query =
    mode === "romance"
      ? "cinta"
      : mode === "foryou"
        ? "ceo"
        : "pewaris";

  const primary = await fetchJson(buildSearchUrl(query, offset));

  if (primary.ok && primary.payload != null) {
    const items = normalizeFeedItems(primary.payload, mode);
    return {
      items,
      hasNextPage: false,
      page: Math.floor(offset / MELOLO_PAGE_SIZE) + 1,
      offset,
    };
  }

  throw new Error(`Melolo ${mode} upstream failed`);
}

export async function respondFeed(
  request: NextRequest,
  mode: FeedMode,
): Promise<NextResponse> {
  try {
    const { page, offset } = resolvePageAndOffset(request);
    const result = await resolveFeedItems(mode, page, offset);

    return NextResponse.json(
      {
        items: result.items,
        hasNextPage: result.hasNextPage,
        page: result.page,
        offset: result.offset,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error(`Melolo ${mode} route error:`, error);

    return NextResponse.json(
      { error: `Failed to load Melolo ${mode} feed` },
      { status: 500 },
    );
  }
}

export async function respondSearch(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json(
        {
          items: [],
          hasNextPage: false,
          page: 1,
          offset: 0,
        },
        { status: 200 },
      );
    }

    const { ok, status, payload } = await fetchJson(buildSearchUrl(query, 0, 100));

    if (!ok || payload == null) {
      return NextResponse.json(
        { error: `Melolo search upstream failed with status ${status}` },
        { status },
      );
    }

    return NextResponse.json(
      {
        items: adaptMeloloSearchList(payload),
        hasNextPage: false,
        page: 1,
        offset: 0,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Melolo search route error:", error);

    return NextResponse.json(
      { error: "Failed to search Melolo dramas" },
      { status: 500 },
    );
  }
}

export async function respondDetail(id: string): Promise<NextResponse> {
  try {
    const rawId = id?.trim();

    if (!rawId) {
      return NextResponse.json(
        { error: "Missing Melolo drama id" },
        { status: 400 },
      );
    }

    const { ok, status, payload } = await fetchJson(buildDetailUrl(rawId));

    if (!ok || payload == null) {
      return NextResponse.json(
        { error: `Melolo detail upstream failed with status ${status}` },
        { status },
      );
    }

    return NextResponse.json(
      {
        drama: adaptMeloloDramaDetail(payload),
        raw: payload,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Melolo detail route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo detail" },
      { status: 500 },
    );
  }
}

function pickEpisodeStreamUrl(payload: unknown, episodeNumber: number): string {
  if (!payload || typeof payload !== "object") return "";

  const root = payload as Record<string, unknown>;
  const episodes = Array.isArray(root.episodes) ? root.episodes : [];

  const matched =
    episodes.find((item) => {
      if (!item || typeof item !== "object") return false;
      const rawIndex = (item as Record<string, unknown>).index;
      const index =
        typeof rawIndex === "number"
          ? rawIndex
          : typeof rawIndex === "string"
            ? Number(rawIndex)
            : 0;
      return index === episodeNumber;
    }) || episodes[episodeNumber - 1];

  if (!matched || typeof matched !== "object") return "";

  const episode = matched as Record<string, unknown>;

  const directUrl =
    typeof episode.stream_url === "string" && episode.stream_url.trim()
      ? episode.stream_url.trim()
      : typeof episode.video_url === "string" && episode.video_url.trim()
        ? episode.video_url.trim()
        : typeof episode.play_url === "string" && episode.play_url.trim()
          ? episode.play_url.trim()
          : typeof episode.url === "string" && episode.url.trim()
            ? episode.url.trim()
            : "";

  if (directUrl) return directUrl;

  return pickBestStreamUrl({
    url: typeof episode.url === "string" ? episode.url : undefined,
    backup: typeof episode.backup === "string" ? episode.backup : undefined,
  } as StreamPayload);
}

export async function resolveMeloloStreamUrl(
  dramaId: string,
  episodeNumber = 1,
): Promise<string> {
  if (!dramaId.trim()) return "";

  const { ok, payload } = await fetchJson(buildMultiVideoUrl(dramaId));

  if (!ok || payload == null) {
    return "";
  }

  return pickEpisodeStreamUrl(payload, episodeNumber);
}

export async function respondStream(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const dramaId =
      searchParams.get("dramaId")?.trim() ||
      searchParams.get("bookId")?.trim() ||
      searchParams.get("id")?.trim() ||
      "";
    const episodeNumber =
      Number(
        searchParams.get("episodeNumber") ||
          searchParams.get("episode") ||
          searchParams.get("ep") ||
          "1",
      ) || 1;

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing Melolo dramaId" },
        { status: 400 },
      );
    }

    const url = await resolveMeloloStreamUrl(dramaId, episodeNumber);

    if (!url) {
      return NextResponse.json(
        { error: "Failed to resolve Melolo stream" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        url,
        dramaId,
        episodeNumber,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Melolo stream route error:", error);

    return NextResponse.json(
      { error: "Failed to resolve Melolo stream" },
      { status: 500 },
    );
  }
}

export async function respondEpisodes(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const meloloDramaId = searchParams.get("dramaId")?.trim() ?? "";

    if (!meloloDramaId) {
      return NextResponse.json(
        { error: "Missing Melolo dramaId" },
        { status: 400 },
      );
    }

    const videos = await fetchJson(buildMultiVideoUrl(meloloDramaId));

    if (!videos.ok || videos.payload == null) {
      return NextResponse.json(
        {
          error: `Melolo episodes upstream failed with status ${videos.status}`,
        },
        { status: videos.status },
      );
    }

    const adaptedEpisodes = adaptMeloloEpisodeList(videos.payload, {
      dramaId: createStableNumericId(meloloDramaId, 1),
      meloloDramaId,
    });

    return NextResponse.json(adaptedEpisodes, { status: 200 });
  } catch (error) {
    console.error("Melolo episodes route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo episodes" },
      { status: 500 },
    );
  }
}
