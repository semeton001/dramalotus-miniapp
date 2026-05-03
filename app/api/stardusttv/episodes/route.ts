import { NextRequest, NextResponse } from "next/server";
import {
  adaptStardustEpisode,
  createStableNumericId,
  extractStardustEpisodes,
  fetchStardustJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const videoId =
      request.nextUrl.searchParams.get("videoId")?.trim() ||
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const numericDramaId =
      Number(request.nextUrl.searchParams.get("numericDramaId") || "") ||
      createStableNumericId(videoId);

    if (!videoId) {
      return NextResponse.json(
        { error: "Missing StardustTV videoId." },
        { status: 400 },
      );
    }

    const payload = await fetchStardustJson(
      `/video/${encodeURIComponent(videoId)}`,
    );

    const episodes = extractStardustEpisodes(payload).map((item) =>
      adaptStardustEpisode(item, videoId, numericDramaId),
    );

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("StardustTV episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load StardustTV episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
