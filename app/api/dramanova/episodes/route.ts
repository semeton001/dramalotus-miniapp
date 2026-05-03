import { NextRequest, NextResponse } from "next/server";
import {
  buildDramaNovaEpisodes,
  createStableNumericId,
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
        { error: "Missing DramaNova dramaId." },
        { status: 400 },
      );
    }

    const episodes = await buildDramaNovaEpisodes(dramaId, numericDramaId);

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("DramaNova episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaNova episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
