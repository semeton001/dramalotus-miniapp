import { NextResponse } from "next/server";

import { normalizeDramawaveFeed } from "@/lib/adapters/drama/dramawave";

const UPSTREAM_URL =
  "https://dramawave.dramabos.my.id/api/anime?lang=in&next=";

export async function GET() {
  try {
    const response = await fetch(UPSTREAM_URL, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal memuat Anime Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = normalizeDramawaveFeed(payload, "anime");

    return NextResponse.json(dramas);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat Anime Dramawave.",
      },
      { status: 500 },
    );
  }
}
