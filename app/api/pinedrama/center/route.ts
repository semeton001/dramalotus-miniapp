import { NextRequest, NextResponse } from "next/server";
import { pinedramaFetch, mapPineDramaCollection } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const scene =
      req.nextUrl.searchParams.get("scene") || "1";

    const categoryId =
      req.nextUrl.searchParams.get("category_id") || "0";

    const count =
      req.nextUrl.searchParams.get("count") || "20";

    const nextCursor =
      req.nextUrl.searchParams.get("nextCursor") || "";

    const qs = new URLSearchParams({
      language: "id",
      region: "ID",
      scene,
      category_id: categoryId,
      count,
    });

    if (nextCursor) {
      qs.set("nextCursor", nextCursor);
    }

    const payload = await pinedramaFetch<any>(
      `/api/drama/center?${qs.toString()}`
    );

    return NextResponse.json({
      items:
        (payload?.data?.collections || [])
          .map(mapPineDramaCollection),
      hasMore:
        Boolean(payload?.data?.hasMore),
      nextCursor:
        payload?.data?.nextCursor || "",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Center failed",
      },
      { status: 500 },
    );
  }
}
