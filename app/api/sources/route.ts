import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

async function fetchSourcesWithRetry(retries = 1) {
  const result = await supabaseServer
    .from("sources")
    .select("*")
    .order("sort_order", { ascending: true });

  if (!result.error) return result;

  if (retries > 0) {
    console.warn("Retrying sources fetch after error:", result.error.message);
    return fetchSourcesWithRetry(retries - 1);
  }

  return result;
}

export async function GET() {
  const { data, error } = await fetchSourcesWithRetry(1);

  if (error) {
    console.error("Sources API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    badge: item.badge,
    description: item.description,
    logo: item.logo,
    cardClass: item.card_class,
    sortOrder: item.sort_order,
    isPopular: item.is_popular,
  }));

  return NextResponse.json(mapped);
}