import { NextRequest, NextResponse } from "next/server";
import {
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
      `https://captain.sapimu.au/flickreels/api/search?keyword=${encodeURIComponent(
        query,
      )}&lang=id`,
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
