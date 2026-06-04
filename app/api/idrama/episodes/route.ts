import { NextRequest, NextResponse } from "next/server";
import { postIdramaJson } from "../_shared";

function pickPlayUrl(ep: any) {
  return (
    ep.play_info_list?.find((x: any) => x.definition === "720p" && x.play_url)
      ?.play_url ||
    ep.play_info_list?.find((x: any) => x.definition === "540p" && x.play_url)
      ?.play_url ||
    ep.play_info_list?.find((x: any) => x.play_url)?.play_url ||
    ep.play_url ||
    ""
  );
}

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim();

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing dramaId" },
        { status: 400 },
      );
    }

    const payload = await postIdramaJson(`/unlock/${dramaId}`);

    const episodes = Array.isArray(payload?.episodes)
      ? payload.episodes.map((wrapper: any) => {
          const ep = wrapper?.data || {};

          return {
            id: Number(ep.episode_id),
            dramaId: Number(dramaId),
            episodeNumber: Number(ep.episode_order),
            title: `Episode ${ep.episode_order}`,
            videoUrl: pickPlayUrl(ep),
            isLocked: false,
            isVipOnly: ep.free_type !== 0,
            sortOrder: Number(ep.episode_order),
            thumbnail: ep.episode_cover || undefined,
          };
        })
      : [];

    return NextResponse.json(episodes);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "iDrama episodes failed" },
      { status: 500 },
    );
  }
}
