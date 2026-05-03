import { NextRequest, NextResponse } from "next/server";
import {
  adaptFlextvDramaList,
  extractFlextvItemsDeep,
  feedResponse,
  fetchFlextvJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1);

    const payload = await fetchFlextvJson("/search", {
      q: query,
      page: 1,
    });

    const items = adaptFlextvDramaList(extractFlextvItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("FlexTV search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search FlexTV.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
