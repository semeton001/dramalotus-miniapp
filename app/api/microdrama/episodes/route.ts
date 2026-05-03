import { NextRequest, NextResponse } from "next/server";
import {
  adaptMicrodramaEpisode,
  createStableNumericId,
  extractMicrodramaEpisodes,
  fetchMicrodramaJson,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const numericDramaId =
      Number(request.nextUrl.searchParams.get("numericDramaId") || "") ||
      createStableNumericId(dramaId);

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing MicroDrama dramaId." },
        { status: 400 },
      );
    }

    const payload = await fetchMicrodramaJson(
      `/dramas/${encodeURIComponent(dramaId)}`,
    );

    const episodes = extractMicrodramaEpisodes(payload).map((item) =>
      adaptMicrodramaEpisode(item, dramaId, numericDramaId),
    );

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("MicroDrama episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load MicroDrama episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
