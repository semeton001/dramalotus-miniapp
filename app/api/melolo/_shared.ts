import { NextRequest, NextResponse } from "next/server";
import { adaptMeloloDramaDetail, adaptMeloloDramaList, adaptMeloloSearchList } from "@/lib/adapters/drama/melolo";
import { adaptMeloloEpisodeList } from "@/lib/adapters/episode/melolo";

export const MELOLO_PAGE_SIZE = 20;
export const MELOLO_DEFAULT_VIDEO_CODE =
  process.env.REELSHORT_DEFAULT_CODE?.trim() ||
  process.env.MELOLO_VIDEO_CODE?.trim() ||
  "4D96F22760EA30FB0FFBA9AA87A979A6";

const MELOLO_HOME_BASE_URL = "https://melolo.dramabos.my.id/api/home";
const MELOLO_DETAIL_BASE_URL = "https://melolo.dramabos.my.id/api/detail";
const MELOLO_VIDEO_BASE_URL = "https://melolo.dramabos.my.id/api/video";
const MELOLO_SEARCH_BASE_URL = "https://melolo.dramabos.my.id/api/search";
const MELOLO_LATEST_URL = "https://api.sansekai.my.id/api/melolo/latest";
const MELOLO_FORYOU_URL = "https://api.sansekai.my.id/api/melolo/foryou";
const MELOLO_TRENDING_URL = "https://api.sansekai.my.id/api/melolo/trending";
const MELOLO_HOME_AGGREGATE_OFFSETS = [0, MELOLO_PAGE_SIZE];

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

type FeedMode = "home" | "latest" | "foryou" | "trending";
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

function buildHomeUrl(offset: number): string {
  return `${MELOLO_HOME_BASE_URL}?lang=id&offset=${encodeURIComponent(String(offset))}`;
}

function buildDetailUrl(id: string): string {
  return `${MELOLO_DETAIL_BASE_URL}/${encodeURIComponent(id)}?lang=id`;
}

function buildSearchUrl(query: string): string {
  return `${MELOLO_SEARCH_BASE_URL}?lang=id&q=${encodeURIComponent(query)}`;
}

function buildVideoUrl(vid: string): string {
  return `${MELOLO_VIDEO_BASE_URL}/${encodeURIComponent(vid)}?lang=id&code=${encodeURIComponent(MELOLO_DEFAULT_VIDEO_CODE)}`;
}

function normalizeFeedItems(payload: unknown, mode: Exclude<FeedMode, "home">): MeloloDramaItem[] {
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
  const homeRequests = MELOLO_HOME_AGGREGATE_OFFSETS.map((offset) =>
    fetchJson(buildHomeUrl(offset)),
  );

  const [homeResults, latestResult, foryouResult, trendingResult] = await Promise.all([
    Promise.all(homeRequests),
    fetchJson(MELOLO_LATEST_URL),
    fetchJson(`${MELOLO_FORYOU_URL}?offset=1`),
    fetchJson(MELOLO_TRENDING_URL),
  ]);

  const homeLists = homeResults
    .filter((result) => result.ok && result.payload != null)
    .map((result) => adaptMeloloDramaList(result.payload) as MeloloDramaItem[]);

  const latestItems = latestResult.ok && latestResult.payload != null
    ? normalizeFeedItems(latestResult.payload, "latest")
    : [];

  const foryouItems = foryouResult.ok && foryouResult.payload != null
    ? normalizeFeedItems(foryouResult.payload, "foryou")
    : [];

  const trendingItems = trendingResult.ok && trendingResult.payload != null
    ? normalizeFeedItems(trendingResult.payload, "trending")
    : [];

  const mergedItems = mergeMeloloDramaLists([
    ...homeLists,
    latestItems,
    foryouItems,
    trendingItems,
  ]);

  if (mergedItems.length === 0) {
    const fallback = await fetchJson(buildHomeUrl(0));

    if (!fallback.ok || fallback.payload == null) {
      throw new Error("Melolo home aggregate failed");
    }

    return paginateMeloloItems(
      adaptMeloloDramaList(fallback.payload) as MeloloDramaItem[],
      page,
    );
  }

  return paginateMeloloItems(mergedItems, page);
}

async function resolveFeedItems(mode: FeedMode, page: number, offset: number): Promise<FeedResult> {
  if (mode === "home") {
    return fetchHomeAggregateFeed(page);
  }

  const primaryUrl =
    mode === "latest"
      ? MELOLO_LATEST_URL
      : mode === "foryou"
        ? `${MELOLO_FORYOU_URL}?offset=${Math.max(1, offset + 1)}`
        : MELOLO_TRENDING_URL;

  const primary = await fetchJson(primaryUrl);

  if (primary.ok && primary.payload != null) {
    const items = adaptMeloloSearchList(primary.payload) as MeloloDramaItem[];
    return {
      items,
      hasNextPage: false,
      page: Math.floor(offset / MELOLO_PAGE_SIZE) + 1,
      offset,
    };
  }

  const fallback = await fetchJson(buildHomeUrl(offset));

  if (!fallback.ok || fallback.payload == null) {
    throw new Error(
      `Melolo ${mode} failed. primary=${primary.status} fallback=${fallback.status}`,
    );
  }

  const items = adaptMeloloDramaList(fallback.payload) as MeloloDramaItem[];
  return {
    items,
    hasNextPage: false,
    page: Math.floor(offset / MELOLO_PAGE_SIZE) + 1,
    offset,
  };
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

    const { ok, status, payload } = await fetchJson(buildSearchUrl(query));

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

export async function resolveMeloloStreamUrl(vid: string): Promise<string> {
  if (!vid.trim()) return "";

  const { ok, payload } = await fetchJson<StreamPayload>(buildVideoUrl(vid));

  if (!ok || payload == null) {
    return "";
  }

  return pickBestStreamUrl(payload);
}

export async function respondStream(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const vid = searchParams.get("vid")?.trim() ?? "";

    if (!vid) {
      return NextResponse.json(
        { error: "Missing Melolo vid" },
        { status: 400 },
      );
    }

    const url = await resolveMeloloStreamUrl(vid);

    if (!url) {
      return NextResponse.json(
        { error: "Failed to resolve Melolo stream" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        url,
        vid,
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

    const detail = await fetchJson(buildDetailUrl(meloloDramaId));

    if (!detail.ok || detail.payload == null) {
      return NextResponse.json(
        {
          error: `Melolo episodes upstream failed with status ${detail.status}`,
        },
        { status: detail.status },
      );
    }

    const adaptedEpisodes = adaptMeloloEpisodeList(detail.payload, {
      dramaId: createStableNumericId(meloloDramaId, 1),
      meloloDramaId,
    });

    const hydratedEpisodes = await Promise.all(
      adaptedEpisodes.map(async (episode) => {
        const typedEpisode = episode as EpisodeWithMeloloMeta;
        const vid =
          typeof typedEpisode.meloloVid === "string"
            ? typedEpisode.meloloVid.trim()
            : "";

        if (!vid) {
          return {
            ...episode,
            videoUrl: episode.videoUrl || "",
          };
        }

        const resolvedUrl = await resolveMeloloStreamUrl(vid);

        return {
          ...episode,
          videoUrl: resolvedUrl || episode.videoUrl || "",
        };
      }),
    );

    return NextResponse.json(hydratedEpisodes, { status: 200 });
  } catch (error) {
    console.error("Melolo episodes route error:", error);

    return NextResponse.json(
      { error: "Failed to load Melolo episodes" },
      { status: 500 },
    );
  }
}
