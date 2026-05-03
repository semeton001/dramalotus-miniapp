import { NextRequest, NextResponse } from "next/server";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";

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

function getReelShortCode(inputCode = ""): string {
  return inputCode.trim() || REELSHORT_DEFAULT_CODE;
}

function redactSensitiveUrl(value: string): string {
  return value.replace(/([?&](?:token|api_token)=)[^&]*/gi, "$1***HIDDEN***");
}

function buildSignedReelShortProxyUrl(token: string): string {
  return `/api/reelshort/stream?token=${encodeURIComponent(token)}`;
}

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function toAbsoluteUrl(baseUrl: string, value: string): string {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

function buildChildSignedReelShortProxyUrl(
  url: string,
  parentPayload: VerifiedStreamToken,
): string {
  const childToken = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url,
  });

  return buildSignedReelShortProxyUrl(childToken);
}

function rewriteReelShortUriAttribute(
  line: string,
  manifestUrl: string,
  tokenPayload: VerifiedStreamToken,
): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uri) => {
    const absolute = toAbsoluteUrl(manifestUrl, uri);
    return `URI="${buildChildSignedReelShortProxyUrl(absolute, tokenPayload)}"`;
  });
}

function rewriteReelShortM3u8Manifest(
  manifestText: string,
  manifestUrl: string,
  tokenPayload: VerifiedStreamToken,
): string {
  return manifestText
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (
        trimmed.startsWith("#EXT-X-KEY:") ||
        trimmed.startsWith("#EXT-X-MAP:") ||
        trimmed.startsWith("#EXT-X-MEDIA:")
      ) {
        return rewriteReelShortUriAttribute(line, manifestUrl, tokenPayload);
      }

      if (trimmed.startsWith("#")) {
        return line;
      }

      const absolute = isAbsoluteUrl(trimmed)
        ? trimmed
        : toAbsoluteUrl(manifestUrl, trimmed);

      return buildChildSignedReelShortProxyUrl(absolute, tokenPayload);
    })
    .join("\n");
}

function buildPassthroughHeaders(request: NextRequest) {
  const headers = new Headers();
  headers.set("Accept", "*/*");

  const range = request.headers.get("range");
  if (range) {
    headers.set("Range", range);
  }

  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    headers.set("User-Agent", userAgent);
  }

  return headers;
}

