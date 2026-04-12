import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, jsonFeed, toDramaList } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;

    const [popular, latest, foryou] = await Promise.all([
      fetchFreeReelsJson(buildApiUrl("/popular", { page })),
      fetchFreeReelsJson(buildApiUrl("/new", { page })),
      fetchFreeReelsJson(buildApiUrl("/foryou", { page })),
    ]);

    const pool = [
      ...toDramaList(popular, "Populer"),
      ...toDramaList(latest, "Baru"),
      ...toDramaList(foryou, "ForYou"),
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

    return NextResponse.json(jsonFeed(randomized, page, randomized.length > 0));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat home FreeReels." },
      { status: 500 },
    );
  }
}
