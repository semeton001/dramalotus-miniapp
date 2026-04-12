import { NextRequest, NextResponse } from "next/server";

type AnyRecord = Record<string, unknown>;

const DEFAULT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
  Origin: "https://api.sansekai.my.id",
  Referer: "https://api.sansekai.my.id/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
};

const REELSHORT_DEFAULT_CODE =
  process.env.REELSHORT_DEFAULT_CODE?.trim() ||
  "4D96F22760EA30FB0FFBA9AA87A979A6";

function getString(record: AnyRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0)
      return value.trim();
    if (typeof value === "number" && Number.isFinite(value))
      return String(value);
  }
  return "";
}

async function fetchJsonish(url: string): Promise<{
  response: Response;
  text: string;
  json: unknown;
}> {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: DEFAULT_HEADERS,
  });

  const text = await response.text();

  let json: unknown = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  return { response, text, json };
}

function createStableNumericId(seed: string, fallback: number): number {
  if (!seed.trim()) return fallback;

  let value = 7;
  for (const ch of seed) {
    value = (value * 31 + ch.charCodeAt(0)) % 2147483647;
  }

  return value > 0 ? value : fallback;
}

function extractItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const record = payload as AnyRecord;
  const candidates = [
    record.items,
    record.results,
    record.books,
    record.data,
    record.list,
    record.popular,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function inferHasNextPage(
  payload: unknown,
  page: number,
  itemCount: number,
): boolean {
  if (!payload || typeof payload !== "object") return itemCount > 0;

  const record = payload as AnyRecord;

  if (typeof record.hasNextPage === "boolean") {
    return record.hasNextPage;
  }

  const totalPageCandidates = [
    record.totalPage,
    record.total_page,
    record.pages,
    record.pageCount,
    record.page_count,
    record.lastPage,
  ];

  for (const candidate of totalPageCandidates) {
    const totalPage =
      typeof candidate === "number"
        ? candidate
        : typeof candidate === "string" && candidate.trim()
          ? Number(candidate)
          : 0;

    if (Number.isFinite(totalPage) && totalPage > 0) {
      return page < totalPage;
    }
  }

  return itemCount > 0;
}

function adaptDramaItem(item: unknown, index: number) {
  const raw = item && typeof item === "object" ? (item as AnyRecord) : {};

  const reelShortRawId = getString(
    raw,
    "book_id",
    "bookId",
    "id",
    "_id",
    "seriesId",
    "dramaId",
    "drama_id",
  );

  const reelShortCode = getString(
    raw,
    "code",
    "bookCode",
    "contentCode",
    "shareCode",
  );

  const title =
    getString(
      raw,
      "title",
      "name",
      "bookName",
      "book_name",
      "dramaName",
      "drama_name",
      "seriesName",
    ) || "Tanpa Judul";

  const pic = getString(
    raw,
    "pic",
    "cover",
    "coverWap",
    "coverImage",
    "cover_image",
    "thumbnail",
    "thumb",
    "poster",
    "posterImage",
    "poster_image",
    "image",
    "imageUrl",
    "image_url",
  );

  const episodeCountRaw = getString(
    raw,
    "chapters",
    "chapterCount",
    "episodes",
    "episodeCount",
    "episode_count",
    "totalEpisodes",
  );
  const episodeCount = Number(episodeCountRaw) || 0;

  const fallbackId = Date.now() + index;
  const numericId = createStableNumericId(
    reelShortRawId || `reelshort-${index}`,
    fallbackId,
  );

  return {
    id: numericId,
    source: "ReelShort",
    sourceId: "2",
    sourceName: "ReelShort",
    title,
    episodes: episodeCount,
    badge: "ReelShort",
    tags: ["Drama"],
    posterClass: "from-[#1A102E] via-[#12131A] to-[#090B12]",
    slug: reelShortRawId
      ? `reelshort-${reelShortRawId}`
      : `reelshort-${numericId}`,
    description: getString(
      raw,
      "desc",
      "description",
      "summary",
      "intro",
      "synopsis",
    ),
    coverImage: pic || undefined,
    posterImage: pic || undefined,
    category: "Drama",
    language: getString(raw, "lang") || "in",
    country: undefined,
    isNew: false,
    isDubbed: title.toLowerCase().includes("versi dub"),
    isTrending: false,
    sortOrder: index,
    rating: undefined,
    releaseYear: undefined,
    reelShortRawId: reelShortRawId || undefined,
    reelShortCode: reelShortCode || undefined,
    reelShortSlug: reelShortRawId ? `reelshort-${reelShortRawId}` : undefined,
  };
}

function dedupeDramaItems<T extends Record<string, unknown>>(items: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of items) {
    const key =
      (typeof item.reelShortRawId === "string" && item.reelShortRawId.trim()) ||
      (typeof item.reelShortSlug === "string" && item.reelShortSlug.trim()) ||
      (typeof item.slug === "string" && item.slug.trim()) ||
      `${typeof item.title === "string" ? item.title : "item"}-${typeof item.id === "number" ? item.id : ""}`;

    if (!map.has(key)) {
      map.set(key, item);
    }
  }

  return Array.from(map.values());
}

