import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";
import {
  NETSHORT_SANSEKAI_BASE_URL,
  loadNetshortHomeFeed,
  tryFetchJson,
} from "../_shared";

export async function GET() {
  const data = await tryFetchJson(`${NETSHORT_SANSEKAI_BASE_URL}/theaters`);

  if (data) {
    const dramas = normalizeNetshortFeed(data, "theaters", "5");
    if (dramas.length > 0) {
      return NextResponse.json(dramas);
    }
  }

  const fallback = await loadNetshortHomeFeed("5");
  const theaterLike = fallback.filter((_, index) => index % 2 === 0);

  return NextResponse.json(
    theaterLike.map((item, index) => ({
      ...item,
      badge: "Teater",
      sortOrder: index,
    })),
  );
}