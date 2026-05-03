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
        navigation_id: 405,
        page: 1,
        page_size: 50,
      }),
      "home",
    );

    return NextResponse.json(dramas);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat Beranda FlickReels.",
    );
  }
}
