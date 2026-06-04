import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxSearch,
  getLang,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const payloads = await Promise.all([
      fetchDramaBoxSearch("sulih suara", 1, lang),
      fetchDramaBoxSearch("sulih suara", 2, lang),
    ]);

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
    console.error("Failed to fetch DramaBox VIP:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox VIP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
