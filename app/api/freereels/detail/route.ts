import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl, fetchFreeReelsJson, toDetailDrama } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId") || request.nextUrl.searchParams.get("id") || "";

    if (!dramaId.trim()) {
      return NextResponse.json({ error: "Parameter dramaId wajib diisi." }, { status: 400 });
    }

    const data = await fetchFreeReelsJson(buildApiUrl(`/drama/${encodeURIComponent(dramaId.trim())}`));
    return NextResponse.json(toDetailDrama(data));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Gagal memuat detail FreeReels." }, { status: 500 });
  }
}
