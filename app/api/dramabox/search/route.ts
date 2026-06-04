import { NextRequest, NextResponse } from "next/server";
import { fetchDramaBoxSearch } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const keyword =
      req.nextUrl.searchParams.get("keyword") ||
      req.nextUrl.searchParams.get("query") ||
      req.nextUrl.searchParams.get("q") ||
      "";

    const page = Number(
      req.nextUrl.searchParams.get("page") || "1",
    );

    const data = await fetchDramaBoxSearch(
      keyword,
      Number.isFinite(page) ? page : 1,
    );

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    );
  }
}
