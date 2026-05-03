import { NextRequest, NextResponse } from "next/server";
import {
  adaptDramabiteDramaList,
  extractDramabiteItemsDeep,
  feedResponse,
  fetchDramabiteJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") || "0") || 0;
    const payload = await fetchDramabiteJson("/foryou", { page });
    const items = adaptDramabiteDramaList(extractDramabiteItemsDeep(payload));
    return feedResponse(items, page);
  } catch (error) {
    console.error("DramaBite foryou route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaBite ForYou.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
