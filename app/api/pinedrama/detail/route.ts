import { NextRequest, NextResponse } from "next/server";
import { pinedramaFetch } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const collectionId =
      req.nextUrl.searchParams.get("collectionId")?.trim() ||
      req.nextUrl.searchParams.get("collection_id")?.trim() ||
      "";

    if (!collectionId) {
      return NextResponse.json(
        { error: "collectionId is required" },
        { status: 400 },
      );
    }

    const qs = new URLSearchParams({
      collection_id: collectionId,
      language: "id",
      region: "ID",
    });

    const payload = await pinedramaFetch<any>(
      `/api/drama/detail?${qs.toString()}`
    );

    return NextResponse.json(payload?.data || {});
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Detail failed",
      },
      { status: 500 },
    );
  }
}
