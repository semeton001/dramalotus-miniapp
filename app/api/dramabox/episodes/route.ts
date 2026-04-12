import { NextRequest, NextResponse } from "next/server";
import {
  fetchDramaBoxEpisodeList,
  getLang,
  mapDramaBoxEpisodes,
} from "../_shared";

export async function GET(request: NextRequest) {
  const bookId = request.nextUrl.searchParams.get("bookId")?.trim() || "";
  const debug = request.nextUrl.searchParams.get("debug")?.trim() == "1";
  const lang = getLang(request);

  if (!bookId || !/^\d+$/.test(bookId)) {
    return NextResponse.json(
      { error: "bookId must be a valid numeric string" },
      { status: 400 },
    );
  }

  try {
    const rawItems = await fetchDramaBoxEpisodeList(bookId, lang);
    const mappedEpisodes = mapDramaBoxEpisodes(rawItems, bookId);

    if (debug) {
      const items = Array.isArray(rawItems) ? rawItems : [];
      return NextResponse.json(
        {
          ok: true,
          bookId,
          rawCount: items.length,
          mappedCount: mappedEpisodes.length,
          firstRaw: items[0] ?? null,
          firstMapped: mappedEpisodes[0] ?? null,
          firstFiveMapped: mappedEpisodes.slice(0, 5),
        },
        { status: 200 },
      );
    }

    return NextResponse.json(mappedEpisodes, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch DramaBox episodes:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch DramaBox episodes",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
