import { NextResponse } from "next/server";
import { buildDramaBoxApiUrl } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  if (normalized.length <= maxCharsPerLine) return normalized;

  const words = normalized.split(" ");
  const targetLength = Math.ceil(normalized.length / 2);

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

  return secondLine ? `${firstLine}\n${secondLine}` : firstLine;
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

function convertSrtToVtt(srt: string): string {
  const normalized = srt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(
      /(\d{2}:\d{2}:\d{2}),(\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}),(\d{3})/g,
      "$1.$2 --> $3.$4 line:78% position:50%,middle size:78% align:center",
    )
    .trim();

  return `WEBVTT

${buildSubtitleStyleBlock()}${limitVttCueTextToTwoLines(normalized)}
`;
}

function applySubtitleStyleToVtt(vtt: string): string {
  const normalized = vtt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const body = normalized.replace(/^WEBVTT[\s\S]*?(?=\n\n|\n\d)/, "").trim();

  return `WEBVTT

${buildSubtitleStyleBlock()}${limitVttCueTextToTwoLines(body)}
`;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function resolveDramaBoxSubtitleUrl(
  bookId: string,
  episodeNo: string,
): Promise<string> {
  const upstreamUrl = buildDramaBoxApiUrl(
    `/drama/${encodeURIComponent(bookId)}/episodes`,
    {
      quality: 720,
      lang: "in",
    },
  );

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
    throw new Error(`DramaBox episodes failed: ${response.status}`);
  }

  const payload = await response.json();

  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: unknown }).data
      : undefined;

  const dataRecord =
    data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const nestedData =
    dataRecord.data && typeof dataRecord.data === "object"
      ? (dataRecord.data as Record<string, unknown>)
      : {};

  const episodes = Array.isArray(dataRecord.episodes)
    ? dataRecord.episodes
    : Array.isArray(nestedData.episodes)
      ? nestedData.episodes
      : Array.isArray(nestedData.list)
        ? nestedData.list
        : [];

  const selectedEpisode = episodes.find((item) => {
    if (!item || typeof item !== "object") return false;

    const record = item as Record<string, unknown>;
    const episode = String(record.episode ?? "").trim();
    const chapterIndex = Number(record.chapterIndex);

    return (
      episode === episodeNo ||
      (!Number.isNaN(chapterIndex) && String(chapterIndex + 1) === episodeNo)
    );
  });

  if (!selectedEpisode || typeof selectedEpisode !== "object") {
    throw new Error("DramaBox episode not found.");
  }

  const subtitles = Array.isArray(
    (selectedEpisode as Record<string, unknown>).subtitles,
  )
    ? ((selectedEpisode as Record<string, unknown>).subtitles as unknown[])
    : [];

  const hasUrl = (item: unknown) =>
    item &&
    typeof item === "object" &&
    Boolean(getString((item as Record<string, unknown>).url));

  const selectedSubtitle =
    subtitles.find((item) => {
      if (!hasUrl(item)) return false;
      const record = item as Record<string, unknown>;
      return getString(record.lang).toLowerCase() === "in";
    }) ||
    subtitles.find((item) => {
      if (!hasUrl(item)) return false;
      const record = item as Record<string, unknown>;
      return record.isDefault === true;
    }) ||
    subtitles.find((item) => {
      if (!hasUrl(item)) return false;
      const record = item as Record<string, unknown>;
      return getString(record.lang).toLowerCase() === "id";
    }) ||
    subtitles.find((item) => {
      if (!hasUrl(item)) return false;
      const record = item as Record<string, unknown>;
      return getString(record.lang).toLowerCase() === "en";
    }) ||
    subtitles.find(hasUrl);

  const subtitleUrl =
    selectedSubtitle && typeof selectedSubtitle === "object"
      ? getString((selectedSubtitle as Record<string, unknown>).url)
      : "";

  if (!subtitleUrl) {
    throw new Error("DramaBox subtitle URL not found.");
  }

  return subtitleUrl;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId")?.trim() || "";
    const episodeNo = searchParams.get("episodeNo")?.trim() || "";

    if (!bookId || !episodeNo) {
      return new NextResponse("Missing bookId or episodeNo", { status: 400 });
    }

    const subtitleUrl = await resolveDramaBoxSubtitleUrl(bookId, episodeNo);

    const response = await fetch(subtitleUrl, {
      cache: "no-store",
      headers: {
        Accept: "text/plain, text/vtt, */*",
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch subtitle", {
        status: response.status,
      });
    }

    const rawText = await response.text();
    const body = subtitleUrl.toLowerCase().endsWith(".srt")
      ? convertSrtToVtt(rawText)
      : applySubtitleStyleToVtt(rawText);

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Failed to fetch DramaBox subtitle:", error);

    return new NextResponse("Failed to fetch subtitle", { status: 500 });
  }
}

export async function HEAD(request: Request) {
  const response = await GET(request);

  return new NextResponse(null, {
    status: response.status,
    headers: response.headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Range",
      "Access-Control-Expose-Headers": "Content-Length, Content-Type",
    },
  });
}
