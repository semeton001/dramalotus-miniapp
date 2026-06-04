import { NextRequest, NextResponse } from "next/server";
import { fetchPineDramaPlay } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const collectionId =
      req.nextUrl.searchParams.get("collectionId")?.trim() || "";

    const episode = Number(
      req.nextUrl.searchParams.get("episode") || "1",
    );

    if (!collectionId) {
      return NextResponse.json(
        { error: "collectionId is required" },
        { status: 400 },
      );
    }

    const payload =
      await fetchPineDramaPlay(
        collectionId,
        episode,
      );

    const target =
      payload?.data?.playUrl;

    if (!target) {
      return NextResponse.json(
        { error: "No stream available" },
        { status: 404 },
      );
    }

    const range =
      req.headers.get("range") || undefined;

    const upstream =
      await fetch(target, {
        headers: {
          ...(range
            ? {
                Range: range,
              }
            : {}),
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
          Referer:
            "https://captain.sapimu.au/",
        },
      });

    const headers = new Headers();

    [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ].forEach((h) => {
      const v =
        upstream.headers.get(h);

      if (v) {
        headers.set(h, v);
      }
    });

    headers.set(
      "Access-Control-Allow-Origin",
      "*",
    );

    return new Response(
      upstream.body,
      {
        status: upstream.status,
        headers,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Stream failed",
      },
      { status: 500 },
    );
  }
}
