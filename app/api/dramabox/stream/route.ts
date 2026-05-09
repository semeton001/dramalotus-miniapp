import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { verifyStreamToken } from "@/lib/stream/token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
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

async function requireDramaboxAccess(
  request: NextRequest,
  payload: VerifiedStreamToken,
) {
  if (payload.provider !== "dramabox") {
    return NextResponse.json(
      { ok: false, error: "Invalid stream provider." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const directParam =
    request.nextUrl.searchParams.get("u")?.trim() ||
    request.nextUrl.searchParams.get("url")?.trim() ||
    "";

  if (directParam) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (isMiniappRequest(request)) return null;

  const episodeNumber = Number(
    request.nextUrl.searchParams.get("episodeNumber") ||
      request.nextUrl.searchParams.get("episode") ||
      request.nextUrl.searchParams.get("ep") ||
      payload.episodeKey?.split(":").pop() ||
      "1",
  );

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episodeNumber tidak valid." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const user = await getCurrentUser();

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
  const legacyDirect =
    request.nextUrl.searchParams.get("u")?.trim() ||
    request.nextUrl.searchParams.get("url")?.trim() ||
    "";

  if (legacyDirect) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() || "";

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing stream token." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const payload = verifyStreamToken(token);

  if (!payload?.url || !isValidUrl(payload.url)) {
    return NextResponse.json(
      { ok: false, error: "Invalid stream token." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const accessError = await requireDramaboxAccess(request, payload);
  if (accessError) return accessError;

  const upstreamUrl = new URL(payload.url);
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
