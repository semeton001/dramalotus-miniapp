import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { fetchDramaBoxPlay, getLang, getNumber, getString } from "../_shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

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

function buildProxyUrl(resolved: URL, parentPayload: VerifiedStreamToken): string {
  const token = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url: resolved.toString(),
  });

  return `/api/dramabox/stream?token=${encodeURIComponent(token)}`;
}

function copyUpstreamHeaders(
  upstream: Response,
  contentType?: string | null,
): Headers {
  const headers = new Headers(buildCorsHeaders(contentType));

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();

    if (HOP_BY_HOP_HEADERS.has(lower)) return;
    if (lower === "access-control-allow-origin") return;
    if (lower === "access-control-allow-methods") return;
    if (lower === "access-control-allow-headers") return;
    if (lower === "access-control-expose-headers") return;

    headers.set(key, value);
  });

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

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function buildUpstreamHeaders(request: NextRequest, upstreamUrl: URL): Headers {
  const headers = new Headers();
  const range = request.headers.get("range");

  if (range) headers.set("Range", range);

  headers.set(
    "User-Agent",
    request.headers.get("user-agent") ||
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );
  headers.set("Accept", "*/*");
  headers.set("Accept-Language", "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7");
  headers.set("Origin", upstreamUrl.origin);
  headers.set("Referer", `${upstreamUrl.origin}/`);
  headers.set("Sec-Fetch-Dest", "video");
  headers.set("Sec-Fetch-Mode", "cors");
  headers.set("Sec-Fetch-Site", "cross-site");

  return headers;
}

function extractVideoUrl(payload: unknown): string {
  const root =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const data =
    root.data && typeof root.data === "object"
      ? (root.data as Record<string, unknown>)
      : {};

  const videos =
    data.videos && typeof data.videos === "object"
      ? (data.videos as Record<string, unknown>)
      : {};

  return (
    getString(videos["720"]) ||
    getString(videos["1080"]) ||
    getString(videos["540"]) ||
    getString(data.videoUrl) ||
    getString(data.url)
  );
}

async function proxyMedia(request: NextRequest, rawUrl: string) {
  if (!rawUrl || !isValidUrl(rawUrl)) {
    return NextResponse.json(
      { ok: false, source: "dramabox", error: "Invalid upstream media URL." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const upstreamUrl = new URL(rawUrl);
  const upstreamResponse = await fetch(upstreamUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: buildUpstreamHeaders(request, upstreamUrl),
    cache: "no-store",
    redirect: "follow",
  });

  const contentType = upstreamResponse.headers.get("content-type");

  if (!upstreamResponse.ok) {
    const text = await upstreamResponse.text().catch(() => "");

    return NextResponse.json(
      {
        ok: false,
        source: "dramabox",
        error: `Upstream media error ${upstreamResponse.status}`,
        details: text.slice(0, 300),
      },
      {
        status: 502,
        headers: buildCorsHeaders("application/json"),
      },
    );
  }

  if (request.method === "HEAD") {
    return new NextResponse(null, {
      status: upstreamResponse.status,
      headers: copyUpstreamHeaders(upstreamResponse, contentType),
    });
  }

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: copyUpstreamHeaders(upstreamResponse, contentType),
  });
}

async function requireDramaboxAccess(
  request: NextRequest,
  episodeNumber: number,
  user: Awaited<ReturnType<typeof getCurrentUser>>,
) {
  if (isMiniappRequest(request)) return null;

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episodeNumber tidak valid." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "dramabox",
    userId: user.id,
  });
  if (rateLimitError) return rateLimitError;

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

async function handleProxy(request: NextRequest) {
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";
  const legacyU = request.nextUrl.searchParams.get("u")?.trim() ?? "";

  if (legacyUrl || legacyU) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!isMiniapp && !user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  if (token) {
    const payload = verifyStreamToken(token);

    if (
      !payload ||
      payload.provider !== "dramabox" ||
      (!isMiniapp && user && payload.userId !== user.id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    return proxyMedia(request, payload.url);
  }

  const bookId = request.nextUrl.searchParams.get("bookId")?.trim() || "";
  const episodeNumber = getNumber(
    request.nextUrl.searchParams.get("episode") ||
      request.nextUrl.searchParams.get("episodeNumber") ||
      request.nextUrl.searchParams.get("ep"),
    0,
  );
  const lang = getLang(request);

  if (!bookId || !/^\d+$/.test(bookId)) {
    return NextResponse.json(
      { ok: false, error: "bookId must be a valid numeric string." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episode must be a valid positive number." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const accessError = await requireDramaboxAccess(request, episodeNumber, user);
  if (accessError) return accessError;

  const playPayload = await fetchDramaBoxPlay(bookId, episodeNumber, lang);
  const upstreamVideoUrl = extractVideoUrl(playPayload);

  if (!upstreamVideoUrl || !isValidUrl(upstreamVideoUrl)) {
    return NextResponse.json(
      {
        ok: false,
        source: "dramabox",
        error: "Video URL tidak ditemukan dari endpoint /play.",
      },
      { status: 502, headers: buildCorsHeaders("application/json") },
    );
  }

  const initialPayload: VerifiedStreamToken = {
    provider: "dramabox",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${bookId}:${episodeNumber}`,
    url: upstreamVideoUrl,
    exp: Math.floor(Date.now() / 1000) + 180,
  };

  if (isMiniapp) {
    return proxyMedia(request, upstreamVideoUrl);
  }

  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: buildProxyUrl(new URL(upstreamVideoUrl), initialPayload),
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  return handleProxy(request);
}

export async function HEAD(request: NextRequest) {
  return handleProxy(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
