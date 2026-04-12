import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";

export const REELIFE_BASE = "https://reelife.dramabos.my.id";
export const REELIFE_LANG = "in";
export const REELIFE_SOURCE_ID = "10";
export const REELIFE_SOURCE_NAME = "Reelife";
export const REELIFE_DEFAULT_PLAY_CODE =
  process.env.REELIFE_PLAY_CODE?.trim() || "";

export type ReelifeDramaItem = {
  actor?: string;
  actress?: string;
  author?: string;
  badgeName?: string;
  badgeType?: number;
  bookAlias?: string;
  bookId?: string | number;
  bookName?: string;
  bookTags?: string[];
  collNum?: number;
  collStatus?: boolean;
  coverPlays?: string;
  coverWap?: string;
  iconType?: number;
  introduction?: string;
  lastChapterId?: string | number;
  likeNum?: number;
  likeStatus?: boolean;
  playNum?: string;
  protagonist?: string;
  status?: boolean;
  code?: string;
};

export type ReelifeBookVo = {
  bookId?: string | number;
  bookName?: string;
  chapterId?: string | number;
  collNum?: number;
  collNumStr?: string;
  collStatus?: boolean;
  coverWap?: string;
  iconType?: number;
  introduction?: string;
  lastChapterId?: string | number;
  likeNum?: number;
  likeStatus?: boolean;
  protagonist?: string;
  status?: boolean;
  code?: string;
};

export type ReelifeChapterItem = {
  bookId?: string | number;
  chapterId?: string | number;
  chapterImg?: string;
  chapterName?: string;
  isCharge?: number;
  likeNum?: number;
  likeNumStr?: string;
  likeStatus?: boolean;
  mp4720p?: string;
  mp4720pStandByUrl?: string[];
  standbyUrls?: string[];
  price?: number;
  code?: string;
};

export type ReelifeBookDetailResponse = {
  code?: number;
  data?: {
    bookVo?: ReelifeBookVo;
    chapterContentList?: ReelifeChapterItem[];
    endRecommendBookVo?: ReelifeDramaItem;
    myTickets?: number;
    recParam?: {
      logId?: string;
      sceneId?: string;
      extendMap?: Record<string, unknown>;
    };
  };
  nowCh?: string;
  nowChTime?: number;
  regTime?: number;
  ts?: number;
};

export type ReelifeChaptersResponse = {
  code?: number;
  data?: {
    chapterList?: ReelifeChapterItem[];
    chapterTips?: string;
  };
  nowCh?: string;
  nowChTime?: number;
  regTime?: number;
  ts?: number;
};

export type ReelifeFeedPayload = {
  items: Drama[];
  hasNextPage: boolean;
  page: number;
};

export function getLang(req?: NextRequest) {
  return req?.nextUrl.searchParams.get("lang") || REELIFE_LANG;
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
  if (value == null) return "";
  return String(value).trim();
}

export function getNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    const text = getString(value);
    if (text) return text;
  }
  return "";
}

export function jsonHeaders() {
  return {
    Accept: "application/json, text/plain, */*",
    Referer: `${REELIFE_BASE}/`,
    Origin: REELIFE_BASE,
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  };
}

