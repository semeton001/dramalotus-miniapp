import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  extractDramaBoxItemsDeep,
  fetchDramaBoxPopular,
  getLang,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const raw = await fetchDramaBoxPopular(lang);
    const extractedItems = extractDramaBoxItemsDeep(raw);
    const dedupedItems = dedupeDramaBoxItems(extractedItems);

    const dramas = adaptDramaBoxDramaList(dedupedItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    return NextResponse.json(dramas);
  } catch (error) {
    console.error("Failed to fetch DramaBox popular:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox popular",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
