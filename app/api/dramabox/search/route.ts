import { NextRequest, NextResponse } from "next/server";
import { fetchDramaBoxSearch } from "../_shared";
import { adaptDramaSearchListBySource } from "@/lib/adapters/drama";

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

    const payload = await fetchDramaBoxSearch(
      keyword,
      Number.isFinite(page) ? page : 1,
    );

    const bookList = Array.isArray(payload?.data?.bookList)
      ? payload.data.bookList
      : [];

    const adapted = adaptDramaSearchListBySource(
      "dramabox",
      bookList,
    );

    return NextResponse.json(adapted);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Search failed",
      },
      { status: 500 },
    );
  }
}
