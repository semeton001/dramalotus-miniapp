import type { Drama } from "@/types/drama";
import { NextResponse } from "next/server";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

export const NETSHORT_DRAMABOS_BASE_URL = "https://netshort.dramabos.my.id/api";
export const NETSHORT_SANSEKAI_BASE_URL = "https://api.sansekai.my.id/api/netshort";

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "https://netshort.dramabos.my.id/",
  Origin: "https://netshort.dramabos.my.id",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
};

export async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      ...DEFAULT_HEADERS,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let body = "";
    try {
      body = (await response.text()).slice(0, 300);
    } catch {}
    throw new Error(`upstream=${url} status=${response.status} body=${body}`);
  }

  return response.json();
}

export async function tryFetchJson(
  url: string,
  init?: RequestInit,
): Promise<unknown | null> {
  try {
    return await fetchJson(url, init);
  } catch {
    return null;
  }
}

export async function loadNetshortHomeFeed(sourceId = "5"): Promise<Drama[]> {
  const data = await fetchJson(`${NETSHORT_DRAMABOS_BASE_URL}/home/1?lang=in`);
  return normalizeNetshortFeed(data, "home", sourceId);
}

export function dedupeDramas(items: Drama[]): Drama[] {
  const map = new Map<number, Drama>();
  for (const item of items) {
    map.set(item.id, item);
  }
  return Array.from(map.values());
}

export function shuffle<T>(items: T[]): T[] {
  const cloned = [...items];
  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallbackMessage;

  return NextResponse.json({ error: message }, { status: 502 });
}