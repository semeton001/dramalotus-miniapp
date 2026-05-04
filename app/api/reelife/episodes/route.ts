import { NextRequest, NextResponse } from "next/server";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";

type JsonRecord = Record<string, unknown>;

const REELIFE_API_BASE_URL = "https://streamapi.web.id/p/reelife/api/v1";
const REELIFE_API_TOKEN = process.env.REELIFE_API_TOKEN?.trim() || "";

async function fetchReelifeStreamApi(pathname: string): Promise<JsonRecord> {
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const baseUrl = REELIFE_API_BASE_URL.endsWith("/")
    ? REELIFE_API_BASE_URL
    : `${REELIFE_API_BASE_URL}/`;

  const url = new URL(normalizedPath, baseUrl);

  if (!url.searchParams.has("token")) {
    url.searchParams.set("token", REELIFE_API_TOKEN);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Reelife streamapi ${response.status} for ${url.toString()}: ${body.slice(0, 300)}`,
    );
  }

  return (await response.json()) as JsonRecord;
}

type ReelifeVideoInfo = {
  quality?: number | string;
  videoPath?: string;
};

type ReelifeChapter = {
  bookId?: string;
  chapterId?: string;
  chapterName?: string;
  chapterImg?: string;
  mp4720p?: string;
  mp4720pStandByUrl?: string[];
  videoInfoList?: ReelifeVideoInfo[];
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function pick720VideoUrl(chapter: ReelifeChapter, payload?: JsonRecord): string {
  const videos = Array.isArray(chapter.videoInfoList)
    ? chapter.videoInfoList
    : [];

  const video720 =
    videos.find((item) => Number(item.quality) === 720 && item.videoPath) ||
    videos.find((item) => item.videoPath);

  return (
    toStringValue(video720?.videoPath) ||
    toStringValue(chapter.mp4720p) ||
    toStringValue(chapter.mp4720pStandByUrl?.[0]) ||
    toStringValue(payload?.video_url)
  );
}

async function fetchEpisode(dramaId: string, episodeNumber: number) {
  const payload = await fetchReelifeStreamApi(
    `/dramas/${encodeURIComponent(dramaId)}/episodes/${episodeNumber}`,
  );

  const data = payload?.data as JsonRecord | undefined;
  const chapterList = Array.isArray(data?.chapterContentList)
    ? (data.chapterContentList as ReelifeChapter[])
    : [];

  const chapter = chapterList[0];

  if (!chapter) return null;

  const chapterId = toStringValue(chapter.chapterId, String(episodeNumber));
  const isVip = episodeNumber > FREE_EPISODE_LIMIT;

  return {
    id: Number(`${dramaId}${String(episodeNumber).padStart(3, "0")}`),
    dramaId: toNumber(dramaId),
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: `/api/reelife/stream?dramaId=${encodeURIComponent(
      dramaId,
    )}&episodeId=${encodeURIComponent(chapterId)}&episodeNumber=${episodeNumber}`,
    originalVideoUrl: undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: isVip,
    isVipOnly: isVip,
    sortOrder: episodeNumber,
    thumbnail: toStringValue(chapter.chapterImg) || undefined,
    reelifeEpisodeId: chapterId,
    reelifePlayId: chapterId,
  };
}

export async function GET(request: NextRequest) {
  try {
    const dramaId =
      request.nextUrl.searchParams.get("dramaId")?.trim() ||
      request.nextUrl.searchParams.get("bookId")?.trim() ||
      "";

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing Reelife dramaId." },
        { status: 400 },
      );
    }

    const detail = await fetchReelifeStreamApi(
      `/dramas/${encodeURIComponent(dramaId)}`,
    );

    const data = detail?.data as JsonRecord | undefined;
    const totalEpisodes =
      toNumber(data?.lastChapterId) ||
      toNumber(data?.chapterCount) ||
      toNumber(data?.episodes) ||
      0;

    if (totalEpisodes <= 0) {
      return NextResponse.json(
        { error: "Reelife detail did not include episode count.", dramaId },
        { status: 502 },
      );
    }

    const episodeNumbers = Array.from(
      { length: totalEpisodes },
      (_, index) => index + 1,
    );

    const episodes = await Promise.all(
      episodeNumbers.map((episodeNumber) =>
        fetchEpisode(dramaId, episodeNumber).catch(() => null),
      ),
    );

    return NextResponse.json(episodes.filter(Boolean), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Reelife episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load Reelife episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
