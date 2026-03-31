import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import {
  adaptDramaListBySource,
  adaptDramaSearchListBySource,
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
  source: string; // lama, sementara
  sourceId: string; // baru
  sourceName: string; // baru
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
};

type SourceRow = {
  id: string;
  name: string;
};

async function fetchDramaBoxSearchList() {
  const response = await fetch(
    "https://dramabox.dramabos.my.id/api/v1/search?query=drama&lang=in",
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
  const dramaboxSample = [
    {
      bookId: "42000008165",
      bookName: "Tak Tertandingi Usai Bebas",
      coverWap:
        "https://hwztchapter.dramaboxdb.com/data/cppartner/4x2/42x0/420x0/42000008165/42000008165.jpg?t=1773974408741",
      chapterCount: 69,
      introduction:
        "Rendy Susanto menanggung kesalahan tunangannya, dia pun dipenjara lima tahun.",
      tags: [
        "Serangan Balik",
        "Balas Dendam",
        "Keadilan",
        "Kekuatan Khusus",
        "Modern",
        "Pria Dominan",
      ],
    },
  ];

  const adaptedDramaBoxSample = adaptDramaListBySource(
    "dramabox",
    dramaboxSample,
  );
  void adaptedDramaBoxSample;

  let adaptedDramaBoxSearch: DramaResponse[] = [];

  try {
    const dramaBoxSearchRaw = await fetchDramaBoxSearchList();
    const dramaBoxSearchItems = Array.isArray(dramaBoxSearchRaw)
      ? dramaBoxSearchRaw
      : [];

    let adaptedDramaBoxSearch: DramaResponse[] = [];

    try {
      const dramaBoxSearchRaw = await fetchDramaBoxSearchList();
      const dramaBoxSearchItems = Array.isArray(dramaBoxSearchRaw)
        ? dramaBoxSearchRaw
        : [];

      adaptedDramaBoxSearch = adaptDramaSearchListBySource(
        "dramabox",
        dramaBoxSearchItems,
      ) as DramaResponse[];

      console.log("DramaBox search raw count:", dramaBoxSearchItems.length);
      console.log(
        "DramaBox search adapted count:",
        adaptedDramaBoxSearch.length,
      );
    } catch (error) {
      console.error("DramaBox search adapter test failed:", error);
    }
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

  return NextResponse.json([...dramas, ...adaptedDramaBoxSearch]);
}
