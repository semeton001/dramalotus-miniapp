import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Episode } from "@/types/episode";
import { adaptDramaBoxEpisodeList } from "@/lib/adapters/episode";

async function fetchDramaBoxEpisodeList(bookId: string) {
  const response = await fetch(
    `https://dramabox.dramabos.my.id/api/v1/allepisode?bookId=${bookId}&lang=in&code=4D96F22760EA30FB0FFBA9AA87A979A6`,
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
      `DramaBox allepisode request failed with status ${response.status}`,
    );
  }

  return response.json();
}

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
    videoUrl: item.video_url ?? undefined,
    thumbnail: item.thumbnail ?? undefined,
  }));

  return NextResponse.json(episodes);
}