import { NextResponse } from "next/server";
import {
  buildFlickreelsApiUrl,
  fetchAndNormalizeFeed,
  jsonError,
} from "../_shared";

export async function GET() {
  try {
    const dramas = await fetchAndNormalizeFeed(
      buildFlickreelsApiUrl("/category", {
        navigation_id: 78,
        page: 50,
        page_size: 10,
      }),
      "home",
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
