import { NextResponse } from "next/server";
import {
  adaptFundramaDramaList,
  extractFundramaItemsDeep,
  feedResponse,
  fetchFundramaJson,
} from "../_shared";

export async function GET() {
  try {
    const [page1, page2] = await Promise.all([
      fetchFundramaJson("/dramas", {
        page: 1,
        limit: 50,
      }),

      fetchFundramaJson("/dramas", {
        page: 2,
        limit: 50,
      }),
    ]);

    const items = adaptFundramaDramaList([
      ...extractFundramaItemsDeep(page1),
      ...extractFundramaItemsDeep(page2),
    ]);

    return feedResponse(items, 1);
  } catch (error) {
    console.error("FunDrama home route error:", error);

    return NextResponse.json(
      {
        error: "Failed to load FunDrama home.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 },
    );
  }
}
