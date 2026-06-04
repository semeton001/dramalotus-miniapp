import { NextResponse } from "next/server";
import {
  fetchAndNormalizeFeed,
  jsonError,
  dedupeFlickreelsDramas,
} from "../_shared";

function shuffle<T>(items: T[]): T[] {
  const cloned = [...items];

  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
}

export async function GET() {
  try {
    const [a, b] = await Promise.all([
      fetchAndNormalizeFeed("/hot-rank", "random"),
      fetchAndNormalizeFeed(
        "/category?navigation_id=684&page=1&page_size=20",
        "random",
      ),
    ]);

    return NextResponse.json(
      shuffle(
        dedupeFlickreelsDramas([...a, ...b]),
      ),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Gagal memuat Acak FlickReels.",
    );
  }
}
