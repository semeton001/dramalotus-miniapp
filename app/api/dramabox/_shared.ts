import { NextRequest } from "next/server";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";
import type { DramaBoxDramaResponse } from "@/lib/adapters/drama/dramabox";

export const DRAMABOX_BASE_URL =
  "https://captain.sapimu.au/dramaboxv4/api";
export const DRAMABOX_LANG = "in";
export const DRAMABOX_TOKEN = process.env.DRAMABOX_TOKEN?.trim() || "";

export const DRAMABOX_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36";
export const DRAMABOX_EPISODE_CODE =
  process.env.DRAMABOX_EPISODE_CODE?.trim() ||
  "4D96F22760EA30FB0FFBA9AA87A979A6";

export type DramaBoxEpisodeItem = {
  chapterId?: string | number;
  chapterIndex?: string | number;
  chapterName?: string;
  episode?: string | number;
  cover?: string;
  isCharge?: boolean | number;
  isPay?: boolean | number;
  videoUrl?: string;
  url?: string;
  ["1080p"]?: string;
  ["720p"]?: string;
};


export function buildDramaBoxApiUrl(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): string {
  const url = new URL(`${DRAMABOX_BASE_URL}${path}`);
  url.searchParams.set("lang", DRAMABOX_LANG);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export function getLang(req?: NextRequest) {
  return req?.nextUrl.searchParams.get("lang") || DRAMABOX_LANG;
}

export function getPage(req?: NextRequest, fallback = 1) {
  const raw = req?.nextUrl.searchParams.get("page");
  const page = Number(raw || fallback);
  return Number.isFinite(page) && page > 0 ? page : fallback;
}

export function getSearchQuery(req?: NextRequest) {
  return (
    req?.nextUrl.searchParams.get("query") ||
    req?.nextUrl.searchParams.get("q") ||
    ""
  ).trim();
}

export function getString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

export function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function fetchJson(url: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${DRAMABOX_TOKEN}`,
      "User-Agent": DRAMABOX_USER_AGENT,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`DramaBox request failed: ${response.status} for ${url}`);
  }

  return response.json();
}

export function isDramaBoxDramaLike(
  value: unknown,
): value is DramaBoxDramaResponse {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.bookId === "string" &&
    item.bookId.trim().length > 0 &&
    typeof item.bookName === "string" &&
    item.bookName.trim().length > 0
  );
}

export function extractDramaBoxItemsDeep(raw: unknown): DramaBoxDramaResponse[] {
  const results: DramaBoxDramaResponse[] = [];

  const visit = (node: unknown) => {
    if (!node) return;

    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }

    if (isDramaBoxDramaLike(node)) {
      results.push(node);
      return;
    }

    if (typeof node === "object") {
      Object.values(node as Record<string, unknown>).forEach(visit);
    }
  };

  visit(raw);
  return results;
}

export function dedupeDramaBoxItems(
  items: DramaBoxDramaResponse[],
): DramaBoxDramaResponse[] {
  const deduped = new Map<string, DramaBoxDramaResponse>();

  for (const item of items) {
    if (!deduped.has(item.bookId)) {
      deduped.set(item.bookId, item);
    }
  }

  return Array.from(deduped.values());
}

export function mergeUniqueDramaBoxItems(
  groups: DramaBoxDramaResponse[][],
): DramaBoxDramaResponse[] {
  return dedupeDramaBoxItems(groups.flat());
}

export async function fetchDramaBoxHomePage(page: number, lang = DRAMABOX_LANG) {
  return fetchJson(
    buildDramaBoxApiUrl("/home", {
      page,
      pageSize: 10,
      lang,
    }),
  );
}

export async function fetchDramaBoxRanking(lang = DRAMABOX_LANG) {
  return fetchJson(buildDramaBoxApiUrl("/rank", { lang }));
}

export async function fetchDramaBoxVip(lang = DRAMABOX_LANG) {
  return fetchJson(
    buildDramaBoxApiUrl("/recommend/book", { lang }),
  );
}

export async function fetchDramaBoxSearch(
  keyword: string,
  page = 1,
  lang = DRAMABOX_LANG,
) {
  return fetchJson(
    buildDramaBoxApiUrl("/search", {
      keyword,
      page,
      lang,
    }),
  );
}

export async function fetchDramaBoxLatest(lang = DRAMABOX_LANG) {
  return fetchDramaBoxVip(lang);
}

export async function fetchDramaBoxDubbed(_page: number, lang = DRAMABOX_LANG) {
  const [page1, page2] = await Promise.all([
    fetchDramaBoxSearch("sulih suara", 1, lang),
    fetchDramaBoxSearch("sulih suara", 2, lang),
  ]);

  return { data: [page1, page2] };
}

export async function fetchDramaBoxPopular(lang = DRAMABOX_LANG) {
  return fetchDramaBoxRanking(lang);
}

export async function fetchDramaBoxPlay(
  bookId: string,
  episode: number,
  lang = DRAMABOX_LANG,
) {
  return fetchJson(
    buildDramaBoxApiUrl("/play", {
      bookId,
      episode,
      lang,
    }),
  );
}


export async function fetchDramaBoxDetail(
  bookId: string,
  lang = DRAMABOX_LANG,
) {
  return fetchJson(
    buildDramaBoxApiUrl(
      `/drama/${encodeURIComponent(bookId)}`,
      { lang },
    ),
  );
}

export async function fetchDramaBoxEpisodeList(
  bookId: string,
  lang = DRAMABOX_LANG,
) {
  const detail = await fetchDramaBoxDetail(bookId, lang);

  const chapterCount = Number(
    detail?.data?.chapterCount ||
    detail?.data?.data?.chapterCount ||
    0,
  );

  if (!chapterCount || chapterCount < 1) {
    throw new Error("DramaBox chapterCount not found");
  }

  return Array.from(
    { length: chapterCount },
    (_, index) => ({
      chapterId: String(index + 1),
      episode: index + 1,
      chapterIndex: index,
      chapterName: `Episode ${index + 1}`,
    }),
  );
}

export function encodeUrlToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function createStableNumericId(seed: string, fallback = 1): number {
  if (!seed.trim()) return fallback;
  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }
  return value > 0 ? value : fallback;
}

export function enrichDramaBoxDramaMeta(
  dramas: Drama[],
  rawItems: DramaBoxDramaResponse[],
): Drama[] {
  return dramas.map((drama, index) => {
    const raw = rawItems[index];
    const rawId = getString(raw?.bookId);

    return {
      ...drama,
      dramaboxBookId: rawId || undefined,
      dramaboxRawId: rawId || undefined,
      slug: drama.slug || (rawId ? `dramabox-${rawId}` : `dramabox-${drama.id}`),
    };
  });
}

export function adaptDramaBoxEpisode(
  item: DramaBoxEpisodeItem,
  bookId: string,
  index = 0,
): Episode {
  const episodeNumber =
    getNumber(item.episode) ||
    getNumber(item.chapterIndex, index) + 1 ||
    index + 1;

  const chapterId = getString(item.chapterId) || `${bookId}-${episodeNumber}`;
  const proxiedVideoUrl =
    `/api/dramabox/stream?bookId=${encodeURIComponent(bookId)}&episode=${episodeNumber}`;

  const title = getString(item.chapterName) || `Episode ${episodeNumber}`;
  const isPaid = false;

  return {
    id:
      getNumber(item.chapterId) ||
      Number(chapterId.replace(/\D/g, "")) ||
      createStableNumericId(`${bookId}:${chapterId}`, index + 1),
    dramaId: Number(bookId),
    episodeNumber,
    title,
    duration: "",
    description: "",
    thumbnail: getString(item.cover) || undefined,
    subtitleUrl: `/api/dramabox/subtitle?bookId=${encodeURIComponent(bookId)}&episodeNo=${encodeURIComponent(String(episodeNumber))}`,
    subtitleLang: "id",
    subtitleLabel: "Indonesia",
    videoUrl: proxiedVideoUrl,
    originalVideoUrl: undefined,
    isLocked: false,
    isVipOnly: false,
    sortOrder: episodeNumber,
    dramaboxChapterId: chapterId || undefined,
    dramaboxBookId: bookId || undefined,
  };
}

export function mapDramaBoxEpisodes(
  rawItems: unknown,
  bookId: string,
): Episode[] {
  const root =
    rawItems && typeof rawItems === "object"
      ? (rawItems as Record<string, unknown>)
      : {};

  const nestedData =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : {};

  const nestedDataData =
    nestedData.data && typeof nestedData.data === "object"
      ? (nestedData.data as Record<string, unknown>)
      : {};

  const items: DramaBoxEpisodeItem[] = Array.isArray(rawItems)
    ? rawItems
    : Array.isArray(nestedData.episodes)
      ? (nestedData.episodes as DramaBoxEpisodeItem[])
      : Array.isArray(nestedDataData.episodes)
        ? (nestedDataData.episodes as DramaBoxEpisodeItem[])
        : Array.isArray(nestedDataData.list)
          ? (nestedDataData.list as DramaBoxEpisodeItem[])
          : [];

  return items
    .map((item, index) => adaptDramaBoxEpisode(item, bookId, index))
    .sort((a, b) => a.episodeNumber - b.episodeNumber);
}

export function shuffle<T>(items: T[]): T[] {
  const copied = [...items];

  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }

  return copied;
}
