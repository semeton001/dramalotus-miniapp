import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoodshortJson,
  normalizeGoodshortFeed,
  readPositiveInt,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";
    const page = readPositiveInt(request, "page", 1);

    if (!query) {
      return NextResponse.json(
        {
          items: [],
          hasNextPage: false,
          page,
        },
        { status: 200 },
      );
    }

    const payload = await fetchGoodshortJson("/search", {
      q: query,
      page,
    });

    const items = normalizeGoodshortFeed(payload, "Search");

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
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
