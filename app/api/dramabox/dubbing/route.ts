import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  extractDramaBoxItemsDeep,
  fetchDramaBoxDubbed,
  getLang,
  getPage,
} from "../_shared";

const DUBBED_PAGES = [1, 2, 3, 4, 5, 6];
const PAGE_SIZE = 24;

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const page = getPage(request, 1);

    const payloads = await Promise.all(
      DUBBED_PAGES.map((upstreamPage) => fetchDramaBoxDubbed(upstreamPage, lang)),
    );

    const extractedItems = payloads.flatMap((raw) =>
      extractDramaBoxItemsDeep(raw),
    );
    const dedupedItems = dedupeDramaBoxItems(extractedItems);

    const dramas = adaptDramaBoxDramaList(dedupedItems).filter(
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
    console.error("Failed to fetch DramaBox dubbing:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox dubbing",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