export async function reelifeFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${REELIFE_BASE}${path}`, {
    ...init,
    headers: {
      ...jsonHeaders(),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Reelife upstream ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<T>;
}

export function isValidDramaItem(item: ReelifeDramaItem) {
  return Boolean(
    getString(item.bookId) && pickFirstString(item.bookName, item.bookAlias),
  );
}

export function extractFeedItems(payload: unknown): ReelifeDramaItem[] {
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  const topLevel = toArray<ReelifeDramaItem>(obj.dramas);
  if (topLevel.length) return topLevel.filter(isValidDramaItem);

  const data = obj.data;
  if (data && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    const nestedDramas = toArray<ReelifeDramaItem>(nested.dramas);
    if (nestedDramas.length) return nestedDramas.filter(isValidDramaItem);
    const list = toArray<ReelifeDramaItem>(nested.list);
    if (list.length) return list.filter(isValidDramaItem);
    const bookList = toArray<ReelifeDramaItem>(nested.bookList);
    if (bookList.length) return bookList.filter(isValidDramaItem);
  }

  return [];
}

export function createStableNumericId(seed: string, fallback = 1): number {
  if (!seed.trim()) return fallback;
  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }
  return value > 0 ? value : fallback;
}

export function dedupeById<T extends { id: number }>(items: T[]): T[] {
  const map = new Map<number, T>();
  items.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export function adaptReelifeDrama(item: ReelifeDramaItem, index = 0): Drama {
  const rawId = getString(item.bookId);
  const numericId = createStableNumericId(
    rawId || `reelife-${index}`,
    index + 1,
  );
  const title = pickFirstString(
    item.bookName,
    item.bookAlias,
    `Reelife ${numericId}`,
  );
  const cover = pickFirstString(item.coverWap);
  const description = pickFirstString(item.introduction);
  const tags = toArray<string>(item.bookTags).filter(Boolean);

  return {
    id: numericId,
    source: REELIFE_SOURCE_NAME,
    sourceId: REELIFE_SOURCE_ID,
    sourceName: REELIFE_SOURCE_NAME,
    title,
    episodes: getNumber(item.lastChapterId),
    badge: pickFirstString(item.badgeName, "Reelife"),
    tags: tags.length ? tags : ["Drama"],
    posterClass: "from-[#0F172A] via-[#111827] to-[#050816]",
    slug: `reelife-${rawId || numericId}`,
    description,
    coverImage: cover || undefined,
    posterImage: cover || undefined,
    category: "Drama",
    language: "in",
    isNew: false,
    isDubbed: title.toLowerCase().includes("sulih suara"),
    isTrending: pickFirstString(item.badgeName)
      .toLowerCase()
      .includes("populer"),
    sortOrder: index,
    reelifeRawId: rawId || undefined,
    reelifeDramaId: rawId || undefined,
    reelifeCode: pickFirstString(item.code) || undefined,
  };
}

export function adaptReelifeDramaList(items: ReelifeDramaItem[]): Drama[] {
  return dedupeById(items.map((item, index) => adaptReelifeDrama(item, index)));
}

export function collectReelifeCode(...sources: Array<unknown>): string {
  const normalizeCandidate = (value: unknown): string => {
    if (typeof value !== "string") return "";
    const text = value.trim();
    if (!text || text === "0" || text.length < 8) return "";
    return text;
  };

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const obj = source as Record<string, unknown>;

    const direct = [
      obj.bookCode,
      obj.contentCode,
      obj.readCode,
      obj.playCode,
      obj.code,
    ]
      .map(normalizeCandidate)
      .find(Boolean);

    if (direct) return direct;

    const data = obj.data;
    if (data && typeof data === "object") {
      const nested = data as Record<string, unknown>;
      const nestedCode = [
        nested.bookCode,
        nested.contentCode,
        nested.readCode,
        nested.playCode,
        nested.code,
      ]
        .map(normalizeCandidate)
        .find(Boolean);

      if (nestedCode) return nestedCode;
    }
  }

  return "";
}

export function findPreviewEpisode(
  items: ReelifeChapterItem[],
  episodeId: string,
): ReelifeChapterItem | undefined {
  return items.find((item) => getString(item.chapterId) === episodeId);
}

export function parseEpisodeNumber(value: string): number {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function adaptReelifeEpisode(
  item: ReelifeChapterItem,
  opts: {
    numericDramaId?: number;
    dramaId?: string;
    code?: string;
    fallbackVideoUrl?: string;
    index?: number;
  } = {},
): Episode {
  const dramaId = getString(item.bookId || opts.dramaId);
  const chapterId = getString(item.chapterId);
  const rawSeed = `${dramaId}:${chapterId}`;
  const numericDramaId =
    typeof opts.numericDramaId === "number" && opts.numericDramaId > 0
      ? opts.numericDramaId
      : createStableNumericId(dramaId || "reelife-drama", 1);

  const title = pickFirstString(item.chapterName, `Episode ${chapterId}`);
  const directUrl = pickFirstString(opts.fallbackVideoUrl, item.mp4720p);
  const code =
    pickFirstString(item.code, opts.code) || REELIFE_DEFAULT_PLAY_CODE;

  return {
    id: createStableNumericId(rawSeed, (opts.index || 0) + 1),
    dramaId: numericDramaId,
    episodeNumber: parseEpisodeNumber(title || chapterId),
    title,
    duration: "",
    slug: `reelife-${dramaId}-${chapterId}`,
    description: "",
    videoUrl: directUrl
      ? `/api/reelife/stream?url=${encodeURIComponent(directUrl)}&dramaId=${encodeURIComponent(
          dramaId,
        )}&episodeId=${encodeURIComponent(chapterId)}${code ? `&code=${encodeURIComponent(code)}` : ""}`
      : `/api/reelife/stream?dramaId=${encodeURIComponent(
          dramaId,
        )}&episodeId=${encodeURIComponent(chapterId)}${code ? `&code=${encodeURIComponent(code)}` : ""}`,
    originalVideoUrl: directUrl || undefined,
    thumbnail: pickFirstString(item.chapterImg) || undefined,
    isLocked: getNumber(item.isCharge) === 1 && getNumber(item.price) > 0,
    isVipOnly: getNumber(item.price) > 0,
    sortOrder: opts.index || 0,
    reelifeEpisodeId: chapterId || undefined,
    reelifePlayId: chapterId || undefined,
    reelifeCode: code || undefined,
  };
}

export function buildRandomSources(page: number) {
  const randomHomePage = Math.max(2, page + 1);
  const randomHotPage = Math.max(3, page + 2);
  const letters = ["a", "c", "f", "h", "m", "s", "t"];
  const letter = letters[(page - 1 + letters.length) % letters.length];

  return {
    homePath: `/api/v1/home?page=${randomHomePage}&lang=${REELIFE_LANG}`,
    hotPath: `/api/v1/browse?page=${randomHotPage}&letter=${letter}&lang=${REELIFE_LANG}`,
  };
}

export function inferHasNextPage(
  items: Drama[],
  opts: { pageSize?: number; alwaysTrueWhenItems?: boolean } = {},
) {
  const pageSize = opts.pageSize ?? 20;
  if (opts.alwaysTrueWhenItems) return items.length > 0;
  return items.length >= pageSize;
}

export function toFeedPayload(
  items: Drama[],
  page: number,
  hasNextPage: boolean,
): ReelifeFeedPayload {
  return {
    items,
    hasNextPage,
    page,
  };
}

export function jsonFeed(
  items: Drama[],
  page: number,
  hasNextPage: boolean,
): NextResponse {
  return NextResponse.json(toFeedPayload(items, page, hasNextPage));
}
