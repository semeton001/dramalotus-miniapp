import { NextRequest, NextResponse } from "next/server";
import { buildBiliTVEpisodes, createStableNumericId } from "../_shared";

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
        { error: "Missing BiliTV dramaId." },
        { status: 400 },
      );
    }

    const episodes = await buildBiliTVEpisodes(dramaId, numericDramaId);

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("BiliTV episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load BiliTV episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
