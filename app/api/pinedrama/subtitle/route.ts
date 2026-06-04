import { NextRequest } from "next/server";
import { fetchPineDramaPlay } from "../_shared";

export async function GET(req: NextRequest) {
  try {
    const collectionId =
      req.nextUrl.searchParams.get("collectionId")?.trim() || "";

    const episode = Number(
      req.nextUrl.searchParams.get("episode") || "1",
    );

    if (!collectionId) {
      return new Response(
        "collectionId is required",
        { status: 400 },
      );
    }

    const payload =
      await fetchPineDramaPlay(
        collectionId,
        episode,
      );

    const subtitles =
      payload?.data?.subtitles || [];

    const selected =
      subtitles.find(
        (s: any) => s?.lang === "id",
      ) ||
      subtitles.find(
        (s: any) => s?.lang === "en",
      ) ||
      subtitles[0];

    if (!selected?.url) {
      return new Response(
        "",
        {
          status: 204,
          headers: {
            "content-type":
              "text/vtt",
          },
        },
      );
    }

    const upstream =
      await fetch(selected.url, {
        cache: "no-store",
      });

    const body =
      await upstream.text();

    return new Response(
      body,
      {
        status: 200,
        headers: {
          "content-type":
            "text/vtt; charset=utf-8",
          "cache-control":
            "public, max-age=300",
        },
      },
    );
  } catch (error) {
    return new Response(
      error instanceof Error
        ? error.message
        : "Subtitle failed",
      {
        status: 500,
      },
    );
  }
}
