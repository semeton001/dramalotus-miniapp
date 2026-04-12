import { NextRequest, NextResponse } from "next/server";
import {
  GOODSHORT_CODE,
  GOODSHORT_LANG,
  DEFAULT_QUALITY,
  buildGoodshortEpisodes,
  fetchGoodshortJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() ?? "";
    const numericDramaId = Number(
      request.nextUrl.searchParams.get("numericDramaId") ?? "0",
    );

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing GoodShort dramaId." },
        { status: 400 },
      );
    }

    const payload = await fetchGoodshortJson(
      `/rawurl/${encodeURIComponent(dramaId)}`,
      {
        lang: GOODSHORT_LANG,
        q: DEFAULT_QUALITY,
        code: GOODSHORT_CODE,
      },
    );

    const episodes = buildGoodshortEpisodes(
      payload,
      Number.isFinite(numericDramaId) && numericDramaId > 0
        ? numericDramaId
        : 0,
    );

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat episode GoodShort.",
      },
      { status: 500 },
    );
  }
}