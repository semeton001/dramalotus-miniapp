import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import {
  REELIFE_DEFAULT_PLAY_CODE,
  ReelifeBookDetailResponse,
  ReelifeChapterItem,
  collectReelifeCode,
  getLang,
  getString,
  reelifeFetch,
  toArray,
} from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

const REELIFE_STREAMAPI_BASE_URL = "https://streamapi.web.id/p/reelife/api/v1";
const REELIFE_API_TOKEN = process.env.REELIFE_API_TOKEN?.trim() || "";

type JsonRecord = Record<string, unknown>;

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-encoding",
  "content-length",
  "host",
]);

function buildCorsHeaders(contentType?: string | null) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Range, Accept-Ranges, Content-Type",
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function copyUpstreamHeaders(
  upstream: Response,
  contentType?: string | null,
): Headers {
  const headers = new Headers(buildCorsHeaders(contentType));

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "content-type" && contentType) return;
    if (lower === "access-control-allow-origin") return;
    if (lower === "access-control-allow-methods") return;
    if (lower === "access-control-allow-headers") return;
    if (lower === "access-control-expose-headers") return;

    headers.set(key, value);
  });

  if (contentType) headers.set("Content-Type", contentType);

  headers.set("Cache-Control", "no-store");
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Range");
  headers.set(
    "Access-Control-Expose-Headers",
    "Content-Length, Content-Range, Accept-Ranges, Content-Type",
  );

  return headers;
}

function buildUpstreamHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  const range = request.headers.get("range");

  headers.set("Accept", "*/*");
  headers.set("Referer", "https://reelife.dramabos.my.id/");
  headers.set("Origin", "https://reelife.dramabos.my.id");
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  );

  if (range) headers.set("Range", range);

  return headers;
}

