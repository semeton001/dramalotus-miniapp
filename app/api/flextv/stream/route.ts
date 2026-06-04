import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { isMiniappRequest } from "@/lib/auth/isMiniappRequest";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { extractPlayVideoUrl, fetchFlextvJson } from "../_shared";

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
    if (lower === "content-type" && contentType) return;
    if (lower === "access-control-allow-origin") return;
    if (lower === "access-control-allow-methods") return;
    if (lower === "access-control-allow-headers") return;
    if (lower === "access-control-expose-headers") return;

    headers.set(key, value);
  });

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

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

function buildUpstreamHeaders(request: NextRequest, upstreamUrl: URL): Headers {
  const headers = new Headers();
  const range = request.headers.get("range");

  headers.set("Accept", "*/*");
  headers.set("Origin", upstreamUrl.origin);
  headers.set("Referer", `${upstreamUrl.origin}/`);
  headers.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  );

  if (range) {
    headers.set("Range", range);
  }

  return headers;
}

async function resolveFlextvStreamUrl(
  seriesId: string,
  episodeId: string,
): Promise<string> {
  if (!seriesId.trim() || !episodeId.trim()) return "";

  const payload = (await fetchFlextvJson(
    `/play/${encodeURIComponent(seriesId)}/${encodeURIComponent(
      episodeId,
    )}`,
    { lang: "id" },
  )) as any;

  const data = payload?.data || {};

  const progressive = Array.isArray(data?.progressive)
    ? data.progressive
    : [];

  const normalize = (v: unknown) =>
    String(v || "").trim().toUpperCase();

  const best =
    progressive.find((item: any) =>
      normalize(item?.title).includes("1080P-MAX"),
    ) ||
    progressive.find((item: any) =>
      normalize(item?.title).includes("1080P"),
    ) ||
    progressive.find((item: any) =>
      normalize(item?.title).includes("720P"),
    ) ||
    progressive.find((item: any) =>
      typeof item?.video_url === "string",
    );

  return (
    best?.video_url ||
    data?.video_url ||
    ""
  );
}

async function requireFlextvAccess(request: NextRequest) {
  if (isMiniappRequest(request)) return null;

  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const directUrl =
    request.nextUrl.searchParams.get("url")?.trim() ||
    request.nextUrl.searchParams.get("u")?.trim() ||
    "";

  if (directUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const rateLimitError = checkStreamRateLimit({
    request,
    provider: "flextv",
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

async function proxyMedia(request: NextRequest, rawUrl: string) {
  let upstreamUrl: URL;

  try {
    upstreamUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json(
      { error: "Invalid upstream URL." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!ALLOWED_PROTOCOLS.has(upstreamUrl.protocol)) {
    return NextResponse.json(
      { error: "Unsupported protocol." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const upstream = await fetch(upstreamUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers: buildUpstreamHeaders(request, upstreamUrl),
    cache: "no-store",
    redirect: "follow",
  });

  const contentType = upstream.headers.get("content-type") || "video/mp4";

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");

    return new NextResponse(text || "Upstream request failed.", {
      status: upstream.status,
      headers: copyUpstreamHeaders(upstream, contentType),
    });
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

async function handleStream(request: NextRequest) {
  const isMiniapp = isMiniappRequest(request);
  const user = isMiniapp ? null : await getCurrentUser();

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const directUrl =
    request.nextUrl.searchParams.get("url")?.trim() ||
    request.nextUrl.searchParams.get("u")?.trim() ||
    "";

  if (directUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  if (token) {
    const payload = verifyStreamToken(token);

    if (
      !payload ||
      payload.provider !== "flextv" ||
      (!isMiniapp && user && payload.userId !== user.id)
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    return proxyMedia(request, payload.url);
  }

  const seriesId =
    request.nextUrl.searchParams.get("seriesId")?.trim() ||
    request.nextUrl.searchParams.get("dramaId")?.trim() ||
    "";

  const episodeId =
    request.nextUrl.searchParams.get("episodeId")?.trim() ||
    request.nextUrl.searchParams.get("ep")?.trim() ||
    request.nextUrl.searchParams.get("episode")?.trim() ||
    request.nextUrl.searchParams.get("episodeNumber")?.trim() ||
    "";

  if (!seriesId || !episodeId) {
    return NextResponse.json(
      { error: "Missing FlexTV seriesId/episodeId." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  const resolvedUrl = await resolveFlextvStreamUrl(seriesId, episodeId);

  if (!resolvedUrl) {
    return NextResponse.json(
      { error: "Failed to resolve FlexTV stream." },
      { status: 404, headers: buildCorsHeaders("application/json") },
    );
  }

  const initialPayload: VerifiedStreamToken = {
    provider: "flextv",
    userId: isMiniapp ? "miniapp" : user!.id,
    episodeKey: `${seriesId}:${episodeId}`,
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
      Location: `/api/flextv/stream?token=${encodeURIComponent(initialToken)}`,
      ...buildCorsHeaders(),
    },
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireFlextvAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireFlextvAccess(request);
  if (accessError) return accessError;

  return handleStream(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
