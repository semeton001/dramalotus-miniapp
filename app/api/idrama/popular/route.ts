import { NextRequest, NextResponse } from "next/server";
import {
  IDRAMA_POPULAR_SECTION_ID,
  adaptIdramaDramaList,
  fetchIdramaJson,
  getSearchParam,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = getSearchParam(request, "page", "1");
    const payload = await fetchIdramaJson(`/section/${IDRAMA_POPULAR_SECTION_ID}`, {
      page,
    });

    const list =
      Array.isArray((payload as { short_plays?: unknown[] })?.short_plays)
        ? (payload as { short_plays: unknown[] }).short_plays
        : [];

    return NextResponse.json(adaptIdramaDramaList(list, "Populer"));
  } catch (error) {
    console.error("iDrama popular route error:", error);
    return NextResponse.json(
      { error: "Failed to load iDrama popular." },
      { status: 500 },
    );
  }
}
