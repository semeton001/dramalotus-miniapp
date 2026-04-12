import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { Episode } from "@/types/episode";

type Params = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(_: Request, { params }: Params) {
  const resolvedParams = await params;
  const slug = decodeURIComponent(resolvedParams.slug);

  const { data, error } = await supabaseServer
    .from("episodes")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch episode", details: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Episode not found" },
      { status: 404 }
    );
  }

  const episode: Episode = {
    id: Number(data.id),
    dramaId: Number(data.drama_id),
    episodeNumber: data.episode_number,
    title: data.title,
    duration: data.duration ?? "",
    slug: data.slug,
    description: data.description ?? undefined,
    sortOrder: data.sort_order ?? undefined,
    isLocked: data.is_locked,
    isVipOnly: data.is_vip_only,
    videoUrl: data.video_url ?? undefined,
    thumbnail: data.thumbnail ?? undefined,
    originalVideoUrl: data.original_video_url ?? undefined,
    subtitleUrl: data.subtitle_url ?? undefined,
    subtitleLang: data.subtitle_lang ?? undefined,
    subtitleLabel: data.subtitle_label ?? undefined,
  };

  return NextResponse.json(episode);
}
