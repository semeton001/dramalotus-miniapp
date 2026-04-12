import { NextResponse } from "next/server";
import type { Drama } from "@/types/drama";
import { normalizeNetshortFeed } from "@/lib/adapters/drama/netshort";

export const NETSHORT_DRAMABOS_BASE_URL = "https://netshort.dramabos.my.id/api";
export const NETSHORT_SANSEKAI_BASE_URL = "https://netshort.sansekai.my.id";
export const NETSHORT_SOURCE_ID = "5";
export const NETSHORT_LANG = "in";
export const NETSHORT_WATCH_CODE =
  process.env.NETSHORT_WATCH_CODE || "4D96F22760EA30FB0FFBA9AA87A979A6";

export async function fetchJson(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json, text/plain, */*",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
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

export async function tryFetchJson(url: string, init?: RequestInit) {
  try {
    return await fetchJson(url, init);
  } catch {
    return null;
  }
}

export function toErrorResponse(error: unknown, fallbackMessage: string) {
  const message =
    error instanceof Error && error.message.trim().length > 0
      ? error.message
      : fallbackMessage;

  return NextResponse.json({ error: message }, { status: 502 });
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function loadNetshortHomeFeed(sourceId = NETSHORT_SOURCE_ID) {
  const payload = await fetchJson(
    `${NETSHORT_DRAMABOS_BASE_URL}/home/1?lang=${NETSHORT_LANG}`,
  );

  return normalizeNetshortFeed(payload, "home", sourceId);
}

export async function fetchAndNormalizeNetshortFeed(
  url: string,
  variant: "home" | "foryou" | "theaters" | "random" | "search" | "detail",
  sourceId = NETSHORT_SOURCE_ID,
) {
  const payload = await fetchJson(url);
  return normalizeNetshortFeed(payload, variant, sourceId);
}

export async function fetchAndNormalizeNetshortForYou(
  page = 1,
  sourceId = NETSHORT_SOURCE_ID,
) {
  const payload = await fetchJson(
    `${NETSHORT_SANSEKAI_BASE_URL}/api/netshort/foryou?page=${page}`,
  );

  return normalizeNetshortFeed(payload, "foryou", sourceId);
}

export function dedupeDramas(items: Drama[]): Drama[] {
  const map = new Map<number, Drama>();

  for (const item of items) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}

export function rotateItems<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return [];

  const safeOffset = ((offset % items.length) + items.length) % items.length;
  if (safeOffset === 0) return [...items];

  return [...items.slice(safeOffset), ...items.slice(0, safeOffset)];
}

export function shuffle<T>(items: T[]): T[] {
  const cloned = [...items];

  for (let i = cloned.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }

  return cloned;
}
