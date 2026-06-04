import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

export const IDRAMA_BASE_URL =
  (process.env.IDRAMA_BASE_URL || "https://captain.sapimu.au/idrama").replace(/\/+$/, "");

export const IDRAMA_DEFAULT_LANG = "id";
export const IDRAMA_TOKEN = process.env.IDRAMA_TOKEN?.trim() || "";

export const IDRAMA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Authorization: `Bearer ${IDRAMA_TOKEN}`,
};

type JsonRecord = Record<string, any>;

export async function fetchIdramaJson(
  path: string,
  params?: Record<string, string | number | undefined>,
) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${IDRAMA_BASE_URL}/api/v1${clean}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }

  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", IDRAMA_DEFAULT_LANG);
  }

  const res = await fetch(url.toString(), {
    headers: IDRAMA_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`iDrama upstream ${res.status}`);
  }

  return res.json();
}

export async function postIdramaJson(path: string) {
  const clean = path.startsWith("/") ? path : `/${path}`;
  const url = `${IDRAMA_BASE_URL}/api/v1${clean}`;

  const res = await fetch(url, {
    method: "POST",
    headers: IDRAMA_HEADERS,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`iDrama upstream ${res.status}`);
  }

  return res.json();
}

function toDrama(item: JsonRecord, idx: number): Drama | null {
  const dramaId = Number(item.id || item.short_play_id || 0);
  if (!dramaId) return null;

  return {
    id: dramaId,
    source: "idrama",
    sourceId: "8",
    sourceName: "iDrama",
    title: item.short_play_name || "Untitled",
    episodes: Number(item.current_count || 0),
    badge: "iDrama",
    tags: Array.isArray(item.content_tag)
      ? item.content_tag.map((x: any) => x?.tag_local).filter(Boolean)
      : [],
    posterClass: "",
    slug: `idrama-${dramaId}`,
    description: item.introduction || "",
    posterImage: item.cover_url || item.compress_cover_url || "",
    coverImage: item.cover_url || item.compress_cover_url || "",
    category: "",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: idx + 1,
  };
}

export function normalizeDramaList(payload: any): Drama[] {
  let items: any[] = [];

  if (Array.isArray(payload?.results)) {
    items = payload.results;
  } else if (Array.isArray(payload?.short_plays)) {
    items = payload.short_plays;
  } else if (Array.isArray(payload?.data?.short_plays)) {
    items = payload.data.short_plays;
  } else if (Array.isArray(payload?.data)) {
    items = payload.data;
  } else if (Array.isArray(payload)) {
    items = payload;
  }

  return items
    .map(toDrama)
    .filter(Boolean) as Drama[];
}

export function normalizeEpisodes(payload: any, dramaId: string): Episode[] {
  const list =
    Array.isArray(payload?.episode_list)
      ? payload.episode_list
      : Array.isArray(payload?.data?.episode_list)
        ? payload.data.episode_list
        : Array.isArray(payload?.short_play_episodes)
          ? payload.short_play_episodes
          : [];

  return list.map((ep: any) => {
    const play720 =
      ep.play_info_list?.find((x: any) => x.definition === "720p" && x.play_url)
        ?.play_url ||
      ep.play_info_list?.find((x: any) => x.play_url)?.play_url ||
      ep.play_url ||
      "";

    return {
      id: Number(ep.episode_id),
      dramaId: Number(dramaId),
      episodeNumber: Number(ep.episode_order),
      title: `Episode ${ep.episode_order}`,
      videoUrl: `/api/idrama/stream?url=${encodeURIComponent(play720)}`,
      isLocked: false,
      isVipOnly: false,
      sortOrder: Number(ep.episode_order),
      thumbnail: ep.episode_cover || undefined,
    };
  });
}
