import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxRanking,
  getLang,
  getPage,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const page = getPage(request, 1);

    const payload = await fetchDramaBoxRanking(lang);
    const rawItems = dedupeDramaBoxItems(extractDramaBoxItemsDeep(payload));

    const adapted = adaptDramaBoxDramaList(rawItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const items = enrichDramaBoxDramaMeta(adapted, rawItems).map(
      (item, index) => ({
        ...item,
        badge: "Ranking",
        isTrending: true,
        sortOrder: index,
      }),
    );

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch DramaBox ranking:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox ranking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
