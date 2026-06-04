import { NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

export const STARDUSTTV_BASE_URL = "https://captain.sapimu.au/stardusttv/api/v1";
export const STARDUSTTV_TOKEN = process.env.STARDUSTTV_TOKEN?.trim() || "";
export const STARDUSTTV_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";

type JsonRecord = Record<string, unknown>;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

export async function fetchStardustJson(path: string): Promise<any> {
  const url = path.startsWith("http")
    ? path
    : `${STARDUSTTV_BASE_URL}${path.startsWith("/") ? path : "/" + path}`;

  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json,text/plain,*/*",
      Authorization: `Bearer ${STARDUSTTV_TOKEN}`,
      "User-Agent": STARDUSTTV_USER_AGENT,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Stardust upstream ${res.status}: ${body.slice(0, 200)}`);
  }

  return res.json();
}

function collectItems(payload: any): any[] {
  if (!payload) return [];

  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.list)) return payload.list;
  if (Array.isArray(payload.data?.items)) return payload.data.items;
  if (Array.isArray(payload.data?.list)) return payload.data.list;
  if (Array.isArray(payload.data?.videos)) return payload.data.videos;
  if (Array.isArray(payload.data?.data)) return payload.data.data;

  if (payload.data && typeof payload.data === "object") {
    return [payload.data];
  }

  return [];
}

export function extractStardustItemsDeep(payload: any) {
  return collectItems(payload);
}

export function adaptStardustDramaList(items: any[]): Drama[] {
  const seen = new Set<string>();

  return items
    .map((item, idx) => {
      const rawId =
        toStringValue(item?.id) ||
        toStringValue(item?.video_id) ||
        String(idx + 1);

      const title =
        toStringValue(item?.title) ||
        toStringValue(item?.name) ||
        `Stardust ${rawId}`;

      const poster =
        toStringValue(item?.cover) ||
        toStringValue(item?.poster) ||
        toStringValue(item?.thumbnail);

      return {
        id: Number(rawId) || idx + 1,
        title,
        description: title,
        coverImage: poster,
        posterImage: poster,
        source: "StardustTV",
        sourceName: "StardustTV",
        sourceId: "15",
        badge: "StardustTV",
        stardusttvVideoId: rawId,
        stardusttvRawId: rawId,
      } as unknown as Drama;
    })
    .filter((item) => {
      const key = (item as any).stardusttvVideoId;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function feedResponse(items: Drama[]) {
  return NextResponse.json({
    items,
    page: 1,
    hasNextPage: false,
  });
}

export function extractStardustEpisodes(payload: any): any[] {
  return (
    payload?.data?.episodes ||
    payload?.data?.list ||
    payload?.episodes ||
    payload?.list ||
    []
  );
}

export function adaptStardustEpisode(raw: any, videoId: string, numericDramaId: number) {
  const ep =
    toNumber(raw?.episode) ||
    toNumber(raw?.sort) ||
    toNumber(raw?.number) ||
    1;

  return {
    id: Number(raw?.id) || ep,
    dramaId: numericDramaId,
    episodeNumber: ep,
    title: `Episode ${ep}`,
    duration: "00:00",
    description: "",
    thumbnail:
      toStringValue(raw?.snapshot) ||
      toStringValue(raw?.thumbnail) ||
      undefined,
    videoUrl: `/api/stardusttv/stream?miniapp=1&videoId=${encodeURIComponent(videoId)}&episode=${ep}`,
    isLocked: false,
    isVipOnly: false,
    sortOrder: ep,
  };
}

export function extractEpisodeStreamUrl(payload: any): string {
  return (
    toStringValue(payload?.data?.h264) ||
    toStringValue(payload?.data?.h265) ||
    toStringValue(payload?.data?.url) ||
    ""
  );
}
