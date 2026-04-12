import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, toDramaList } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query") ||
      request.nextUrl.searchParams.get("q") ||
      "";
    const page = request.nextUrl.searchParams.get("page") || "1";

    if (!query.trim()) {
      return NextResponse.json([]);
    }

    const data = await fetchFreeReelsJson(
      buildApiUrl("/search", { q: query.trim(), page }),
    );
    return NextResponse.json(toDramaList(data, "FreeReels"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal mencari FreeReels." },
      { status: 500 },
    );
  }
}
