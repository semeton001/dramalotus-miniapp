import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";
import {
  NETSHORT_SANSEKAI_BASE_URL,
  loadNetshortHomeFeed,
  tryFetchJson,
} from "../_shared";

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items;
  const safeOffset = offset % items.length;
  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

export async function GET() {
  const data = await tryFetchJson(
    `${NETSHORT_SANSEKAI_BASE_URL}/foryou?page=1`,
  );

  if (data) {
    const dramas = normalizeNetshortFeed(data, "foryou", "5");
    if (dramas.length > 0) {
      return NextResponse.json(dramas);
    }
  }

  const fallback = await loadNetshortHomeFeed("5");
  const rotated = rotate(fallback, 6);

  return NextResponse.json(
    rotated.map((item, index) => ({
      ...item,
      badge: "ForYou",
      sortOrder: index,
    })),
  );
}