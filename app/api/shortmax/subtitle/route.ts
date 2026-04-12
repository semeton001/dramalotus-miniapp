import { NextRequest, NextResponse } from "next/server";
import { SHORTMAX_UPSTREAM_HEADERS, srtToVtt } from "../_shared";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(request: NextRequest) {
  const upstreamUrl = request.nextUrl.searchParams.get("url")?.trim() || "";

  if (!upstreamUrl) {
    return NextResponse.json(
      { message: "Parameter url wajib diisi." },
      { status: 400 },
    );
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      headers: SHORTMAX_UPSTREAM_HEADERS,
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { message: `Subtitle upstream error ${upstreamResponse.status}.` },
        { status: upstreamResponse.status },
      );
    }

    const subtitleText = await upstreamResponse.text();
    const vttText = subtitleText.includes("WEBVTT")
      ? subtitleText
      : srtToVtt(subtitleText);

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
        "Content-Type": "text/vtt; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Shortmax subtitle route error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses subtitle Shortmax.",
      },
      { status: 500 },
    );
  }
}
