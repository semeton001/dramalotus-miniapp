import { NextRequest, NextResponse } from "next/server";
import {
  adaptBiliTVDramaList,
  enrichBiliTVSubtitleAvailability,
  BILITV_HOME_MAX_PAGE,
  extractBiliTVItemsDeep,
  feedResponse,
  fetchBiliTVJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Math.min(
      BILITV_HOME_MAX_PAGE,
      Math.max(1, Number(request.nextUrl.searchParams.get("page") || "1")),
    );

    const payloads = await Promise.all([
      fetchBiliTVJson("/home", { page: 1, limit: 20 }),
      fetchBiliTVJson("/home", { page: 2, limit: 20 }),
      fetchBiliTVJson("/home", { page: 3, limit: 20 }),
    ]);

    const items = adaptBiliTVDramaList(
      payloads.flatMap(extractBiliTVItemsDeep),
    );

    return feedResponse(items, 1, false);
  } catch (error) {
    console.error("BiliTV home route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load BiliTV home.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
