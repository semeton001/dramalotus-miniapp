import { NextRequest, NextResponse } from "next/server";
import { fetchIdramaJson, normalizeDramaList } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || "";

    if (!q) {
      return NextResponse.json({ items: [] });
    }

    const payload = await fetchIdramaJson("/search", {
      q,
      page: 1,
      page_size: 20,
    });

    return NextResponse.json({
      items: normalizeDramaList(payload),
      hasNextPage: false,
      page: 1,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "search failed", items: [] },
      { status: 500 },
    );
  }
}
