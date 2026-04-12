import { NextRequest, NextResponse } from "next/server";
import {
  GOODSHORT_LANG,
  enrichGoodshortDramasWithBookDetails,
  fetchGoodshortJson,
  normalizeGoodshortFeed,
} from "../_shared";

export async function GET(_request: NextRequest) {
  try {
    const payload = await fetchGoodshortJson("/hot", {
      lang: GOODSHORT_LANG,
    });

    const items = normalizeGoodshortFeed(payload, "Trending");
    const hydrated = await enrichGoodshortDramasWithBookDetails(items);

    return NextResponse.json(hydrated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat feed GoodShort trending.",
      },
      { status: 500 },
    );
  }
}
