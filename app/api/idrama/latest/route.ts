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

    const payloads = await Promise.all([
      fetchIdramaJson("/latest", {
        page,
        limit: 50,
      }),
      fetchIdramaJson("/ranking/trending", {
        page,
        limit: 50,
      }),
    ]);

    const rawItems = payloads.flatMap((payload) => extractIdramaItemsDeep(payload));
    const items = dedupeIdramaDramas(adaptIdramaDramaList(rawItems, "Terbaru"));

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("iDrama latest route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load iDrama latest.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
