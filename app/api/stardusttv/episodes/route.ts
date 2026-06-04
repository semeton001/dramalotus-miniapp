import { NextRequest, NextResponse } from "next/server";
import {
  fetchStardustJson,
  extractStardustEpisodes,
  adaptStardustEpisode,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("videoId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const numericDramaId = Number(
      request.nextUrl.searchParams.get("numericDramaId") || dramaId || "0"
    );

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const payload = await fetchStardustJson(
      `/video/${encodeURIComponent(dramaId)}?lang=id`
    );

    const episodes = extractStardustEpisodes(payload)
      .map((ep) => adaptStardustEpisode(ep, dramaId, numericDramaId))
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed loading episodes",
      },
      { status: 500 }
    );
  }
}
