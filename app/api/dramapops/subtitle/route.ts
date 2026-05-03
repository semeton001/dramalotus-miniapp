import { NextRequest, NextResponse } from "next/server";

function buildSubtitleStyleBlock(): string {
  return `STYLE
::cue {
  background: transparent;
  color: #ffffff;
  text-shadow:
    0 1px 2px rgba(0, 0, 0, 0.95),
    0 0 4px rgba(0, 0, 0, 0.85);
  font-size: 18px;
  line-height: 1.18;
  text-align: center;
}

`;
}

function splitSubtitleTextToMaxTwoLines(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const maxCharsPerLine = 30;

  if (normalized.length <= maxCharsPerLine) return normalized;

  const words = normalized.split(" ");
  const targetLength = Math.ceil(normalized.length / 2);

  let firstLine = "";
  let secondLine = "";

  for (const word of words) {
    const nextFirstLine = firstLine ? `${firstLine} ${word}` : word;

    if (
      firstLine.length < targetLength &&
      nextFirstLine.length <= maxCharsPerLine + 6
    ) {
      firstLine = nextFirstLine;
    } else {
      secondLine = secondLine ? `${secondLine} ${word}` : word;
    }
  }

  return secondLine ? `${firstLine}\n${secondLine}` : firstLine;
}

function sanitizeCueText(text: string): string {
  return text
    .replace(/<c(?:\.[^>]*)?>/g, "")
    .replace(/<\/c(?:\.[^>]*)?>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeTimingLine(line: string): string {
  return line
    .replace(/\s+line:[^\s]+/g, "")
    .replace(/\s+position:[^\s]+/g, "")
    .replace(/\s+align:[^\s]+/g, "")
    .replace(/\s+size:[^\s]+/g, "")
    .replace(
      /^(\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}).*$/,
      "$1 line:78% position:50%,middle size:70% align:center",
    );
}

function processVttBody(body: string): string {
  return body
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex < 0) return "";

      const headerLines = lines.slice(0, timingIndex);
      const timingLine = normalizeTimingLine(lines[timingIndex]);
      const text = sanitizeCueText(lines.slice(timingIndex + 1).join(" "));
      const cueText = splitSubtitleTextToMaxTwoLines(text);

      if (!cueText) return "";

      return [...headerLines, timingLine, cueText].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n");
}

function convertSubtitleToStyledVtt(input: string): string {
  const normalized = input.replace(/^\uFEFF/, "").trim();

  const body = normalized.startsWith("WEBVTT")
    ? normalized.replace(/^WEBVTT[^\n\r]*(\r?\n)+/, "")
    : normalized.replace(/,(\d{3})/g, ".$1");

  return `WEBVTT\n\n${buildSubtitleStyleBlock()}${processVttBody(body)}\n`;
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
    const vttText = convertSubtitleToStyledVtt(text);

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
            : "Gagal memuat subtitle Dramapops.",
      },
      { status: 500 },
    );
  }
}
