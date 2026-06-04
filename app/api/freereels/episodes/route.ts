import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, toEpisodes } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId") ||
      request.nextUrl.searchParams.get("id") ||
      "";

    const numericDramaId = Number(
      request.nextUrl.searchParams.get("numericDramaId") || "0",
    );

    if (!dramaId.trim()) {
      return NextResponse.json(
        { error: "Parameter dramaId wajib diisi." },
        { status: 400 },
      );
    }

    const data = await fetchFreeReelsJson(
      buildApiUrl(`/dramas/${encodeURIComponent(dramaId.trim())}`),
    );

    const mapped = toEpisodes(data, numericDramaId, dramaId.trim());

    return NextResponse.json({
      ep1: (data as any)?.episode_list?.[0] || (data as any)?.episodes?.[0] || (data as any)?.data?.[0] || null,
      ep30: (data as any)?.episode_list?.[29] || (data as any)?.episodes?.[29] || (data as any)?.data?.[29] || null,
      mapped1: mapped[0],
      mapped30: mapped[29],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat episode FreeReels.",
      },
      { status: 500 },
    );
  }
}
