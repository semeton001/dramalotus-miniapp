import { NextRequest, NextResponse } from "next/server";
import {
  adaptMicrodramaDramaList,
  extractMicrodramaItemsDeep,
  feedResponse,
  fetchMicrodramaJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1);

    const payload = await fetchMicrodramaJson("/dramas/search", { q: query });
    const items = adaptMicrodramaDramaList(extractMicrodramaItemsDeep(payload));

    return feedResponse(items, 1);
  } catch (error) {
    console.error("MicroDrama search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search MicroDrama.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
