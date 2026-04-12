import { NextRequest, NextResponse } from "next/server";
import {
  adaptReelifeDramaList,
  buildRandomSources,
  dedupeById,
  extractFeedItems,
  getPage,
  jsonFeed,
  reelifeFetch,
} from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const page = getPage(req, 1);
    const { homePath, hotPath } = buildRandomSources(page);

    const [homePayload, hotPayload] = await Promise.all([
      reelifeFetch<unknown>(homePath),
      reelifeFetch<unknown>(hotPath),
    ]);

    const items = dedupeById([
      ...adaptReelifeDramaList(extractFeedItems(homePayload)),
      ...adaptReelifeDramaList(extractFeedItems(hotPayload)),
    ]);

    return jsonFeed(items, page, items.length > 0);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown Reelife random error" },
      { status: 500 },
    );
  }
}
