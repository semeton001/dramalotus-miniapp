import { NextRequest, NextResponse } from "next/server";
import {
  buildGoodshortApiUrl,
  fetchGoodshortJson,
  normalizeGoodshortItems,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const payload = await fetchGoodshortJson(
      buildGoodshortApiUrl("/search", { q }),
    );

    return NextResponse.json({
      items: normalizeGoodshortItems(payload),
      hasNextPage: false,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "GoodShort search failed" },
      { status: 500 },
    );
  }
}
