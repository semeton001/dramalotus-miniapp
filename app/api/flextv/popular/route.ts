import { NextResponse } from "next/server";
import {
  adaptFlextvDramaList,
  extractFlextvItemsDeep,
  feedResponse,
  fetchFlextvJson,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchFlextvJson("/tabs/1", { page: 1 });
    const items = adaptFlextvDramaList(extractFlextvItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("FlexTV popular route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FlexTV popular.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
