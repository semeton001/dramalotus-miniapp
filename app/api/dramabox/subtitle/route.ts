import { NextRequest } from "next/server";
import { fetchDramaBoxPlay } from "../_shared";

export async function GET(request: NextRequest) {
  try {
    const bookId =
      request.nextUrl.searchParams.get("bookId")?.trim() || "";

    const episodeNo = Number(
      request.nextUrl.searchParams.get("episodeNo") || "1",
    );

    if (!bookId) {
      return new Response("", { status: 204 });
    }

    const payload = await fetchDramaBoxPlay(
      bookId,
      Number.isFinite(episodeNo) ? episodeNo : 1,
    );

    const subtitles =
      payload?.data?.subtitles || [];

    const indo =
      subtitles.find((s: any) => s?.lang === "in") ||
      subtitles.find((s: any) => s?.lang === "id");

    if (!indo?.url) {
      return new Response("", { status: 204 });
    }

    const upstream = await fetch(indo.url, {
      cache: "no-store",
    });

    if (!upstream.ok) {
      return new Response("", { status: 204 });
    }

    const body = await upstream.text();

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("", { status: 204 });
  }
}
