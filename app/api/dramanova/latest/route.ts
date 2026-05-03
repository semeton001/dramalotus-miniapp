import { NextResponse } from "next/server";
import {
  adaptDramaNovaDramaList,
  extractDramaNovaItemsDeep,
  feedResponse,
  fetchDramaNovaJson,
} from "../_shared";

export async function GET() {
  try {
    const payloads = await Promise.all([
      fetchDramaNovaJson("/recommend", {
        categoryKey: "dramanova_new",
        page: 1,
        size: 5,
        limit: 12,
      }),
      fetchDramaNovaJson("/recommend", {
        categoryKey: "dramanova_new",
        page: 2,
        size: 5,
        limit: 12,
      }),
    ]);

    const items = adaptDramaNovaDramaList(payloads.flatMap(extractDramaNovaItemsDeep));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaNova latest route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaNova latest.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
