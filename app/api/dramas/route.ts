import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  adaptDramaDetailBySource,
  adaptDramaSearchListBySource,
  mergeDramaBoxDramaMetadata,
} from "@/lib/adapters/drama";

type DramaRow = {
  id: string;
  source_id: string;
  title: string;
  slug: string;
  description: string | null;
  episodes_count: number;
  badge: string | null;
  poster_class: string | null;
  tags: string[];
  category: string | null;
  is_new: boolean;
  is_dubbed: boolean;
  is_trending: boolean;
  sort_order: number;
};

type DramaResponse = {
  id: number;
  source: string;
  sourceId: string;
  sourceName: string;
  title: string;
  episodes: number;
  badge: string;
  tags: string[];
  posterClass: string;
  slug: string;
  description: string;
  category: string;
  isNew: boolean;
  isDubbed: boolean;
  isTrending: boolean;
  sortOrder: number;
  posterImage?: string;
};

type SourceRow = {
  id: string;
  name: string;
};

type DramaBoxSearchItemResponse = {
  bookId: string;
  bookName?: string;
  coverWap?: string;
  chapterCount?: number;
  introduction?: string;
  tags?: string[];
};

const DRAMABOX_BASE_URL = "https://dramabox.dramabos.my.id/api/v1";
const DRAMABOX_LANG = "in";
const DRAMABOX_ENRICH_LIMIT = 12;
const DRAMABOX_SEARCH_QUERY = "love";
const DRAMABOX_EPISODE_CODE = "4D96F22760EA30FB0FFBA9AA87A979A6";

async function fetchDramaBoxSearchList(query: string) {
  const response = await fetch(
    `${DRAMABOX_BASE_URL}/search?query=${encodeURIComponent(query)}&lang=${DRAMABOX_LANG}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `DramaBox search request failed with status ${response.status}`,
    );
  }

  return response.json();
}

async function fetchDramaBoxDetail(bookId: string) {
  const response = await fetch(
    `${DRAMABOX_BASE_URL}/detail?bookId=${encodeURIComponent(bookId)}&lang=${DRAMABOX_LANG}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `DramaBox detail request failed for bookId ${bookId} with status ${response.status}`,
    );
  }

  return response.json();
}

