import { NextRequest, NextResponse } from "next/server";
import {
  fetchGoodshortJson,
  normalizeGoodshortFeed,
  readPositiveInt,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = readPositiveInt(request, "page", 1);

    const payload = await fetchGoodshortJson("/home", {
      channelId: 562,
      page,
      pageSize: 100,
    });

    const items = normalizeGoodshortFeed(payload, "Beranda");

    return NextResponse.json(
      {
        items,
        hasNextPage: false,
        page,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat feed GoodShort.",
      },
      { status: 500 },
    );
  }
}
