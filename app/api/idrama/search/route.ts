import { NextRequest, NextResponse } from "next/server";
import {
  adaptIdramaDramaList,
  dedupeIdramaDramas,
  extractIdramaItemsDeep,
  fetchIdramaJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";
    const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;

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

    const payload = await fetchIdramaJson("/search", {
      q: query,
      page,
      page_size: 50,
    });

    const items = dedupeIdramaDramas(
      adaptIdramaDramaList(extractIdramaItemsDeep(payload), "iDrama"),
    );

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("iDrama search route error:", error);
    return NextResponse.json(
      {
        error: "Failed to search iDrama.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
