import { NextRequest, NextResponse } from "next/server";
import {
  adaptFundramaDramaList,
  extractFundramaItemsDeep,
  feedResponse,
  fetchFundramaJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    if (!query) return feedResponse([], 1);

    const payload = await fetchFundramaJson("/search", { q: query });
    const items = adaptFundramaDramaList(extractFundramaItemsDeep(payload));

    return feedResponse(items, 1);
  } catch (error) {
    console.error("FunDrama search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search FunDrama.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
