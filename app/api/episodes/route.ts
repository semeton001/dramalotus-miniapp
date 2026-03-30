import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Episode } from "@/types/episode";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("episodes")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch episodes", details: error.message },
      { status: 500 },
    );
  }

  const episodes: Episode[] = (data ?? []).map((item) => ({
    id: Number(item.id),
    dramaId: Number(item.drama_id),
    episodeNumber: item.episode_number,
    title: item.title,
    duration: item.duration ?? undefined,
    slug: item.slug,
    description: item.description ?? undefined,
    sortOrder: item.sort_order,
    isLocked: item.is_locked,
    isVipOnly: item.is_vip_only,
  }));

  return NextResponse.json(episodes);
}
