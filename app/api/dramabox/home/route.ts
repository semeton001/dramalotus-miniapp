import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxHomePage,
  getLang,
  getPage,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = getPage(request, 1);
    const lang = getLang(request);

    const [payload, nextPayload] = await Promise.all([
      fetchDramaBoxHomePage(page, lang),
      fetchDramaBoxHomePage(page + 1, lang).catch(() => null),
    ]);

    const homepageItems = extractDramaBoxItemsDeep(payload);
    const mergedItems = dedupeDramaBoxItems(homepageItems);

    const adapted = adaptDramaBoxDramaList(mergedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const items = enrichDramaBoxDramaMeta(adapted, mergedItems);

    const nextItems = nextPayload
      ? dedupeDramaBoxItems(extractDramaBoxItemsDeep(nextPayload))
      : [];

    const nextAdapted = adaptDramaBoxDramaList(nextItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const hasNextPage = nextAdapted.length > 0;

    return NextResponse.json(
      {
        items,
        hasNextPage,
        page,
      },
      { status: 200 },
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
