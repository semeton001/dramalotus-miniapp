import { NextRequest, NextResponse } from "next/server";
import {
  buildShortmaxFeedUrl,
  fetchShortmaxJson,
  normalizeShortmaxFeed,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const [forYouPayload, epicPayload] = await Promise.all([
      fetchShortmaxJson(buildShortmaxFeedUrl("foryou", 1)).catch(() => null),
      fetchShortmaxJson(buildShortmaxFeedUrl("hot")).catch(() => null),
    ]);

    const merged = [
      ...(forYouPayload ? normalizeShortmaxFeed(forYouPayload, "foryou", "7") : []),
      ...(epicPayload ? normalizeShortmaxFeed(epicPayload, "foryou", "7") : []),
    ];

    const deduped = Array.from(
      new Map(merged.map((item) => [item.shortmaxDramaId || item.slug || item.id, item])).values(),
    );

    return NextResponse.json(
      {
        items: deduped,
        hasNextPage: false,
        page: 1,
      },
      {
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    console.error("Shortmax ForYou route error:", error);

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
