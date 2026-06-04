import { NextResponse } from "next/server";
import {
  adaptFlextvDramaList,
  extractFlextvItemsDeep,
  feedResponse,
  fetchFlextvJson,
} from "../_shared";

export async function GET() {
  try {
    const payloads = await Promise.all([
      fetchFlextvJson("/tabs/3", { page: 1, lang: "id" }),
    ]);

    const items = adaptFlextvDramaList(
      payloads.flatMap((payload) => extractFlextvItemsDeep(payload)),
    );

    return feedResponse(items, 1);
  } catch (error) {
    console.error("FlexTV foryou route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FlexTV ForYou.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
