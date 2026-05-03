import { NextResponse } from "next/server";
import {
  adaptFundramaDramaList,
  extractFundramaItemsDeep,
  feedResponse,
  fetchFundramaJson,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchFundramaJson("/dramas", {
      page: 3,
      limit: 50,
    });

    const items = adaptFundramaDramaList(extractFundramaItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("FunDrama Hot route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FunDrama Hot.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
