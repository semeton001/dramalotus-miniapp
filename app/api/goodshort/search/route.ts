import { NextRequest, NextResponse } from "next/server";
import {
  GOODSHORT_CODE,
  GOODSHORT_LANG,
  GOODSHORT_SEARCH_SIZE,
  fetchGoodshortJson,
  normalizeGoodshortFeed,
  readPositiveInt,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
    const page = readPositiveInt(request, "page", 1);

    if (!query) {
      return NextResponse.json([]);
    }

    const payload = await fetchGoodshortJson("/search", {
      lang: GOODSHORT_LANG,
      q: query,
      page,
      size: GOODSHORT_SEARCH_SIZE,
      code: GOODSHORT_CODE,
    });

    return NextResponse.json(normalizeGoodshortFeed(payload, "Search"));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal mencari drama GoodShort.",
      },
      { status: 500 },
    );
  }
}
