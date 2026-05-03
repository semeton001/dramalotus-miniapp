import { NextRequest, NextResponse } from "next/server";
import {
  adaptStardustDramaList,
  extractStardustItemsDeep,
  feedResponse,
  fetchStardustJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1, false);

    const payload = await fetchStardustJson("/search", {
      q: query,
      page: 1,
      page_size: 30,
    });

    const items = adaptStardustDramaList(extractStardustItemsDeep(payload));

    return feedResponse(items, 1, false);
  } catch (error) {
    console.error("StardustTV search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search StardustTV.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
