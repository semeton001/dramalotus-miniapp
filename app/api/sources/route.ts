import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Source } from "@/types/source";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("sources")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch sources", details: error.message },
      { status: 500 },
    );
  }

  const sources: Source[] = (data ?? []).map((item) => ({
    id: Number(item.id),
    name: item.name,
    badge: item.badge ?? undefined,
    cardClass: item.card_class,
    logo: item.logo,
    slug: item.slug,
    description: item.description,
    sortOrder: item.sort_order,
    isPopular: item.is_popular,
  }));

  return NextResponse.json(sources);
}