async function fetchFeed(upstreamUrl: string, page = 1) {
  const { response, text, json } = await fetchJsonish(upstreamUrl);

  if (!response.ok) {
    throw new Error(
      `Upstream ReelShort gagal. status=${response.status} body=${text}`,
    );
  }

  const items = extractItems(json);

  return {
    items: items.map(adaptDramaItem),
    hasNextPage: inferHasNextPage(json, page, items.length),
    page,
  };
}

async function fetchFeedItems(upstreamUrl: string): Promise<unknown[]> {
  const { response, text, json } = await fetchJsonish(upstreamUrl);

  if (!response.ok) {
    throw new Error(
      `Upstream ReelShort gagal. status=${response.status} body=${text} url=${upstreamUrl}`,
    );
  }

  return extractItems(json);
}

export async function respondDramaFeed(upstreamUrl: string, page = 1) {
  const payload = await fetchFeed(upstreamUrl, page);
  return NextResponse.json(payload, { status: 200 });
}

export async function respondCombinedDramaFeed(
  upstreamUrls: string[],
  page = 1,
) {
  const results = await Promise.all(
    upstreamUrls.map((url) => fetchFeedItems(url)),
  );

  const merged = results.flat().map(adaptDramaItem);
  const deduped = dedupeDramaItems(merged);

  return NextResponse.json(
    {
      items: deduped,
      hasNextPage: false,
      page,
    },
    { status: 200 },
  );
}

