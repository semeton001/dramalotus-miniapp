import { NextRequest, NextResponse } from "next/server";
import {
  buildGoodshortApiUrl,
  fetchGoodshortJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim();

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing dramaId" },
        { status: 400 },
      );
    }

    const payload = await fetchGoodshortJson(
      buildGoodshortApiUrl(`/book/${encodeURIComponent(dramaId)}`),
    );

    const preview = Array.isArray(payload?.data?.list)
      ? payload.data.list
      : [];

    const chapterCount = Number(
      payload?.data?.book?.chapterCount || preview.length || 0,
    );

    const cover = payload?.data?.book?.cover || preview[0]?.image || "";

    const out = Array.from({ length: chapterCount }, (_, i) => ({
      id: i + 1,
      dramaId: Number(dramaId),
      episodeNumber: i + 1,
      title: `Episode ${i + 1}`,
      duration: "",
      slug: `goodshort-${dramaId}-ep-${i + 1}`,
      description: "",
      thumbnail: cover,
      videoUrl: `/api/goodshort/stream?dramaId=${dramaId}&episode=${i + 1}`,
      originalVideoUrl: "",
      isLocked: false,
      isVipOnly: false,
      sortOrder: i + 1,
    }));

    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "GoodShort episodes failed" },
      { status: 500 },
    );
  }
}
