import { NextResponse } from "next/server";

import { normalizeDramawaveFeed } from "@/lib/adapters/drama/dramawave";

export const DRAMAWAVE_BASE_URL = "https://dramawave.dramabos.my.id/api";
export const DRAMAWAVE_DEFAULT_CODE =
  process.env.DRAMAWAVE_DEFAULT_CODE?.trim() ||
  "4D96F22760EA30FB0FFBA9AA87A979A6";

export type DramawaveFeedKind =
  | "home"
  | "foryou"
  | "anime"
  | "random"
  | "search";

export type DramawavePaginatedResponse<T> = {
  items: T[];
  hasNextPage: boolean;
  page: number;
};

export function parsePositivePage(
  value: string | null | undefined,
  fallback = 1,
): number {
  const parsed = Number(value || fallback);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.floor(parsed);
}

export function buildPageInfo(
  payload: unknown,
  page: number,
): Pick<DramawavePaginatedResponse<never>, "hasNextPage" | "page"> {
  const pageInfo =
    payload && typeof payload === "object"
      ? (payload as { page_info?: { has_more?: unknown; next?: unknown } })
          .page_info
      : undefined;

  if (pageInfo && typeof pageInfo === "object") {
    return {
      hasNextPage: Boolean(pageInfo.has_more),
      page,
    };
  }

  return {
    hasNextPage: false,
    page,
  };
}

export function buildPaginatedFeedPayload<T>(params: {
  items: T[];
  hasNextPage: boolean;
  page: number;
}): DramawavePaginatedResponse<T> {
  return {
    items: Array.isArray(params.items) ? params.items : [],
    hasNextPage: Boolean(params.hasNextPage),
    page: parsePositivePage(String(params.page), 1),
  };
}

export function normalizeDramawaveFeedPayload(
  payload: unknown,
  kind: DramawaveFeedKind,
  page = 1,
): DramawavePaginatedResponse<ReturnType<typeof normalizeDramawaveFeed>[number]> {
  const items = normalizeDramawaveFeed(payload, kind);
  const pageInfo = buildPageInfo(payload, page);

  return buildPaginatedFeedPayload({
    items,
    hasNextPage: pageInfo.hasNextPage,
    page: pageInfo.page,
  });
}

export function buildDramawaveUrl(
  path: string,
  searchParams?: Record<string, string | number | boolean | undefined | null>,
): string {
  const url = new URL(path, `${DRAMAWAVE_BASE_URL}/`);

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function fetchDramawaveJson<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0",
      ...(init?.headers || {}),
    },
    ...init,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    const snippet = bodyText.trim().slice(0, 300);
    throw Object.assign(
      new Error(
        snippet
          ? `Dramawave upstream request failed. status=${response.status} body=${snippet}`
          : `Dramawave upstream request failed. status=${response.status}`,
      ),
      { status: response.status },
    );
  }

  return (await response.json()) as T;
}

export function errorResponse(error: unknown, fallback: string) {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
      ? ((error as { status: number }).status ?? 500)
      : 500;

  return NextResponse.json(
    {
      error: error instanceof Error ? error.message : fallback,
    },
    { status },
  );
}

export function encodeUrlToken(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}
