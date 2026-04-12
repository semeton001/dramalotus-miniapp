import { NextRequest, NextResponse } from "next/server";
import {
  GOODSHORT_HOME_SIZE,
  GOODSHORT_LANG,
  fetchGoodshortJson,
  normalizeGoodshortFeed,
  readPositiveInt,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const page = readPositiveInt(request, "page", 1);

    const payload = await fetchGoodshortJson("/home", {
      lang: GOODSHORT_LANG,
      channel: -1,
      page,
      size: GOODSHORT_HOME_SIZE,
    });

    return NextResponse.json(normalizeGoodshortFeed(payload, "Beranda"));
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
