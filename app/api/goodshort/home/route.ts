import { NextResponse } from "next/server";
import {
  buildGoodshortApiUrl,
  fetchGoodshortJson,
  normalizeGoodshortItems,
} from "../_shared";

export async function GET() {
  try {
    const [p1, p2] = await Promise.all([
      fetchGoodshortJson(
        buildGoodshortApiUrl("/home", {
          channelId: 562,
          page: 1,
          pageSize: 12,
        }),
      ),
      fetchGoodshortJson(
        buildGoodshortApiUrl("/home", {
          channelId: 562,
          page: 2,
          pageSize: 12,
        }),
      ),
    ]);

    const merged = [
      ...normalizeGoodshortItems(p1),
      ...normalizeGoodshortItems(p2),
    ];

    const dedup = Array.from(
      new Map(merged.map((x) => [x.id, x])).values(),
    );

    return NextResponse.json({
      items: dedup,
      hasNextPage: false,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "GoodShort home failed" },
      { status: 500 },
    );
  }
}