async function fetchDramaBoxEpisodeList(bookId: string) {
  const response = await fetch(
    `${DRAMABOX_BASE_URL}/allepisode?bookId=${encodeURIComponent(bookId)}&lang=${DRAMABOX_LANG}&code=${DRAMABOX_EPISODE_CODE}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `DramaBox allepisode request failed for bookId ${bookId} with status ${response.status}`,
    );
  }

  return response.json();
}

function shouldEnrichDramaBoxItem(item: DramaResponse) {
  return (
    item.sourceName === "DramaBox" &&
    (item.episodes <= 0 ||
      item.tags.length === 0 ||
      item.description.trim().length === 0)
  );
}

export async function GET() {
  const [
    { data: dramasData, error: dramasError },
    { data: sourcesData, error: sourcesError },
  ] = await Promise.all([
    supabaseServer
      .from("dramas")
      .select("*")
      .order("sort_order", { ascending: true }),
    supabaseServer.from("sources").select("id, name"),
  ]);

  if (dramasError) {
    return NextResponse.json(
      { error: "Failed to fetch dramas", details: dramasError.message },
      { status: 500 },
    );
  }

  if (sourcesError) {
    return NextResponse.json(
      { error: "Failed to fetch sources", details: sourcesError.message },
      { status: 500 },
    );
  }

  const sourceMap = new Map(
    ((sourcesData ?? []) as SourceRow[]).map((source) => [
      source.id,
      source.name,
    ]),
  );

  let adaptedDramaBoxSearch: DramaResponse[] = [];

  try {
    const dramaBoxSearchRaw = await fetchDramaBoxSearchList(
      DRAMABOX_SEARCH_QUERY,
    );

    const dramaBoxSearchItems = Array.isArray(dramaBoxSearchRaw)
      ? (dramaBoxSearchRaw as DramaBoxSearchItemResponse[])
      : [];

    const searchAdapted = adaptDramaSearchListBySource(
      "dramabox",
      dramaBoxSearchItems,
    ) as DramaResponse[];

    const enrichCandidates = searchAdapted
      .filter(shouldEnrichDramaBoxItem)
      .slice(0, DRAMABOX_ENRICH_LIMIT);

    const enrichMap = new Map<
      number,
      {
        detail?: Partial<DramaResponse> & { id: number };
        episodeCount?: number;
      }
    >();

    await Promise.allSettled(
      enrichCandidates.map(async (item) => {
        const bookId = String(item.id);

        const [detailResult, episodeResult] = await Promise.allSettled([
          fetchDramaBoxDetail(bookId),
          item.episodes <= 0
            ? fetchDramaBoxEpisodeList(bookId)
            : Promise.resolve(null),
        ]);

        let detail: (Partial<DramaResponse> & { id: number }) | undefined;

        if (detailResult.status === "fulfilled" && detailResult.value) {
          try {
            detail = adaptDramaDetailBySource(
              "dramabox",
              detailResult.value,
            ) as Partial<DramaResponse> & { id: number };
          } catch (error) {
            console.error(
              `Failed adapting DramaBox detail for ${bookId}:`,
              error,
            );
          }
        }

        let episodeCount: number | undefined;

        if (
          episodeResult.status === "fulfilled" &&
          Array.isArray(episodeResult.value)
        ) {
          episodeCount = episodeResult.value.length;
        }

        enrichMap.set(item.id, { detail, episodeCount });
      }),
    );

    adaptedDramaBoxSearch = searchAdapted.map((item) => {
      const enriched = enrichMap.get(item.id);

      if (!enriched) return item;

      return mergeDramaBoxDramaMetadata(
        item,
        enriched.detail,
        enriched.episodeCount,
      ) as DramaResponse;
    });

    console.log("DramaBox search raw count:", dramaBoxSearchItems.length);
    console.log("DramaBox search adapted count:", searchAdapted.length);
    console.log(
      "DramaBox search enriched count:",
      adaptedDramaBoxSearch.length,
    );
    console.log(
      "DramaBox adapted titles:",
      adaptedDramaBoxSearch.slice(0, 5).map((item) => ({
        id: item.id,
        title: item.title,
        episodes: item.episodes,
      })),
    );
  } catch (error) {
    console.error("DramaBox search adapter test failed:", error);
  }

  const dramas: DramaResponse[] = ((dramasData ?? []) as DramaRow[]).map(
    (item) => ({
      id: Number(item.id),
      source: sourceMap.get(item.source_id) ?? "",
      sourceId: item.source_id,
      sourceName: sourceMap.get(item.source_id) ?? "",
      title: item.title,
      episodes: item.episodes_count,
      badge: item.badge ?? "",
      tags: item.tags ?? [],
      posterClass: item.poster_class ?? "",
      slug: item.slug,
      description: item.description ?? "",
      category: item.category ?? "",
      isNew: item.is_new,
      isDubbed: item.is_dubbed,
      isTrending: item.is_trending,
      sortOrder: item.sort_order,
    }),
  );

  const mergedDramas = [...dramas];
  const existingDramaIds = new Set(dramas.map((item) => item.id));

  adaptedDramaBoxSearch.forEach((item) => {
    if (!existingDramaIds.has(item.id)) {
      mergedDramas.push(item);
    }
  });

  mergedDramas.sort((a, b) => {
    const aOrder = a.sortOrder ?? 9999;
    const bOrder = b.sortOrder ?? 9999;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.title.localeCompare(b.title);
  });

  console.log("Supabase dramas count:", dramas.length);
  console.log("DramaBox adapted count:", adaptedDramaBoxSearch.length);
  console.log("Merged dramas count:", mergedDramas.length);

  return NextResponse.json(mergedDramas);
}
