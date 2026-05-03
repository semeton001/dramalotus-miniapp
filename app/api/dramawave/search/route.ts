import { NextResponse } from "next/server";

import { normalizeDramawaveFeed } from "@/lib/adapters/drama/dramawave";

const DRAMAWAVE_SEARCH_BASE_URL =
  "https://streamapi.web.id/p/dramawave/api/v1/search/keywords";

const DRAMAWAVE_TOKEN = process.env.DRAMAWAVE_TOKEN?.trim() || "";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query")?.trim() || "";

    if (!query) {
      return NextResponse.json([]);
    }

    const upstreamUrl = `${DRAMAWAVE_SEARCH_BASE_URL}?q=${encodeURIComponent(
      query,
    )}&lang=id-ID&token=${DRAMAWAVE_TOKEN}`;

    const response = await fetch(upstreamUrl, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    });

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
