import { NextRequest, NextResponse } from "next/server";
import type { Drama } from "@/types/drama";

export const FUNDRAMA_BASE_URL =
  "https://captain.sapimu.au/fundrama/api/v1";

export const FUNDRAMA_TOKEN =
  process.env.FUNDRAMA_TOKEN?.trim() || "";

export const FUNDRAMA_LANG = "id";

export const FUNDRAMA_SOURCE_ID = "13";
export const FUNDRAMA_SOURCE_NAME = "FunDrama";

export const FUNDRAMA_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36";

type JsonRecord = Record<string, unknown>;

type Episode = {
  id: number;
  dramaId: number;
  episodeNumber: number;
  title: string;
  videoUrl: string;
  originalVideoUrl?: string;
  subtitleUrl?: string;
  subtitleLang?: string;
  subtitleLabel?: string;
  isLocked?: boolean;
  isVipOnly?: boolean;
  sortOrder?: number;
  thumbnail?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function toStringValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function pickString(
  record: JsonRecord | undefined,
  ...keys: string[]
): string {
  if (!record) return "";

  for (const key of keys) {
    const picked = toStringValue(record[key]);

    if (picked) return picked;
  }

  return "";
}

export function createStableNumericId(
  value: string,
  fallback = 0,
): number {
  const direct = Number(value);

  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash || fallback;
}

export async function fetchFundramaJson(
  path: string,
  searchParams?: Record<string, string | number | undefined>,
): Promise<any> {
  const normalizedPath = path.startsWith("/")
    ? path.slice(1)
    : path;

  const baseUrl = FUNDRAMA_BASE_URL.endsWith("/")
    ? FUNDRAMA_BASE_URL
    : `${FUNDRAMA_BASE_URL}/`;

  const url = new URL(normalizedPath, baseUrl);

  Object.entries(searchParams ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  if (!url.searchParams.has("lang")) {
    url.searchParams.set("lang", FUNDRAMA_LANG);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${FUNDRAMA_TOKEN}`,
      "User-Agent": FUNDRAMA_USER_AGENT,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");

    throw new Error(
      `FunDrama upstream ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

function looksLikeDrama(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const item = value as JsonRecord;

  const hasId = Boolean(
    item.dshame ||
      item.id ||
      item.dramaId,
  );

  const hasTitle = Boolean(
    item.nsin ||
      item.title ||
      item.name,
  );

  const hasPoster = Boolean(
    item.ptear ||
      item.poster ||
      item.cover ||
      item.image,
  );

  return hasId && hasTitle && hasPoster;
}

export function extractFundramaItemsDeep(
  payload: unknown,
): JsonRecord[] {
  const seen = new Set<unknown>();

  const walk = (value: unknown): JsonRecord[] => {
    if (
      !value ||
      typeof value !== "object" ||
      seen.has(value)
    ) {
      return [];
    }

    seen.add(value);

    if (Array.isArray(value)) {
      const directItems = value.filter(
        looksLikeDrama,
      ) as JsonRecord[];

      const nested = value.flatMap(walk);

      return [...directItems, ...nested];
    }

    const record = value as JsonRecord;

    const direct: JsonRecord[] = [];

    if (looksLikeDrama(record)) {
      direct.push(record);
    }

    const priorityKeys = [
      "btra",
      "list",
      "items",
      "data",
      "ddriv",
      "result",
      "results",
      "rows",
      "records",
      "dramas",
      "contents",
    ];

    for (const key of priorityKeys) {
      const found = walk(record[key]);

      if (found.length > 0) {
        return [...direct, ...found];
      }
    }

    return [
      ...direct,
      ...Object.values(record).flatMap(walk),
    ];
  };

  return walk(payload);
}

export function adaptFundramaDrama(
  item: JsonRecord,
  index = 0,
): Drama {
  const rawId = pickString(
    item,
    "dshame",
    "id",
    "dramaId",
  );

  const numericId = createStableNumericId(
    rawId || `fundrama-${index}`,
    index + 1,
  );

  const title =
    pickString(
      item,
      "nsin",
      "title",
      "name",
    ) || `FunDrama ${numericId}`;

  const posterImage = pickString(
    item,
    "ptear",
    "poster",
    "cover",
    "image",
  );

  const episodes =
    toNumber(item.eshe) ||
    toNumber(item.episodes) ||
    0;

  return {
    id: numericId,
    title,
    posterClass: "",
    category: "Drama",
    isNew: false,
    isDubbed: false,
    isTrending: false,
    sortOrder: index,
    description:
      pickString(
        item,
        "dentra",
        "description",
        "summary",
      ) || title,
    coverImage: posterImage,
    posterImage,
    episodes,
    tags: ["FunDrama"],
    source: FUNDRAMA_SOURCE_NAME,
    sourceId: FUNDRAMA_SOURCE_ID,
    sourceName: FUNDRAMA_SOURCE_NAME,
    badge: "FunDrama",
    slug: `fundrama-${rawId || numericId}`,
    fundramaRawId: rawId || undefined,
    fundramaDramaId: rawId || undefined,
  } as Drama & {
    fundramaRawId?: string;
    fundramaDramaId?: string;
  };
}

export function dedupeFundramaDramas(
  items: Drama[],
): Drama[] {
  const seen = new Set<string>();

  const output: Drama[] = [];

  items.forEach((drama) => {
    const meta = drama as Drama & {
      fundramaRawId?: string;
      fundramaDramaId?: string;
    };

    const key =
      meta.fundramaDramaId ||
      meta.fundramaRawId ||
      drama.slug ||
      drama.title;

    if (!key || seen.has(key)) return;

    seen.add(key);

    output.push(drama);
  });

  return output;
}

export function adaptFundramaDramaList(
  items: JsonRecord[],
): Drama[] {
  return dedupeFundramaDramas(
    items.map((item, index) =>
      adaptFundramaDrama(item, index),
    ),
  );
}

export function feedResponse(
  items: Drama[],
  page = 1,
): NextResponse {
  return NextResponse.json(
    {
      items,
      hasNextPage: false,
      page,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export function extractFundramaEpisodes(
  payload: unknown,
): JsonRecord[] {
  const record = payload as JsonRecord;

  const data = record?.data as JsonRecord | undefined;

  const ddriv = data?.ddriv as JsonRecord | undefined;

  const episodes = ddriv?.eclim;

  return Array.isArray(episodes)
    ? (episodes as JsonRecord[])
    : [];
}

export function pickBestVideoUrl(
  qualities: unknown,
): string {
  if (!Array.isArray(qualities)) return "";

  const items = qualities.filter(
    (item): item is JsonRecord =>
      Boolean(item) &&
      typeof item === "object" &&
      !Array.isArray(item),
  );

  const by720 = items.find((item) =>
    toStringValue(item.Dspee)
      .toUpperCase()
      .includes("720"),
  );

  const by540 = items.find((item) =>
    toStringValue(item.Dspee)
      .toUpperCase()
      .includes("540"),
  );

  const by480 = items.find((item) =>
    toStringValue(item.Dspee)
      .toUpperCase()
      .includes("480"),
  );

  const fallback = items.find((item) =>
    pickString(item, "Mbrie", "Bcance"),
  );

  return pickString(
    by720 || by540 || by480 || fallback,
    "Mbrie",
    "Bcance",
    "url",
  );
}

export function adaptFundramaEpisode(
  raw: JsonRecord,
  dramaId: string,
  numericDramaId: number,
): Episode {
  const episodeNumber =
    toNumber(raw.erev) ||
    toNumber(raw.episode) ||
    1;

  const episodeId =
    pickString(raw, "esecur", "vticke", "id") ||
    String(episodeNumber);

  return {
    id: createStableNumericId(
      `${dramaId}-${episodeId}`,
      episodeNumber,
    ),
    dramaId: numericDramaId,
    episodeNumber,
    title: `Episode ${episodeNumber}`,
    videoUrl: `/api/fundrama/stream?miniapp=1&dramaId=${encodeURIComponent(
      dramaId,
    )}&episodeId=${encodeURIComponent(
      episodeId,
    )}&episodeNumber=${episodeNumber}`,
    originalVideoUrl: undefined,
    subtitleUrl: undefined,
    subtitleLang: undefined,
    subtitleLabel: undefined,
    isLocked: false,
    isVipOnly: false,
    sortOrder: episodeNumber,
    thumbnail: undefined,
    fundramaEpisodeId: episodeId,
    fundramaPlayId: String(episodeNumber),
  } as Episode;
}

export async function proxyRemoteMedia(
  request: NextRequest,
  rawUrl: string,
): Promise<NextResponse> {
  const response = await fetch(rawUrl, {
    method: "GET",
    headers: {
      Accept: "*/*",
      "User-Agent": FUNDRAMA_USER_AGENT,
      ...(request.headers.get("range")
        ? {
            Range: request.headers.get(
              "range",
            ) as string,
          }
        : {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Failed to load FunDrama media: ${response.status}`,
        rawUrl,
      },
      { status: response.status },
    );
  }

  const headers = new Headers();

  headers.set(
    "content-type",
    response.headers.get("content-type") ||
      "video/mp4",
  );

  headers.set("cache-control", "no-store");

  headers.set(
    "access-control-allow-origin",
    "*",
  );

  const contentLength =
    response.headers.get("content-length");

  const contentRange =
    response.headers.get("content-range");

  if (contentLength) {
    headers.set(
      "content-length",
      contentLength,
    );
  }

  if (contentRange) {
    headers.set(
      "content-range",
      contentRange,
    );
  }

  const body = await response.arrayBuffer();

  return new NextResponse(body, {
    status: response.status,
    headers,
  });
}
