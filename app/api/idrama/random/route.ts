import { NextRequest, NextResponse } from "next/server";
import {
  IDRAMA_POPULAR_SECTION_ID,
  adaptIdramaDramaList,
  fetchIdramaJson,
  getSearchParam,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const rawPage = Number(getSearchParam(request, "page", "1"));
    const mappedPage = ((Math.max(1, rawPage) - 1) % 7) + 1;

    const payload = await fetchIdramaJson(`/section/${IDRAMA_POPULAR_SECTION_ID}`, {
      page: mappedPage,
    });

    const list =
      Array.isArray((payload as { short_plays?: unknown[] })?.short_plays)
        ? (payload as { short_plays: unknown[] }).short_plays
        : [];

    const dramas = adaptIdramaDramaList(list, "Acak").sort(
      () => Math.random() - 0.5,
    );

    return NextResponse.json(dramas);
  } catch (error) {
    console.error("iDrama random route error:", error);
    return NextResponse.json(
      { error: "Failed to load iDrama random." },
      { status: 500 },
    );
  }
}
