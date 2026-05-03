import { NextRequest, NextResponse } from "next/server";
import {
  buildShortmaxFeedUrl,
  fetchShortmaxJson,
  normalizeShortmaxFeed,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Math.min(
      5,
      Math.max(1, Number(request.nextUrl.searchParams.get("page") || "1") || 1),
    );

    const payload = await fetchShortmaxJson(buildShortmaxFeedUrl("home", page));
    const items = normalizeShortmaxFeed(payload, "home", "7");

    return NextResponse.json(
      {
        items,
        hasNextPage: page < 5,
        page,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Shortmax home route error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat feed Shortmax.",
      },
      { status: 500 },
    );
  }
}
