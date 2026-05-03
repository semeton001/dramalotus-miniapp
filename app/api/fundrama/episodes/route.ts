import { NextRequest, NextResponse } from "next/server";
import {
  adaptFundramaEpisode,
  createStableNumericId,
  extractFundramaEpisodes,
  fetchFundramaJson,
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
        { error: "Missing FunDrama dramaId." },
        { status: 400 },
      );
    }

    const payload = await fetchFundramaJson(
      `/drama/${encodeURIComponent(dramaId)}`,
    );

    const episodes = extractFundramaEpisodes(payload).map((item) =>
      adaptFundramaEpisode(item, dramaId, numericDramaId),
    );

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("FunDrama episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load FunDrama episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
