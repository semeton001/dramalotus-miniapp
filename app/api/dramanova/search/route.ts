import { NextRequest, NextResponse } from "next/server";
import {
  adaptDramaNovaDramaList,
  extractDramaNovaItemsDeep,
  feedResponse,
  fetchDramaNovaJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1);

    const payload = await fetchDramaNovaJson("/search", { q: query });
    const items = adaptDramaNovaDramaList(extractDramaNovaItemsDeep(payload));

    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaNova search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search DramaNova.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
