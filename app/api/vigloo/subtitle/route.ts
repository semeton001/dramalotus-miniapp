import { NextRequest, NextResponse } from "next/server";
import { createStreamToken, readStreamToken } from "@/lib/stream-token";
import { buildViglooApiUrl, VIGLOO_HEADERS } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function absolutize(base: string, value: string) {
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  try {
    const seasonId =
      request.nextUrl.searchParams.get("seasonId")?.trim() || "";

    const ep =
      request.nextUrl.searchParams.get("ep")?.trim() || "1";

    if (!seasonId) {
      return NextResponse.json(
        { error: "Missing seasonId" },
        { status: 400 },
      );
    }

    const upstream = await fetch(
      buildViglooApiUrl(
        `/vigloo/api/v1/play?seasonId=${encodeURIComponent(
          seasonId,
        )}&ep=${encodeURIComponent(ep)}`,
      ),
      {
        cache: "no-store",
        headers: VIGLOO_HEADERS,
      },
    );

    const json = await upstream.json();

    const url = json?.payload?.url || "";
    const cookies = json?.payload?.cookies || {};

    if (!url) {
      throw new Error("No stream url");
    }

    const cookieHeader = [
      cookies["CloudFront-Policy"]
        ? `CloudFront-Policy=${cookies["CloudFront-Policy"]}`
        : "",
      cookies["CloudFront-Signature"]
        ? `CloudFront-Signature=${cookies["CloudFront-Signature"]}`
        : "",
      cookies["CloudFront-Key-Pair-Id"]
        ? `CloudFront-Key-Pair-Id=${cookies["CloudFront-Key-Pair-Id"]}`
        : "",
    ]
      .filter(Boolean)
      .join("; ");

    const master = await fetch(url, {
      cache: "no-store",
      headers: {
        Cookie: cookieHeader,
        Referer: "https://captain.sapimu.au/",
        Origin: "https://captain.sapimu.au",
      },
    });

    const masterText = await master.text();

    const subtitleMatch =
      masterText.match(
        /TYPE=SUBTITLES.*?LANGUAGE="ind".*?URI="([^"]+)"/i,
      ) ||
      masterText.match(
        /TYPE=SUBTITLES.*?NAME="Indonesian".*?URI="([^"]+)"/i,
      );

    if (!subtitleMatch?.[1]) {
      return new NextResponse("WEBVTT\n\n", {
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
        },
      });
    }

    const subtitlePlaylistUrl = absolutize(
      url,
      subtitleMatch[1],
    );

    const subtitlePlaylist = await fetch(
      subtitlePlaylistUrl,
      {
        cache: "no-store",
        headers: {
          Cookie: cookieHeader,
          Referer: "https://captain.sapimu.au/",
          Origin: "https://captain.sapimu.au",
        },
      },
    );

    const subtitlePlaylistText =
      await subtitlePlaylist.text();

    const segmentUrls = subtitlePlaylistText
      .split("\n")
      .map((x) => x.trim())
      .filter(
        (x) =>
          x &&
          !x.startsWith("#") &&
          (x.endsWith(".vtt") ||
            x.includes(".vtt?")),
      )
      .map((x) => absolutize(subtitlePlaylistUrl, x));

    let merged = "WEBVTT\n\n";

    for (const segmentUrl of segmentUrls) {
      const seg = await fetch(segmentUrl, {
        cache: "no-store",
        headers: {
          Cookie: cookieHeader,
        },
      });

      const text = await seg.text();

      merged += text
        .replace(/^WEBVTT\s*/i, "")
        .trim();

      merged += "\n\n";
    }

    return new NextResponse(merged, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new NextResponse("WEBVTT\n\n", {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
      },
    });
  }
}
