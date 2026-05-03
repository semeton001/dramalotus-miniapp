import { NextResponse } from "next/server";
import {
  adaptMicrodramaDramaList,
  extractMicrodramaItemsDeep,
  feedResponse,
  fetchMicrodramaJson,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchMicrodramaJson("/dramas", {
      limit: 100,
    });

    const items = adaptMicrodramaDramaList(extractMicrodramaItemsDeep(payload));
    return feedResponse(items, 1);
  } catch (error) {
    console.error("MicroDrama home route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load MicroDrama home.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
