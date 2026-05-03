import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, jsonFeed, toDramaList } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;

    const upstreamPage = Math.max(0, page - 1);

    const [dubbing, anime, female] = await Promise.all([
      fetchFreeReelsJson(buildApiUrl("/dubbing", { page: upstreamPage })),
      fetchFreeReelsJson(buildApiUrl("/anime", { page: upstreamPage })),
      fetchFreeReelsJson(buildApiUrl("/female", { page: upstreamPage })),
    ]);

    const pool = [
      ...toDramaList(dubbing, "Dubbing"),
      ...toDramaList(anime, "Anime"),
      ...toDramaList(female, "Female"),
    ];

    const deduped = Array.from(
      new Map(
        pool.map((item) => [item.freereelsDramaId || String(item.id), item]),
      ).values(),
    );

    const randomized = [...deduped]
      .sort(() => Math.random() - 0.5)
      .slice(0, 60)
      .map((item, index) => ({ ...item, sortOrder: index, badge: "FreeReels" }));

    return NextResponse.json(jsonFeed(randomized, page, false));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat home FreeReels." },
      { status: 500 },
    );
  }
}
