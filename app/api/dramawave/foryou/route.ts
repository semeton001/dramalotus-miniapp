import { NextRequest, NextResponse } from "next/server";

import { normalizeDramawaveFeedPayload, parsePositivePage } from "../_shared";

const DRAMAWAVE_FORYOU_URL =
  "https://streamapi.web.id/p/dramawave/api/v1/feed/recommend";

const DRAMAWAVE_TOKEN = process.env.DRAMAWAVE_TOKEN?.trim() || "";

export async function GET(request: NextRequest) {
  try {
    const page = parsePositivePage(request.nextUrl.searchParams.get("page"), 1);

    const upstreamUrl = `${DRAMAWAVE_FORYOU_URL}?page=${page}&lang=id-ID&token=${DRAMAWAVE_TOKEN}`;

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
        { error: `Gagal memuat ForYou Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = await response.json();

    return NextResponse.json(normalizeDramawaveFeedPayload(payload, "foryou", page));
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat ForYou Dramawave.",
      },
      { status: 500 },
    );
  }
}
