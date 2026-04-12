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
      buildShortmaxFeedUrl("home", page, type),
    );

    const normalized = normalizeShortmaxFeed(payload, "home", "7");
    const pageSize = 20;
    const start = (page - 1) * pageSize;
    const paginated = normalized.slice(start, start + pageSize);

    return NextResponse.json(paginated, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
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
