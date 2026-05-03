import { NextRequest, NextResponse } from "next/server";
import {
  IDRAMA_DEFAULT_CODE,
  adaptIdramaEpisodes,
  fetchIdramaJson,
} from "../_shared";

const IDRAMA_UNLOCK_BASE_URL = "https://captain.sapimu.au/idrama/api/v1";
const IDRAMA_UNLOCK_TOKEN =
  "e58d7eee19710b97553a0b73aeda687be4cb05d3b378b8fc8d65d5facf6cb438";

type JsonRecord = Record<string, unknown>;

type IdramaPlayInfo = {
  definition?: string;
  play_url?: string;
  is_vip?: boolean;
};

type IdramaEpisodeRaw = {
  episode_id?: number | string;
  episode_order?: number | string;
  episode_cover?: string;
  play_url?: string;
  play_info_list?: IdramaPlayInfo[] | null;
  episode_status?: number;
};

type IdramaUnlockItem = {
  episode?: number;
  data?: IdramaEpisodeRaw;
};

type IdramaUnlockResponse = {
  total?: number;
  episodes?: IdramaUnlockItem[];
};

function getSearchParam(
  request: NextRequest,
  name: string,
  fallback = "",
): string {
  return request.nextUrl.searchParams.get(name)?.trim() || fallback;
}

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

function pick720PlayUrl(raw: IdramaEpisodeRaw | null | undefined): string {
  if (!raw) return "";

  const playInfoList = Array.isArray(raw.play_info_list)
    ? raw.play_info_list
    : [];

  const video720 =
    playInfoList.find((item) => item.definition === "720p" && item.play_url) ||
    playInfoList.find((item) => item.play_url);

  return toStringValue(video720?.play_url) || toStringValue(raw.play_url);
}

function normalizeEpisode(
  raw: IdramaEpisodeRaw,
  dramaId: string,
  numericDramaId: number,
  fallbackEpisode: number,
) {
  const episodeNumber =
    toNumber(raw.episode_order) || toNumber(fallbackEpisode) || 1;
  const playUrl = pick720PlayUrl(raw);
  const episodeId =
    toNumber(raw.episode_id) ||
    Number(`${numericDramaId || toNumber(dramaId)}${String(episodeNumber).padStart(3, "0")}`);

  return {
    id: episodeId,
    dramaId: numericDramaId || toNumber(dramaId),
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: playUrl
      ? `/api/idrama/stream?u=${encodeURIComponent(playUrl)}`
      : `/api/idrama/stream?dramaId=${encodeURIComponent(
          dramaId,
        )}&ep=${episodeNumber}&code=${encodeURIComponent(IDRAMA_DEFAULT_CODE)}`,
    originalVideoUrl: playUrl || undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: !playUrl,
    isVipOnly: !playUrl,
    sortOrder: episodeNumber,
    thumbnail: toStringValue(raw.episode_cover) || undefined,
    idramaEpisodeId: toStringValue(raw.episode_id) || String(episodeNumber),
    idramaPlayId: String(episodeNumber),
  };
}

async function fetchIdramaUnlockEpisodes(
  dramaId: string,
): Promise<IdramaUnlockItem[]> {
  const url = `${IDRAMA_UNLOCK_BASE_URL}/unlock/${encodeURIComponent(
    dramaId,
  )}/1/all`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${IDRAMA_UNLOCK_TOKEN}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`iDrama unlock request failed: ${response.status}`);
  }

  const payload = (await response.json()) as IdramaUnlockResponse;
  return Array.isArray(payload?.episodes) ? payload.episodes : [];
}

export async function GET(request: NextRequest) {
  try {
    const dramaId = getSearchParam(request, "dramaId");
    const numericDramaId = toNumber(getSearchParam(request, "numericDramaId"));
    const code = getSearchParam(request, "code", IDRAMA_DEFAULT_CODE);

    if (!dramaId) {
      return NextResponse.json(
        { error: "Missing iDrama dramaId." },
        { status: 400 },
      );
    }

    const detailPayload = (await fetchIdramaJson(
      `/drama/${encodeURIComponent(dramaId)}`,
      { code },
    )) as JsonRecord;

    const detailEpisodes = Array.isArray(detailPayload?.episode_list)
      ? (detailPayload.episode_list as IdramaEpisodeRaw[])
      : [];

    let unlockEpisodes: IdramaUnlockItem[] = [];
    try {
      unlockEpisodes = await fetchIdramaUnlockEpisodes(dramaId);
    } catch (error) {
      console.warn("iDrama unlock fallback to detail only:", error);
    }

    const mergedByEpisode = new Map<number, IdramaEpisodeRaw>();

    detailEpisodes.forEach((episode, index) => {
      const episodeNumber = toNumber(episode.episode_order) || index + 1;
      mergedByEpisode.set(episodeNumber, episode);
    });

    unlockEpisodes.forEach((item) => {
      if (!item?.data) return;
      const episodeNumber =
        toNumber(item.episode) ||
        toNumber(item.data.episode_order) ||
        mergedByEpisode.size + 1;

      const existing = mergedByEpisode.get(episodeNumber);
      const unlockPlayUrl = pick720PlayUrl(item.data);

      if (!existing || unlockPlayUrl) {
        mergedByEpisode.set(episodeNumber, item.data);
      }
    });

    const episodes = Array.from(mergedByEpisode.entries())
      .sort(([a], [b]) => a - b)
      .map(([episodeNumber, raw]) =>
        normalizeEpisode(raw, dramaId, numericDramaId, episodeNumber),
      );

    if (episodes.length === 0) {
      const fallbackEpisodes = adaptIdramaEpisodes(
        detailPayload,
        dramaId,
        numericDramaId || undefined,
        code,
      );
      return NextResponse.json(fallbackEpisodes, {
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.json(episodes, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("iDrama episodes route error:", error);
    return NextResponse.json(
      {
        error: "Failed to load iDrama episodes.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
