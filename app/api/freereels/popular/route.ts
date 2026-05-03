import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, jsonFeed, toDramaList } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;
    const upstreamPage = Math.max(0, page - 1);
    const data = await fetchFreeReelsJson(
      buildApiUrl("/popular", { page: upstreamPage }),
    );
    const items = toDramaList(data, "Populer");
    return NextResponse.json(jsonFeed(items, page, false));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat daftar populer FreeReels.",
      },
      { status: 500 },
    );
  }
}
