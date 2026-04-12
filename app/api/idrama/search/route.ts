import { NextRequest, NextResponse } from "next/server";
import {
  adaptIdramaDramaList,
  fetchIdramaJson,
  getSearchParam,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const query = getSearchParam(request, "query");
    const page = getSearchParam(request, "page", "1");

    if (!query) {
      return NextResponse.json([]);
    }

    const payload = await fetchIdramaJson("/search", {
      q: query,
      page,
    });

    const results =
      Array.isArray((payload as { results?: unknown[] })?.results)
        ? (payload as { results: unknown[] }).results
        : [];

    return NextResponse.json(adaptIdramaDramaList(results, "iDrama"));
  } catch (error) {
    console.error("iDrama search route error:", error);
    return NextResponse.json(
      { error: "Failed to search iDrama." },
      { status: 500 },
    );
  }
}
