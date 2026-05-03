import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, getFreeReelsCode, toEpisodes } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId") || request.nextUrl.searchParams.get("id") || "";
    const numericDramaId = Number(request.nextUrl.searchParams.get("numericDramaId") || "0");
    const code = getFreeReelsCode();

    if (!dramaId.trim()) {
      return NextResponse.json({ error: "Parameter dramaId wajib diisi." }, { status: 400 });
    }

    const data = await fetchFreeReelsJson(
      buildApiUrl("/batchload", {
        id: dramaId.trim(),
        code,
      }),
    );

    return NextResponse.json(toEpisodes(data, numericDramaId, dramaId.trim(), code));
  } catch (error) {
    console.warn("FreeReels episodes upstream gagal, memakai fallback frontend:", error);
    return NextResponse.json([]);
  }
}
