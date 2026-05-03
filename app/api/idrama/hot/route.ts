import { NextRequest, NextResponse } from "next/server";
import {
  adaptIdramaDramaList,
  dedupeIdramaDramas,
  extractIdramaItemsDeep,
  fetchIdramaJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = Number(request.nextUrl.searchParams.get("page") || "1") || 1;

    const payload = await fetchIdramaJson("/ranking/trending", {
      page,
      limit: 50,
    });

    const items = dedupeIdramaDramas(
      adaptIdramaDramaList(extractIdramaItemsDeep(payload), "Trending"),
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
    console.error("iDrama trending route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load iDrama trending.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
