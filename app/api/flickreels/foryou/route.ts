import { NextResponse } from "next/server";
import {
  buildFlickreelsApiUrl,
  fetchAndNormalizeFeed,
  jsonError,
} from "../_shared";

export async function GET() {
  try {
    const dramas = await fetchAndNormalizeFeed(
      buildFlickreelsApiUrl("/for-you", {
        page: 1,
        page_size: 10,
      }),
      "foryou",
    );

    return NextResponse.json(dramas);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat ForYou FlickReels.",
    );
  }
}
