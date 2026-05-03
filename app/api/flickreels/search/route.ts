import { NextRequest, NextResponse } from "next/server";
import {
  buildFlickreelsApiUrl,
  fetchAndNormalizeFeed,
  jsonError,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query =
      request.nextUrl.searchParams.get("query")?.trim() ||
      request.nextUrl.searchParams.get("keyword")?.trim() ||
      "";

    if (!query) {
      return NextResponse.json([]);
    }

    const dramas = await fetchAndNormalizeFeed(
      buildFlickreelsApiUrl("/search", {
        keyword: query,
        page: 1,
        page_size: 10,
      }),
      "search",
    );

    return NextResponse.json(dramas);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal mencari drama FlickReels.",
    );
  }
}
