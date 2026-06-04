import { NextRequest, NextResponse } from "next/server";
import { pinedramaFetch, mapPineDramaCollection } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const keyword =
      req.nextUrl.searchParams.get("keyword")?.trim() || "";

    if (!keyword) {
      return NextResponse.json(
        {
          items: [],
          hasMore: false,
          nextCursor: null,
        },
        { status: 200 },
      );
    }

    const qs = new URLSearchParams({
      keyword,
      language: "id",
      region: "ID",
    });

    const payload = await pinedramaFetch<any>(
      `/api/drama/search?${qs.toString()}`
    );

    return NextResponse.json({
      items:
        (payload?.data?.collections || [])
          .map(mapPineDramaCollection),
      hasMore: Boolean(payload?.data?.hasMore),
      nextCursor: payload?.data?.nextCursor ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Search failed",
      },
      { status: 500 },
    );
  }
}
