import { NextRequest, NextResponse } from "next/server";
import type { Episode } from "@/types/episode";

const NETSHORT_DETAIL_BASE_URL =
  "https://streamapi.web.id/p/netshort/api/v1/detail";

const NETSHORT_TOKEN = process.env.NETSHORT_TOKEN?.trim() || "";

type StreamapiNetshortDetailResponse = {
  code?: number;
  data?: {
    id?: string | number;
    title?: string;
    totalEpisodes?: number;
    episodes?: Array<{
      episodeNo?: number;
      episodeId?: string | number;
      cover?: string;
      isLocked?: boolean;
    }>;
  };
};

function toNumberId(value: string): number {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;

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

  return Number(
    `${numericDramaId || 9}${String(episodeNumber).padStart(3, "0")}`,
  );
}

export async function GET(request: NextRequest) {
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";

  if (!dramaId) {
    return NextResponse.json(
      { error: "dramaId is required." },
      { status: 400 },
    );
  }

  try {
    const upstreamUrl = `${NETSHORT_DETAIL_BASE_URL}/${encodeURIComponent(
      dramaId,
    )}?lang=id_ID&token=${NETSHORT_TOKEN}`;

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
        { error: `Netshort episodes failed: ${response.status}` },
        { status: response.status },
      );
    }

    const rawBody = await response.text();

    if (!rawBody.trim()) {
      return NextResponse.json(
        { error: "Netshort detail upstream returned empty body." },
        { status: 502 },
      );
    }

    let payload: StreamapiNetshortDetailResponse;

    try {
      payload = JSON.parse(rawBody) as StreamapiNetshortDetailResponse;
    } catch {
      return NextResponse.json(
        {
          error: "Netshort detail upstream returned invalid JSON.",
          preview: rawBody.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const item = payload.data;

    if (!item || !Array.isArray(item.episodes)) {
      return NextResponse.json(
        { error: "Invalid Netshort episodes payload." },
        { status: 502 },
      );
    }

    const rawDramaId = String(item.id || dramaId);
    const numericDramaId = toNumberId(rawDramaId);

    const episodes: Episode[] = item.episodes
      .map((episode, index) => {
        const episodeNumber =
          typeof episode.episodeNo === "number" && episode.episodeNo > 0
            ? episode.episodeNo
            : index + 1;

        const rawEpisodeId =
          episode.episodeId !== undefined && episode.episodeId !== null
            ? String(episode.episodeId)
            : `${rawDramaId}-${episodeNumber}`;

        return {
          id: buildStableEpisodeId(numericDramaId, rawEpisodeId, episodeNumber),
          dramaId: numericDramaId,
          episodeNumber,
          title: `Episode ${episodeNumber}`,
          duration: "",
          slug: `netshort-${rawDramaId}-episode-${episodeNumber}`,
          description: "",
          videoUrl: `/api/netshort/stream?dramaId=${encodeURIComponent(rawDramaId)}&episodeNo=${episodeNumber}`,
          originalVideoUrl: undefined,
          thumbnail:
            typeof episode.cover === "string" && episode.cover.length > 0
              ? episode.cover
              : undefined,
          isLocked: Boolean(episode.isLocked),
          isVipOnly: Boolean(episode.isLocked),
          subtitleUrl: `/api/netshort/subtitle?dramaId=${encodeURIComponent(rawDramaId)}&episodeNo=${episodeNumber}`,
          subtitleLang: "id",
          subtitleLabel: "Indonesia",
          sortOrder: episodeNumber,
          netshortEpisodeId: rawEpisodeId,
          netshortVid: rawDramaId,
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
            : "Failed to load Netshort episodes.",
      },
      { status: 500 },
    );
  }
}
