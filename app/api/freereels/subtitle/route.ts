import { NextRequest, NextResponse } from "next/server";

function convertSrtToVtt(input: string): string {
  const normalized = input.replace(/\r/g, "").trim();
  if (!normalized) return "WEBVTT\n\n";

  const body = normalized
    .split("\n")
    .map((line) => {
      if (/^\d+$/.test(line.trim())) return line;
      if (line.includes("-->")) {
        return line.replace(/,(\d{3})/g, ".$1");
      }
      return line;
    })
    .join("\n");

  return `WEBVTT\n\n${body}\n`;
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url") || "";

    if (!url.trim()) {
      return NextResponse.json(
        { error: "Parameter url subtitle wajib diisi." },
        { status: 400 },
      );
    }

    const response = await fetch(url.trim(), {
      cache: "no-store",
      headers: {
        Accept: "text/vtt,text/plain,*/*",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gagal mengambil subtitle. status=${response.status}` },
        { status: response.status },
      );
    }

    const text = await response.text();
    const vttText = convertSrtToVtt(text);

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat subtitle FreeReels.",
      },
      { status: 500 },
    );
  }
}