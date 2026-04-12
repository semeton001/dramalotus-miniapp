import { NextRequest } from "next/server";
import type { Drama } from "@/types/drama";
import type { Episode } from "@/types/episode";
import type { DramaBoxDramaResponse } from "@/lib/adapters/drama/dramabox";

export const DRAMABOX_BASE_URL = "https://dramabox.dramabos.my.id/api/v1";
export const DRAMABOX_LANG = "in";
export const DRAMABOX_EPISODE_CODE =
  process.env.DRAMABOX_EPISODE_CODE?.trim() ||
  "4D96F22760EA30FB0FFBA9AA87A979A6";

export type DramaBoxEpisodeItem = {
  chapterId?: string | number;
  chapterIndex?: string | number;
  isCharge?: boolean;
  videoUrl?: string;
  ["1080p"]?: string;
};

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
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
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
    `${DRAMABOX_BASE_URL}/homepage?page=${page}&lang=${lang}`,
  );
}

export async function fetchDramaBoxLatest(lang = DRAMABOX_LANG) {
  return fetchJson(`${DRAMABOX_BASE_URL}/latest?lang=${lang}`);
}

export async function fetchDramaBoxDubbed(page: number, lang = DRAMABOX_LANG) {
  return fetchJson(
    `${DRAMABOX_BASE_URL}/dubbed?classify=terpopuler&page=${page}&lang=${lang}`,
  );
}

export async function fetchDramaBoxPopular(lang = DRAMABOX_LANG) {
  return fetchJson(`${DRAMABOX_BASE_URL}/populersearch?lang=${lang}`);
}

export async function fetchDramaBoxEpisodeList(
  bookId: string,
  lang = DRAMABOX_LANG,
  code = DRAMABOX_EPISODE_CODE,
) {
  const response = await fetch(
    `${DRAMABOX_BASE_URL}/allepisode?bookId=${encodeURIComponent(bookId)}&lang=${lang}&code=${encodeURIComponent(code)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      `DramaBox allepisode request failed with status ${response.status}`,
    );
  }

  return response.json();
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
  const chapterIndex = getNumber(item.chapterIndex, index + 1);
  const chapterId = getString(item.chapterId) || `${bookId}-${chapterIndex}`;
  const upstreamVideoUrl =
    getString(item.videoUrl) || getString(item["1080p"]);

  const proxiedVideoUrl = upstreamVideoUrl
    ? `/api/dramabox/stream?u=${encodeUrlToken(upstreamVideoUrl)}`
    : "";

  return {
    id:
      getNumber(item.chapterId) ||
      Number(chapterId.replace(/\D/g, "")) ||
      createStableNumericId(`${bookId}:${chapterId}`, index + 1),
    dramaId: Number(bookId),
    episodeNumber: chapterIndex,
    title: `Episode ${chapterIndex}`,
    duration: "",
    description: "",
    thumbnail: undefined,
    videoUrl: proxiedVideoUrl,
    originalVideoUrl: upstreamVideoUrl || undefined,
    isLocked: Boolean(item.isCharge),
    isVipOnly: Boolean(item.isCharge),
    sortOrder: chapterIndex,
    dramaboxChapterId: chapterId || undefined,
    dramaboxBookId: bookId || undefined,
  };
}

export function mapDramaBoxEpisodes(
  rawItems: unknown,
  bookId: string,
): Episode[] {
  const items: DramaBoxEpisodeItem[] = Array.isArray(rawItems) ? rawItems : [];

  return items
    .map((item, index) => adaptDramaBoxEpisode(item, bookId, index))
    .filter((episode) => Boolean(episode.videoUrl))
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
