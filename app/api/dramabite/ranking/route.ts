import { NextResponse } from "next/server";
import {
  adaptDramabiteDramaList,
  extractDramabiteItemsDeep,
  feedResponse,
  fetchDramabiteJson,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchDramabiteJson("/recommend", { page: 0 });
    const items = adaptDramabiteDramaList(extractDramabiteItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("DramaBite ranking route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaBite ranking.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
