import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  extractDramaBoxItemsDeep,
  fetchDramaBoxHomePage,
  fetchDramaBoxLatest,
  getLang,
  getPage,
  mergeUniqueDramaBoxItems,
} from "../_shared";

const HOMEPAGE_PAGES = [1, 2, 3, 4];
const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const page = getPage(request, 1);

    const [latestPayload, ...homepagePayloads] = await Promise.all([
      fetchDramaBoxLatest(lang),
      ...HOMEPAGE_PAGES.map((homepage) => fetchDramaBoxHomePage(homepage, lang)),
    ]);

    const latestItems = extractDramaBoxItemsDeep(latestPayload);
    const homepageItems = homepagePayloads.flatMap((raw) =>
      extractDramaBoxItemsDeep(raw),
    );

    const mergedItems = mergeUniqueDramaBoxItems([latestItems, homepageItems]);

    const dramas = adaptDramaBoxDramaList(mergedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    const start = (page - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const items = dramas.slice(start, end);
    const hasNextPage = end < dramas.length;

    return NextResponse.json(
      {
        items,
        hasNextPage,
        page,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to fetch DramaBox latest:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox latest",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
