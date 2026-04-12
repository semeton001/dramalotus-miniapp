import { NextResponse } from "next/server";
import { fetchAndNormalizeFeed, FLICKREELS_LANG, jsonError } from "../_shared";

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
    const [home, foryou, trending] = await Promise.all([
      fetchAndNormalizeFeed(`/api/home?lang=${FLICKREELS_LANG}&page=1`, "home"),
      fetchAndNormalizeFeed(`/api/list?lang=${FLICKREELS_LANG}&page=1&page_size=15&category_id=0`, "foryou"),
      fetchAndNormalizeFeed(`/trending?lang=${FLICKREELS_LANG}`, "trending"),
    ]);

    const merged = [...home, ...foryou, ...trending];
    const deduped = Array.from(new Map(merged.map((item) => [item.id, item])).values());

    return NextResponse.json(shuffle(deduped));
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal memuat feed acak Flickreels.",
    );
  }
}
