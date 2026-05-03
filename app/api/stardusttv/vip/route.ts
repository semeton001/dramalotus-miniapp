import { NextResponse } from "next/server";
import {
  adaptStardustDramaList,
  extractStardustItemsDeep,
  feedResponse,
  fetchStardustJson,
} from "../_shared";

export async function GET() {
  try {
    const payloads = await Promise.all([
      fetchStardustJson("/category/1", { page: 1, page_size: 30 }),
      fetchStardustJson("/category/1", { page: 2, page_size: 30 }),
    ]);

    const items = adaptStardustDramaList(
      payloads.flatMap((payload) => extractStardustItemsDeep(payload)),
    );

    return feedResponse(items, 1, false);
  } catch (error) {
    console.error("StardustTV VIP route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load StardustTV VIP.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
