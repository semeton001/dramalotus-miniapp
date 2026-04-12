import { NextRequest, NextResponse } from "next/server";
import {
  GOODSHORT_LANG,
  enrichGoodshortDramasWithBookDetails,
  fetchGoodshortJson,
  normalizeGoodshortFeed,
  readPositiveInt,
} from "../_shared";

const GOODSHORT_POPULAR_UPSTREAM_PAGE = 10;
const GOODSHORT_POPULAR_UPSTREAM_SIZE = 30;
const GOODSHORT_POPULAR_PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  try {
    const page = readPositiveInt(request, "page", 1);

    const payload = await fetchGoodshortJson("/home", {
      lang: GOODSHORT_LANG,
      channel: -1,
      page: GOODSHORT_POPULAR_UPSTREAM_PAGE,
      size: GOODSHORT_POPULAR_UPSTREAM_SIZE,
    });

    const items = normalizeGoodshortFeed(payload, "Populer");
    const start = (page - 1) * GOODSHORT_POPULAR_PAGE_SIZE;
    const end = start + GOODSHORT_POPULAR_PAGE_SIZE;
    const pagedItems = items.slice(start, end);
    const hydrated = await enrichGoodshortDramasWithBookDetails(pagedItems);
    const hasMore = end < items.length;

    return NextResponse.json(hydrated, {
      headers: {
        "x-has-more": hasMore ? "1" : "0",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat feed GoodShort populer.",
      },
      { status: 500 },
    );
  }
}
