import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { FREE_EPISODE_LIMIT } from "@/lib/episodes/access";
import { createStreamToken, verifyStreamToken } from "@/lib/stream/token";
import { checkStreamRateLimit } from "@/lib/rate-limit/stream";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const DRAMAWAVE_DRAMA_BASE_URL =
  "https://streamapi.web.id/p/dramawave/api/v1/dramas";

const DRAMAWAVE_TOKEN = process.env.DRAMAWAVE_TOKEN?.trim() || "";

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

type VerifiedStreamToken = NonNullable<ReturnType<typeof verifyStreamToken>>;

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

function isLikelyPlaylist(contentType: string | null, url: URL): boolean {
  const lowerType = (contentType || "").toLowerCase();
  const pathname = url.pathname.toLowerCase();

  return (
    lowerType.includes("application/vnd.apple.mpegurl") ||
    lowerType.includes("application/x-mpegurl") ||
    pathname.endsWith(".m3u8")
  );
}

function isValidDecodedUrl(value: string): boolean {
  if (!value || value.trim().length === 0) return false;

  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.has(url.protocol) && !!url.hostname;
  } catch {
    return false;
  }
}

function toProxyUrl(resolved: URL, parentPayload: VerifiedStreamToken): string {
  const childToken = createStreamToken({
    provider: parentPayload.provider,
    userId: parentPayload.userId,
    episodeKey: parentPayload.episodeKey,
    url: resolved.toString(),
  });

  return `/api/dramawave/stream?token=${encodeURIComponent(childToken)}`;
}

function rewriteDirectiveUris(
  line: string,
  upstreamUrl: URL,
  parentPayload: VerifiedStreamToken,
): string {
  return line.replace(/URI="([^"]+)"/g, (_match, uriValue: string) => {
    try {
      const resolved = new URL(uriValue, upstreamUrl);

      if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
        return `URI="${uriValue}"`;
      }

      return `URI="${toProxyUrl(resolved, parentPayload)}"`;
    } catch {
      return `URI="${uriValue}"`;
    }
  });
}

