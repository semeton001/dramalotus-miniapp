import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AnyItem = Record<string, any>;

type SourceConfig = {
  name: string;
  path: string;
};

const SOURCES: SourceConfig[] = [
  { name: "DramaBox", path: "/api/dramabox/search" },
  { name: "ReelShort", path: "/api/reelshort/search" },
  { name: "GoodShort", path: "/api/goodshort/search" },
  { name: "ShortMax", path: "/api/shortmax/search" },
  { name: "Melolo", path: "/api/melolo/search" },
  { name: "FlexTV", path: "/api/flextv/search" },
  { name: "FlickReels", path: "/api/flickreels/search" },
  { name: "iDrama", path: "/api/idrama/search" },
  { name: "Reelife", path: "/api/reelife/search" },
];

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

function normalizeItem(
  item: AnyItem,
  source: SourceConfig,
  sortOrder: number
): AnyItem | null {
  const title = getTitle(item);
  const cover = getCover(item);

  if (!title || title === "Tanpa Judul") return null;
  if (!cover) return null;

  return {
    ...item,
    source: item.source ?? item.sourceName ?? source.name,
    sourceName: item.sourceName ?? item.source ?? source.name,
    badge: item.badge ?? item.sourceName ?? item.source ?? source.name,
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

function getBaseUrl(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "dramalotus.site";

  return `${proto}://${host}`;
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs = 3500
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        accept: "application/json",
        "user-agent": "DramaLotus-App-Search/1.0",
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

async function searchItems(
  req: NextRequest,
  keyword: string,
  limit: number
): Promise<AnyItem[]> {
  const baseUrl = getBaseUrl(req);

  const results = await Promise.allSettled(
    SOURCES.map(async (source) => {
      const url =
        `${baseUrl}${source.path}?keyword=${encodeURIComponent(keyword)}` +
        `&q=${encodeURIComponent(keyword)}` +
        `&page=1&miniapp=1`;

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

  return dedupeItems(merged).slice(0, limit);
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const keyword = (sp.get("q") || sp.get("keyword") || "").trim();
  const limitRaw = Number(sp.get("limit") || 20);
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? limitRaw : 20));

  if (keyword.length < 2) {
    return NextResponse.json({
      items: [],
      count: 0,
      keyword,
      limit,
      error: "Keyword minimal 2 karakter",
    });
  }

  const items = await searchItems(req, keyword, limit);

  return NextResponse.json({
    items,
    count: items.length,
    keyword,
    limit,
  });
}
