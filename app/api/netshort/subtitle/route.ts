import { NextRequest, NextResponse } from "next/server";

function srtToVtt(srt: string): string {
  const normalized = srt
    .replace(/\r+/g, "")
    .replace(/^\d+\s*$/gm, "")
    .replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3}) --> (\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2 --> $3.$4",
    );

  return `WEBVTT

STYLE
::cue {
  background: transparent;
}

${normalized}`;
}

function looksLikeSrt(text: string): boolean {
  return /^\s*\d+\s*$/m.test(text) && /-->/m.test(text);
}

function looksLikeVtt(text: string): boolean {
  return text.trimStart().startsWith("WEBVTT");
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (!url) {
    return NextResponse.json({ error: "url is required." }, { status: 400 });
  }

  try {
    console.log("NETSHORT_SUBTITLE_URL", url);

    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      headers: {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
      },
    });

    console.log("NETSHORT_SUBTITLE_STATUS", response.status);
    console.log(
      "NETSHORT_SUBTITLE_RESPONSE_CONTENT_TYPE",
      response.headers.get("content-type") || "",
    );

    const rawText = await response.text();

    console.log("NETSHORT_SUBTITLE_PREVIEW", rawText.slice(0, 300));

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `subtitle fetch failed: ${response.status}`,
          detail: rawText.slice(0, 300),
        },
        { status: response.status },
      );
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json(
        { error: "subtitle body is empty" },
        { status: 500 },
      );
    }

    let body = rawText;

    if (looksLikeVtt(rawText)) {
      body = rawText;
    } else if (
      looksLikeSrt(rawText) ||
      url.toLowerCase().includes(".srt") ||
      (response.headers.get("content-type") || "").includes("text/plain")
    ) {
      body = srtToVtt(rawText);
    } else {
      body = `WEBVTT

STYLE
::cue {
  background: transparent;
}

${rawText}`;
    }

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("NETSHORT_SUBTITLE_ERROR", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load subtitle.",
      },
      { status: 500 },
    );
  }
}