import { NextRequest, NextResponse } from "next/server";
import {
  adaptDramabiteEpisode,
  fetchDramabiteJson,
} from "../_shared";

type JsonRecord = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing DramaBite dramaId." },
        { status: 400 },
      );
    }

    const payload = (await fetchDramabiteJson(
      `/drama/${encodeURIComponent(dramaId)}`,
    )) as JsonRecord;

    const episodes = Array.isArray(payload?.episodes)
      ? (payload.episodes as JsonRecord[])
      : Array.isArray((payload?.data as JsonRecord | undefined)?.episodes)
        ? (((payload.data as JsonRecord).episodes as JsonRecord[]) ?? [])
        : [];

    return NextResponse.json(
      episodes.map((episode) => adaptDramabiteEpisode(episode, dramaId)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("DramaBite episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load DramaBite episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
