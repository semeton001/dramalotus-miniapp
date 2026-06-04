import { NextRequest, NextResponse } from "next/server";
import { fetchJson, errorJson } from "../_shared";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const dramaId =
    request.nextUrl.searchParams.get("id")?.trim() ||
    request.nextUrl.searchParams.get("dramaId")?.trim() ||
    "";

  if (!dramaId) {
    return NextResponse.json([]);
  }

  try {
    const payload = await fetchJson(
      `/api/v1/dramas/${encodeURIComponent(dramaId)}?lang=id-ID`
    );

    const episodes = Array.isArray(payload?.data?.info?.episode_list)
      ? payload.data.info.episode_list
      : [];

    const mapped = episodes.map((ep: any, index: number) => {
      const epNo =
        Number(ep?.index || ep?.episode || ep?.episode_no || index + 1) ||
        index + 1;

      return {
        id:
          ep?.id ||
          ep?.episode_id ||
          `${dramaId}-${epNo}`,
        dramaId,
        episodeNumber: epNo,
        title: `Episode ${epNo}`,
        duration: ep?.duration ? String(ep.duration) : "",
        slug: `dramawave-${dramaId}-${epNo}`,
        description: "",
        thumbnail:
          ep?.cover ||
          payload?.data?.info?.cover ||
          undefined,
        isLocked: !Boolean(ep?.unlock),
        isVipOnly: ep?.video_type === "vip",
        videoUrl:
          `/api/dramawave/stream?dramaId=${encodeURIComponent(dramaId)}&episode=${epNo}`,
        subtitleUrl:
          `/api/dramawave/subtitle?dramaId=${encodeURIComponent(dramaId)}&episode=${epNo}`,
        subtitleLang: "id",
        subtitleLabel: "Indonesia",
        sortOrder: epNo,
      };
    });

    return NextResponse.json(mapped);
  } catch (error) {
    return errorJson(error);
  }
}
