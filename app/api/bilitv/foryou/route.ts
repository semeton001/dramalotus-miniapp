import { NextResponse } from "next/server";
import {
  adaptBiliTVDramaList,
  enrichBiliTVSubtitleAvailability,
  extractBiliTVItemsDeep,
  feedResponse,
  fetchBiliTVJson,
} from "../_shared";

export async function GET() {
  try {
    const payload = await fetchBiliTVJson("/recommend");
    const items = await enrichBiliTVSubtitleAvailability(
      adaptBiliTVDramaList(extractBiliTVItemsDeep(payload)),
    );

    return feedResponse(items, 1, false);
  } catch (error) {
    console.error("BiliTV foryou route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load BiliTV ForYou.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
