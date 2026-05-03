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
      fetchStardustJson("/category/2", { page: 1, page_size: 30 }),
      fetchStardustJson("/category/10", { page: 1, page_size: 30 }),
    ]);

    const items = adaptStardustDramaList(
      payloads.flatMap((payload) => extractStardustItemsDeep(payload)),
    );

    return feedResponse(items, 1, false);
  } catch (error) {
    console.error("StardustTV romance route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load StardustTV romance.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
