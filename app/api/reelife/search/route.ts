import { NextRequest, NextResponse } from "next/server";
import {
  adaptReelifeDramaList,
  extractFeedItems,
  getLang,
  getPage,
  getSearchQuery,
  reelifeFetch,
} from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const q = getSearchQuery(req);
    const page = getPage(req, 1);
    const lang = getLang(req);

    if (!q) {
      return NextResponse.json([]);
    }

    const payload = await reelifeFetch<unknown>(
      `/api/v1/search?q=${encodeURIComponent(q)}&page=${page}&lang=${lang}`,
    );
    return NextResponse.json(adaptReelifeDramaList(extractFeedItems(payload)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown Reelife search error" },
      { status: 500 },
    );
  }
}