async function proxyMedia(request: NextRequest, rawUrl: string) {
  let upstreamUrl: URL;

  try {
    upstreamUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid upstream URL." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!ALLOWED_PROTOCOLS.has(upstreamUrl.protocol)) {
    return NextResponse.json(
      { ok: false, error: "Unsupported protocol." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: buildUpstreamHeaders(request),
    cache: "no-store",
    redirect: "follow",
  });

  const contentType = upstream.headers.get("content-type") || "video/mp4";

  if (!upstream.ok && upstream.status !== 206) {
    const body = await upstream.text().catch(() => "");

    return NextResponse.json(
      {
        ok: false,
        source: "reelife",
        error: `Upstream media error ${upstream.status}: ${body.slice(0, 300)}`,
      },
      { status: 502, headers: buildCorsHeaders("application/json") },
    );
  }

  if (request.method === "HEAD") {
    return new NextResponse(null, {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream, contentType),
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: copyUpstreamHeaders(upstream, contentType),
  });
}

async function resolveFromPlay(
  dramaId: string,
  episodeId: string,
  code: string,
  lang: string,
) {
  try {
    const query = new URLSearchParams({ code, lang });
    const payload = await reelifeFetch<{
      videoUrl?: string;
      standbyUrls?: string[];
    }>(`/api/v1/play/${dramaId}/${episodeId}?${query.toString()}`);

    return getString(payload?.videoUrl);
  } catch {
    return "";
  }
}

async function resolveFromBookPreview(
  dramaId: string,
  episodeId: string,
  lang: string,
) {
  try {
    const payload = await reelifeFetch<ReelifeBookDetailResponse>(
      `/api/v1/book/${dramaId}?lang=${lang}`,
    );

    const items = toArray<ReelifeChapterItem>(payload?.data?.chapterContentList);
    const target = items.find((item) => getString(item.chapterId) === episodeId);

    return {
      url: getString(target?.mp4720p || target?.mp4720pStandByUrl?.[0]),
      code:
        collectReelifeCode(payload, payload?.data?.bookVo, ...items) ||
        REELIFE_DEFAULT_PLAY_CODE,
    };
  } catch {
    return {
      url: "",
      code: REELIFE_DEFAULT_PLAY_CODE,
    };
  }
}

function toStringValue(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function pickStreamApiVideoUrl(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";

  const record = payload as JsonRecord;
  const data = record.data && typeof record.data === "object"
    ? (record.data as JsonRecord)
    : undefined;

  const chapterList = Array.isArray(data?.chapterContentList)
    ? (data?.chapterContentList as JsonRecord[])
    : [];

  const chapter = chapterList[0] || data || record;

  const videoInfoList = Array.isArray((chapter as JsonRecord).videoInfoList)
    ? ((chapter as JsonRecord).videoInfoList as JsonRecord[])
    : [];

  const video720 =
    videoInfoList.find((item) => Number(item.quality) === 720 && item.videoPath) ||
    videoInfoList.find((item) => item.videoPath);

  return (
    toStringValue(video720?.videoPath) ||
    toStringValue((chapter as JsonRecord).mp4720p) ||
    toStringValue(((chapter as JsonRecord).mp4720pStandByUrl as unknown[])?.[0]) ||
    toStringValue(record.video_url)
  );
}

async function fetchReelifeStreamApi(pathname: string): Promise<unknown> {
  const normalizedPath = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  const baseUrl = REELIFE_STREAMAPI_BASE_URL.endsWith("/")
    ? REELIFE_STREAMAPI_BASE_URL
    : `${REELIFE_STREAMAPI_BASE_URL}/`;

  const url = new URL(normalizedPath, baseUrl);

  if (!url.searchParams.has("token")) {
    url.searchParams.set("token", REELIFE_API_TOKEN);
  }

  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) return null;

  return response.json();
}

async function resolveFromStreamApi(
  dramaId: string,
  episodeNumber: string,
): Promise<string> {
  if (!dramaId || !episodeNumber || !REELIFE_API_TOKEN) return "";

  const payload = await fetchReelifeStreamApi(
    `/dramas/${encodeURIComponent(dramaId)}/episodes/${encodeURIComponent(
      episodeNumber,
    )}`,
  );

  return pickStreamApiVideoUrl(payload);
}

async function resolveReelifeStreamUrl(
  dramaId: string,
  episodeId: string,
  code: string,
  lang: string,
  episodeNumber: string,
): Promise<string> {
  let resolvedUrl = await resolveFromPlay(dramaId, episodeId, code, lang);
  let currentCode = code;

  if (!resolvedUrl) {
    const preview = await resolveFromBookPreview(dramaId, episodeId, lang);

    if (!currentCode && preview.code) {
      currentCode = preview.code;
    }

    if (preview.url) {
      resolvedUrl = preview.url;
    }
  }

  if (!resolvedUrl && currentCode) {
    resolvedUrl = await resolveFromPlay(dramaId, episodeId, currentCode, lang);
  }

  if (!resolvedUrl && episodeNumber) {
    resolvedUrl = await resolveFromStreamApi(dramaId, episodeNumber);
  }

  return resolvedUrl;
}

async function requireReelifeAccess(request: NextRequest) {
  if (isMiniappRequest(request)) return null;

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const directParam =
    request.nextUrl.searchParams.get("url")?.trim() ||
    request.nextUrl.searchParams.get("u")?.trim() ||
    "";

  if (directParam) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "reelife",
    userId: user.id,
  });
  if (rateLimitError) return rateLimitError;

  if (token) return null;

  const episodeNumber = Number(
    request.nextUrl.searchParams.get("episodeNumber") ||
      request.nextUrl.searchParams.get("episode") ||
      request.nextUrl.searchParams.get("ep") ||
      "1",
  );

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episodeNumber tidak valid." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const isFreeEpisode = episodeNumber <= FREE_EPISODE_LIMIT;

  if (!isFreeEpisode && user.membership_status !== "vip") {
    return NextResponse.json(
      {
        ok: false,
        error: "VIP_REQUIRED",
        message: "Episode ini hanya untuk VIP.",
      },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (user.membership_status === "vip" && user.vip_until) {
    const expiresAt = new Date(user.vip_until).getTime();

    if (!Number.isNaN(expiresAt) && expiresAt <= Date.now()) {
      return NextResponse.json(
        { ok: false, error: "VIP_EXPIRED" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }
  }

  return null;
}

async function handleStream(request: NextRequest) {
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const directParam =
    request.nextUrl.searchParams.get("url")?.trim() ||
    request.nextUrl.searchParams.get("u")?.trim() ||
    "";

  if (directParam) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (token) {
    const payload = verifyStreamToken(token);

    if (
      !payload ||
      payload.provider !== "reelife" ||
      (!isMiniapp && user && payload.userId !== user.id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    return proxyMedia(request, payload.url);
  }

  const dramaId = getString(request.nextUrl.searchParams.get("dramaId"));
  const episodeId =
    getString(request.nextUrl.searchParams.get("episodeId")) ||
    getString(request.nextUrl.searchParams.get("ep")) ||
    getString(request.nextUrl.searchParams.get("episode"));
  const episodeNumber =
    getString(request.nextUrl.searchParams.get("episodeNumber")) ||
    getString(request.nextUrl.searchParams.get("episode")) ||
    getString(request.nextUrl.searchParams.get("ep")) ||
    episodeId;
  const lang = getLang(request);
  const code =
    collectReelifeCode(request.nextUrl.searchParams.get("code")) ||
    REELIFE_DEFAULT_PLAY_CODE;

  if (!dramaId || !episodeId) {
    return NextResponse.json(
      { ok: false, source: "reelife", error: "Missing dramaId or episodeId" },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const resolvedUrl = await resolveReelifeStreamUrl(
    dramaId,
    episodeId,
    code,
    lang,
    episodeNumber,
  );

  if (!resolvedUrl) {
    return NextResponse.json(
      {
        ok: false,
        source: "reelife",
        dramaId,
        episodeId,
        error: "No playable Reelife stream resolved",
      },
      { status: 404, headers: buildCorsHeaders("application/json") },
    );
  }

  const initialPayload: VerifiedStreamToken = {
    provider: "reelife",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${dramaId}:${episodeId}`,
    url: resolvedUrl,
    exp: Math.floor(Date.now() / 1000) + 180,
  };

  if (isMiniapp) {
    return proxyMedia(request, resolvedUrl);
  }

  const initialToken = createStreamToken({
    provider: initialPayload.provider,
    userId: initialPayload.userId,
    episodeKey: initialPayload.episodeKey,
    url: initialPayload.url,
  });

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: `/api/reelife/stream?token=${encodeURIComponent(initialToken)}`,
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireReelifeAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireReelifeAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
