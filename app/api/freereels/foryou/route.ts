import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, jsonFeed, toDramaList } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;
    const data = await fetchFreeReelsJson(buildApiUrl("/foryou", { page }));
    const items = toDramaList(data, "ForYou");
    return NextResponse.json(jsonFeed(items, page, items.length > 0));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal memuat ForYou FreeReels." },
      { status: 500 },
    );
  }
}
