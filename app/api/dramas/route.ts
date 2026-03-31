import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Drama } from "@/types/drama";

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

type SourceRow = {
  id: string;
  name: string;
};

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

  const dramas: Drama[] = ((dramasData ?? []) as DramaRow[]).map((item) => ({
    id: Number(item.id),
    source: sourceMap.get(item.source_id) ?? "",
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
  }));

  return NextResponse.json(dramas);
}
