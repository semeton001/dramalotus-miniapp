import { NextRequest, NextResponse } from "next/server";
import {
  buildShortmaxApiUrl,
  fetchShortmaxJson,
  normalizeShortmaxFeed,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";
    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") || "1") || 1,
    );

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

    const payload = await fetchShortmaxJson(
      buildShortmaxApiUrl("/search", {
        q: query,
        page,
      }),
    );

    const items = normalizeShortmaxFeed(payload, "search", "7");

    return NextResponse.json(
      {
        items,
        hasNextPage: items.length > 0 && page < 2,
        page,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Shortmax search route error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mencari Shortmax.",
      },
      { status: 500 },
    );
  }
}
