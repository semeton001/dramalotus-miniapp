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

const DRAMABOX_LANG = "in";
const DRAMABOX_SEARCH_QUERY = "love";





async function fetchDramaBoxCatalog() {
  const token = process.env.DRAMABOX_TOKEN?.trim() || "";

  const response = await fetch(
    `https://captain.sapimu.au/dramaboxbaru/api/search?keyword=${encodeURIComponent(
      DRAMABOX_SEARCH_QUERY,
    )}&page=1&lang=${DRAMABOX_LANG}`,
    {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`DramaBox search failed ${response.status}`);
  }

  const payload = await response.json();

  return payload?.data?.data?.searchList ?? [];
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
    const dramaBoxSearchRaw = await fetchDramaBoxCatalog();

    const dramaBoxSearchItems = Array.isArray(dramaBoxSearchRaw)
      ? (dramaBoxSearchRaw as DramaBoxSearchItemResponse[])
      : [];

    const searchAdapted = adaptDramaSearchListBySource(
      "dramabox",
      dramaBoxSearchItems,
    ) as DramaResponse[];

    
    adaptedDramaBoxSearch = searchAdapted;
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

  return NextResponse.json(mergedDramas);
}
