import { NextRequest, NextResponse } from "next/server";
import {
  buildShortmaxFeedUrl,
  fetchShortmaxJson,
  normalizeShortmaxFeed,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Math.max(
      1,
      Number(request.nextUrl.searchParams.get("page") || "1") || 1,
    );
    const type = request.nextUrl.searchParams.get("type") || "monthly";
    const payload = await fetchShortmaxJson(
      buildShortmaxFeedUrl("trending", page, type),
    );

    return NextResponse.json(
      normalizeShortmaxFeed(payload, "trending", "7"),
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Shortmax trending route error:", error);

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