export async function respondSearch(query: string) {
  if (!query.trim()) {
    return NextResponse.json([], { status: 200 });
  }

  const { response, text, json } = await fetchJsonish(
    `https://reelshort.dramabos.my.id/search?q=${encodeURIComponent(query)}&lang=in`,
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Upstream ReelShort search gagal. status=${response.status}`,
        upstreamBody: text,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(extractItems(json).map(adaptDramaItem), {
    status: 200,
  });
}

export async function respondDetail(reelShortId: string) {
  if (!reelShortId.trim()) {
    return NextResponse.json(
      { error: "Parameter id wajib diisi." },
      { status: 400 },
    );
  }

  const { response, text, json } = await fetchJsonish(
    `https://reelshort.dramabos.my.id/detail/${encodeURIComponent(reelShortId)}?lang=in`,
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Upstream ReelShort detail gagal. status=${response.status}`,
        upstreamBody: text,
        requestedId: reelShortId,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(json, { status: 200 });
}

function pickBestStreamUrl(raw: Record<string, unknown>): string {
  const direct = getString(
    raw,
    "url",
    "playUrl",
    "play_url",
    "videoUrl",
    "video_url",
    "streamUrl",
    "stream_url",
  );
  if (direct) return direct;

  const streams = raw.streams;
  if (!Array.isArray(streams)) return "";

  const normalized = streams.filter(
    (entry): entry is Record<string, unknown> =>
      !!entry && typeof entry === "object",
  );

  const getUrl = (entry: Record<string, unknown>) =>
    getString(entry, "url", "playUrl", "play_url", "videoUrl", "video_url");

  const getQuality = (entry: Record<string, unknown>) =>
    getString(entry, "quality").toLowerCase();

  const masterLike =
    normalized.find((entry) => {
      const quality = getQuality(entry);
      const url = getUrl(entry);
      return (
        quality === "0p" ||
        (/\.m3u8$/i.test(url) &&
          !url.includes("-sd.m3u8") &&
          !url.includes("-video-sd.m3u8"))
      );
    }) ?? null;

  if (masterLike) {
    const url = getUrl(masterLike);
    if (url) return url;
  }

  const nonVideoSd =
    normalized.find((entry) => {
      const url = getUrl(entry);
      return url && !url.includes("-video-sd.m3u8");
    }) ?? null;

  if (nonVideoSd) {
    const url = getUrl(nonVideoSd);
    if (url) return url;
  }

  for (const entry of normalized) {
    const url = getUrl(entry);
    if (url) return url;
  }

  return "";
}

function adaptEpisodeDuration(secondsValue: unknown): string {
  const seconds =
    typeof secondsValue === "number"
      ? secondsValue
      : typeof secondsValue === "string" && secondsValue.trim()
        ? Number(secondsValue)
        : 0;

  if (!Number.isFinite(seconds) || seconds <= 0) return "00:00";

  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function adaptReelShortEpisodes(
  payload: unknown,
  numericDramaId: number,
  reelShortId: string,
  code: string,
) {
  const record =
    payload && typeof payload === "object" ? (payload as AnyRecord) : {};
  const sourceList = Array.isArray(record.episodes)
    ? record.episodes
    : Array.isArray(record.chapters)
      ? record.chapters
      : Array.isArray(payload)
        ? payload
        : [];

  return sourceList.map((item, index) => {
    const raw = item && typeof item === "object" ? (item as AnyRecord) : {};

    const episodeNumberRaw =
      getString(raw, "episode", "episodeNumber", "episode_number") ||
      getString(raw, "name").match(/(\d+)/)?.[1] ||
      "";
    const episodeNumber = Number(episodeNumberRaw) || index + 1;

    const episodeId = getString(raw, "id", "episodeId", "episode_id");
    const videoUrl = pickBestStreamUrl(raw);

    return {
      id: createStableNumericId(
        `${reelShortId}:${episodeId || episodeNumber}:${videoUrl}`,
        numericDramaId * 1000 + episodeNumber,
      ),
      dramaId: numericDramaId,
      episodeNumber,
      title: getString(raw, "name", "title") || `Episode ${episodeNumber}`,
      duration: adaptEpisodeDuration(raw.duration),
      description: getString(raw, "description", "desc", "summary"),
      videoUrl: videoUrl || undefined,
      originalVideoUrl: videoUrl || undefined,
      isLocked: String(raw.is_lock ?? "") === "1",
      isVipOnly: String(raw.is_lock ?? "") === "1",
      sortOrder: episodeNumber,
      reelShortEpisodeId: episodeId || undefined,
      reelShortVideoId: episodeId || undefined,
      reelShortCode: code || undefined,
    };
  });
}

async function fetchEpisodesPayload(reelShortId: string, inputCode: string) {
  const candidateCode = inputCode.trim() || REELSHORT_DEFAULT_CODE;

  const urls = [
    `https://reelshort.dramabos.my.id/allepisodes/${encodeURIComponent(reelShortId)}?code=${encodeURIComponent(candidateCode)}`,
    `https://reelshort.dramabos.my.id/chapters/${encodeURIComponent(reelShortId)}?lang=in&code=${encodeURIComponent(candidateCode)}`,
    `https://reelshort.dramabos.my.id/chapters/${encodeURIComponent(reelShortId)}?lang=en&code=${encodeURIComponent(candidateCode)}`,
  ];

  for (const url of urls) {
    const { response, text, json } = await fetchJsonish(url);
    if (!response.ok) continue;

    const record = json && typeof json === "object" ? (json as AnyRecord) : {};
    if (Array.isArray(record.episodes) || Array.isArray(record.chapters)) {
      return { json, code: candidateCode };
    }

    if (Array.isArray(json)) {
      return { json, code: candidateCode };
    }

    if (text) {
      return { json, code: candidateCode };
    }
  }

  return null;
}

