import { NextRequest, NextResponse } from "next/server";
import {
  IDRAMA_DEFAULT_CODE,
  adaptIdramaEpisodes,
  fetchIdramaJson,
  getSearchParam,
} from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId = getSearchParam(request, "dramaId");
    const numericDramaId = Number(getSearchParam(request, "numericDramaId", "0"));
    const code = getSearchParam(request, "code", IDRAMA_DEFAULT_CODE);

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing dramaId." },
        { status: 400 },
      );
    }

    const payload = await fetchIdramaJson(`/drama/${dramaId}`, { code });

    return NextResponse.json(
      adaptIdramaEpisodes(payload, dramaId, numericDramaId || undefined, code),
    );
  } catch (error) {
    console.error("iDrama episodes route error:", error);
    return NextResponse.json(
      { error: "Failed to load iDrama episodes." },
      { status: 500 },
    );
  }
}
