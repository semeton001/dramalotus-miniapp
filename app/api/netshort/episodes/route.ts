import { NextRequest, NextResponse } from "next/server";
import type { Episode } from "@/types/episode";

const NETSHORT_ALLEPISODE_BASE_URL =
  "https://netshort.sansekai.my.id/api/netshort/allepisode";
const NETSHORT_WATCH_BASE_URL = "https://netshort.dramabos.my.id/api/watch";
const NETSHORT_LANG = "in";
const NETSHORT_WATCH_CODE =
  process.env.NETSHORT_WATCH_CODE || "4D96F22760EA30FB0FFBA9AA87A979A6";

type NetshortAllepisodeResponse = {
  shortPlayId?: string | number;
  shortPlayLibraryId?: string | number;
  shortPlayName?: string;
  totalEpisode?: string | number;
  shortPlayEpisodeInfos?: NetshortEpisodeItem[];
};

type NetshortEpisodeItem = {
  shortPlayId?: string | number;
  shortPlayLibraryId?: string | number;
  episodeId?: string | number;
  episodeNo?: string | number;
  episodeType?: string | number;
  episodeCover?: string;
  isLock?: boolean | number | string;
  isVip?: boolean | number | string;
  isAd?: boolean | number | string;
  subtitleList?: NetshortSubtitleItem[];
};

type NetshortSubtitleItem = {
  url?: string;
  format?: string;
  sub_id?: string | number;
  language_id?: string | number;
  subtitleLanguage?: string;
  expireTime?: string | number;
};

type NetshortWatchResponse = {
  success?: boolean;
  data?: {
    current?: string | number;
    maxEps?: string | number;
    status?: boolean;
    subtitles?: Array<{
      lang?: string;
      url?: string;
    }>;
    videoUrl?: string;
  };
};

function encodeUrlToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function toNumberValue(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toBooleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    return lowered === "1" || lowered === "true" || lowered === "yes";
  }
  return false;
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

async function fetchNetshortAllepisodes(shortPlayId: string) {
  const upstreamUrl = new URL(NETSHORT_ALLEPISODE_BASE_URL);
  upstreamUrl.searchParams.set("shortPlayId", shortPlayId);

  const response = await fetch(upstreamUrl.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
      Origin: "https://netshort.sansekai.my.id",
      Referer: "https://netshort.sansekai.my.id/",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load Netshort allepisode. status=${response.status}`,
    );
  }

  return (await response.json()) as NetshortAllepisodeResponse;
}

async function fetchWatchEpisode(
  shortPlayId: string,
  episodeNumber: number,
): Promise<NetshortWatchResponse["data"] | null> {
  const upstreamUrl = new URL(
    `${NETSHORT_WATCH_BASE_URL}/${encodeURIComponent(shortPlayId)}/${encodeURIComponent(String(episodeNumber))}`,
  );
  upstreamUrl.searchParams.set("lang", NETSHORT_LANG);
  upstreamUrl.searchParams.set("code", NETSHORT_WATCH_CODE);

  const response = await fetch(upstreamUrl.toString(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
    },
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as NetshortWatchResponse;
  return payload?.data ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
    const numericDramaIdRaw =
      request.nextUrl.searchParams.get("numericDramaId")?.trim() || "0";
    const numericDramaId = Number(numericDramaIdRaw) || 0;

    if (!dramaId) {
      return NextResponse.json({ error: "Missing dramaId" }, { status: 400 });
    }

    const payload = await fetchNetshortAllepisodes(dramaId);
    const rawEpisodeList = Array.isArray(payload?.shortPlayEpisodeInfos)
      ? payload.shortPlayEpisodeInfos
      : [];

    const watchResults = await Promise.all(
      rawEpisodeList.map(async (item, index) => {
        const episodeNumber = toNumberValue(item.episodeNo, index + 1);
        const watchData = await fetchWatchEpisode(dramaId, episodeNumber);
        return { item, index, episodeNumber, watchData };
      }),
    );

    const episodes: Episode[] = watchResults
      .map(({ item, episodeNumber, watchData }) => {
        const rawEpisodeId =
          toStringValue(item.episodeId) || `${dramaId}-${episodeNumber}`;

        const rawVideoUrl = toStringValue(watchData?.videoUrl);

        const subtitle =
          Array.isArray(watchData?.subtitles) && watchData.subtitles.length > 0
            ? watchData.subtitles[0]
            : Array.isArray(item.subtitleList) && item.subtitleList.length > 0
              ? item.subtitleList[0]
              : undefined;

        const subtitleUrl = toStringValue(subtitle?.url);
        const subtitleLang =
          toStringValue(
            (subtitle as { lang?: string; subtitleLanguage?: string } | undefined)
              ?.lang,
          ) ||
          toStringValue(
            (subtitle as { subtitleLanguage?: string } | undefined)
              ?.subtitleLanguage,
          ) ||
          "id-ID";

        return {
          id: buildStableEpisodeId(numericDramaId, rawEpisodeId, episodeNumber),
          dramaId: numericDramaId,
          episodeNumber,
          title: `Episode ${episodeNumber}`,
          duration: "",
          description: "",
          thumbnail: toStringValue(item.episodeCover) || undefined,
          videoUrl: rawVideoUrl
            ? `/api/netshort/stream?u=${encodeUrlToken(rawVideoUrl)}`
            : "",
          originalVideoUrl: rawVideoUrl || undefined,
          isLocked: toBooleanValue(item.isLock),
          isVipOnly: toBooleanValue(item.isVip),
          sortOrder: episodeNumber,
          subtitleUrl: subtitleUrl
            ? `/api/netshort/subtitle?url=${encodeURIComponent(subtitleUrl)}`
            : undefined,
          subtitleLang,
          subtitleLabel: "Indonesian",
        } satisfies Episode;
      })
      .filter((episode) => episode.videoUrl)
      .sort((a, b) => a.episodeNumber - b.episodeNumber);

    return NextResponse.json(episodes, { status: 200 });
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