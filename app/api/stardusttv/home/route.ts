import { NextRequest, NextResponse } from "next/server";
import {
  adaptStardustDramaList,
  extractStardustItemsDeep,
  feedResponse,
  fetchStardustJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Math.min(
      5,
      Math.max(1, Number(request.nextUrl.searchParams.get("page") || "1")),
    );

    const payload = await fetchStardustJson("/category/0", {
      page,
      page_size: 30,
    });

    const items = adaptStardustDramaList(extractStardustItemsDeep(payload));

    return feedResponse(items, page, page < 5);
  } catch (error) {
    console.error("StardustTV home route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load StardustTV home.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
