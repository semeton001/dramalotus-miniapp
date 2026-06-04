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
      fetchFlextvJson("/tabs/7", { page: 1, lang: "id" }),
      fetchFlextvJson("/tabs/8", { page: 1, lang: "id" }),
      fetchFlextvJson("/tabs/11", { page: 1, lang: "id" }),
    ]);

    const items = adaptFlextvDramaList(
      payloads.flatMap((payload) => extractFlextvItemsDeep(payload)),
    );

    return feedResponse(items, 1);
  } catch (error) {
    console.error("FlexTV home route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FlexTV home.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
