import { NextResponse } from "next/server";
import {
  fetchAndNormalizeFeed,
  jsonError,
} from "../_shared";

export async function GET() {
  try {
    const dramas = await fetchAndNormalizeFeed(
      "/category?navigation_id=78&page=1&page_size=20",
      "trending",
    );

    return NextResponse.json(
      dramas.map((item, index) => ({
        ...item,
        badge: "Terbaru",
        isNew: true,
        isTrending: false,
        sortOrder: index,
      })),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat Terbaru FlickReels.",
    );
  }
}
