import { NextRequest, NextResponse } from "next/server";
import {
  adaptDramapopsDramaList,
  extractDramapopsItemsDeep,
  feedResponse,
  fetchDramapopsJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1);

    const payload = await fetchDramapopsJson("/search", {
      q: query,
      limit: 50,
    });
    const items = adaptDramapopsDramaList(extractDramapopsItemsDeep(payload));

    return feedResponse(items, 1);
  } catch (error) {
    console.error("Dramapops search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search Dramapops.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
