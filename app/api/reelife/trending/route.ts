import { NextRequest, NextResponse } from "next/server";
import {
  adaptReelifeDramaList,
  buildRandomSources,
  dedupeById,
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
    const { hotPath } = buildRandomSources(page);

    const [rankPayload, homePayload, hotPayload] = await Promise.all([
      reelifeFetch<unknown>(`/api/v1/rank?type=populer&lang=${lang}`),
      reelifeFetch<unknown>(`/api/v1/home?page=${page}&lang=${lang}`),
      reelifeFetch<unknown>(hotPath),
    ]);

    const items = dedupeById([
      ...adaptReelifeDramaList(extractFeedItems(rankPayload)),
      ...adaptReelifeDramaList(extractFeedItems(homePayload)),
      ...adaptReelifeDramaList(extractFeedItems(hotPayload)),
    ]).slice(0, 20);

    return jsonFeed(items, page, false);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "reelife",
        tab: "trending",
        error:
          error instanceof Error
            ? error.message
            : "Unknown Reelife trending error",
      },
      { status: 500 },
    );
  }
}
