import { NextRequest, NextResponse } from "next/server";
import {
  buildShortmaxApiUrl,
  fetchShortmaxJson,
  normalizeShortmaxFeed,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const payload = await fetchShortmaxJson(
      buildShortmaxApiUrl("/search", {
        q: q,
        page: 1,
      }),
    );

    return NextResponse.json({
      items: normalizeShortmaxFeed(payload, "search"),
      hasNextPage: false,
      page: 1,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shortmax search error",
      },
      { status: 500 },
    );
  }
}
