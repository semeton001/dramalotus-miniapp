import { NextRequest, NextResponse } from "next/server";
import { buildShortmaxApiUrl, fetchShortmaxJson } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim();

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing dramaId" },
        { status: 400 },
      );
    }

    const payload = await fetchShortmaxJson(
      buildShortmaxApiUrl(`/detail/${encodeURIComponent(dramaId)}`),
    );

    const data = payload?.data;
    const total = Number(data?.episodes || 0);

    if (!total) {
      return NextResponse.json([]);
    }

    const episodes = Array.from({ length: total }, (_, i) => {
      const ep = i + 1;

      return {
        id: Number(`${dramaId}${ep}`),
        dramaId: Number(dramaId),
        episodeNumber: ep,
        title: `Episode ${ep}`,
        duration: "",
        slug: `shortmax-${dramaId}-ep-${ep}`,
        description: "",
        thumbnail: data?.cover || "",
        videoUrl: `/api/shortmax/stream?dramaId=${dramaId}&episode=${ep}`,
        originalVideoUrl: "",
        isLocked: false,
        isVipOnly: false,
        sortOrder: ep,
      };
    });

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shortmax episodes error",
      },
      { status: 500 },
    );
  }
}
