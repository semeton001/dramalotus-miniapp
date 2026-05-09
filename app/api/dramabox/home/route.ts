import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxHomePage,
  getLang,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const payloads = await Promise.all(
      [1, 2, 3, 4, 5].map((page) => fetchDramaBoxHomePage(page, lang)),
    );

    const rawItems = dedupeDramaBoxItems(
      payloads.flatMap((payload) => extractDramaBoxItemsDeep(payload)),
    );

    const adapted = adaptDramaBoxDramaList(rawItems).filter(
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
    console.error("Failed to fetch DramaBox home:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox home",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
