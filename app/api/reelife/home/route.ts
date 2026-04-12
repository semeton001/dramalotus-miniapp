import { NextRequest, NextResponse } from "next/server";
import {
  adaptReelifeDramaList,
  extractFeedItems,
  getLang,
  getPage,
  jsonFeed,
  reelifeFetch,
} from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const page = getPage(req, 1);
    const lang = getLang(req);
    const payload = await reelifeFetch<unknown>(
      `/api/v1/home?page=${page}&lang=${lang}`,
    );
    const items = adaptReelifeDramaList(extractFeedItems(payload));

    return jsonFeed(items, page, items.length > 0);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown Reelife home error",
      },
      { status: 500 },
    );
  }
}