function rewritePlaylist(
  body: string,
  upstreamUrl: URL,
  parentPayload: VerifiedStreamToken,
): string {
  return body
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return rewriteDirectiveUris(line, upstreamUrl, parentPayload);
      }

      try {
        const resolved = new URL(trimmed, upstreamUrl);

        if (!ALLOWED_PROTOCOLS.has(resolved.protocol)) {
          return line;
        }

        return toProxyUrl(resolved, parentPayload);
      } catch {
        return line;
      }
    })
    .join("\n");
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

  if (range) {
    headers.set("Range", range);
  }

  headers.set(
    "User-Agent",
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

async function fetchUpstream(
  request: NextRequest,
  upstreamUrl: URL,
): Promise<Response> {
  const headers = buildUpstreamHeaders(request, upstreamUrl);

  return fetch(upstreamUrl.toString(), {
    method: request.method === "HEAD" ? "HEAD" : "GET",
    headers,
    cache: "no-store",
    redirect: "follow",
  });
}

async function resolveDramawavePlayUrl(
  dramaId: string,
  episodeNo: string,
): Promise<string> {
  const upstreamUrl = `${DRAMAWAVE_DRAMA_BASE_URL}/${encodeURIComponent(
    dramaId,
  )}/play/${encodeURIComponent(episodeNo)}?lang=id-ID&token=${encodeURIComponent(
    DRAMAWAVE_TOKEN,
  )}`;

  const response = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Dramawave play failed: ${response.status}`);
  }

  const payload = await response.json();
  const data =
    payload && typeof payload === "object" && "data" in payload
      ? (payload as { data?: Record<string, unknown> }).data
      : undefined;

  const videoUrl =
    data && typeof data.video_url === "string" && data.video_url.trim()
      ? data.video_url.trim()
      : data &&
          typeof data.external_audio_h264_m3u8 === "string" &&
          data.external_audio_h264_m3u8.trim()
        ? data.external_audio_h264_m3u8.trim()
        : data &&
            typeof data.m3u8_url === "string" &&
            data.m3u8_url.trim()
          ? data.m3u8_url.trim()
          : "";

  if (!videoUrl) {
    throw new Error("Dramawave play URL not found.");
  }

  return videoUrl;
}

async function requireDramawaveAccess(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const token = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const proxyToken = request.nextUrl.searchParams.get("u")?.trim() ?? "";
  const legacyUrl = request.nextUrl.searchParams.get("url")?.trim() ?? "";

  if (token) return null;

  if (proxyToken || legacyUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  }

  const episodeNo = request.nextUrl.searchParams.get("episodeNo")?.trim() || "";
  const episodeNumber = Number(episodeNo);

  if (!Number.isInteger(episodeNumber) || episodeNumber < 1) {
    return NextResponse.json(
      { ok: false, error: "episodeNo tidak valid." },
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

async function handleProxy(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: buildCorsHeaders("application/json") },
    );
  }

  const streamToken = request.nextUrl.searchParams.get("token")?.trim() ?? "";
  const rawToken = request.nextUrl.searchParams.get("u")?.trim();
  const rawLegacyUrl = request.nextUrl.searchParams.get("url")?.trim();
  const dramaId = request.nextUrl.searchParams.get("dramaId")?.trim() || "";
  const episodeNo = request.nextUrl.searchParams.get("episodeNo")?.trim() || "";

  let rawUrl = "";
  let parentPayload: VerifiedStreamToken | null = null;

  if (streamToken) {
    const tokenPayload = verifyStreamToken(streamToken);

    if (
      !tokenPayload ||
      tokenPayload.provider !== "dramawave" ||
      tokenPayload.userId !== user.id
    ) {
      return NextResponse.json(
        { ok: false, error: "Invalid or expired stream token" },
        { status: 403, headers: buildCorsHeaders("application/json") },
      );
    }

    rawUrl = tokenPayload.url;
    parentPayload = tokenPayload;
  } else if (rawToken || rawLegacyUrl) {
    return NextResponse.json(
      { ok: false, error: "Direct URL playback is disabled." },
      { status: 403, headers: buildCorsHeaders("application/json") },
    );
  } else if (dramaId && episodeNo) {
    try {
      rawUrl = await resolveDramawavePlayUrl(dramaId, episodeNo);
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Failed to resolve Dramawave play URL.",
        },
        { status: 500, headers: buildCorsHeaders("application/json") },
      );
    }

    const initialToken = createStreamToken({
      provider: "dramawave",
      userId: user.id,
      episodeKey: `${dramaId}:${episodeNo}`,
      url: rawUrl,
    });

    const tokenUrl = `/api/dramawave/stream?token=${encodeURIComponent(
      initialToken,
    )}`;

    return new NextResponse(null, {
      status: 307,
      headers: {
        Location: tokenUrl,
        ...buildCorsHeaders(),
      },
    });
  }

  if (!rawUrl || !parentPayload) {
    return NextResponse.json(
      { error: "Missing required query parameter: token or dramaId+episodeNo" },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

  if (!isValidDecodedUrl(rawUrl)) {
    return NextResponse.json(
      { error: "Decoded URL is invalid or incomplete." },
      { status: 400, headers: buildCorsHeaders("application/json") },
    );
  }

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

  const upstreamResponse = await fetchUpstream(request, upstreamUrl);
  const contentType = upstreamResponse.headers.get("content-type");

  if (!upstreamResponse.ok) {
    const text = await upstreamResponse.text().catch(() => "");

    return new NextResponse(text || "Upstream request failed.", {
      status: upstreamResponse.status,
      headers: copyUpstreamHeaders(upstreamResponse, contentType),
    });
  }

  if (request.method === "HEAD") {
    const responseHeaders = copyUpstreamHeaders(
      upstreamResponse,
      isLikelyPlaylist(contentType, upstreamUrl)
        ? "application/vnd.apple.mpegurl; charset=utf-8"
        : contentType,
    );
    responseHeaders.delete("Content-Disposition");
    responseHeaders.delete("content-disposition");

    return new NextResponse(null, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  if (isLikelyPlaylist(contentType, upstreamUrl)) {
    const playlistText = await upstreamResponse.text();
    const rewritten = rewritePlaylist(playlistText, upstreamUrl, parentPayload);

    const responseHeaders = copyUpstreamHeaders(
      upstreamResponse,
      "application/vnd.apple.mpegurl; charset=utf-8",
    );
    responseHeaders.delete("Content-Disposition");
    responseHeaders.delete("content-disposition");

    return new NextResponse(rewritten, {
      status: upstreamResponse.status,
      headers: responseHeaders,
    });
  }

  const responseHeaders = copyUpstreamHeaders(upstreamResponse, contentType);
  responseHeaders.delete("Content-Disposition");
  responseHeaders.delete("content-disposition");

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

export async function GET(request: NextRequest) {
  const accessError = await requireDramawaveAccess(request);
  if (accessError) return accessError;

  return handleProxy(request);
}

export async function HEAD(request: NextRequest) {
  const accessError = await requireDramawaveAccess(request);
  if (accessError) return accessError;

  return handleProxy(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(),
  });
}
