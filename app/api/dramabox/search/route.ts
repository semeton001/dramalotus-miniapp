import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxSearchList } from "@/lib/adapters/drama/dramabox";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxSearch,
  getLang,
  getPage,
  getSearchQuery,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query = getSearchQuery(request);
    const page = getPage(request, 1);
    const lang = getLang(request);

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

    const payload = await fetchDramaBoxSearch(query, page, lang);
    const rawItems = dedupeDramaBoxItems(extractDramaBoxItemsDeep(payload));

    const adapted = adaptDramaBoxSearchList(rawItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const items = enrichDramaBoxDramaMeta(adapted, rawItems);

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page,
      },
      { status: 200 },
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
