import { NextRequest, NextResponse } from "next/server";
import { adaptDramaBoxDramaList } from "@/lib/adapters/drama";
import {
  dedupeDramaBoxItems,
  enrichDramaBoxDramaMeta,
  extractDramaBoxItemsDeep,
  fetchDramaBoxRanking,
  getLang,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const lang = getLang(request);
    const raw = await fetchDramaBoxRanking(lang);
    const rawItems = dedupeDramaBoxItems(extractDramaBoxItemsDeep(raw));

    const adapted = adaptDramaBoxDramaList(rawItems).filter(
      (item) => item.id > 0 && item.title.trim().length > 0,
    );

    return NextResponse.json(enrichDramaBoxDramaMeta(adapted, rawItems));
  } catch (error) {
    console.error("Failed to fetch DramaBox popular/ranking:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox popular/ranking",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
