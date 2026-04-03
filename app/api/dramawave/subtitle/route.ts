import { NextResponse } from "next/server";

function convertSrtToVtt(srt: string): string {
  const normalized = srt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2 --> $3.$4 line:-6 position:50% size:78% align:middle",
    );

  const styleBlock = `STYLE
::cue {
  background: transparent;
  color: #ffffff;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 4px rgba(0, 0, 0, 0.85);
  font-size: 100%;
}

`;

  return `WEBVTT

${styleBlock}${normalized}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subtitleUrl = searchParams.get("url")?.trim() || "";

    if (!subtitleUrl) {
      return new NextResponse("Missing subtitle url", { status: 400 });
    }

    const response = await fetch(subtitleUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/plain, */*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch subtitle", {
        status: response.status,
      });
    }

    const srtText = await response.text();
    const vttText = convertSrtToVtt(srtText);

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new NextResponse(
      error instanceof Error
        ? error.message
        : "Failed to process subtitle",
      { status: 500 },
    );
  }
}