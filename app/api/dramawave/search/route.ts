import { NextResponse } from "next/server";

import { normalizeDramawaveFeed } from "@/lib/adapters/drama/dramawave";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const upstreamUrl = `https://dramawave.dramabos.my.id/api/search?q=${encodeURIComponent(query)}&lang=in`;
    const response = await fetch(upstreamUrl, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal memuat search Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();
    const dramas = normalizeDramawaveFeed(payload, "search");

    return NextResponse.json(dramas);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mencari Dramawave.",
      },
      { status: 500 },
    );
  }
}
