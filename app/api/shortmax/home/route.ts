import { NextResponse } from "next/server";
import { fetchShortmaxJson, normalizeShortmaxFeed } from "../_shared";

function dedupe(items: any[]) {
  return Array.from(
    new Map(
      items.map((x) => [x.shortmaxDramaId || x.slug || x.id, x]),
    ).values(),
  );
}

export async function GET() {
  try {
    const [home, epic, foryou] = await Promise.all([
      fetchShortmaxJson("https://captain.sapimu.au/shortmax/api/v1/home?tab=1&lang=id"),
      fetchShortmaxJson("https://captain.sapimu.au/shortmax/api/v1/feed/epic?lang=id"),
      fetchShortmaxJson("https://captain.sapimu.au/shortmax/api/v1/foryou?page=1&lang=id"),
    ]);

    return NextResponse.json({
      items: dedupe([
        ...normalizeShortmaxFeed(home, "home"),
        ...normalizeShortmaxFeed(epic, "hot"),
        ...normalizeShortmaxFeed(foryou, "foryou"),
      ]),
      hasNextPage: false,
      page: 1,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Shortmax home error",
      },
      { status: 500 },
    );
  }
}