export async function respondEpisodes(request: NextRequest) {
  try {
    const reelShortId = request.nextUrl.searchParams.get("id")?.trim() ?? "";
    const inputCode = request.nextUrl.searchParams.get("code")?.trim() ?? "";
    const dramaIdParam =
      request.nextUrl.searchParams.get("dramaId")?.trim() ?? "";

    if (!reelShortId) {
      return NextResponse.json(
        { error: "Parameter id wajib diisi." },
        { status: 400 },
      );
    }

    const payload = await fetchEpisodesPayload(reelShortId, inputCode);

    if (!payload) {
      return NextResponse.json(
        {
          error: "Upstream ReelShort episodes gagal.",
          requestedId: reelShortId,
          attemptedCode: inputCode || REELSHORT_DEFAULT_CODE,
        },
        { status: 502 },
      );
    }

    const numericDramaId = Number(dramaIdParam);
    const safeDramaId =
      Number.isFinite(numericDramaId) && numericDramaId > 0
        ? numericDramaId
        : createStableNumericId(reelShortId, Date.now());

    return NextResponse.json(
      adaptReelShortEpisodes(
        payload.json,
        safeDramaId,
        reelShortId,
        payload.code,
      ),
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal memuat episode ReelShort.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function respondStream(request: NextRequest) {
  try {
    const directUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (directUrl) {
      return NextResponse.json({ url: directUrl }, { status: 200 });
    }

    const episodeId =
      request.nextUrl.searchParams.get("episodeId")?.trim() ?? "";
    const reelShortId =
      request.nextUrl.searchParams.get("id")?.trim() ??
      request.nextUrl.searchParams.get("dramaId")?.trim() ??
      "";
    const inputCode = request.nextUrl.searchParams.get("code")?.trim() ?? "";

    if (!episodeId) {
      return NextResponse.json(
        { error: "Parameter episodeId wajib diisi." },
        { status: 400 },
      );
    }

    const code = inputCode || REELSHORT_DEFAULT_CODE;

    const candidates = [
      `https://reelshort.dramabos.my.id/play/${encodeURIComponent(episodeId)}?code=${encodeURIComponent(code)}`,
      `https://reelshort.dramabos.my.id/unlock/${encodeURIComponent(episodeId)}?code=${encodeURIComponent(code)}`,
      `https://reelshort.dramabos.my.id/stream/${encodeURIComponent(episodeId)}?code=${encodeURIComponent(code)}`,
    ];

    for (const candidate of candidates) {
      const { response, json } = await fetchJsonish(candidate);
      if (!response.ok || !json || typeof json !== "object") continue;
      const record = json as AnyRecord;
      const url = getString(
        record,
        "url",
        "playUrl",
        "play_url",
        "videoUrl",
        "video_url",
        "streamUrl",
        "stream_url",
      );
      if (url) {
        return NextResponse.json({ url }, { status: 200 });
      }
    }

    if (reelShortId) {
      const payload = await fetchEpisodesPayload(reelShortId, code);
      if (payload) {
        const record =
          payload.json && typeof payload.json === "object"
            ? (payload.json as AnyRecord)
            : {};
        const sourceList = Array.isArray(record.episodes)
          ? record.episodes
          : Array.isArray(record.chapters)
            ? record.chapters
            : [];

        for (const item of sourceList) {
          if (!item || typeof item !== "object") continue;
          const raw = item as AnyRecord;
          if (getString(raw, "id") !== episodeId) continue;

          const url = pickBestStreamUrl(raw);
          if (url) {
            return NextResponse.json({ url }, { status: 200 });
          }
        }
      }
    }

    return NextResponse.json(
      {
        error: "URL stream ReelShort tidak berhasil di-resolve.",
        episodeId,
        reelShortId,
      },
      { status: 404 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Gagal resolve stream ReelShort.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function respondSubtitle(request: NextRequest) {
  const episodeId = request.nextUrl.searchParams.get("episodeId")?.trim() ?? "";
  if (!episodeId) {
    return NextResponse.json(
      { error: "Parameter episodeId wajib diisi." },
      { status: 400 },
    );
  }

  const { response, text, json } = await fetchJsonish(
    `https://reelshort.dramabos.my.id/subtitle/${encodeURIComponent(episodeId)}`,
  );

  if (!response.ok) {
    return NextResponse.json(
      {
        error: `Upstream ReelShort subtitle gagal. status=${response.status}`,
        upstreamBody: text,
      },
      { status: response.status },
    );
  }

  return NextResponse.json(json, { status: 200 });
}
