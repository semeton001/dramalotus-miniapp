import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxSearchList } from "@/lib/adapters/drama/dramabox";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxSearch,
  getLang,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("q")?.trim() ||
      "";

    const lang = getLang(request);

    if (!query) {
      return NextResponse.json({ items: [], page: 1, hasNextPage: false });
    }

    const payloads = await Promise.all([
      fetchDramaBoxSearch(query, 1, lang),
      fetchDramaBoxSearch(query, 2, lang),
    ]);

    const rawItems = dedupeDramaBoxItems(
      payloads.flatMap((payload) => extractDramaBoxItemsDeep(payload)),
    );

    const adapted = adaptDramaBoxSearchList(rawItems).filter(
      (item) => item.coverImage || item.posterImage,
    );

    return NextResponse.json(
      {
        items: enrichDramaBoxDramaMeta(adapted, rawItems),
        page: 1,
        hasNextPage: false,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Failed to search DramaBox:", error);

    return NextResponse.json(
      {
        error: "Failed to search DramaBox",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
