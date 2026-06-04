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
        "/for-you?page=1&page_size=10",
        "foryou",
      ),
      fetchAndNormalizeFeed(
        "/for-you?page=2&page_size=10",
        "foryou",
      ),
    ]);

    return NextResponse.json(
      dedupeFlickreelsDramas([...a, ...b]),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat ForYou FlickReels.",
    );
  }
}
