import { NextResponse } from "next/server";

import type { Episode } from "@/types/episode";

const DRAMAWAVE_DRAMA_BASE_URL =
  "https://streamapi.web.id/p/dramawave/api/v1/dramas";

const DRAMAWAVE_TOKEN = process.env.DRAMAWAVE_TOKEN?.trim() || "";

type StreamapiDramawaveDetailResponse = {
  code?: number;
  data?: {
    info?: {
      id?: string;
      name?: string;
      episode_count?: number;
      episode_list?: Array<{
        id?: string;
        name?: string;
        cover?: string;
        index?: number;
        duration?: number;
        unlock?: boolean;
        video_type?: string;
        subtitle_list?: Array<{
          language?: string;
          type?: string;
          subtitle?: string;
          display_name?: string;
        }>;
      }>;
    };
  };
};

function toNumberId(value: string): number {
  let hash = 0;

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash || Date.now();
}

function buildStableEpisodeId(
  numericDramaId: number,
  rawEpisodeId: string,
  episodeNumber: number,
): number {
  const direct = Number(rawEpisodeId);
  if (Number.isFinite(direct) && direct > 0) return direct;

  return toNumberId(`${numericDramaId}-${rawEpisodeId}-${episodeNumber}`);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const dramaId = searchParams.get("dramaId")?.trim() || "";
    const numericDramaIdParam = Number(searchParams.get("numericDramaId") || "0");

    if (!dramaId) {
      return NextResponse.json(
        { error: "Query dramaId wajib diisi." },
        { status: 400 },
      );
    }

    const upstreamUrl = `${DRAMAWAVE_DRAMA_BASE_URL}/${encodeURIComponent(
      dramaId,
    )}?lang=id-ID&token=${DRAMAWAVE_TOKEN}`;

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
      return NextResponse.json(
        { error: `Gagal memuat episode Dramawave. status=${response.status}` },
        { status: response.status },
      );
    }

    const payload = (await response.json()) as StreamapiDramawaveDetailResponse;
    const info = payload.data?.info;
    const episodeList = Array.isArray(info?.episode_list)
      ? info.episode_list
      : [];

    const numericDramaId =
      Number.isFinite(numericDramaIdParam) && numericDramaIdParam > 0
        ? numericDramaIdParam
        : toNumberId(dramaId);

    const episodes: Episode[] = episodeList
      .map((episode, index) => {
        const episodeNumber =
          typeof episode.index === "number" && episode.index > 0
            ? episode.index
            : index + 1;

        const rawEpisodeId =
          typeof episode.id === "string" && episode.id.trim().length > 0
            ? episode.id.trim()
            : `${dramaId}-${episodeNumber}`;

        const duration =
          typeof episode.duration === "number" && episode.duration > 0
            ? `${episode.duration}s`
            : "";

        return {
          id: buildStableEpisodeId(numericDramaId, rawEpisodeId, episodeNumber),
          dramaId: numericDramaId,
          episodeNumber,
          title: `Episode ${episodeNumber}`,
          duration,
          slug: `dramawave-${dramaId}-episode-${episodeNumber}`,
          description: "",
          videoUrl: `/api/dramawave/stream?dramaId=${encodeURIComponent(
            dramaId,
          )}&episodeNo=${episodeNumber}&miniapp=1`,
          originalVideoUrl: undefined,
          thumbnail:
            typeof episode.cover === "string" && episode.cover.length > 0
              ? episode.cover
              : undefined,
          isLocked: episode.unlock === false,
          isVipOnly: episode.video_type === "charge" || episode.unlock === false,
          sortOrder: episodeNumber,
          subtitleUrl: `/api/dramawave/subtitle?dramaId=${encodeURIComponent(
            dramaId,
          )}&episodeNo=${episodeNumber}`,
          subtitleLang: "id",
          subtitleLabel: "Indonesia",
          dramawaveEpisodeId: rawEpisodeId,
          dramawaveVid: dramaId,
        };
      })
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    return NextResponse.json(episodes);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memuat episode Dramawave.",
      },
      { status: 500 },
    );
  }
}
