import { NextResponse } from "next/server";
import {
  adaptReelifeDramaList,
  extractFeedItems,
  jsonFeed,
  reelifeFetch,
} from "../_shared";

export async function GET() {
  try {
    const payload =
      await reelifeFetch(
        "/foryou?page=1&size=30",
      );

    const items =
      adaptReelifeDramaList(
        extractFeedItems(payload),
      );

    return jsonFeed(items, 1, false);
  } catch (error) {
    console.error("Reelife foryou route error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown Reelife foryou error",
      },
      { status: 500 },
    );
  }
}
