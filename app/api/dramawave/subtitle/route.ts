import { NextResponse } from "next/server";

const DRAMAWAVE_DRAMA_BASE_URL =
  "https://streamapi.web.id/p/dramawave/api/v1/dramas";

const DRAMAWAVE_TOKEN = process.env.DRAMAWAVE_TOKEN?.trim() || "";

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

  const maxCharsPerLine = 42;

  if (normalized.length <= maxCharsPerLine) {
    return normalized;
  }

  const words = normalized.split(" ");
  const totalLength = normalized.length;
  const targetLength = Math.ceil(totalLength / 2);

  let firstLine = "";
  let secondLine = "";

  for (const word of words) {
    const nextFirstLine = firstLine ? `${firstLine} ${word}` : word;

    if (
      firstLine.length < targetLength &&
      nextFirstLine.length <= maxCharsPerLine + 8
    ) {
      firstLine = nextFirstLine;
    } else {
      secondLine = secondLine ? `${secondLine} ${word}` : word;
    }
  }

  if (!secondLine) {
    return firstLine;
  }

  return `${firstLine}\n${secondLine}`;
}

function limitVttCueTextToTwoLines(vttBody: string): string {
  return vttBody
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      const timingIndex = lines.findIndex((line) => line.includes("-->"));

      if (timingIndex < 0) return block;

      const headerLines = lines.slice(0, timingIndex + 1);
      const textLines = lines.slice(timingIndex + 1);
      const text = textLines.join(" ");

      return [...headerLines, splitSubtitleTextToMaxTwoLines(text)]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}


function sanitizeVttCueBody(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => {
      if (!block) return false;

      const lines = block.split("\n");
      const timingLine = lines.find((line) => line.includes("-->")) || "";
      const lowerBlock = block.toLowerCase();
      const lowerTiming = timingLine.toLowerCase();

      if (!timingLine) return false;

      // Drop visual/OCR overlay captions from upstream VTT.
      // These usually use color0/f75 classes and start-aligned positions.
      if (lowerBlock.includes(".color0")) return false;
      if (lowerBlock.includes("<c.f75")) return false;
      if (lowerTiming.includes("align:start")) return false;
      if (lowerTiming.includes("position:9%")) return false;

      return true;
    })
    .map((block) => {
      return block
        .replace(/<c(?:\.[^>]*)?>/g, "")
        .replace(/<\/c(?:\.[^>]*)?>/g, "")
        .replace(/<[^>]+>/g, "")
        .replace(
          /^(\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}[.,]\d{3}).*$/gm,
          "$1 line:78% position:50%,middle size:78% align:center",
        );
    })
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n");
}


function applySubtitleStyleToVtt(vtt: string): string {
  const normalized = vtt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const firstCueMatch = normalized.match(
    /(?:^|\n)((?:\d+\s*\n)?\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->[\s\S]*)/,
  );

  const cueBody = firstCueMatch
    ? firstCueMatch[1].trimStart()
    : normalized
        .replace(
          /^WEBVTT[\s\S]*?(?=\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->|\n\d+\s*\n\d{2}:\d{2}:\d{2}[.,]\d{3}\s*-->)/,
          "",
        )
        .trimStart();

  return `WEBVTT\n\n${buildSubtitleStyleBlock()}${limitVttCueTextToTwoLines(sanitizeVttCueBody(cueBody))}`;
}

function convertSrtToVtt(srt: string): string {
  const normalized = srt
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2 --> $3.$4 line:78% position:50%,middle size:78% align:center",
    );

  return `WEBVTT

${buildSubtitleStyleBlock()}${normalized}`;
}

async function resolveDramawaveSubtitleUrl(
  dramaId: string,
  episodeNo: string,
): Promise<string> {
  const upstreamUrl = `${DRAMAWAVE_DRAMA_BASE_URL}/${encodeURIComponent(
    dramaId,
  )}/play/${encodeURIComponent(episodeNo)}?lang=id-ID&token=${DRAMAWAVE_TOKEN}`;

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Dramawave play failed: ${response.status}`);
  }

  const payload = await response.json();
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: { subtitle_list?: unknown } }).data
      : undefined;

  const subtitles = Array.isArray(data?.subtitle_list)
    ? data.subtitle_list
    : [];

  const hasSubtitleUrl = (item: unknown): boolean => {
    if (!item || typeof item !== "object") return false;

    const subtitle = (item as { subtitle?: unknown }).subtitle;
    const vtt = (item as { vtt?: unknown }).vtt;

    return (
      (typeof vtt === "string" && vtt.trim().length > 0) ||
      (typeof subtitle === "string" && subtitle.trim().length > 0)
    );
  };

  const selected =
    subtitles.find((item) => {
      if (!item || typeof item !== "object") return false;
      const language = (item as { language?: unknown }).language;
      return (
        typeof language === "string" &&
        language.toLowerCase() === "id-id" &&
        hasSubtitleUrl(item)
      );
    }) ||
    subtitles.find((item) => {
      if (!item || typeof item !== "object") return false;
      const displayName = (item as { display_name?: unknown }).display_name;
      return (
        typeof displayName === "string" &&
        displayName.toLowerCase() === "indonesia" &&
        hasSubtitleUrl(item)
      );
    }) ||
    subtitles.find(hasSubtitleUrl);

  const subtitleUrl =
    selected && typeof selected === "object"
      ? ((selected as { vtt?: unknown }).vtt ||
          (selected as { subtitle?: unknown }).subtitle)
      : "";

  if (typeof subtitleUrl !== "string" || !subtitleUrl.trim()) {
    throw new Error("Dramawave subtitle URL not found.");
  }

  return subtitleUrl.trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const directUrl = searchParams.get("url")?.trim() || "";
    const dramaId = searchParams.get("dramaId")?.trim() || "";
    const episodeNo = searchParams.get("episodeNo")?.trim() || "";

    const subtitleUrl =
      directUrl || (dramaId && episodeNo
        ? await resolveDramawaveSubtitleUrl(dramaId, episodeNo)
        : "");

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
    const vttText = srtText.trimStart().startsWith("WEBVTT")
      ? applySubtitleStyleToVtt(srtText)
      : convertSrtToVtt(srtText);

    return new NextResponse(vttText, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
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
