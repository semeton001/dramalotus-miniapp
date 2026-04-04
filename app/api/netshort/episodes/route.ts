import { NextRequest, NextResponse } from "next/server";
import type { Episode } from "@/types/episode";
import {
  NETSHORT_DRAMABOS_BASE_URL,
  fetchJson,
  toErrorResponse,
} from "../_shared";

const NETSHORT_WATCH_CODE =
  process.env.NETSHORT_WATCH_CODE || "4D96F22760EA30FB0FFBA9AA87A979A6";

type NetshortDramaDetailResponse = {
  shortPlayId?: string;
  totalEpisode?: number;
};

type NetshortWatchResponse = {
  data?: {
    current?: number;
    maxEps?: number;
    status?: boolean;
    videoUrl?: string;
    subtitles?: Array<{
      lang?: string;
      url?: string;
    }>;
  };
  success?: boolean;
};

function pickSubtitle(
  subtitles: Array<{ lang?: string; url?: string }> | undefined,
): {
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;
} {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return {};
  }

  const indo =
    subtitles.find(
      (item) => item?.lang === "id_ID" || item?.lang === "id-ID",
    ) ?? subtitles[0];

  if (!indo?.url) {
    return {};
  }

  return {
    subtitleUrl: indo.url,
    subtitleLang: indo.lang === "id_ID" ? "id-ID" : indo.lang || "id-ID",
    subtitleLabel: "Indonesian",
  };
}

function toEpisodeId(numericDramaId: number, episodeNumber: number): number {
  return Number(`${numericDramaId}${String(episodeNumber).padStart(3, "0")}`);
}

export async function GET(request: NextRequest) {
  const shortPlayId = request.nextUrl.searchParams.get("dramaId")?.trim() ?? "";
  const numericDramaId = Number(
    request.nextUrl.searchParams.get("numericDramaId") ?? "0",
  );

  if (!shortPlayId || !Number.isFinite(numericDramaId) || numericDramaId <= 0) {
    return NextResponse.json(
      { error: "dramaId and numericDramaId are required." },
      { status: 400 },
    );
  }

  if (!NETSHORT_WATCH_CODE) {
    return NextResponse.json(
      { error: "NETSHORT_WATCH_CODE is required." },
      { status: 500 },
    );
  }

  try {
    const detail = (await fetchJson(
      `${NETSHORT_DRAMABOS_BASE_URL}/drama/${encodeURIComponent(shortPlayId)}?lang=in`,
    )) as NetshortDramaDetailResponse;

    const resolvedShortPlayId =
      typeof detail?.shortPlayId === "string" &&
      detail.shortPlayId.trim().length > 0
        ? detail.shortPlayId.trim()
        : shortPlayId;

    const totalEpisode =
      typeof detail?.totalEpisode === "number" &&
      Number.isFinite(detail.totalEpisode)
        ? detail.totalEpisode
        : 0;

    if (totalEpisode <= 0) {
      return NextResponse.json([]);
    }

    const watchResults = await Promise.all(
      Array.from({ length: totalEpisode }, async (_, index) => {
        const episodeNumber = index + 1;

        try {
          const watch = (await fetchJson(
            `${NETSHORT_DRAMABOS_BASE_URL}/watch/${encodeURIComponent(
              resolvedShortPlayId,
            )}/${episodeNumber}?lang=in&code=${encodeURIComponent(NETSHORT_WATCH_CODE)}`,
          )) as NetshortWatchResponse;

          const videoUrl =
            typeof watch?.data?.videoUrl === "string" &&
            watch.data.videoUrl.trim().length > 0
              ? watch.data.videoUrl.trim()
              : "";

          const subtitle = pickSubtitle(watch?.data?.subtitles);

          const directSubtitleUrl = subtitle.subtitleUrl || undefined;

          const episode: Episode = {
            id: toEpisodeId(numericDramaId, episodeNumber),
            dramaId: numericDramaId,
            episodeNumber,
            title: `Episode ${episodeNumber}`,
            duration: "--:--",
            videoUrl: videoUrl || undefined,
            sortOrder: index,
            netshortEpisodeId: String(episodeNumber),
            netshortVid: undefined,
            subtitleUrl: directSubtitleUrl,
            subtitleLang: directSubtitleUrl ? "id-ID" : undefined,
            subtitleLabel: directSubtitleUrl ? "Indonesian" : undefined,
          };

          return episode;
        } catch {
          const episode: Episode = {
            id: toEpisodeId(numericDramaId, episodeNumber),
            dramaId: numericDramaId,
            episodeNumber,
            title: `Episode ${episodeNumber}`,
            duration: "--:--",
            sortOrder: index,
            isLocked: true,
            isVipOnly: true,
            netshortEpisodeId: String(episodeNumber),
          };

          return episode;
        }
      }),
    );

    return NextResponse.json(watchResults);
  } catch (error) {
    return toErrorResponse(error, "Failed to load Netshort episodes.");
  }
}
