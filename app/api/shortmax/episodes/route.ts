import { NextRequest, NextResponse } from "next/server";
import { buildShortmaxApiUrl, fetchShortmaxJson } from "../_shared";

type ShortmaxDetailResponse = {
  data?: {
    id?: number | string;
    code?: number | string;
    name?: string;
    cover?: string;
    episodes?: number | string;
    totalEpisodes?: number | string;
    summary?: string;
  };
};

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dramaId = searchParams.get("dramaId")?.trim() || "";
    const numericDramaId = Number(searchParams.get("numericDramaId") || 0);

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const detail = (await fetchShortmaxJson(
      buildShortmaxApiUrl(`/detail/${encodeURIComponent(dramaId)}`),
    )) as ShortmaxDetailResponse;

    const totalEpisodes =
      asNumber(detail?.data?.episodes) ||
      asNumber(detail?.data?.totalEpisodes) ||
      0;

    if (totalEpisodes <= 0) {
      return NextResponse.json(
        {
          error: "Shortmax detail did not include episode count",
          dramaId,
        },
        { status: 404 },
      );
    }

    const title = asString(detail?.data?.name);
    const cover = asString(detail?.data?.cover);

    const episodes = Array.from({ length: totalEpisodes }, (_, index) => {
      const episodeNumber = index + 1;

      return {
        id: Number(`${numericDramaId || asNumber(detail?.data?.id) || 0}${String(episodeNumber).padStart(3, "0")}`),
        dramaId: numericDramaId || asNumber(detail?.data?.id) || 0,
        episodeNumber,
        title: `Episode ${episodeNumber}`,
        duration: undefined,
        videoUrl: `/api/shortmax/stream?dramaId=${encodeURIComponent(
          dramaId,
        )}&episode=${episodeNumber}`,
        originalVideoUrl: undefined,
        subtitleUrl: undefined,
        subtitleLang: undefined,
        subtitleLabel: undefined,
        isLocked: false,
        thumbnail: cover || undefined,
        shortmaxDramaId: dramaId,
        shortmaxEpisode: episodeNumber,
        shortmaxTitle: title || undefined,
      };
    });

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
            : "Unknown Shortmax episodes error",
      },
      { status: 500 },
    );
  }
}
