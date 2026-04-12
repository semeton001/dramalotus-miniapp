import { NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { normalizeFlickreelsFeed } from "@/lib/adapters/drama/flickreels";

export const FLICKREELS_BASE_URL = "https://flickreels.dramabos.my.id";
export const FLICKREELS_SOURCE_ID = "6";
export const FLICKREELS_LANG = "6";
export const FLICKREELS_BATCH_CODE =
  process.env.FLICKREELS_BATCH_CODE || "4D96F22760EA30FB0FFBA9AA87A979A6";

export async function fetchFlickreelsJson(path: string) {
  const url = `${FLICKREELS_BASE_URL}${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json, text/plain, */*",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Flickreels upstream error: ${response.status} ${path}`);
  }

  return response.json();
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export function pickFeedVariantFromPath(path: string) {
  if (path.includes("trending")) return "trending" as const;
  if (path.includes("list")) return "foryou" as const;
  return "home" as const;
}

export async function fetchAndNormalizeFeed(
  path: string,
  variant?: "home" | "foryou" | "trending" | "search" | "random",
) {
  const payload = await fetchFlickreelsJson(path);
  return normalizeFlickreelsFeed(
    payload,
    variant ?? pickFeedVariantFromPath(path),
    FLICKREELS_SOURCE_ID,
  );
}

export function dedupeFlickreelsDramas(items: Drama[]): Drama[] {
  const map = new Map<number, Drama>();

  for (const item of items) {
    if (!map.has(item.id)) {
      map.set(item.id, item);
      continue;
    }

    const current = map.get(item.id)!;
    const currentScore = Number(Boolean(current.posterImage)) + Number(Boolean(current.description));
    const nextScore = Number(Boolean(item.posterImage)) + Number(Boolean(item.description));

    if (nextScore >= currentScore) {
      map.set(item.id, {
        ...current,
        ...item,
      });
    }
  }

  return Array.from(map.values());
}

export function rotateItems<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return [];

  const safeOffset = ((offset % items.length) + items.length) % items.length;
  if (safeOffset === 0) return [...items];

  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

export function buildDiversifiedForYouFeed(
  homeItems: Drama[],
  listItems: Drama[],
  limit = 15,
): Drama[] {
  const uniqueHome = dedupeFlickreelsDramas(homeItems);
  const uniqueList = dedupeFlickreelsDramas(listItems);
  const homeIds = new Set(uniqueHome.map((item) => item.id));

  const listWithoutHome = uniqueList.filter((item) => !homeIds.has(item.id));
  const rotatedList = rotateItems(listWithoutHome, Math.floor(listWithoutHome.length / 3) || 1);

  if (rotatedList.length >= limit) {
    return rotatedList.slice(0, limit).map((item, index) => ({
      ...item,
      badge: "ForYou",
      sortOrder: index,
      isTrending: false,
    }));
  }

  const rotatedHome = rotateItems(uniqueHome, Math.floor(uniqueHome.length / 2) || 1);
  const fallbackPool = dedupeFlickreelsDramas([...rotatedList, ...rotatedHome]);

  return fallbackPool.slice(0, limit).map((item, index) => ({
    ...item,
    badge: "ForYou",
    sortOrder: index,
    isTrending: false,
  }));
}
