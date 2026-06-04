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
        categoryKey: "Dramanova_banner",
        page: 1,
        size: 5,
        limit: 6,
      }),
      fetchDramaNovaJson("/recommend", {
        categoryKey: "Dramanova_Animation",
        page: 1,
        size: 5,
        limit: 20,
      }),
    ]);

    const items = adaptDramaNovaDramaList(payloads.flatMap(extractDramaNovaItemsDeep));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaNova foryou route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaNova ForYou.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
