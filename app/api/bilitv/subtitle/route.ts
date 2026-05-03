import { NextRequest, NextResponse } from "next/server";
import { fetchBiliTVSubtitleVtt } from "../_shared";

function normalizeVtt(input: string): string {
  const normalized = input.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!normalized) return "WEBVTT\n\n";

  const body = normalized.startsWith("WEBVTT")
    ? normalized.replace(/^WEBVTT[^\n]*\n*/i, "").trim()
    : normalized;

  return `WEBVTT\n\n${body
    .split("\n")
    .map((line) => line.replace(/^\uFEFF/, ""))
    .join("\n")}\n`;
}

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("id")?.trim() ||
      "";
    const episode =
      request.nextUrl.searchParams.get("episode")?.trim() ||
      request.nextUrl.searchParams.get("ep")?.trim() ||
      "";

    if (!dramaId || !episode) {
      return NextResponse.json(
        { error: "Missing BiliTV subtitle dramaId or episode." },
        { status: 400 },
      );
    }

    const text = await fetchBiliTVSubtitleVtt(dramaId, episode);
    const vtt = normalizeVtt(text);

    return new NextResponse(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.warn("BiliTV subtitle unavailable:", error);

    return new NextResponse("WEBVTT\n\n", {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
