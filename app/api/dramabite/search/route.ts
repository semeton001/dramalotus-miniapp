import { NextRequest, NextResponse } from "next/server";
import {
  adaptDramabiteDramaList,
  extractDramabiteItemsDeep,
  feedResponse,
  fetchDramabiteJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) {
      return feedResponse([], 1);
    }

    const payload = await fetchDramabiteJson("/search", {
      q: query,
      limit: 20,
    });

    const items = adaptDramabiteDramaList(extractDramabiteItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaBite search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search DramaBite.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
