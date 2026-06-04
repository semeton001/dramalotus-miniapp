import { NextRequest, NextResponse } from "next/server";
import {
  adaptBiliTVDramaList,
  enrichBiliTVSubtitleAvailability,
  extractBiliTVItemsDeep,
  feedResponse,
  fetchBiliTVJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1, false);

    const payload = await fetchBiliTVJson("/search", { q: query });

    const normalized = Array.isArray(payload)
      ? payload
      : extractBiliTVItemsDeep(payload);

    const items = adaptBiliTVDramaList(normalized);

    return feedResponse(items, 1, false);
  } catch (error) {
    console.error("BiliTV search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search BiliTV.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
