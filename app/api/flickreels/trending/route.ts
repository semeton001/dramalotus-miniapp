import { NextResponse } from "next/server";
import { fetchAndNormalizeFeed, FLICKREELS_LANG, jsonError } from "../_shared";

export async function GET() {
  try {
    const dramas = await fetchAndNormalizeFeed(`/trending?lang=${FLICKREELS_LANG}`, "trending");
    return NextResponse.json(dramas);
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Gagal memuat trending Flickreels.",
    );
  }
}
