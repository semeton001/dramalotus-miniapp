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
      fetchDramaNovaJson("/dramas", { page: 1, size: 20 }),
      fetchDramaNovaJson("/dramas", { page: 2, size: 20 }),
      fetchDramaNovaJson("/dramas", { page: 3, size: 20 }),
    ]);

    const items = adaptDramaNovaDramaList(payloads.flatMap(extractDramaNovaItemsDeep));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaNova home route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaNova home.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
