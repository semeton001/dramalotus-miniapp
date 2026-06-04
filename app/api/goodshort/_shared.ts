import { NextRequest, NextResponse } from "next/server";

export const GOODSHORT_TOKEN = process.env.GOODSHORT_TOKEN || "";
export const GOODSHORT_LANG = "id";

export const GOODSHORT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
};

export function buildGoodshortApiUrl(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): string {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`https://captain.sapimu.au/goodshort/api/v1${cleanPath}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      url.searchParams.set(k, String(v));
    });
  }

  return url.toString();
}

export async function fetchGoodshortJson(
  url: string,
  initOrParams?: RequestInit | Record<string, string | number | undefined | null>,
) {
  let finalUrl = url;

  const isAbsolute = /^https?:\/\//.test(url);

  const looksLikeRequestInit =
    initOrParams &&
    typeof initOrParams === "object" &&
    (
      "method" in initOrParams ||
      "headers" in initOrParams ||
      "body" in initOrParams ||
      "cache" in initOrParams
    );

  if (!isAbsolute) {
    finalUrl = buildGoodshortApiUrl(
      url,
      looksLikeRequestInit ? undefined : (initOrParams as any),
    );
  }

  const res = await fetch(finalUrl, {
    ...(looksLikeRequestInit ? (initOrParams as RequestInit) : {}),
    headers: {
      ...GOODSHORT_HEADERS,
      Authorization: `Bearer ${GOODSHORT_TOKEN}`,
      ...(looksLikeRequestInit
        ? ((initOrParams as RequestInit)?.headers ?? {})
        : {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GoodShort upstream ${res.status}`);
  }

  return res.json();
}

export function normalizeGoodshortItems(payload: any) {
  let items: any[] = [];

  if (Array.isArray(payload?.data?.searchResult?.records)) {
    items = payload.data.searchResult.records;
  } else if (Array.isArray(payload?.data?.records)) {
    items = payload.data.records.flatMap((section: any) =>
      Array.isArray(section?.items) ? section.items : [],
    );
  } else if (Array.isArray(payload?.data?.records)) {
    items = payload.data.records;
  } else if (Array.isArray(payload?.data?.items)) {
    items = payload.data.items;
  } else if (Array.isArray(payload?.data?.list)) {
    items = payload.data.list;
  } else if (Array.isArray(payload?.data?.books)) {
    items = payload.data.books;
  } else if (Array.isArray(payload?.data)) {
    items = payload.data;
  }

  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();

  return items
    .map((item: any) => ({
      id: Number(item.bookId || item.id || 0),
      title: item.bookName || item.name || "",
      description: item.introduction || "",
      posterImage:
        item.cover ||
        item.image ||
        item.bookDetailCover ||
        "",
      thumbnail:
        item.cover ||
        item.image ||
        item.bookDetailCover ||
        "",
      totalEpisodes:
        Number(item.chapterCount || item.episodes || 0),
      genre: item.labels || [],
      source: "goodshort",
      sourceName: "GoodShort",
    }))
    .filter((item: any) => {
      if (!item.id) return false;
      if (seen.has(String(item.id))) return false;
      seen.add(String(item.id));
      return true;
    });
}

/* compatibility aliases for existing routes */
export function normalizeGoodshortFeed(
  payload: any,
  _tab?: string,
) {
  return normalizeGoodshortItems(payload);
}

export async function enrichGoodshortDramasWithBookDetails(items: any[]) {
  return items;
}

export function readPositiveInt(
  value: string | null | undefined,
  fallback = 1,
) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function createProxyHeaders(contentType = "application/json") {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    "Cache-Control": "no-store",
    "Content-Type": contentType,
  };
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: createProxyHeaders("application/json"),
    },
  );
}
