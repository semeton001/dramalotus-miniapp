import { NextRequest, NextResponse } from "next/server";
import {
  buildDramapopsEpisodes,
  createStableNumericId,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const movieId =
      request.nextUrl.searchParams.get("movieId")?.trim() ||
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const numericDramaId =
      Number(request.nextUrl.searchParams.get("numericDramaId") || "") ||
      createStableNumericId(movieId);

    if (!movieId) {
      return NextResponse.json(
        { error: "Missing Dramapops movieId." },
        { status: 400 },
      );
    }

    const episodes = await buildDramapopsEpisodes(movieId, numericDramaId);

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Dramapops episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load Dramapops episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
