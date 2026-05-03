import { NextRequest, NextResponse } from "next/server";
import { fetchGoodshortJson, normalizeGoodshortImageUrl } from "../_shared";

type GoodshortVideoVariant = {
  type?: string;
  filePath?: string;
  cdnList?: GoodshortCdnItem[];
};

type GoodshortCdnItem = {
  cdnDomain?: string;
  videoPath?: string;
};

type GoodshortChapterItem = {
  id?: number | string;
  bookId?: number | string;
  volumeId?: number | string;
  chapterName?: string;
  playTime?: number;
  price?: number;
  index?: number;
  image?: string;
  cdn?: string;
  cdnList?: GoodshortCdnItem[];
  multiVideos?: GoodshortVideoVariant[];
};

type GoodshortChaptersResponse = {
  data?: {
    list?: GoodshortChapterItem[];
  };
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

function normalizeDuration(value: unknown): string | undefined {
  const totalSeconds = toNumber(value);
  if (totalSeconds <= 0) return undefined;

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() ?? "";
    const numericDramaId = Number(
      request.nextUrl.searchParams.get("numericDramaId") ?? "0",
    );

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing GoodShort dramaId." },
        { status: 400 },
      );
    }

    const chaptersPayload = (await fetchGoodshortJson(
      `/chapters/${encodeURIComponent(dramaId)}`,
    )) as GoodshortChaptersResponse;

    const chapters = Array.isArray(chaptersPayload?.data?.list)
      ? chaptersPayload.data.list
      : [];

    const episodes = chapters
      .map((chapter, index) => {
        const chapterId = toStringValue(chapter.id) || `${dramaId}-${index + 1}`;
        const hasDirectVideo =
          toStringValue(chapter.cdn) ||
          (Array.isArray(chapter.multiVideos) && chapter.multiVideos.length > 0) ||
          (Array.isArray(chapter.cdnList) && chapter.cdnList.length > 0);


        const episodeNumber =
          toNumber(chapter.index, -1) >= 0
            ? toNumber(chapter.index) + 1
            : index + 1;

        const chapterName =
          toStringValue(chapter.chapterName) ||
          String(episodeNumber).padStart(3, "0");

        return {
          id:
            toNumber(chapter.id) ||
            Number(`${numericDramaId || 0}${String(episodeNumber).padStart(3, "0")}`),
          dramaId:
            Number.isFinite(numericDramaId) && numericDramaId > 0
              ? numericDramaId
              : toNumber(dramaId),
          episodeNumber,
          title: `Episode ${episodeNumber}`,
          duration: normalizeDuration(chapter.playTime),
          videoUrl: `/api/goodshort/stream?bookId=${encodeURIComponent(
            dramaId,
          )}&chapterId=${encodeURIComponent(chapterId)}&q=720p`,
          originalVideoUrl: undefined,
          subtitleUrl: undefined,
          subtitleLang: undefined,
          subtitleLabel: undefined,
          isLocked: !hasDirectVideo && toNumber(chapter.price) > 0,
          isVipOnly: !hasDirectVideo && toNumber(chapter.price) > 0,
          sortOrder: episodeNumber,
          thumbnail:
            normalizeGoodshortImageUrl(toStringValue(chapter.image)) ||
            undefined,
          goodshortChapterId: chapterId,
          goodshortBookId: dramaId,
          goodshortChapterName: chapterName,
        };
      })
      .filter(Boolean);

    return NextResponse.json(episodes, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal memuat episode GoodShort.",
      },
      { status: 500 },
    );
  }
}
