import { NextResponse } from "next/server";
import {
  buildFlickreelsApiUrl,
  fetchAndNormalizeFeed,
  jsonError,
} from "../_shared";

function shuffle<T>(items: T[]): T[] {
  const cloned = [...items];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
}

export async function GET() {
  try {
    const dramas = await fetchAndNormalizeFeed(
      buildFlickreelsApiUrl("/category", {
        navigation_id: 387,
        page: 1,
        page_size: 10,
      }),
      "random",
    );

    return NextResponse.json(shuffle(dramas));
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat Acak FlickReels.",
    );
  }
}
