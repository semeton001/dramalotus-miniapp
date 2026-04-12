import { NextRequest, NextResponse } from "next/server";
import { fetchAndNormalizeFeed, FLICKREELS_LANG, jsonError } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const dramas = await fetchAndNormalizeFeed(
      `/search?q=${encodeURIComponent(query)}&lang=${FLICKREELS_LANG}`,
      "search",
    );
    return NextResponse.json(dramas);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal mencari drama Flickreels.",
    );
  }
}
