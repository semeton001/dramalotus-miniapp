import { NextResponse } from "next/server";
import {
  buildDiversifiedForYouFeed,
  fetchAndNormalizeFeed,
  FLICKREELS_LANG,
  jsonError,
} from "../_shared";

export async function GET() {
  try {
    const [home, listPage1, listPage2, listPage3] = await Promise.all([
      fetchAndNormalizeFeed(`/api/home?lang=${FLICKREELS_LANG}&page=1`, "home"),
      fetchAndNormalizeFeed(
        `/api/list?lang=${FLICKREELS_LANG}&page=1&page_size=15&category_id=0`,
        "foryou",
      ),
      fetchAndNormalizeFeed(
        `/api/list?lang=${FLICKREELS_LANG}&page=2&page_size=15&category_id=0`,
        "foryou",
      ),
      fetchAndNormalizeFeed(
        `/api/list?lang=${FLICKREELS_LANG}&page=3&page_size=15&category_id=0`,
        "foryou",
      ),
    ]);

    const dramas = buildDiversifiedForYouFeed(home, [...listPage1, ...listPage2, ...listPage3], 15);
    return NextResponse.json(dramas);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat feed Flickreels ForYou.",
    );
  }
}
