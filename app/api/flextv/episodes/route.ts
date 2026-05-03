import { NextRequest, NextResponse } from "next/server";
import {
  adaptFlextvEpisode,
  createStableNumericId,
  extractFlextvEpisodes,
  fetchFlextvJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const seriesId =
      request.nextUrl.searchParams.get("seriesId")?.trim() ||
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const numericDramaId =
      Number(request.nextUrl.searchParams.get("numericDramaId") || "") ||
      createStableNumericId(seriesId);

    if (!seriesId) {
      return NextResponse.json(
        { error: "Missing FlexTV seriesId." },
        { status: 400 },
      );
    }

    const payload = await fetchFlextvJson(
      `/series/${encodeURIComponent(seriesId)}/episodes`,
    );

    const episodes = extractFlextvEpisodes(payload).map((item) =>
      adaptFlextvEpisode(item, seriesId, numericDramaId),
    );

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("FlexTV episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FlexTV episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
