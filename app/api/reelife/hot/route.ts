import { NextRequest, NextResponse } from "next/server";
import {
  adaptReelifeDramaList,
  extractFeedItems,
  getLang,
  getPage,
  inferHasNextPage,
  jsonFeed,
  reelifeFetch,
} from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const page = getPage(req, 1);
    const lang = getLang(req);
    const letter = (req.nextUrl.searchParams.get("letter") || "c").trim() || "c";
    const payload = await reelifeFetch<unknown>(
      `/api/v1/browse?page=${page}&letter=${encodeURIComponent(letter)}&lang=${lang}`,
    );
    const items = adaptReelifeDramaList(extractFeedItems(payload));
    return jsonFeed(items, page, inferHasNextPage(items));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown Reelife hot error" },
      { status: 500 },
    );
  }
}
