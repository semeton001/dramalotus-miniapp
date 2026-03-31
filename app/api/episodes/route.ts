import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Episode } from "@/types/episode";
import { adaptDramaBoxEpisodeList } from "@/lib/adapters/episode";

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

  const dramaBoxEpisodeSample = [
    {
      chapterId: "700519021",
      chapterIndex: 1,
      isCharge: false,
      videoUrl:
        "https://thwztvideo.dramaboxdb.com/12/5x6/56x1/561x8/56180000024/700519021_1/700519021.720p.narrowv3.mp4",
      "1080p":
        "https://thwztvideo.dramaboxdb.com/12/5x6/56x1/561x8/56180000024/700519021_1/700519021.1080p.wz.g264.mp4",
    },
  ];

  const adaptedDramaBoxEpisodeSample = adaptDramaBoxEpisodeList(
    dramaBoxEpisodeSample,
    42000008165,
  );

  void adaptedDramaBoxEpisodeSample;

  try {
    const dramaBoxEpisodeRaw = await fetchDramaBoxEpisodeList("42000008165");
    const dramaBoxEpisodeItems = Array.isArray(dramaBoxEpisodeRaw)
      ? dramaBoxEpisodeRaw
      : [];

    const adaptedDramaBoxEpisodes = adaptDramaBoxEpisodeList(
      dramaBoxEpisodeItems,
      42000008165,
    );

    console.log("DramaBox episode raw count:", dramaBoxEpisodeItems.length);
    console.log(
      "DramaBox episode adapted count:",
      adaptedDramaBoxEpisodes.length,
    );

    void adaptedDramaBoxEpisodes;
  } catch (error) {
    console.error("DramaBox episode adapter test failed:", error);
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
