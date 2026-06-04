import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyItem = Record<string, any>;

type SourceConfig = {
  name: string;
  path: string;
};

const SOURCES: SourceConfig[] = [
  { name: "DramaBox", path: "/api/dramabox/home" },
  { name: "ReelShort", path: "/api/reelshort/foryou" },
  { name: "GoodShort", path: "/api/goodshort/home" },
  { name: "ShortMax", path: "/api/shortmax/home" },
  { name: "Melolo", path: "/api/melolo/home" },
  { name: "FlexTV", path: "/api/flextv/home" },
  { name: "FlickReels", path: "/api/flickreels/home" },
  { name: "iDrama", path: "/api/idrama/home" },
  { name: "Reelife", path: "/api/reelife/home" },
];

// 15 menit
const CACHE_TTL_MS = 15 * 60 * 1000;

let cache: {
  savedAt: number;
  items: AnyItem[];
} | null = null;

let refreshing: Promise<AnyItem[]> | null = null;

function extractItems(data: any): AnyItem[] {
  if (Array.isArray(data)) {
    return data.filter((item) => item && typeof item === "object");
  }

  if (!data || typeof data !== "object") return [];

  const direct =
    data.items ??
    data.data ??
    data.results ??
    data.list ??
    data.records ??
    data.rows;

  if (Array.isArray(direct)) {
    return direct.filter((item) => item && typeof item === "object");
  }

  if (direct && typeof direct === "object") {
    const nested =
      direct.items ??
      direct.data ??
      direct.results ??
      direct.list ??
      direct.records ??
      direct.rows;

    if (Array.isArray(nested)) {
      return nested.filter((item) => item && typeof item === "object");
    }
  }

  const nestedData = data.data;

  if (nestedData && typeof nestedData === "object") {
    const nested =
      nestedData.items ??
      nestedData.data ??
      nestedData.results ??
      nestedData.list ??
      nestedData.records ??
      nestedData.rows;

    if (Array.isArray(nested)) {
      return nested.filter((item) => item && typeof item === "object");
    }
  }

  return [];
}

function getTitle(item: AnyItem): string {
  return String(
    item.title ??
      item.name ??
      item.bookName ??
      item.seriesName ??
      item.dramaName ??
      item.movieName ??
      ""
  ).trim();
}

function getCover(item: AnyItem): string {
  return String(
    item.coverImage ??
      item.posterImage ??
      item.cover ??
      item.poster ??
      item.image ??
      item.imageUrl ??
      item.thumbnail ??
      ""
  ).trim();
}

function getSourceId(item: AnyItem): string {
  return String(
    item.sourceDramaId ??
      item.dramaboxBookId ??
      item.dramaboxRawId ??
      item.reelShortRawId ??
      item.reelShortSlug ??
      item.reelShortId ??
      item.goodshortDramaId ??
      item.goodshortRawId ??
      item.shortmaxDramaId ??
      item.shortmaxRawId ??
      item.flextvSeriesId ??
      item.flextvDramaId ??
      item.flickreelsDramaId ??
      item.flickreelsRawId ??
      item.idramaDramaId ??
      item.idramaRawId ??
      item.reelifeDramaId ??
      item.reelifeRawId ??
      item.meloloDramaId ??
      item.meloloRawId ??
      item.bookId ??
      item.dramaId ??
      item.seriesId ??
      item.id ??
      ""
  ).trim();
}

function isLatinTitle(title: string): boolean {
  return /[A-Za-zÀ-ÿ]/.test(title);
}

function normalizeItem(
  item: AnyItem,
  source: SourceConfig,
  sortOrder: number
): AnyItem | null {
  const title = getTitle(item);
  const cover = getCover(item);

  if (!title || title === "Tanpa Judul") return null;
  if (!cover) return null;

  // Pengaman kalau ada source yang tiba-tiba mengembalikan judul non-latin.
  if (source.name.toLowerCase() === "dramanova" && !isLatinTitle(title)) {
    return null;
  }

  return {
    ...item,
    source: item.source ?? item.sourceName ?? source.name,
    sourceName: item.sourceName ?? item.source ?? source.name,
    badge: item.badge ?? item.sourceName ?? source.name,
    sortOrder,
  };
}


function interleaveGroups(groups: AnyItem[][]): AnyItem[] {
  const result: AnyItem[] = [];
  const maxLen = Math.max(0, ...groups.map((group) => group.length));

  for (let i = 0; i < maxLen; i++) {
    for (const group of groups) {
      const item = group[i];

      if (item) {
        result.push(item);
      }
    }
  }

  return result;
}

function dedupeItems(items: AnyItem[]): AnyItem[] {
  const seen = new Set<string>();
  const result: AnyItem[] = [];

  for (const item of items) {
    const source = String(item.source ?? item.sourceName ?? "").toLowerCase();
    const id = getSourceId(item).toLowerCase();
    const title = getTitle(item).toLowerCase();

    const key = id ? `${source}::${id}` : `${source}::${title}`;

    if (seen.has(key)) continue;

    seen.add(key);
    result.push(item);
  }

  return result;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 12_000
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "DramaLotus-App-Backend/1.0",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "dramalotus.site";

  return `${proto}://${host}`;
}

async function fetchUntukmuItems(req: NextRequest): Promise<AnyItem[]> {
  const baseUrl = getBaseUrl(req);

  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const url = `${baseUrl}${source.path}?page=1&miniapp=1`;
      const data = await fetchJsonWithTimeout(url);
      const rawItems = extractItems(data);

      return rawItems
        .map((item, index) => normalizeItem(item, source, index))
        .filter(Boolean) as AnyItem[];
    })
  );

  const groups: AnyItem[][] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      groups.push(result.value);
    }
  }

  const merged = interleaveGroups(groups);

  return dedupeItems(merged);
}

async function refreshCache(req: NextRequest): Promise<AnyItem[]> {
  if (refreshing) return refreshing;

  refreshing = fetchUntukmuItems(req)
    .then((items) => {
      if (items.length > 0) {
        cache = {
          savedAt: Date.now(),
          items,
        };
      }

      return items;
    })
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}

export async function GET(req: NextRequest) {
  const now = Date.now();
  const fresh = cache && now - cache.savedAt < CACHE_TTL_MS;

  if (fresh) {
    return NextResponse.json({
      items: cache?.items ?? [],
      cached: true,
      stale: false,
      count: cache?.items?.length ?? 0,
      ttlMs: CACHE_TTL_MS,
    });
  }

  // Kalau ada cache lama, langsung tampilkan agar Beranda Untukmu cepat.
  // Refresh data baru jalan diam-diam.
  if (cache?.items?.length) {
    refreshCache(req).catch(() => {});

    return NextResponse.json({
      items: cache?.items ?? [],
      cached: true,
      stale: true,
      count: cache?.items?.length ?? 0,
      ttlMs: CACHE_TTL_MS,
    });
  }

  // Cache pertama masih kosong, tunggu fetch pertama.
  const items = await refreshCache(req);

  return NextResponse.json({
    items,
    cached: false,
    stale: false,
    count: items.length,
    ttlMs: CACHE_TTL_MS,
  });
}