async function proxyReelShortMedia(
  request: NextRequest,
  targetUrl: string,
  tokenPayload: VerifiedStreamToken,
) {
  const upstream = await fetch(targetUrl, {
    cache: "no-store",
    headers: buildPassthroughHeaders(request),
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Gagal mengambil stream upstream. status=${upstream.status}` },
      { status: upstream.status },
    );
  }

  const contentType =
    upstream.headers.get("content-type") ||
    (targetUrl.includes(".m3u8")
      ? "application/vnd.apple.mpegurl"
      : "video/mp4");

  const isManifest =
    contentType.includes("application/vnd.apple.mpegurl") ||
    contentType.includes("application/x-mpegURL") ||
    targetUrl.includes(".m3u8");

  if (isManifest) {
    const manifestText = await upstream.text();
    const rewrittenManifest = rewriteReelShortM3u8Manifest(
      manifestText,
      targetUrl,
      tokenPayload,
    );

    return new NextResponse(rewrittenManifest, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const responseHeaders = new Headers();
  responseHeaders.set("Content-Type", contentType);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("Access-Control-Allow-Origin", "*");

  const contentLength = upstream.headers.get("content-length");
  const contentRange = upstream.headers.get("content-range");
  const acceptRanges = upstream.headers.get("accept-ranges");

  if (contentLength) responseHeaders.set("Content-Length", contentLength);
  if (contentRange) responseHeaders.set("Content-Range", contentRange);
  if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

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
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as AnyRecord)
      : {};

  const nestedLists = Array.isArray(data.lists)
    ? data.lists.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as AnyRecord;
        return Array.isArray(item.books) ? item.books : [];
      })
    : [];

  if (nestedLists.length > 0) return nestedLists;

  const candidates = [
    record.items,
    record.results,
    record.books,
    record.data,
    record.list,
    record.popular,
    data.items,
    data.results,
    data.books,
    data.list,
    data.popular,
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
      "book_title",
      "title",
      "name",
      "bookName",
      "book_name",
      "dramaName",
      "drama_name",
      "seriesName",
      "share_text",
    ) || "Tanpa Judul";

  const pic = getString(
    raw,
    "book_pic",
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
    "chapter_count",
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
      `Upstream ReelShort gagal. status=${response.status} body=${text} url=${redactSensitiveUrl(upstreamUrl)}`,
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
    upstreamUrls.map(async (url) => {
      try {
        return await fetchFeedItems(url);
      } catch (error) {
        console.warn(
          "ReelShort feed upstream gagal, memakai fallback kosong:",
          error,
        );
        return [];
      }
    }),
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

  const candidateCode = getReelShortCode();

  const { response, text, json } = await fetchJsonish(
    `https://streamapi.web.id/p/reelshort/api/v1/search?q=${encodeURIComponent(query)}&page=1&lang=in&token=${encodeURIComponent(candidateCode)}`,
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

  const record = json && typeof json === "object" ? (json as AnyRecord) : {};
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as AnyRecord)
      : {};

  const items = Array.isArray(data.lists)
    ? data.lists
    : extractItems(json);

  return NextResponse.json(items.map(adaptDramaItem), {
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

  const candidateCode = getReelShortCode();

  const { response, text, json } = await fetchJsonish(
    `https://streamapi.web.id/p/reelshort/api/v1/book/${encodeURIComponent(reelShortId)}?lang=in&token=${encodeURIComponent(candidateCode)}`,
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
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as AnyRecord)
      : {};
  const sourceList = Array.isArray(data.chapters)
    ? data.chapters
    : Array.isArray(record.chapters)
      ? record.chapters
      : Array.isArray(record.episodes)
        ? record.episodes
        : Array.isArray(payload)
          ? payload
          : [];

  return sourceList.map((item, index) => {
    const raw = item && typeof item === "object" ? (item as AnyRecord) : {};

    const episodeNumberRaw =
      getString(
        raw,
        "serial_number",
        "episode",
        "episodeNumber",
        "episode_number",
      ) ||
      getString(raw, "chapter_name", "name").match(/(\d+)/)?.[1] ||
      "";
    const episodeNumber = Number(episodeNumberRaw) || index + 1;

    const episodeId = getString(
      raw,
      "chapter_id",
      "id",
      "episodeId",
      "episode_id",
    );
    const videoUrl = pickBestStreamUrl(raw);

    const isLocked =
      String(raw.is_lock ?? "") === "1" ||
      String(raw.ad_vip_locked ?? "") === "1";

    return {
      id: createStableNumericId(
        `${reelShortId}:${episodeId || episodeNumber}:${videoUrl}`,
        numericDramaId * 1000 + episodeNumber,
      ),
      dramaId: numericDramaId,
      episodeNumber,
      title:
        getString(raw, "chapter_name", "name", "title") ||
        `Episode ${episodeNumber}`,
      duration: adaptEpisodeDuration(raw.duration),
      description: getString(raw, "description", "desc", "summary"),
      videoUrl: videoUrl || undefined,
      originalVideoUrl: videoUrl || undefined,
      coverImage: getString(raw, "video_pic") || undefined,
      isLocked,
      isVipOnly:
        String(raw.vip_free ?? "") === "1" ||
        String(raw.ad_vip_locked ?? "") === "1" ||
        isLocked,
      sortOrder: episodeNumber,
      reelShortEpisodeId: episodeId || undefined,
      reelShortVideoId: getString(raw, "video_id") || undefined,
      reelShortCode: code || undefined,
    };
  });
}

async function fetchEpisodesPayload(reelShortId: string, inputCode: string) {
  const candidateCode = getReelShortCode(inputCode);
  const url = `https://streamapi.web.id/p/reelshort/api/v1/book/${encodeURIComponent(reelShortId)}/chapters?lang=in&token=${encodeURIComponent(candidateCode)}`;

  const { response, text, json } = await fetchJsonish(url);
  if (!response.ok) return null;

  const record = json && typeof json === "object" ? (json as AnyRecord) : {};
  const data =
    record.data && typeof record.data === "object"
      ? (record.data as AnyRecord)
      : {};

  if (Array.isArray(data.chapters) || Array.isArray(record.chapters)) {
    return { json, code: candidateCode };
  }

  if (text) {
    return { json, code: candidateCode };
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
      console.warn("ReelShort episodes upstream gagal, return fallback kosong.");
      return NextResponse.json([], { status: 200 });
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
    console.warn("ReelShort episodes route error, return fallback kosong:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function respondStream(request: NextRequest, userId: string) {
  try {
    const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
    const tokenPayload = token ? verifyStreamToken(token) : null;

    if (tokenPayload) {
      if (tokenPayload.provider !== "reelshort") {
        return NextResponse.json(
          { ok: false, error: "Invalid stream token provider" },
          { status: 403 },
        );
      }

      if (tokenPayload.userId !== userId) {
        return NextResponse.json(
          { ok: false, error: "Invalid stream token user" },
          { status: 403 },
        );
      }

      return proxyReelShortMedia(request, tokenPayload.url, tokenPayload);
    }

    const directUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
    if (directUrl) {
      return NextResponse.json(
        { ok: false, error: "Direct URL playback is disabled." },
        { status: 403 },
      );
    }

    const episodeId =
      request.nextUrl.searchParams.get("episodeId")?.trim() ?? "";
    const reelShortId =
      request.nextUrl.searchParams.get("id")?.trim() ??
      request.nextUrl.searchParams.get("dramaId")?.trim() ??
      "";

    if (!episodeId) {
      return NextResponse.json(
        { error: "Parameter episodeId wajib diisi." },
        { status: 400 },
      );
    }

    if (!reelShortId) {
      return NextResponse.json(
        { error: "Parameter id wajib diisi." },
        { status: 400 },
      );
    }

    const candidateCode = getReelShortCode();
    const candidate = `https://streamapi.web.id/p/reelshort/api/v1/book/${encodeURIComponent(reelShortId)}/chapter/${encodeURIComponent(episodeId)}/video?token=${encodeURIComponent(candidateCode)}`;

    const { response, text, json } = await fetchJsonish(candidate);

    if (!response.ok || !json || typeof json !== "object") {
      return NextResponse.json(
        {
          error: "URL stream ReelShort tidak berhasil di-resolve.",
          upstreamStatus: response.status,
          upstreamBody: text,
          episodeId,
          reelShortId,
        },
        { status: response.ok ? 404 : response.status },
      );
    }

    const record = json as AnyRecord;
    const data =
      record.data && typeof record.data === "object"
        ? (record.data as AnyRecord)
        : {};
    const videos = Array.isArray(data.videos) ? data.videos : [];

    const normalized = videos.filter(
      (entry): entry is Record<string, unknown> =>
        !!entry && typeof entry === "object",
    );

    const getPlayUrl = (entry: Record<string, unknown>) =>
      getString(entry as AnyRecord, "PlayURL", "playUrl", "url");

    const getDpi = (entry: Record<string, unknown>) => {
      const raw = entry.Dpi;
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string" && raw.trim()) {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
      return 0;
    };

    const getMultiDpi = (entry: Record<string, unknown>) => {
      const raw = entry.MultiDpi;
      if (typeof raw === "number" && Number.isFinite(raw)) return raw;
      if (typeof raw === "string" && raw.trim()) {
        const n = Number(raw);
        if (Number.isFinite(n)) return n;
      }
      return 0;
    };

    const preferred =
      normalized.find((entry) => getDpi(entry) == 720 && !!getPlayUrl(entry)) ??
      normalized.find((entry) => getMultiDpi(entry) == 720 && !!getPlayUrl(entry)) ??
      normalized.find((entry) => !!getPlayUrl(entry)) ??
      null;

    const url = preferred ? getPlayUrl(preferred) : "";

    if (url) {
      const streamToken = createStreamToken({
        provider: "reelshort",
        userId,
        episodeKey: `${reelShortId}:${episodeId}`,
        url,
      });

      return NextResponse.json(
        { url: buildSignedReelShortProxyUrl(streamToken) },
        { status: 200 },
      );
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
