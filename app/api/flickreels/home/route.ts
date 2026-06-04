import { NextResponse } from "next/server";
import {
  fetchAndNormalizeFeed,
  jsonError,
  dedupeFlickreelsDramas,
} from "../_shared";

export async function GET() {
  try {
    const [a, b] = await Promise.all([
      fetchAndNormalizeFeed(
        "/category?navigation_id=405&page=1&page_size=20",
        "home",
      ),
      fetchAndNormalizeFeed(
        "/category?navigation_id=88&page=1&page_size=20",
        "home",
      ),
    ]);

    return NextResponse.json(
      dedupeFlickreelsDramas([...a, ...b]),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat Beranda FlickReels.",
    );
  }
}
