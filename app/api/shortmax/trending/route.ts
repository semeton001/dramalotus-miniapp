import { NextRequest, NextResponse } from "next/server";
import {
  buildShortmaxFeedUrl,
  fetchShortmaxJson,
  normalizeShortmaxFeed,
} from "../_shared";

export async function GET(_request: NextRequest) {
  try {
    const payload = await fetchShortmaxJson("https://captain.sapimu.au/shortmax/api/v1/feed/ranked?lang=id");
    const items = normalizeShortmaxFeed(payload, "trending", "7");

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page: 1,
      },
      {
        headers: { "Cache-Control": "no-store" },
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
