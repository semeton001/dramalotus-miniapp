import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
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


async function resolveReelifeStreamUrl(
  dramaId: string,
  episodeId: string,
  _code: string,
  _lang: string,
  _episodeNumber: string,
): Promise<string> {
  try {
    const payload = await reelifeFetch<any>(
      `/dramas/${encodeURIComponent(dramaId)}/episodes/${encodeURIComponent(
        episodeId,
      )}`,
    );

    const direct =
      getString(payload?.video_url);

    if (direct) {
      return direct;
    }

    const chapter =
      payload?.data?.chapterContentList?.[0];

    const video720 =
      chapter?.videoInfoList?.find(
        (item: any) => Number(item?.quality) === 720,
      ) ||
      chapter?.videoInfoList?.[0];

    return (
      getString(video720?.videoPath) ||
      getString(chapter?.mp4720p) ||
      getString(chapter?.mp4720pStandByUrl?.[0]) ||
      ""
    );
  } catch {
    return "";
  }
}

async function requireReelifeAccess(_request: NextRequest) {
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
